from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from firebase_client import get_db
from coordination import append_log, coordinate_donation, replan_after_decline
from models import (
    AllocationUpdate,
    AgentLogEntry,
    DonationCreate,
    DonationState,
    DonationStateUpdate,
    RecipientResponse,
)

router = APIRouter(prefix="/donations", tags=["donations"])


@router.post("")
def create_donation(data: DonationCreate):
    db = get_db()
    payload = data.model_dump(exclude={"missingFields"})
    payload.pop("category", None)
    payload.update({
        "createdAt": firestore.SERVER_TIMESTAMP,
        "state": "Submitted",
        "allocation": [],
        "missingFields": [],
    })
    doc_ref = db.collection("donations").document()
    doc_ref.set(payload)
    state = coordinate_donation(db, doc_ref.id, {**payload, "createdAt": None})
    return {"id": doc_ref.id, "state": state}


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


@router.post("/{donation_id}/coordinate")
def retry_coordination(donation_id: str):
    db = get_db()
    ref = db.collection("donations").document(donation_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Donation not found")
    donation = doc.to_dict()
    declined = next(
        (item for item in donation.get("allocation", []) if item.get("status") == "declined"),
        None,
    )
    if declined:
        state = replan_after_decline(
            db,
            donation_id,
            donation,
            donation.get("allocation", []),
            declined["recipientId"],
        )
    else:
        state = coordinate_donation(db, donation_id, donation)
    return {"id": donation_id, "state": state}


@router.patch("/{donation_id}/state")
def update_state(donation_id: str, data: DonationStateUpdate):
    if data.state == DonationState.VERIFIED:
        raise HTTPException(status_code=409, detail="Handoff is verified only after all pickup jobs complete")
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
    ref.update({"allocation": [item.model_dump() for item in data.allocation]})
    return {"id": donation_id, "allocation": data.allocation}


@router.delete("/{donation_id}")
def delete_donation(donation_id: str):
    db = get_db()
    db.collection("donations").document(donation_id).delete()
    return {"deleted": donation_id}


@router.post("/{donation_id}/logs")
def append_agent_log(donation_id: str, entry: AgentLogEntry):
    db = get_db()
    if not db.collection("donations").document(donation_id).get().exists:
        raise HTTPException(status_code=404, detail="Donation not found")
    log_ref = db.collection("donations").document(donation_id).collection("agentLogs").document()
    log_ref.set({**entry.model_dump(), "time": firestore.SERVER_TIMESTAMP})
    return {"id": log_ref.id, **entry.model_dump()}


@router.get("/{donation_id}/logs")
def get_agent_logs(donation_id: str):
    db = get_db()
    docs = (
        db.collection("donations").document(donation_id)
        .collection("agentLogs")
        .order_by("time")
        .stream()
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/{donation_id}/responses")
def add_response(donation_id: str, data: RecipientResponse):
    db = get_db()
    ref = db.collection("donations").document(donation_id)
    donation_snapshot = ref.get()
    if not donation_snapshot.exists:
        raise HTTPException(status_code=404, detail="Donation not found")

    donation = donation_snapshot.to_dict()
    if donation.get("state") not in {"Planning Redistribution", "Coordinating Pickup"}:
        raise HTTPException(status_code=409, detail="Donation is not accepting recipient responses")

    if data.action == "accepted":
        recipient_snapshot = db.collection("recipients").document(data.recipientId).get()
        recipient = recipient_snapshot.to_dict() if recipient_snapshot.exists else None
        if not recipient or not recipient.get("address") or not donation.get("pickupAddress"):
            raise HTTPException(status_code=409, detail="Pickup and dropoff addresses are required before a job can be created")

        job_ref = db.collection("pickupJobs").document(f"{donation_id}_{data.recipientId}")
        @firestore.transactional
        def accept_allocation(transaction):
            current_snapshot = transaction.get(ref)
            if not current_snapshot.exists:
                raise HTTPException(status_code=404, detail="Donation not found")
            current = current_snapshot.to_dict()
            if current.get("state") not in {"Planning Redistribution", "Coordinating Pickup"}:
                raise HTTPException(status_code=409, detail="Donation is not accepting recipient responses")
            current_allocation = current.get("allocation", [])
            current_index = next(
                (index for index, item in enumerate(current_allocation) if item.get("recipientId") == data.recipientId),
                None,
            )
            if current_index is None:
                raise HTTPException(status_code=404, detail="No allocation for this recipient")
            if current_allocation[current_index].get("status") != "pending":
                raise HTTPException(status_code=409, detail="This allocation has already been answered")

            accepted_quantity = current_allocation[current_index]["quantity"]
            current_allocation[current_index]["status"] = "accepted"
            current_allocation[current_index]["jobId"] = job_ref.id
            transaction.update(ref, {"allocation": current_allocation, "state": "Coordinating Pickup"})
            transaction.set(job_ref, {
                "donationId": donation_id,
                "recipientId": data.recipientId,
                "food": current["food"],
                "quantity": f"{accepted_quantity} {current['unit']}",
                "pickupName": current.get("donorName") or "Donor",
                "pickupAddress": current["pickupAddress"],
                "dropoffName": recipient["name"],
                "dropoffAddress": recipient["address"],
                "deadline": current.get("deadline") or "",
                "distance": None,
                "duration": None,
                "status": "available",
                "createdAt": firestore.SERVER_TIMESTAMP,
            })
            return accepted_quantity, current["unit"]

        accepted_quantity, unit = accept_allocation(db.transaction())
        message = f"{recipient['name']} accepted {accepted_quantity} {unit}; a volunteer pickup job was created."
        append_log(db, donation_id, "coordinate", message)
    else:
        allocation = donation.get("allocation", [])
        allocation_index = next(
            (index for index, item in enumerate(allocation) if item.get("recipientId") == data.recipientId),
            None,
        )
        if allocation_index is None:
            raise HTTPException(status_code=404, detail="No allocation for this recipient")
        if allocation[allocation_index].get("status") != "pending":
            raise HTTPException(status_code=409, detail="This allocation has already been answered")
        allocation[allocation_index]["status"] = "declined"
        replan_after_decline(db, donation_id, donation, allocation, data.recipientId)

    db.collection("donations").document(donation_id).collection("recipientResponses").add({
        "recipientId": data.recipientId,
        "action": data.action,
        "respondedAt": firestore.SERVER_TIMESTAMP,
    })
    return {"donationId": donation_id, "recipientId": data.recipientId, "action": data.action}
