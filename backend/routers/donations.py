from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from firebase_client import get_db
from models import DonationCreate, DonationStateUpdate, AllocationUpdate, AgentLogEntry

router = APIRouter(prefix="/donations", tags=["donations"])


@router.post("")
def create_donation(data: DonationCreate):
    db = get_db()
    doc_ref = db.collection("donations").document()
    payload = data.model_dump()
    payload["createdAt"] = firestore.SERVER_TIMESTAMP
    payload["state"] = "Submitted"
    doc_ref.set(payload)
    return {"id": doc_ref.id, **payload}


@router.get("")
def list_donations():
    db = get_db()
    docs = db.collection("donations").order_by("createdAt", direction=firestore.Query.DESCENDING).stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


@router.get("/{donation_id}")
def get_donation(donation_id: str):
    db = get_db()
    doc = db.collection("donations").document(donation_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Donation not found")
    return {"id": doc.id, **doc.to_dict()}


@router.patch("/{donation_id}/state")
def update_state(donation_id: str, data: DonationStateUpdate):
    db = get_db()
    ref = db.collection("donations").document(donation_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Donation not found")
    ref.update({"state": data.state})
    return {"id": donation_id, "state": data.state}


@router.patch("/{donation_id}/allocation")
def update_allocation(donation_id: str, data: AllocationUpdate):
    db = get_db()
    ref = db.collection("donations").document(donation_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Donation not found")
    ref.update({"allocation": [a.model_dump() for a in data.allocation]})
    return {"id": donation_id, "allocation": data.allocation}


@router.delete("/{donation_id}")
def delete_donation(donation_id: str):
    db = get_db()
    db.collection("donations").document(donation_id).delete()
    return {"deleted": donation_id}


# ── Agent logs ─────────────────────────────────────────────

@router.post("/{donation_id}/logs")
def append_log(donation_id: str, entry: AgentLogEntry):
    db = get_db()
    log_ref = db.collection("donations").document(donation_id).collection("agentLogs").document()
    log_ref.set({**entry.model_dump(), "time": firestore.SERVER_TIMESTAMP})
    return {"id": log_ref.id, **entry.model_dump()}


@router.get("/{donation_id}/logs")
def get_logs(donation_id: str):
    db = get_db()
    docs = (
        db.collection("donations").document(donation_id)
        .collection("agentLogs")
        .order_by("time")
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


# ── Recipient responses ────────────────────────────────────

@router.post("/{donation_id}/responses")
def add_response(donation_id: str, recipientId: str, action: str):
    db = get_db()
    ref = db.collection("donations").document(donation_id).collection("recipientResponses").document()
    ref.set({"recipientId": recipientId, "action": action, "respondedAt": firestore.SERVER_TIMESTAMP})
    return {"id": ref.id, "recipientId": recipientId, "action": action}
