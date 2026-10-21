import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, TrafficRule, QuizQuestion, QuizAttempt
from backend.schemas import (
    TrafficRuleResponse, QuizQuestionResponse,
    QuizSubmit, QuizAttemptResponse
)
from backend.auth import get_current_user, log_audit_event

router = APIRouter(prefix="/rules", tags=["Traffic Rules & Learning Center"])

@router.get("", response_model=List[TrafficRuleResponse])
def get_traffic_rules(
    category: Optional[str] = None,
    risk_tier: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves searchable catalog of 108 Official Indian RTO Traffic Signs."""
    query = db.query(TrafficRule)
    if category and category.lower() != "all":
        query = query.filter(TrafficRule.category.ilike(category))
    if risk_tier and risk_tier.lower() != "all":
        query = query.filter(TrafficRule.risk_tier.ilike(risk_tier))
    if search:
        s = f"%{search}%"
        query = query.filter(
            (TrafficRule.name.ilike(s)) |
            (TrafficRule.required_action.ilike(s)) |
            (TrafficRule.legal_reference.ilike(s))
        )
    rules = query.order_by(TrafficRule.class_id.asc()).all()
    results = []
    for r in rules:
        resp = TrafficRuleResponse.model_validate(r)
        pad = f"{r.class_id:03d}"
        resp.image_url = f"/signs/{pad}.png"
        cat_upper = (r.category or "MANDATORY").upper()
        if "MANDAT" in cat_upper:
            resp.category = "MANDATORY"
            resp.shape = "Octagon" if r.class_id == 0 else ("Inverted Triangle" if r.class_id == 1 else "Circle")
            resp.color_code = "#EF4444"
            resp.sign_code = "IRC67-M01" if r.class_id == 0 else ("IRC67-M02" if r.class_id == 1 else f"IRC67-M{pad}")
            resp.geometry = "900mm Octagonal Substrate" if r.class_id == 0 else ("900mm Inverted Triangle" if r.class_id == 1 else "750mm Circular Disc")
            resp.reflectivity = "Microprismatic Class XI"
            resp.halt = r.required_action or "Mandatory halt or statutory compliance required"
        elif "CAUTION" in cat_upper or "WARN" in cat_upper:
            resp.category = "CAUTIONARY"
            resp.shape = "Triangle"
            resp.color_code = "#F59E0B"
            resp.sign_code = f"IRC67-W{pad}"
            resp.geometry = "900mm Equilateral Triangle"
            resp.reflectivity = "High-Intensity Microprismatic"
            resp.halt = r.required_action or "Reduce velocity and proceed with heightened vigilance"
        else:
            resp.category = "INFORMATORY"
            resp.shape = "Rectangle"
            resp.color_code = "#1D4ED8"
            resp.sign_code = f"IRC67-I{pad}"
            resp.geometry = "600x600mm Square/Rectangular Plaque"
            resp.reflectivity = "Engineering Grade Type II"
            resp.halt = r.required_action or "Informational wayfinding service"
        resp.pitfall = r.mistake_avoidance or f"Failure to observe {r.name} in road conditions."
        results.append(resp)
    return results

@router.get("/mistakes")
def get_mistake_awareness_catalog(db: Session = Depends(get_db)):
    """Returns curated defensive driving mistake awareness guides."""
    rules_with_mistakes = db.query(TrafficRule).filter(TrafficRule.mistake_avoidance.isnot(None)).all()
    catalog = [
        {
            "class_id": r.class_id,
            "sign_name": r.name,
            "category": r.category,
            "risk_tier": r.risk_tier,
            "common_mistake": r.mistake_avoidance,
            "statutory_law": r.legal_reference,
            "penalty_info": r.penalty_info,
            "correct_behavior": r.required_action
        }
        for r in rules_with_mistakes[:15]
    ]
    return catalog

@router.get("/quizzes", response_model=List[QuizQuestionResponse])
def get_quiz_questions(
    category: Optional[str] = None,
    mode: Optional[str] = "learning",
    db: Session = Depends(get_db)
):
    """Returns quiz questions for interactive learning with options, teaching explanations, and rationales."""
    query = db.query(QuizQuestion)
    if category and category.lower() != "all":
        query = query.filter(QuizQuestion.category.ilike(f"%{category}%"))
    questions = query.all()

    resp = []
    for q in questions:
        opts = json.loads(q.options_json) if q.options_json else []
        resp.append(QuizQuestionResponse(
            id=q.id,
            category=q.category,
            question_text=q.question_text,
            options=opts,
            correct_option_index=q.correct_option_index if mode == "learning" else -1,
            explanation=q.explanation if mode == "learning" else "",
            legal_reference=getattr(q, "legal_reference", None) or "Motor Vehicles Act, 1988",
            penalty_info=getattr(q, "penalty_info", None),
            teaching_tip=getattr(q, "teaching_tip", None),
            reference_rule_id=q.reference_rule_id
        ))
    return resp

@router.post("/quizzes/submit")
def submit_quiz(
    submission: QuizSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Evaluates user answers, computes score, updates safety score, and returns explanations."""
    score = 0
    total = len(submission.answers)
    detailed_results = []

    for item in submission.answers:
        qid = item.get("question_id")
        selected_idx = item.get("selected_option")

        q = db.query(QuizQuestion).filter(QuizQuestion.id == qid).first()
        if q:
            is_correct = (selected_idx == q.correct_option_index)
            if is_correct:
                score += 1
            opts = json.loads(q.options_json) if q.options_json else []
            detailed_results.append({
                "question_id": qid,
                "question_text": q.question_text,
                "selected_option_index": selected_idx,
                "correct_option_index": q.correct_option_index,
                "is_correct": is_correct,
                "explanation": q.explanation,
                "options": opts
            })

    pct = round((score / max(1, total)) * 100.0, 1)
    passed = (pct >= 70.0)

    # Record attempt
    attempt = QuizAttempt(
        user_id=current_user.id,
        category=submission.category,
        score=score,
        total_questions=total,
        percentage=pct,
        passed=passed,
        answers_json=json.dumps(submission.answers)
    )
    db.add(attempt)

    # Dynamically update user's safety score
    if passed and current_user.safety_score < 98:
        current_user.safety_score = min(100, current_user.safety_score + 2)
    db.commit()

    log_audit_event(db, current_user.id, "QUIZ_COMPLETED", details=f"Scored {score}/{total} ({pct}%) in {submission.category}")

    return {
        "score": score,
        "total_questions": total,
        "percentage": pct,
        "passed": passed,
        "user_safety_score": current_user.safety_score,
        "detailed_results": detailed_results
    }

@router.get("/quizzes/history", response_model=List[QuizAttemptResponse])
def get_user_quiz_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns the authenticated user's quiz attempt history."""
    return db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.created_at.desc()).all()
