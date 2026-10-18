"""
Run this once to seed Firestore with dummy data.
Usage: python seed.py
"""
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import hashlib
import os

load_dotenv()

cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()


# ── Recipients ─────────────────────────────────────────────
recipients = [
    {
        "name": "Northern Rivers Community Kitchen",
        "location": "Lismore",
        "address": "12 Molesworth St, Lismore NSW 2480",
        "capacity": 50,
        "capacityUnit": "portions",
        "accepts": ["cooked", "produce", "bakery"],
        "transport": True,
        "contact": "kitchen@nrck.org.au",
    },
    {
        "name": "Lismore Shelter",
        "location": "Lismore",
        "address": "45 Keen St, Lismore NSW 2480",
        "capacity": 20,
        "capacityUnit": "portions",
        "accepts": ["cooked", "bakery"],
        "transport": False,
        "contact": "info@lismoreshelter.org.au",
    },
    {
        "name": "Byron Bay Food Bank",
        "location": "Byron Bay",
        "address": "3 Jonson St, Byron Bay NSW 2481",
        "capacity": 40,
        "capacityUnit": "portions",
        "accepts": ["produce", "packaged", "bakery"],
        "transport": True,
        "contact": "hello@byronbayfoodbank.org",
    },
    {
        "name": "Ballina Family Support",
        "location": "Ballina",
        "address": "22 River St, Ballina NSW 2478",
        "capacity": 15,
        "capacityUnit": "portions",
        "accepts": ["cooked", "produce"],
        "transport": False,
        "contact": "support@ballinafamily.org.au",
    },
]

print("Seeding recipients...")
for r in recipients:
    identity = (
        " ".join(r["name"].casefold().split()),
        " ".join(r["location"].casefold().split()),
    )
    existing = next(
        (
            doc for doc in db.collection("recipients").stream()
            if (
                " ".join(str(doc.to_dict().get("name", "")).casefold().split()),
                " ".join(str(doc.to_dict().get("location", "")).casefold().split()),
            ) == identity
        ),
        None,
    )
    if existing:
        print(f"  = {r['name']} already exists")
        continue
    identity_hash = hashlib.sha256("|".join(identity).encode("utf-8")).hexdigest()
    ref = db.collection("recipients").document(f"seed_{identity_hash[:32]}")
    ref.set(r)
    print(f"  + {r['name']}")


# ── Donations ──────────────────────────────────────────────
donations = [
    {
        "donorName": "The Riverside Restaurant",
        "donorId": "donor-001",
        "food": "Cooked mixed meals — pasta, salad, bread rolls",
        "category": "cooked",
        "quantity": 35,
        "unit": "portions",
        "deadline": "21:00",
        "storage": "Hot-held above 60°C",
        "location": "Lismore",
        "pickupAddress": "88 Molesworth St, Lismore NSW 2480",
        "preparedAt": "17:00",
        "notes": "Individually packaged in sealed containers",
        "state": "Handoff Verified",
        "missingFields": [],
        "allocation": [
            {"recipientId": "r2", "recipientName": "Lismore Shelter", "quantity": 20, "status": "confirmed"},
            {"recipientId": "r4", "recipientName": "Ballina Family Support", "quantity": 15, "status": "confirmed"},
        ],
    },
    {
        "donorName": "Sunrise Bakery",
        "donorId": "donor-002",
        "food": "Assorted bread loaves and pastries",
        "category": "bakery",
        "quantity": 60,
        "unit": "portions",
        "deadline": "14:00",
        "storage": "Room temperature, packaged",
        "location": "Ballina",
        "pickupAddress": "14 River St, Ballina NSW 2478",
        "preparedAt": "06:00",
        "notes": "Packaged in paper bags",
        "state": "Coordinating Pickup",
        "missingFields": [],
        "allocation": [
            {"recipientId": "r3", "recipientName": "Byron Bay Food Bank", "quantity": 40, "status": "confirmed"},
            {"recipientId": "r1", "recipientName": "Northern Rivers Community Kitchen", "quantity": 20, "status": "pending"},
        ],
    },
    {
        "donorName": "Green Grocer Co-op",
        "donorId": "donor-003",
        "food": "Mixed vegetables — zucchini, tomatoes, leafy greens",
        "category": "produce",
        "quantity": 25,
        "unit": "portions",
        "deadline": "18:00",
        "storage": None,
        "location": "Lismore",
        "pickupAddress": None,
        "preparedAt": "08:00",
        "notes": None,
        "state": "Held for Review",
        "missingFields": ["storage", "address"],
        "allocation": [],
    },
]

print("\nSeeding donations...")
for d in donations:
    ref = db.collection("donations").document()
    d["createdAt"] = firestore.SERVER_TIMESTAMP
    ref.set(d)
    print(f"  + {d['donorName']} — {d['food'][:40]}")

    # Add agent logs as subcollection
    logs = {
        "Handoff Verified": [
            {"type": "extract", "message": "Extracted: 35 portions cooked meals, deadline 21:00, hot-held storage confirmed."},
            {"type": "validate", "message": "Eligibility check passed. Storage documented. Temperature compliant."},
            {"type": "plan", "message": "Searching recipients. Found: Northern Rivers CK (cap 50), Lismore Shelter (cap 20)."},
            {"type": "tool_call", "message": "TOOL: request_acceptance({ recipient: Lismore Shelter, quantity: 20 }) → accepted"},
            {"type": "tool_call", "message": "TOOL: request_acceptance({ recipient: Ballina Family Support, quantity: 15 }) → accepted"},
            {"type": "verify", "message": "Handoff evidence received. Lismore Shelter: 20 ✓  Ballina Family Support: 15 ✓. Donation complete."},
        ],
        "Coordinating Pickup": [
            {"type": "extract", "message": "Extracted: 60 bakery items, room temp packaged, deadline 14:00."},
            {"type": "validate", "message": "Eligibility check passed. Packaged, within safe window."},
            {"type": "plan", "message": "Matched: Byron Bay Food Bank (40) + Northern Rivers CK (20)."},
            {"type": "tool_call", "message": "TOOL: request_acceptance({ recipient: Byron Bay Food Bank, quantity: 40 }) → accepted"},
            {"type": "coordinate", "message": "Awaiting confirmation from Northern Rivers CK for 20 items."},
        ],
        "Held for Review": [
            {"type": "extract", "message": "Extracted: 25 portions mixed produce, deadline 18:00. Storage information missing."},
            {"type": "review", "message": "HOLD: Storage and pickup address not provided. Donation held for coordinator review."},
        ],
    }

    for log in logs.get(d["state"], []):
        ref.collection("agentLogs").add({**log, "time": firestore.SERVER_TIMESTAMP})


# ── Pickup Jobs ────────────────────────────────────────────
jobs = [
    {
        "donationId": "don-002",
        "food": "Assorted bread loaves and pastries",
        "quantity": "40 portions",
        "pickupName": "Sunrise Bakery",
        "pickupAddress": "14 River St, Ballina NSW 2478",
        "dropoffName": "Byron Bay Food Bank",
        "dropoffAddress": "3 Jonson St, Byron Bay NSW 2481",
        "deadline": "14:00",
        "distance": "28 km",
        "duration": "32 min",
        "status": "available",
    },
    {
        "donationId": "don-004",
        "food": "Vegetable curry and rice",
        "quantity": "18 portions",
        "pickupName": "The Riverside Restaurant",
        "pickupAddress": "88 Jonson St, Byron Bay NSW 2481",
        "dropoffName": "Northern Rivers Community Kitchen",
        "dropoffAddress": "12 Molesworth St, Lismore NSW 2480",
        "deadline": "19:30",
        "distance": "45 km",
        "duration": "48 min",
        "status": "available",
    },
]

print("\nSeeding pickup jobs...")
for j in jobs:
    ref = db.collection("pickupJobs").document()
    j["createdAt"] = firestore.SERVER_TIMESTAMP
    ref.set(j)
    print(f"  + {j['pickupName']} -> {j['dropoffName']}")


# ── Approvals ──────────────────────────────────────────────
approvals = [
    {
        "donationId": "don-002",
        "donorName": "Sunrise Bakery",
        "description": "Split allocation: Byron Bay Food Bank (40 portions) + Northern Rivers CK (20 portions).",
        "status": "approved",
        "requestedAt": firestore.SERVER_TIMESTAMP,
        "resolvedAt": firestore.SERVER_TIMESTAMP,
    },
]

print("\nSeeding approvals...")
for a in approvals:
    ref = db.collection("approvals").document()
    ref.set(a)
    print(f"  + {a['donorName']} — {a['status']}")

print("\nSeeding complete! Open Firestore console to verify.")
