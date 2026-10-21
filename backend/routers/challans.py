from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Vehicle, Challan
from backend.schemas import ChallanCreate, ChallanUpdate, ChallanResponse
from backend.auth import get_current_user, log_audit_event
from backend.storage import validate_and_save_challan_doc

router = APIRouter(prefix="/challans", tags=["Challan & Traffic-Violation Center"])

INDIAN_REGIONS = [
    {
        "id": "telangana",
        "name": "Telangana",
        "code": "TS",
        "plate_prefix": "TS",
        "portal_name": "Telangana State Police Integrated e-Challan System",
        "portal_url": "https://echallan.tspolice.gov.in/",
        "alt_portal_url": "https://echallan.parivahan.gov.in/",
        "description": "Comprehensive statewide online challan enquiry and settlement system for Hyderabad, Cyberabad, Rachakonda, Warangal, and all TS district police commissionerates.",
        "search_hint": "Enter vehicle registration number (e.g. TS09EA4020) and solve simple captcha. No login or password required.",
        "features": [
            "Real-time ANPR & Speed Gun CCTV photo inspection",
            "Fine concession / discount drives (Lok Adalat)",
            "Instant payment receipt generation",
            "Payment via TSOnline, MeeSeva, UPI & NetBanking"
        ],
        "helpline": "040-27852482",
        "badge_color": "cyan"
    },
    {
        "id": "andhra_pradesh",
        "name": "Andhra Pradesh",
        "code": "AP",
        "plate_prefix": "AP",
        "portal_name": "Andhra Pradesh Transport & Parivahan e-Challan",
        "portal_url": "https://echallan.parivahan.gov.in/",
        "alt_portal_url": "https://www.aptransport.org/",
        "description": "Andhra Pradesh citations (Vijayawada, Visakhapatnam, Guntur, and State Highways) are officially unified through the Central MoRTH Parivahan and AP Transport citizen portals.",
        "search_hint": "Enter Vehicle Registration Number or Driving Licence (DL) Number with Chassis/Engine digits or Mobile OTP.",
        "features": [
            "AP Police & Transport integrated violation database",
            "MoRTH National Registry fast settlement",
            "APTransport.org citizen services"
        ],
        "helpline": "0863-2340500 / 0120-2459169",
        "badge_color": "emerald"
    },
    {
        "id": "karnataka",
        "name": "Karnataka",
        "code": "KA",
        "plate_prefix": "KA",
        "portal_name": "Bangalore Traffic Police (BTP) & Karnataka One",
        "portal_url": "https://karnatakaone.gov.in/",
        "alt_portal_url": "https://echallan.parivahan.gov.in/",
        "description": "Smart CCTV surveillance and e-challan system for Bengaluru City, Mysore, and Karnataka State Police via Karnataka One and Parivahan.",
        "search_hint": "Search by Vehicle Registration Number or Notice Number on Karnataka One or Parivahan portal.",
        "features": [
            "BTP Intelligent Traffic Management System (ITMS)",
            "Bangalore One / Karnataka One payment gateway",
            "MoRTH Pan-India Parivahan sync"
        ],
        "helpline": "080-22943030",
        "badge_color": "amber"
    },
    {
        "id": "maharashtra",
        "name": "Maharashtra",
        "code": "MH",
        "plate_prefix": "MH",
        "portal_name": "Maharashtra State Traffic Police (MahaTraffic)",
        "portal_url": "https://mahatrafficechallan.gov.in/",
        "alt_portal_url": "https://echallan.parivahan.gov.in/",
        "description": "Unified traffic portal covering Mumbai Traffic Police (MTP), Pune City, Mumbai-Pune Expressway, and Maharashtra highways.",
        "search_hint": "Enter Vehicle Registration Number + last 4 digits of Engine/Chassis Number.",
        "features": [
            "Mumbai Traffic Police automated CCTV challans",
            "Grievance filing & dispute lodging online",
            "Virtual Court integration"
        ],
        "helpline": "022-24937747",
        "badge_color": "blue"
    },
    {
        "id": "delhi",
        "name": "Delhi (NCT)",
        "code": "DL",
        "plate_prefix": "DL",
        "portal_name": "Delhi Traffic Police Notice & e-Challan Portal",
        "portal_url": "https://traffic.delhipolice.gov.in/echallan",
        "alt_portal_url": "https://echallan.parivahan.gov.in/",
        "description": "Automated RLVD (Red Light Violation Detection) and OSVD (Over Speed Violation Detection) system for the National Capital.",
        "search_hint": "Search with Vehicle Number or Notice Number. Links to Virtual Court for compound notices.",
        "features": [
            "Delhi Police camera photo & video evidence",
            "Virtual Court Delhi dispute adjudication",
            "Delhi Police Tatkal online disposal"
        ],
        "helpline": "011-25844444",
        "badge_color": "purple"
    },
    {
        "id": "tamil_nadu",
        "name": "Tamil Nadu",
        "code": "TN",
        "plate_prefix": "TN",
        "portal_name": "Tamil Nadu Traffic Police & Parivahan e-Challan",
        "portal_url": "https://echallan.parivahan.gov.in/",
        "alt_portal_url": "https://eservices.tnpolice.gov.in/",
        "description": "Official automated camera enforcement for Greater Chennai Traffic Police (GCTP), Coimbatore, Madurai, and Tamil Nadu Highway Patrol.",
        "search_hint": "Query using Vehicle Registration Number on the Parivahan or TN Police e-Services portal.",
        "features": [
            "GCTP contactless automated notices",
            "TN Police e-Services portal integration",
            "Parivahan unified payment"
        ],
        "helpline": "044-23452330 / 0120-2459169",
        "badge_color": "rose"
    },
    {
        "id": "gujarat",
        "name": "Gujarat",
        "code": "GJ",
        "plate_prefix": "GJ",
        "portal_name": "Gujarat State Police e-Challan Payment Portal",
        "portal_url": "https://echallanpayment.gujarat.gov.in/",
        "alt_portal_url": "https://echallan.parivahan.gov.in/",
        "description": "Official Gujarat State Traffic e-Challan payment and verification system covering Ahmedabad City, Surat, Vadodara, Rajkot, and State Highways.",
        "search_hint": "Enter Vehicle Registration Number (e.g. GJ01AB1234) to query automated camera violation notices.",
        "features": [
            "Official Gujarat State online payment gateway",
            "Real-time ANPR red light surveillance",
            "Parivahan national sync"
        ],
        "helpline": "079-25630100",
        "badge_color": "yellow"
    },
    {
        "id": "uttar_pradesh",
        "name": "Uttar Pradesh",
        "code": "UP",
        "plate_prefix": "UP",
        "portal_name": "UP Police Traffic Directorate & Parivahan",
        "portal_url": "https://echallan.parivahan.gov.in/",
        "alt_portal_url": "https://traffic.uppolice.gov.in/",
        "description": "Covers Noida, Greater Noida, Lucknow, Yamuna Expressway, and UP State traffic surveillance.",
        "search_hint": "Query by Vehicle Number on Parivahan MoRTH gateway or UP Traffic portal.",
        "features": [
            "Expressway speed trap detection",
            "UP Virtual Court linkage",
            "Integrated grievance escalation"
        ],
        "helpline": "0522-2208535 / 0120-2459169",
        "badge_color": "indigo"
    },
    {
        "id": "kerala",
        "name": "Kerala",
        "code": "KL",
        "plate_prefix": "KL",
        "portal_name": "Kerala Police & MVD Suraksha Portal",
        "portal_url": "https://echallan.parivahan.gov.in/",
        "alt_portal_url": "https://keralapolice.gov.in/",
        "description": "Fully automated AI Camera road safety project covering automated camera checkpoints across Kerala via Parivahan.",
        "search_hint": "Search by Vehicle Registration Number on Parivahan to view AI camera captures and compound fines.",
        "features": [
            "AI Camera helmet, seatbelt & phone detection",
            "MVD Kerala dispute redressal",
            "Parivahan instant clearance"
        ],
        "helpline": "0471-2318870",
        "badge_color": "teal"
    },
    {
        "id": "west_bengal",
        "name": "West Bengal",
        "code": "WB",
        "plate_prefix": "WB",
        "portal_name": "Kolkata Traffic Police & Parivahan",
        "portal_url": "https://echallan.parivahan.gov.in/",
        "alt_portal_url": "https://kolkatatrafficpolice.net/",
        "description": "Kolkata City Traffic Police and West Bengal Motor Vehicles enforcement.",
        "search_hint": "Enter Registration Number on Parivahan or Kolkata Traffic portal.",
        "features": [
            "Kolkata Traffic camera proof lookup",
            "GRIPS government receipt validation",
            "Fastag toll plaza blacklist clearing"
        ],
        "helpline": "033-22143644",
        "badge_color": "emerald"
    },
    {
        "id": "all_india",
        "name": "All-India / Central",
        "code": "IN",
        "plate_prefix": "",
        "portal_name": "MoRTH Parivahan Digital e-Challan",
        "portal_url": "https://echallan.parivahan.gov.in/",
        "alt_portal_url": "https://parivahan.gov.in/",
        "description": "Ministry of Road Transport & Highways centralized pan-India database covering 36 States & Union Territories.",
        "search_hint": "Query using Challan Number, Vehicle Registration Number, or Driving Licence (DL) Number with mobile OTP.",
        "features": [
            "Pan-India National Highway (NHAI) speed violations",
            "Vahan & Sarathi national registry synchronization",
            "Virtual Court dispute arbitration linkage"
        ],
        "helpline": "0120-2459169",
        "badge_color": "cyan"
    }
]

@router.get("", response_model=List[ChallanResponse])
def get_challans(
    status_filter: Optional[str] = None,
    state_filter: Optional[str] = None,
    vehicle_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves challans associated with user's vehicles or all platform fleet notices for administrators."""
    if current_user.role == "admin" and not vehicle_id:
        query = db.query(Challan)
    else:
        query = db.query(Challan).filter(Challan.user_id == current_user.id)

    if status_filter and status_filter.lower() != "all":
        query = query.filter(Challan.status == status_filter.lower())
    if state_filter and state_filter.lower() not in ["all", "all-india", "all_india"]:
        query = query.filter(Challan.state.ilike(f"%{state_filter}%"))
    if vehicle_id:
        query = query.filter(Challan.vehicle_id == vehicle_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Challan.challan_number.ilike(search_fmt)) |
            (Challan.violation_type.ilike(search_fmt)) |
            (Challan.issuing_authority.ilike(search_fmt)) |
            (Challan.state.ilike(search_fmt))
        )

    challans = query.order_by(Challan.created_at.desc()).all()
    results = []
    for c in challans:
        resp = ChallanResponse.model_validate(c)
        if c.vehicle:
            resp.vehicle_reg = c.vehicle.reg_number
        results.append(resp)
    return results

@router.get("/regions")
def get_challan_regions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns directory of Indian State & Regional e-Challan portals (e.g., Telangana TS Police, AP Police, BTP Karnataka, MahaTraffic, etc.)
    with real-time notice counts and deep-link query URLs.
    """
    if current_user.role == "admin":
        all_challans = db.query(Challan).all()
        user_vehicles = db.query(Vehicle).all()
    else:
        all_challans = db.query(Challan).filter(Challan.user_id == current_user.id).all()
        user_vehicles = db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()
    primary_reg = user_vehicles[0].reg_number if user_vehicles else "TS09EA4020"

    regions_data = []
    for reg in INDIAN_REGIONS:
        if reg["id"] == "all_india":
            matching = all_challans
        else:
            matching = [c for c in all_challans if c.state and reg["name"].lower() in c.state.lower()]

        pending = [c for c in matching if c.status == "pending"]
        paid = [c for c in matching if c.status == "paid"]
        disputed = [c for c in matching if c.status == "disputed"]

        regions_data.append({
            **reg,
            "total_notices": len(matching),
            "pending_count": len(pending),
            "pending_amount": sum(c.amount for c in pending),
            "paid_count": len(paid),
            "disputed_count": len(disputed),
            "sample_vehicle_reg": primary_reg,
            "direct_lookup_url": reg["portal_url"]
        })

    return regions_data

@router.post("/seed-examples")
def seed_user_example_challans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates a rich suite of realistic Indian state e-Challan examples for the authenticated user."""
    # Find or create a primary vehicle for user
    vehicle = db.query(Vehicle).filter(Vehicle.user_id == current_user.id).first()
    if not vehicle:
        vehicle = Vehicle(
            user_id=current_user.id,
            reg_number="TS-09-EA-4020" if current_user.role == "admin" else "KA-01-MJ-2024",
            nickname="Primary Vehicle",
            vehicle_type="4-Wheeler Car",
            make_model="Tata Harrier Dark Edition" if current_user.role == "admin" else "Hyundai Creta SX(O)",
            year=2024,
            fuel_type="Petrol",
            color="Obsidian Black",
            insurance_expiry="2027-04-15",
            puc_expiry="2026-11-20"
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)

    # Add 4 diverse real-world Indian examples
    samples = [
        Challan(
            user_id=current_user.id,
            vehicle_id=vehicle.id,
            challan_number=f"CH-TS-CYB-2026-{db.query(Challan).count() + 101}",
            violation_type="Speed Limit Violation (> 95 km/h on Outer Ring Road, Gachibowli - Sec 112/183)",
            amount=1000.0,
            violation_date="2026-10-18",
            due_date="2026-11-25",
            issuing_authority="Telangana State Police (Cyberabad)",
            state="Telangana",
            status="pending",
            payment_url="https://echallan.tspolice.gov.in/",
            source="webhook",
            notes="ANPR Speed Camera capture at Exit 19, Gachibowli, Hyderabad. Registered speed: 96 km/h in 80 km/h zone."
        ),
        Challan(
            user_id=current_user.id,
            vehicle_id=vehicle.id,
            challan_number=f"CH-DEL-2026-{db.query(Challan).count() + 102}",
            violation_type="Stop Line & Zebra Crossing Infringement (Sec 119/177)",
            amount=500.0,
            violation_date="2026-10-12",
            due_date="2026-11-30",
            issuing_authority="Delhi Traffic Police",
            state="Delhi",
            status="disputed",
            payment_url="https://traffic.delhipolice.gov.in/echallan",
            source="camera_notice",
            notes="Automated AI Dispute filed: Dashcam telemetry confirms vehicle halted 0.8m behind line before sensor trip."
        ),
        Challan(
            user_id=current_user.id,
            vehicle_id=vehicle.id,
            challan_number=f"CH-KA-BTP-2026-{db.query(Challan).count() + 103}",
            violation_type="Unauthorized Entry into Dedicated Bus Priority Lane (Sec 115/177)",
            amount=1000.0,
            violation_date="2026-09-30",
            due_date="2026-10-25",
            issuing_authority="Bengaluru Traffic Police (BTP)",
            state="Karnataka",
            status="paid",
            payment_url="https://karnatakaone.gov.in/",
            source="webhook",
            notes="Settled online via Karnataka One / BTP portal on Oct 02."
        ),
        Challan(
            user_id=current_user.id,
            vehicle_id=vehicle.id,
            challan_number=f"CH-MH-MUM-2026-{db.query(Challan).count() + 104}",
            violation_type="Dangerous Driving / Unsafe Lane Cutting on Expressway (Sec 184)",
            amount=1500.0,
            violation_date="2026-10-08",
            due_date="2026-11-20",
            issuing_authority="Maharashtra State Traffic Police (MahaTraffic)",
            state="Maharashtra",
            status="pending",
            payment_url="https://mahatrafficechallan.gov.in/",
            source="camera_notice",
            notes="Camera notice triggered during high-speed overtaking maneuver on Mumbai-Pune Expressway km 42."
        )
    ]
    db.add_all(samples)
    db.commit()
    return {"status": "success", "message": f"Seeded {len(samples)} realistic Indian traffic violation notices!"}

@router.get("/summary")
def get_challans_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns total pending fine amount, status counts, and violation breakdown."""
    all_challans = db.query(Challan).filter(Challan.user_id == current_user.id).all()
    pending = [c for c in all_challans if c.status == "pending"]
    paid = [c for c in all_challans if c.status == "paid"]
    disputed = [c for c in all_challans if c.status == "disputed"]

    total_pending_amount = sum(c.amount for c in pending)
    total_paid_amount = sum(c.amount for c in paid)

    # Breakdown by violation type
    breakdown = {}
    state_breakdown = {}
    for c in all_challans:
        breakdown[c.violation_type] = breakdown.get(c.violation_type, 0) + 1
        st = c.state or "Telangana"
        state_breakdown[st] = state_breakdown.get(st, 0) + 1

    return {
        "total_challans_count": len(all_challans),
        "pending_count": len(pending),
        "paid_count": len(paid),
        "disputed_count": len(disputed),
        "total_pending_amount": total_pending_amount,
        "total_paid_amount": total_paid_amount,
        "violation_breakdown": breakdown,
        "state_breakdown": state_breakdown,
        "official_verification_url": "https://echallan.parivahan.gov.in/",
        "telangana_verification_url": "https://echallan.tspolice.gov.in/"
    }

@router.post("", response_model=ChallanResponse, status_code=status.HTTP_201_CREATED)
def create_challan(
    challan_in: ChallanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually records a challan associated with a registered vehicle."""
    detected_state = challan_in.state or "Telangana"
    if challan_in.vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.id == challan_in.vehicle_id, Vehicle.user_id == current_user.id).first()
        if not v:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in your garage.")
        # Auto-detect state from plate if not explicitly chosen
        if not challan_in.state or challan_in.state == "Telangana":
            if v.reg_number.startswith("TS"):
                detected_state = "Telangana"
            elif v.reg_number.startswith("AP"):
                detected_state = "Andhra Pradesh"
            elif v.reg_number.startswith("KA"):
                detected_state = "Karnataka"
            elif v.reg_number.startswith("DL"):
                detected_state = "Delhi"
            elif v.reg_number.startswith("MH"):
                detected_state = "Maharashtra"
            elif v.reg_number.startswith("TN"):
                detected_state = "Tamil Nadu"
            elif v.reg_number.startswith("UP"):
                detected_state = "Uttar Pradesh"
            elif v.reg_number.startswith("GJ"):
                detected_state = "Gujarat"

    # Default portal URL based on state
    payment_url = challan_in.payment_url
    if not payment_url or "parivahan" in payment_url:
        if detected_state.lower() == "telangana":
            payment_url = "https://echallan.tspolice.gov.in/"
        elif detected_state.lower() == "andhra pradesh":
            payment_url = "https://echallan.appolice.gov.in/"
        elif detected_state.lower() == "maharashtra":
            payment_url = "https://mahatrafficechallan.gov.in/"
        else:
            payment_url = "https://echallan.parivahan.gov.in/"

    new_challan = Challan(
        user_id=current_user.id,
        vehicle_id=challan_in.vehicle_id,
        challan_number=challan_in.challan_number.strip().upper(),
        violation_type=challan_in.violation_type,
        amount=challan_in.amount,
        violation_date=challan_in.violation_date,
        due_date=challan_in.due_date,
        issuing_authority=challan_in.issuing_authority,
        state=detected_state,
        status=challan_in.status,
        payment_url=payment_url,
        source="manual_entry",
        notes=challan_in.notes
    )
    db.add(new_challan)
    db.commit()
    db.refresh(new_challan)

    log_audit_event(db, current_user.id, "CHALLAN_CREATED", details=f"Created challan {new_challan.challan_number} [{detected_state}]")
    resp = ChallanResponse.model_validate(new_challan)
    if new_challan.vehicle:
        resp.vehicle_reg = new_challan.vehicle.reg_number
    return resp

@router.post("/upload", response_model=ChallanResponse)
def upload_challan_document(
    file: UploadFile = File(...),
    challan_number: str = Form(...),
    violation_type: str = Form(...),
    amount: float = Form(500.0),
    violation_date: str = Form(...),
    vehicle_id: Optional[int] = Form(None),
    issuing_authority: str = Form("State Traffic Police"),
    state: Optional[str] = Form("Telangana"),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploads a challan notice/receipt and creates an entry with document attachment."""
    safe_name, abs_path = validate_and_save_challan_doc(file, current_user.id)

    payment_url = "https://echallan.parivahan.gov.in/"
    if state and state.lower() == "telangana":
        payment_url = "https://echallan.tspolice.gov.in/"
    elif state and state.lower() == "andhra pradesh":
        payment_url = "https://echallan.appolice.gov.in/"

    new_challan = Challan(
        user_id=current_user.id,
        vehicle_id=vehicle_id,
        challan_number=challan_number.strip().upper(),
        violation_type=violation_type,
        amount=amount,
        violation_date=violation_date,
        issuing_authority=issuing_authority,
        state=state or "Telangana",
        status="pending",
        payment_url=payment_url,
        document_path=safe_name,
        source="document_upload",
        notes=notes
    )
    db.add(new_challan)
    db.commit()
    db.refresh(new_challan)

    log_audit_event(db, current_user.id, "CHALLAN_UPLOADED", details=f"Uploaded challan document for {challan_number}")
    resp = ChallanResponse.model_validate(new_challan)
    if new_challan.vehicle:
        resp.vehicle_reg = new_challan.vehicle.reg_number
    return resp

@router.put("/{challan_id}", response_model=ChallanResponse)
def update_challan(
    challan_id: int,
    challan_update: ChallanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates challan payment status (mark paid, dispute), region, or notes."""
    challan = db.query(Challan).filter(Challan.id == challan_id, Challan.user_id == current_user.id).first()
    if not challan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challan record not found.")

    if challan_update.status is not None:
        challan.status = challan_update.status
    if challan_update.amount is not None:
        challan.amount = challan_update.amount
    if challan_update.notes is not None:
        challan.notes = challan_update.notes
    if challan_update.state is not None:
        challan.state = challan_update.state

    db.commit()
    db.refresh(challan)
    log_audit_event(db, current_user.id, "CHALLAN_UPDATED", details=f"Updated status of challan {challan.challan_number} to {challan.status}")

    resp = ChallanResponse.model_validate(challan)
    if challan.vehicle:
        resp.vehicle_reg = challan.vehicle.reg_number
    return resp

@router.delete("/{challan_id}")
def delete_challan(
    challan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Removes a challan entry from user's records."""
    challan = db.query(Challan).filter(Challan.id == challan_id, Challan.user_id == current_user.id).first()
    if not challan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challan record not found.")

    num = challan.challan_number
    db.delete(challan)
    db.commit()
    log_audit_event(db, current_user.id, "CHALLAN_DELETED", details=f"Deleted challan {num}")
    return {"message": f"Challan record {num} has been removed."}
