from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from firebase_client import get_db
from coordination import append_log, replan_after_decline
from models import PickupJobCreate, JobStatusUpdate

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("")
def create_job(data: PickupJobCreate):
    db = get_db()
    ref = db.collection("pickupJobs").document()
    payload = data.model_dump()
    payload["createdAt"] = firestore.SERVER_TIMESTAMP
    ref.set(payload)
    return {"id": ref.id, **payload}


@router.get("")
def list_jobs(status: str = None):
    db = get_db()
    query = db.collection("pickupJobs")
    if status:
        query = query.where("status", "==", status)
    docs = query.stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


@router.get("/{job_id}")
def get_job(job_id: str):
    db = get_db()
    doc = db.collection("pickupJobs").document(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"id": doc.id, **doc.to_dict()}


@router.patch("/{job_id}/status")
def update_job_status(job_id: str, data: JobStatusUpdate):
    db = get_db()
    ref = db.collection("pickupJobs").document(job_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    current_status = snapshot.to_dict().get("status")
    if data.status == current_status and data.status != "completed":
        return {"id": job_id, "status": data.status}
    allowed_transitions = {
        "available": {"accepted", "declined"},
        "accepted": {"en_route_pickup", "declined"},
        "en_route_pickup": {"picked_up", "declined"},
        "picked_up": {"en_route_dropoff", "declined"},
        "en_route_dropoff": {"completed", "declined"},
        "completed": set(),
        "declined": set(),
    }
    if data.status != current_status and data.status not in allowed_transitions.get(current_status, set()):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot change job status from {current_status} to {data.status}",
        )
    if data.status != current_status:
        ref.update({"status": data.status, "updatedAt": firestore.SERVER_TIMESTAMP})

    job = ref.get().to_dict()
    donation_id = job.get("donationId")
    if donation_id and data.status == "completed":
        donation_ref = db.collection("donations").document(donation_id)
        jobs = list(db.collection("pickupJobs").where("donationId", "==", donation_id).stream())
        donation_snapshot = donation_ref.get()
        if not donation_snapshot.exists:
            return {"id": job_id, "status": data.status}
        donation = donation_snapshot.to_dict()
        allocation = donation.get("allocation", [])
        completed_job_ids = {
            item.id for item in jobs if item.to_dict().get("status") == "completed"
        }
        active_jobs = [item for item in jobs if item.to_dict().get("status") != "declined"]
        for item in allocation:
            if item.get("jobId") in completed_job_ids and item.get("status") == "accepted":
                item["status"] = "confirmed"
        confirmed_quantity = sum(
            float(item.get("quantity", 0))
            for item in allocation
            if item.get("status") == "confirmed" and item.get("jobId") in completed_job_ids
        )
        all_jobs_complete = bool(active_jobs) and all(
            item.to_dict().get("status") == "completed" for item in active_jobs
        )
        donation_update = {"allocation": allocation}
        if all_jobs_complete and confirmed_quantity >= float(donation.get("quantity", 0)):
            if donation.get("state") != "Handoff Verified":
                donation_update["state"] = "Handoff Verified"
                append_log(db, donation_id, "verify", "All allocated quantities have completed pickup and handoff.")
        donation_ref.update(donation_update)
    elif donation_id and data.status == "declined":
        donation_ref = db.collection("donations").document(donation_id)
        donation_snapshot = donation_ref.get()
        if donation_snapshot.exists and job.get("recipientId"):
            donation = donation_snapshot.to_dict()
            allocation = donation.get("allocation", [])
            for item in allocation:
                if item.get("recipientId") == job["recipientId"] and item.get("jobId") == job_ref.id:
                    item["status"] = "declined"
            replan_after_decline(db, donation_id, donation, allocation, job["recipientId"])

    return {"id": job_id, "status": data.status}


@router.delete("/{job_id}")
def delete_job(job_id: str):
    db = get_db()
    db.collection("pickupJobs").document(job_id).delete()
    return {"deleted": job_id}
