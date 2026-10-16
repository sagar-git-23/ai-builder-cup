from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class DonationState(str, Enum):
    SUBMITTED = "Submitted"
    EXTRACTING = "Extracting Details"
    ELIGIBILITY_CHECK = "Eligibility Check"
    PLANNING = "Planning Redistribution"
    COORDINATING = "Coordinating Pickup"
    RECOVERING = "Recovering — Replanning"
    AWAITING_APPROVAL = "Awaiting Human Approval"
    VERIFIED = "Handoff Verified"
    FAILED = "Failed"
    REVIEW = "Held for Review"


class AllocationItem(BaseModel):
    recipientId: str
    recipientName: str
    quantity: float
    status: str = "pending"


class DonationCreate(BaseModel):
    food: str
    quantity: float
    unit: str = "portions"
    deadline: Optional[str] = None
    storage: Optional[str] = None
    notes: Optional[str] = None
    donorName: Optional[str] = None
    donorId: Optional[str] = None
    category: Optional[str] = None
    missingFields: Optional[List[str]] = []


class DonationStateUpdate(BaseModel):
    state: DonationState


class AllocationUpdate(BaseModel):
    allocation: List[AllocationItem]


class RecipientCreate(BaseModel):
    name: str
    location: str
    capacity: float
    accepts: List[str]
    transport: bool = False
    address: Optional[str] = None
    contact: Optional[str] = None


class RecipientResponse(BaseModel):
    recipientId: str
    action: str  # "accepted" | "declined"


class PickupJobCreate(BaseModel):
    donationId: str
    food: str
    quantity: str
    pickupName: str
    pickupAddress: str
    dropoffName: str
    dropoffAddress: str
    deadline: str
    distance: Optional[str] = None
    duration: Optional[str] = None
    status: str = "available"


class JobStatusUpdate(BaseModel):
    status: str  # available | accepted | picked_up | completed | declined


class ApprovalCreate(BaseModel):
    donationId: str
    donorName: str
    description: str


class ApprovalResolve(BaseModel):
    status: str  # approved | rejected


class AgentLogEntry(BaseModel):
    type: str
    message: str
