from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from firebase_client import get_db
from coordination import append_log
from models import ApprovalCreate, ApprovalResolve

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.post("")
def create_approval(data: ApprovalCreate):
    db = get_db()
    ref = db.collection("approvals").document()
    payload = data.model_dump()
    payload["status"] = "pending"
    payload["requestedAt"] = firestore.SERVER_TIMESTAMP
    ref.set(payload)
    return {"id": ref.id, **data.model_dump(), "status": "pending"}


@router.get("")
def list_approvals(status: str = None):
    db = get_db()
    query = db.collection("approvals").order_by("requestedAt", direction=firestore.Query.DESCENDING)
    docs = query.stream()
    results = [{"id": d.id, **d.to_dict()} for d in docs]
    if status:
        results = [r for r in results if r.get("status") == status]
    return results


@router.patch("/{approval_id}/resolve")
def resolve_approval(approval_id: str, data: ApprovalResolve):
    db = get_db()
    ref = db.collection("approvals").document(approval_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Approval not found")
    if snapshot.to_dict().get("status") != "pending":
        raise HTTPException(status_code=409, detail="Approval has already been resolved")
    ref.update({"status": data.status, "resolvedAt": firestore.SERVER_TIMESTAMP})

    approval = ref.get().to_dict()
    donation_id = approval.get("donationId")
    if donation_id:
        state = "Planning Redistribution" if data.status == "approved" else "Held for Review"
        db.collection("donations").document(donation_id).update({"state": state})
        append_log(
            db,
            donation_id,
            "approval",
            f"Coordinator {data.status} the proposed allocation.",
        )

    return {"id": approval_id, "status": data.status}
