from typing import List, Literal, Optional
from enum import Enum
from pydantic import BaseModel, Field


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
    status: Literal["pending", "accepted", "declined", "confirmed"] = "pending"
    jobId: Optional[str] = None


class DonationCreate(BaseModel):
    food: str = Field(min_length=1, max_length=500)
    quantity: float = Field(gt=0)
    unit: str = "portions"
    preparedAt: Optional[str] = Field(default=None, max_length=20)
    deadline: Optional[str] = Field(default=None, max_length=20)
    storage: Optional[str] = Field(default=None, max_length=300)
    location: Optional[str] = Field(default=None, max_length=500)
    pickupAddress: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=2000)
    donorName: Optional[str] = Field(default=None, max_length=200)
    donorId: Optional[str] = Field(default=None, max_length=200)
    category: Optional[str] = None
    missingFields: List[str] = Field(default_factory=list)


class DonationStateUpdate(BaseModel):
    state: DonationState


class AllocationUpdate(BaseModel):
    allocation: List[AllocationItem]


class RecipientCreate(BaseModel):
    name: str
    location: str
    capacity: float
    capacityUnit: str
    accepts: List[str]
    transport: bool = False
    address: str
    contact: Optional[str] = None


class RecipientResponse(BaseModel):
    recipientId: str
    action: Literal["accepted", "declined"]


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
    status: Literal[
        "available",
        "accepted",
        "en_route_pickup",
        "picked_up",
        "en_route_dropoff",
        "completed",
        "declined",
    ]


class ApprovalCreate(BaseModel):
    donationId: str
    donorName: str
    description: str


class ApprovalResolve(BaseModel):
    status: Literal["approved", "rejected"]


class AgentLogEntry(BaseModel):
    type: str
    message: str
