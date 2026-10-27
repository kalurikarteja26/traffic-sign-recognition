import datetime
import io
import re
import hashlib
import urllib.request
import urllib.parse
from typing import Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Query
from sqlalchemy.orm import Session

from backend.config import TTS_CACHE_DIR
from backend.database import get_db
from backend.models import User, DashcamVideo, SafetyEvent
from backend.schemas import SafetyEventResponse, EventFeedbackUpdate
from backend.auth import get_current_user, get_optional_user, log_audit_event
from backend.ai_service import AIServiceManager

router = APIRouter(prefix="/ai", tags=["AI Road-Safety Intelligence"])
ai_manager = AIServiceManager.get_instance()

@router.post("/analyze-video/{video_id}")
def trigger_video_analysis(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers automated AI traffic sign perception on an uploaded dashcam video.
    Samples frames, applies multi-scale neural net inference & multi-agent consensus,
    and stores timestamped safety events with snapshots.
    """
    video = db.query(DashcamVideo).filter(DashcamVideo.id == video_id, DashcamVideo.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video recording not found.")

    video.status = "processing"
    db.commit()

    try:
        # Run AI Video Analysis
        events = ai_manager.analyze_video(
            video_path=video.file_path,
            video_id=video.id,
            user_id=current_user.id,
            sample_interval_sec=0.5,
            confidence_threshold=0.30
        )

        # Clear any prior events for this video
        db.query(SafetyEvent).filter(SafetyEvent.video_id == video.id).delete()

        # Insert newly detected events
        created_events = []
        for ev_data in events:
            se = SafetyEvent(**ev_data)
            db.add(se)
            created_events.append(se)

        video.status = "analyzed"
        video.processed_at = datetime.datetime.utcnow()
        db.commit()

        log_audit_event(db, current_user.id, "VIDEO_ANALYZED", details=f"Analyzed video #{video.id}: detected {len(created_events)} safety events.")

        return {
            "message": f"Analysis complete. Detected {len(created_events)} traffic safety events.",
            "video_id": video.id,
            "status": "analyzed",
            "events_count": len(created_events)
        }

    except Exception as e:
        video.status = "failed"
        db.commit()
        print(f"[AI ANALYSIS ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video analysis failed: {str(e)}"
        )

@router.post("/predict-frame")
async def predict_single_frame(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Real-time single-frame or webcam snapshot prediction.
    Applies multi-scale ROI search, neural net inference, and multi-agent arbitration.
    """
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        result = ai_manager.predict_image(pil_img)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process image frame: {str(e)}"
        )

@router.put("/events/{event_id}/feedback")
def update_event_feedback(
    event_id: int,
    feedback_in: EventFeedbackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows vehicle owner to mark detection as Confirmed or False Positive."""
    event = db.query(SafetyEvent).filter(SafetyEvent.id == event_id, SafetyEvent.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety event not found.")

    event.user_feedback = feedback_in.feedback
    db.commit()
    log_audit_event(db, current_user.id, "EVENT_FEEDBACK", details=f"Marked event #{event.id} as {feedback_in.feedback}")
    return {"message": "Feedback recorded.", "feedback": feedback_in.feedback}

@router.get("/evaluation")
def get_model_evaluation_report():
    """Returns empirical measured test-set accuracy, precision, and latency metrics."""
    return ai_manager.get_evaluation_metrics()


def chunk_tts_text(text: str, max_chars: int = 110) -> list:
    """Splits long prompts on spaces so each chunk remains within Google TTS character limits."""
    words = text.split()
    chunks = []
    current_words = []
    current_len = 0

    for word in words:
        if len(word) > max_chars:
            if current_words:
                chunks.append(" ".join(current_words))
                current_words = []
                current_len = 0
            chunks.append(word[:max_chars])
            continue

        if current_len + len(word) + 1 > max_chars:
            if current_words:
                chunks.append(" ".join(current_words))
            current_words = [word]
            current_len = len(word)
        else:
            current_words.append(word)
            current_len += len(word) + 1

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks or [text]


@router.get("/tts")
def stream_tts_audio(
    text: str = Query(..., min_length=1, max_length=1000, description="Text prompt to synthesize into voice audio"),
    lang: str = Query("en", description="Language code: 'te' (Telugu), 'hi' (Hindi), or 'en' (English)")
):
    """
    Synthesizes authentic multi-language voice alerts (Telugu, Hindi, English)
    with chunked streaming and disk caching for seamless client playback.
    """
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Empty text provided.")

    lang_code = lang.lower().strip()
    if lang_code in ("te", "te-in"):
        tl = "te"
        clean_text = clean_text.replace("₹", " రూపాయలు ").replace("–", " నుండి ").replace("-", " ").replace("/", " లేదా ")
    elif lang_code in ("hi", "hi-in"):
        tl = "hi"
        clean_text = clean_text.replace("₹", " रुपये ").replace("–", " से ").replace("-", " ").replace("/", " या ")
    else:
        tl = "en"
        clean_text = clean_text.replace("₹", " Rupees ").replace("–", " to ").replace("-", " ").replace("/", " or ")

    clean_text = re.sub(r"\s+", " ", clean_text).strip()

    # Deterministic cache key
    text_hash = hashlib.md5(f"{tl}:{clean_text}".encode("utf-8")).hexdigest()
    cache_file = TTS_CACHE_DIR / f"{tl}_{text_hash}.mp3"

    # Return cached audio if present
    if cache_file.exists() and cache_file.stat().st_size > 500:
        audio_bytes = cache_file.read_bytes()
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=604800, immutable",
                "X-AeroVision-TTS-Cached": "HIT",
                "X-AeroVision-Language": tl
            }
        )

    # Fetch chunked audio from Google TTS service and concatenate MP3 frames
    try:
        chunks = chunk_tts_text(clean_text, max_chars=110)
        combined_audio = bytearray()

        for chunk in chunks:
            encoded_query = urllib.parse.quote(chunk)
            google_tts_url = (
                f"https://translate.google.com/translate_tts?ie=UTF-8&tl={tl}&client=tw-ob&q={encoded_query}"
            )
            req = urllib.request.Request(
                google_tts_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Referer": "https://translate.google.com/"
                }
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status != 200:
                    raise Exception(f"Google TTS returned status {response.status}")
                chunk_bytes = response.read()
                combined_audio.extend(chunk_bytes)

        final_bytes = bytes(combined_audio)
        if len(final_bytes) > 500:
            cache_file.write_bytes(final_bytes)

        return Response(
            content=final_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=604800, immutable",
                "X-AeroVision-TTS-Cached": "MISS",
                "X-AeroVision-Language": tl
            }
        )
    except Exception as e:
        print(f"[TTS GENERATION ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Speech synthesis generation failed: {str(e)}"
        )
