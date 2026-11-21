import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import ensure_client_scope, get_current_user, scoped_client_ids
from app.db.models import Message, User
from app.db.session import get_db
from app.core.timeutil import iso_utc, utcnow


router = APIRouter()


class MessageRequest(BaseModel):
    clientId: str | int
    text: str


class MarkReadRequest(BaseModel):
    clientId: str | int


def serialize_message(message: Message) -> dict:
    return {
        "id": message.id,
        "clientId": message.client_id,
        "senderId": message.sender_id,
        "senderName": message.sender.name if message.sender else "",
        "senderRole": message.sender.role if message.sender else "",
        "text": message.text,
        "isRead": bool(message.is_read),
        "createdAt": iso_utc(message.created_at),
    }


def resolve_client_id(db: Session, user: User, requested_client_id: str | int) -> str:
    client_ids = scoped_client_ids(db, user)
    req_str = str(requested_client_id)
    if req_str in client_ids:
        return req_str
    if user.role == "client" and client_ids:
        return client_ids[0]
    ensure_client_scope(db, user, req_str)
    return req_str


@router.get("")
def list_messages(
    clientId: str,
    markRead: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    resolved_client_id = resolve_client_id(db, user, clientId)
    messages = db.query(Message).filter(Message.client_id == resolved_client_id).order_by(Message.created_at).all()

    if markRead:
        unread_incoming = [m for m in messages if m.sender_id != user.id and not m.is_read]
        if unread_incoming:
            for m in unread_incoming:
                m.is_read = True
            db.commit()

    return {"messages": [serialize_message(message) for message in messages]}


@router.get("/unread-counts")
def unread_counts(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    client_ids = scoped_client_ids(db, user)
    if not client_ids:
        return {"totalUnread": 0, "byClient": {}}

    unread_messages = (
        db.query(Message.client_id)
        .filter(
            Message.client_id.in_(client_ids),
            Message.sender_id != user.id,
            Message.is_read == False,
        )
        .all()
    )

    by_client: dict[str, int] = {}
    for (cid,) in unread_messages:
        cid_str = str(cid)
        by_client[cid_str] = by_client.get(cid_str, 0) + 1

    total_unread = len(unread_messages)
    return {"totalUnread": total_unread, "byClient": by_client}


@router.put("/read")
def mark_messages_read(
    payload: MarkReadRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    resolved_client_id = resolve_client_id(db, user, payload.clientId)
    unread_messages = (
        db.query(Message)
        .filter(
            Message.client_id == resolved_client_id,
            Message.sender_id != user.id,
            Message.is_read == False,
        )
        .all()
    )
    for m in unread_messages:
        m.is_read = True
    db.commit()
    return {"message": "Messages marked as read.", "count": len(unread_messages)}


@router.post("", status_code=201)
def create_message(payload: MessageRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    client_id = resolve_client_id(db, user, payload.clientId)
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Message text is required.")
    message = Message(
        id=f"msg_{uuid.uuid4().hex[:16]}",
        client_id=client_id,
        sender_id=user.id,
        text=payload.text.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return {"message": serialize_message(message)}
