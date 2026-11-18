import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.models import AssistantChatLog, AuditLog, Client, FraudAlert, Invoice, Message, Upload, User
from app.db.session import get_db
from app.core.timeutil import iso_utc, utcnow
from app.services.audit import serialize_activity


router = APIRouter()


@router.get("/users")
def users(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    items = db.query(User).order_by(User.created_at.desc()).all()
    return {"users": [{"id": item.id, "name": item.name, "email": item.email, "role": item.role, "status": item.status, "createdAt": iso_utc(item.created_at)} for item in items]}


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
