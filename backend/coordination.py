import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from firebase_admin import firestore


CATEGORIES = ("cooked", "bakery", "produce", "packaged")


def classify_food(food, notes=None):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    if not api_key:
        return _keyword_category(food, notes), "GEMINI_API_KEY is not configured; used keyword classification."

    schema = {
        "type": "OBJECT",
        "properties": {
            "category": {"type": "STRING", "enum": list(CATEGORIES)},
            "confidence": {"type": "NUMBER"},
        },
        "required": ["category", "confidence"],
    }
    prompt = (
        "Classify the donated food into exactly one category: cooked, bakery, produce, or packaged. "
        "Use cooked for prepared meals, bakery for bread and baked goods, produce for fresh fruits "
        "and vegetables, and packaged for shelf-stable packaged food. If uncertain, use low confidence. "
        "Do not infer food safety or storage suitability. "
        f"Food description: {food}\nPackaging notes: {notes or 'none'}"
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{urllib.parse.quote(model, safe='')}:generateContent?key={urllib.parse.quote(api_key, safe='')}"
    )
    request = urllib.request.Request(
        url,
        data=json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(text)
        category = result.get("category")
        confidence = float(result.get("confidence", 0))
        if category in CATEGORIES and 0 <= confidence <= 1:
            if confidence >= 0.6:
                return category, f"Gemini classified the donation as {category} (confidence {confidence:.2f})."
            return None, f"Gemini classification confidence was too low ({confidence:.2f}); coordinator review required."
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, TypeError, ValueError) as error:
        fallback = _keyword_category(food, notes)
        result = f"keyword classification returned {fallback or 'no category'}"
        return fallback, f"Gemini classification failed ({type(error).__name__}); {result}."

    return None, "Gemini returned an invalid category or confidence value; coordinator review is required."


def _keyword_category(food, notes=None):
    text = f"{food} {notes or ''}".casefold()
    keywords = (
        ("cooked", r"\b(cooked|meal|prepared|hot food|leftover|pasta|soup|curry)\b"),
        ("bakery", r"\b(bread|bakery|baked|pastry|pastries|cake|rolls|loaf)\b"),
        ("produce", r"\b(produce|vegetable|vegetables|fruit|fruits|fresh|zucchini|tomato|tomatoes|greens)\b"),
        ("packaged", r"\b(packaged|canned|tin|shelf.?stable|sealed|dry goods)\b"),
    )
    for category, pattern in keywords:
        if re.search(pattern, text):
            return category
    return None


def plan_allocations(donation, recipients, quantity=None, excluded_ids=()):
    remaining = float(donation["quantity"] if quantity is None else quantity)
    unit = str(donation.get("unit", "")).casefold()
    category = donation.get("category")
    excluded = set(excluded_ids)
    matches = []

    for recipient in recipients:
        if recipient["id"] in excluded:
            continue
        accepts = [str(value).casefold() for value in recipient.get("accepts", [])]
        if category not in accepts:
            continue
        if str(recipient.get("capacityUnit", "")).casefold() != unit:
            continue
        if not recipient.get("address"):
            continue
        try:
            capacity = float(recipient.get("capacity", 0))
        except (TypeError, ValueError):
            continue
        if capacity > 0:
            matches.append((recipient, capacity))

    matches.sort(key=lambda item: (
        str(item[0].get("location", "")).casefold() != str(donation.get("location", "")).casefold(),
        -item[1],
    ))

    allocations = []
    for recipient, capacity in matches:
        allocated = min(remaining, capacity)
        if allocated <= 0:
            break
        allocations.append({
            "recipientId": recipient["id"],
            "recipientName": recipient["name"],
            "quantity": allocated,
            "status": "pending",
        })
        remaining -= allocated
        if remaining <= 0:
            break

    return allocations, max(0, remaining)


def append_log(db, donation_id, entry_type, message):
    db.collection("donations").document(donation_id).collection("agentLogs").add({
        "type": entry_type,
        "message": message,
        "time": firestore.SERVER_TIMESTAMP,
    })


def create_approval(db, donation_id, donation, allocations, reason):
    description = (
        f"{reason} Proposed allocation: "
        + " + ".join(f"{item['recipientName']} ({item['quantity']} {donation['unit']})" for item in allocations)
        + "."
    )
    return db.collection("approvals").add({
        "donationId": donation_id,
        "donorName": donation.get("donorName") or "Donor",
        "description": description,
        "status": "pending",
        "requestedAt": firestore.SERVER_TIMESTAMP,
    })


def coordinate_donation(db, donation_id, donation):
    ref = db.collection("donations").document(donation_id)
    ref.update({"state": "Extracting Details"})
    append_log(db, donation_id, "extract", "Reviewing the submitted food details and classifying the food category.")

    missing_fields = []
    for field, key in (
        ("preparedAt", "time"),
        ("deadline", "deadline"),
        ("storage", "storage"),
        ("location", "location"),
        ("pickupAddress", "address"),
    ):
        if not str(donation.get(field) or "").strip():
            missing_fields.append(key)

    if missing_fields:
        ref.update({"state": "Held for Review", "missingFields": missing_fields, "allocation": []})
        append_log(
            db,
            donation_id,
            "review",
            "Coordination paused: preparation time, pickup deadline, storage details, pickup area, and street address are required before offers can be made.",
        )
        return "Held for Review"

    category = donation.get("category")
    if category not in CATEGORIES:
        category, classification_note = classify_food(donation["food"], donation.get("notes"))
        append_log(db, donation_id, "validate", classification_note)
    else:
        append_log(db, donation_id, "validate", f"Using submitted category: {category}.")

    if category not in CATEGORIES:
        ref.update({"state": "Held for Review", "missingFields": ["category"], "allocation": []})
        append_log(db, donation_id, "review", "Food category could not be determined confidently; coordinator review is required.")
        return "Held for Review"

    donation["category"] = category
    ref.update({"category": category, "state": "Eligibility Check", "missingFields": []})
    append_log(db, donation_id, "validate", "Required donation details are present. Food-safety suitability is not certified by this automated check.")
    append_log(db, donation_id, "plan", f"Finding recipient organizations that accept {category} in {donation['unit']}.")

    recipients = [
        {"id": item.id, **item.to_dict()}
        for item in db.collection("recipients").stream()
    ]
    allocations, remaining = plan_allocations(donation, recipients)
    if remaining > 0:
        ref.update({"state": "Held for Review", "allocation": [], "missingFields": ["recipients"]})
        append_log(
            db,
            donation_id,
            "review",
            f"No complete eligible allocation is available for {donation['quantity']} {donation['unit']}; {remaining} {donation['unit']} remain unmatched.",
        )
        return "Held for Review"

    ref.update({"allocation": allocations, "missingFields": []})
    if len(allocations) > 1:
        create_approval(db, donation_id, donation, allocations, "A split across multiple recipients needs coordinator approval.")
        ref.update({"state": "Awaiting Human Approval"})
        append_log(db, donation_id, "approval", "Split allocation proposed; waiting for coordinator approval before notifying recipients.")
        return "Awaiting Human Approval"

    ref.update({"state": "Planning Redistribution"})
    append_log(
        db,
        donation_id,
        "plan",
        f"Matched the full donation to {allocations[0]['recipientName']} ({allocations[0]['quantity']} {donation['unit']}); recipient response requested.",
    )
    return "Planning Redistribution"


def replan_after_decline(db, donation_id, donation, allocation, declined_recipient_id):
    accepted = [item for item in allocation if item.get("status") in {"accepted", "confirmed"}]
    declined = [
        item for item in allocation
        if item.get("recipientId") == declined_recipient_id and item.get("status") == "declined"
    ]
    accepted_quantity = sum(float(item["quantity"]) for item in accepted)
    remaining = max(0, float(donation["quantity"]) - accepted_quantity)
    excluded_ids = [
        item["recipientId"] for item in allocation
        if item.get("status") in {"accepted", "confirmed", "declined"}
    ]
    recipients = [
        {"id": item.id, **item.to_dict()}
        for item in db.collection("recipients").stream()
    ]
    replacements, unallocated = plan_allocations(
        donation,
        recipients,
        quantity=remaining,
        excluded_ids=excluded_ids,
    )
    updated_allocation = accepted + declined + replacements
    ref = db.collection("donations").document(donation_id)

    if unallocated > 0:
        ref.update({
            "allocation": updated_allocation,
            "state": "Held for Review",
            "missingFields": ["recipients"],
        })
        append_log(
            db,
            donation_id,
            "review",
            f"A recipient declined. Replanning could not match {unallocated} {donation['unit']}; coordinator review is required.",
        )
        return "Held for Review"

    if remaining == 0:
        ref.update({"allocation": updated_allocation, "state": "Coordinating Pickup"})
        append_log(db, donation_id, "replan", "A recipient declined, but accepted allocations already cover the donation.")
        return "Coordinating Pickup"

    if len(accepted + replacements) > 1:
        ref.update({"allocation": updated_allocation, "state": "Awaiting Human Approval"})
        create_approval(
            db,
            donation_id,
            donation,
            accepted + replacements,
            "A recipient declined; the revised allocation needs coordinator approval.",
        )
        append_log(db, donation_id, "approval", "A replacement plan is ready and waiting for coordinator approval.")
        return "Awaiting Human Approval"

    ref.update({"allocation": updated_allocation, "state": "Planning Redistribution"})
    append_log(db, donation_id, "replan", "A recipient declined; a replacement recipient was found and notified.")
    return "Planning Redistribution"
