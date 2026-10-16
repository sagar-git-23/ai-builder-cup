from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from firebase_client import get_db
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
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Job not found")
    ref.update({"status": data.status, "updatedAt": firestore.SERVER_TIMESTAMP})

    # If job completed, update the linked donation state to Handoff Verified
    if data.status == "completed":
        job = ref.get().to_dict()
        donation_id = job.get("donationId")
        if donation_id:
            db.collection("donations").document(donation_id).update({
                "state": "Handoff Verified"
            })

    return {"id": job_id, "status": data.status}


@router.delete("/{job_id}")
def delete_job(job_id: str):
    db = get_db()
    db.collection("pickupJobs").document(job_id).delete()
    return {"deleted": job_id}
