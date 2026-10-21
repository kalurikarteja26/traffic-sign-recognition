from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Vehicle, Challan, DashcamVideo
from backend.schemas import VehicleCreate, VehicleUpdate, VehicleResponse
from backend.auth import get_current_user, log_audit_event

router = APIRouter(prefix="/vehicles", tags=["Vehicle Garage"])

@router.get("", response_model=List[VehicleResponse])
def get_user_vehicles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all vehicles registered in the authenticated user's garage."""
    vehicles = db.query(Vehicle).filter(Vehicle.user_id == current_user.id).order_by(Vehicle.created_at.desc()).all()
    results = []
    for v in vehicles:
        pending_c = db.query(Challan).filter(Challan.vehicle_id == v.id, Challan.status == "pending").all()
        pending_amt = sum(c.amount for c in pending_c)
        v_count = db.query(DashcamVideo).filter(DashcamVideo.vehicle_id == v.id).count()

        resp = VehicleResponse.model_validate(v)
        resp.pending_challans_count = len(pending_c)
        resp.total_challans_amount = pending_amt
        resp.videos_count = v_count
        results.append(resp)
    return results

@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    vehicle_in: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registers a new vehicle in the user's personal garage."""
    reg_clean = vehicle_in.reg_number.strip().upper()
    new_vehicle = Vehicle(
        user_id=current_user.id,
        reg_number=reg_clean,
        nickname=vehicle_in.nickname or f"{vehicle_in.make_model or 'Vehicle'} ({reg_clean})",
        vehicle_type=vehicle_in.vehicle_type,
        make_model=vehicle_in.make_model,
        year=vehicle_in.year,
        fuel_type=vehicle_in.fuel_type,
        color=vehicle_in.color,
        insurance_expiry=vehicle_in.insurance_expiry,
        puc_expiry=vehicle_in.puc_expiry
    )
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    log_audit_event(db, current_user.id, "VEHICLE_ADDED", details=f"Added vehicle {reg_clean}")
    resp = VehicleResponse.model_validate(new_vehicle)
    resp.pending_challans_count = 0
    resp.total_challans_amount = 0.0
    resp.videos_count = 0
    return resp

@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle_detail(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns details and compliance status for a specific vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    pending_c = db.query(Challan).filter(Challan.vehicle_id == vehicle.id, Challan.status == "pending").all()
    resp = VehicleResponse.model_validate(vehicle)
    resp.pending_challans_count = len(pending_c)
    resp.total_challans_amount = sum(c.amount for c in pending_c)
    resp.videos_count = db.query(DashcamVideo).filter(DashcamVideo.vehicle_id == vehicle.id).count()
    return resp

@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    vehicle_update: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates vehicle metadata or nickname."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    update_data = vehicle_update.dict(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(vehicle, field, val)

    db.commit()
    db.refresh(vehicle)
    log_audit_event(db, current_user.id, "VEHICLE_UPDATED", details=f"Updated vehicle {vehicle.reg_number}")
    return get_vehicle_detail(vehicle_id, current_user, db)

@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a vehicle from the user's garage."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    reg = vehicle.reg_number
    db.delete(vehicle)
    db.commit()
    log_audit_event(db, current_user.id, "VEHICLE_DELETED", details=f"Deleted vehicle {reg}")
    return {"message": f"Vehicle {reg} has been removed from your garage."}
