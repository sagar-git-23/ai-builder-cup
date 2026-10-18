from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from firebase_client import get_db
from models import RecipientCreate

router = APIRouter(prefix="/recipients", tags=["recipients"])


@router.post("")
def create_recipient(data: RecipientCreate):
    db = get_db()
    ref = db.collection("recipients").document()
    payload = data.model_dump()
    payload["createdAt"] = firestore.SERVER_TIMESTAMP
    ref.set(payload)
    return {"id": ref.id, **payload}


@router.get("")
def list_recipients():
    db = get_db()
    docs = db.collection("recipients").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


@router.get("/{recipient_id}")
def get_recipient(recipient_id: str):
    db = get_db()
    doc = db.collection("recipients").document(recipient_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Recipient not found")
    return {"id": doc.id, **doc.to_dict()}


@router.get("/match/{donation_id}")
def match_recipients(donation_id: str):
    """Find recipients that can accept a given donation based on category and capacity."""
    db = get_db()
    donation = db.collection("donations").document(donation_id).get()
    if not donation.exists:
        raise HTTPException(status_code=404, detail="Donation not found")

    d = donation.to_dict()
    category = d.get("category", "")
    quantity = float(d.get("quantity", 0))

    all_recipients = db.collection("recipients").stream()
    matches = []
    for r in all_recipients:
        data = r.to_dict()
        accepts = data.get("accepts", [])
        capacity = float(data.get("capacity", 0))
        same_unit = str(data.get("capacityUnit", "")).casefold() == str(d.get("unit", "")).casefold()
        if category in accepts and same_unit and capacity >= quantity and data.get("address"):
            matches.append({"id": r.id, **data})

    return matches


@router.delete("/{recipient_id}")
def delete_recipient(recipient_id: str):
    db = get_db()
    db.collection("recipients").document(recipient_id).delete()
    return {"deleted": recipient_id}
