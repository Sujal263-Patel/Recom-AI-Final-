import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.security import hash_password
from app.core.timeutil import iso_utc, utcnow
from app.db.models import (
    AssistantChatLog,
    AuditLog,
    CAProfile,
    Client,
    ClientProfile,
    FraudAlert,
    Invoice,
    Message,
    Upload,
    User,
)
from app.db.session import get_db
from app.services.audit import record_activity, serialize_activity


router = APIRouter()


class UpdateUserStatusPayload(BaseModel):
    status: str


@router.get("/users")
def users(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    items = db.query(User).order_by(User.created_at.desc()).all()
    return {
        "users": [
            {
                "id": item.id,
                "name": item.name,
                "email": item.email,
                "role": item.role,
                "status": item.status,
                "emailVerified": bool(item.email_verified),
                "phone": item.phone or "",
                "firmName": item.firm_name or "",
                "icaiNumber": item.icai_number or "",
                "gstin": item.gstin or "",
                "createdAt": iso_utc(item.created_at),
            }
            for item in items
        ]
    }


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: UpdateUserStatusPayload,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("admin")),
) -> dict:
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_status = payload.status.strip().lower()
    if new_status not in ["active", "inactive", "suspended"]:
        raise HTTPException(status_code=400, detail="Status must be 'active', 'inactive', or 'suspended'.")

    if target_user.id == admin_user.id and new_status != "active":
        raise HTTPException(status_code=400, detail="Cannot deactivate or suspend the logged-in administrator.")

    old_status = target_user.status
    target_user.status = new_status

    record_activity(
        db,
        admin_user,
        "USER_STATUS_UPDATED",
        target_user.email,
        f"Admin changed user status from {old_status} to {new_status} for {target_user.email}",
    )
    db.commit()
    db.refresh(target_user)
    return {
        "message": f"User status successfully updated to {new_status}.",
        "userId": target_user.id,
        "status": target_user.status,
    }


@router.get("/system")
def system(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    return {
        "system": {
            "users": db.query(User).count(),
            "clients": db.query(Client).count(),
            "invoices": db.query(Invoice).count(),
            "alerts": db.query(FraudAlert).count(),
            "uploads": db.query(Upload).count(),
            "messages": db.query(Message).count(),
            "aiChats": db.query(AssistantChatLog).count(),
        }
    }


@router.get("/audit-logs")
def audit_logs(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return {"logs": [serialize_activity(db, item) for item in logs]}


@router.get("/ai-chats")
def ai_chats(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    logs = db.query(AssistantChatLog).order_by(AssistantChatLog.created_at.desc()).limit(200).all()
    result = []
    for c in logs:
        try:
            tools = json.loads(c.tools_used) if c.tools_used else []
        except Exception:
            tools = []
        result.append({
            "id": c.id,
            "userId": c.user_id,
            "userName": c.user_name,
            "userEmail": c.user_email,
            "userRole": c.user_role,
            "question": c.question,
            "answer": c.answer,
            "engine": c.engine,
            "toolsUsed": tools,
            "refused": c.refused,
            "createdAt": iso_utc(c.created_at),
        })
    return {"chats": result}


@router.get("/messages")
def all_messages(clientId: str | None = None, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    query = db.query(Message, Client, User).join(Client, Client.id == Message.client_id).outerjoin(User, User.id == Message.sender_id)
    if clientId and clientId != "ALL":
        query = query.filter(Message.client_id == clientId)
    rows = query.order_by(Message.created_at.desc()).limit(300).all()
    return {
        "messages": [
            {
                "id": msg.id,
                "clientId": msg.client_id,
                "clientName": client.name if client else "",
                "clientGstin": client.gstin if client else "",
                "senderId": msg.sender_id,
                "senderName": sender.name if sender else "Unknown",
                "senderEmail": sender.email if sender else "",
                "senderRole": sender.role if sender else "",
                "text": msg.text,
                "createdAt": iso_utc(msg.created_at),
            }
            for msg, client, sender in rows
        ]
    }


@router.get("/data-overview")
def data_overview(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    clients = db.query(Client).all()
    overview = []
    for c in clients:
        officer = db.get(User, c.ca_id) if c.ca_id else None
        upload_count = db.query(Upload).filter(Upload.client_id == c.id).count()
        invoice_count = db.query(Invoice).filter(Invoice.client_id == c.id).count()
        alert_count = db.query(FraudAlert).filter(FraudAlert.client_id == c.id).count()
        msg_count = db.query(Message).filter(Message.client_id == c.id).count()
        overview.append({
            "id": c.id,
            "name": c.name,
            "gstin": c.gstin,
            "email": c.email,
            "city": c.city,
            "status": c.status,
            "risk": c.risk,
            "compliance": c.compliance,
            "officerName": officer.name if officer else "Unassigned",
            "officerEmail": officer.email if officer else "",
            "officerFirm": officer.firm_name if officer else "",
            "uploadCount": upload_count,
            "invoiceCount": invoice_count,
            "alertCount": alert_count,
            "messageCount": msg_count,
        })
    return {"clients": overview}


class CreateTaxOfficerRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str = ""
    firmName: str = ""
    icaiNumber: str = ""
    city: str = ""
    specialization: str = "GST"
    experience: str = "1+ Years"


class ReassignClientRequest(BaseModel):
    newCaId: str
    reason: str = ""


@router.post("/tax-officers", status_code=201)
def create_tax_officer(
    payload: CreateTaxOfficerRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("admin")),
) -> dict:
    email = payload.email.strip().lower()
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    ca_user = User(
        id=f"usr_{uuid.uuid4().hex[:16]}",
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="ca",
        phone=payload.phone.strip(),
        firm_name=payload.firmName.strip(),
        icai_number=payload.icaiNumber.strip().upper(),
        email_verified=True,
        status="active",
    )
    db.add(ca_user)
    db.flush()

    ca_profile = CAProfile(
        id=f"cap_{uuid.uuid4().hex[:16]}",
        user_id=ca_user.id,
        specialization=payload.specialization.strip() or "GST",
        experience=payload.experience.strip() or "1+ Years",
        city=payload.city.strip(),
        is_verified=True,
    )
    db.add(ca_profile)
    record_activity(
        db,
        admin_user,
        "USER_CREATED",
        ca_user.email,
        f"Admin created Tax Officer {ca_user.name} ({ca_user.email})",
    )
    db.commit()
    db.refresh(ca_user)

    return {
        "message": "Tax Officer created successfully.",
        "taxOfficer": {
            "id": ca_user.id,
            "name": ca_user.name,
            "email": ca_user.email,
            "firmName": ca_user.firm_name,
            "icaiNumber": ca_user.icai_number,
            "city": ca_profile.city,
            "specialization": ca_profile.specialization,
            "status": ca_user.status,
            "createdAt": iso_utc(ca_user.created_at),
        },
    }


@router.put("/clients/{client_id}/reassign")
def reassign_client(
    client_id: str,
    payload: ReassignClientRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("admin")),
) -> dict:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    target_ca = db.get(User, str(payload.newCaId))
    if not target_ca or target_ca.role != "ca" or target_ca.status != "active":
        raise HTTPException(status_code=404, detail="Active Tax Officer not found.")

    previous_ca_id = client.ca_id
    previous_ca = db.get(User, previous_ca_id) if previous_ca_id else None

    client.ca_id = target_ca.id

    client_profiles = (
        db.query(ClientProfile)
        .filter(
            (ClientProfile.user_id == client.id)
            | (
                ClientProfile.user_id.in_(
                    db.query(User.id).filter(User.email == client.email)
                )
            )
        )
        .all()
    )
    for cp in client_profiles:
        cp.selected_ca_id = target_ca.id

    prev_name = previous_ca.name if previous_ca else "Unassigned"
    record_activity(
        db,
        admin_user,
        "CLIENT_REASSIGNED",
        client.name,
        f"Reassigned {client.name} from {prev_name} to {target_ca.name}. {payload.reason}".strip(),
        client_id=client.id,
    )
    db.commit()

    return {
        "message": f"Client successfully reassigned to {target_ca.name}.",
        "client": {
            "id": client.id,
            "name": client.name,
            "gstin": client.gstin,
            "caId": client.ca_id,
            "officerName": target_ca.name,
            "officerEmail": target_ca.email,
        },
    }


@router.get("/tax-officers/workload")
def tax_officers_workload(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> dict:
    cas = (
        db.query(User, CAProfile)
        .outerjoin(CAProfile, CAProfile.user_id == User.id)
        .filter(User.role == "ca", User.status == "active")
        .order_by(User.name)
        .all()
    )
    result = []
    for ca_user, ca_prof in cas:
        clients = db.query(Client).filter(Client.ca_id == ca_user.id).all()
        client_ids = [c.id for c in clients]
        client_count = len(clients)

        invoice_count = (
            db.query(Invoice).filter(Invoice.client_id.in_(client_ids)).count()
            if client_ids
            else 0
        )
        alert_count = (
            db.query(FraudAlert)
            .filter(
                FraudAlert.client_id.in_(client_ids),
                FraudAlert.status == "Open",
            )
            .count()
            if client_ids
            else 0
        )

        if client_count == 0:
            status_label = "Available"
        elif client_count <= 3:
            status_label = "Light"
        elif client_count <= 8:
            status_label = "Optimal"
        else:
            status_label = "Heavy"

        result.append(
            {
                "id": ca_user.id,
                "name": ca_user.name,
                "email": ca_user.email,
                "firmName": ca_user.firm_name,
                "icaiNumber": ca_user.icai_number,
                "city": ca_prof.city if ca_prof else "",
                "specialization": ca_prof.specialization if ca_prof else "GST",
                "clientCount": client_count,
                "invoiceCount": invoice_count,
                "openAlertCount": alert_count,
                "workloadStatus": status_label,
                "clients": [
                    {"id": c.id, "name": c.name, "gstin": c.gstin}
                    for c in clients
                ],
            }
        )

    return {"taxOfficers": result}
