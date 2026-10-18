import unittest

from coordination import _keyword_category, plan_allocations


class PlanningTests(unittest.TestCase):
    def test_splits_across_same_unit_recipients_and_prefers_same_location(self):
        donation = {
            "quantity": 35,
            "unit": "portions",
            "category": "cooked",
            "location": "Lismore",
        }
        recipients = [
            {
                "id": "far",
                "name": "Far recipient",
                "location": "Ballina",
                "capacity": 35,
                "capacityUnit": "portions",
                "accepts": ["cooked"],
                "address": "1 Far Street",
            },
            {
                "id": "near",
                "name": "Nearby recipient",
                "location": "Lismore",
                "capacity": 20,
                "capacityUnit": "portions",
                "accepts": ["cooked"],
                "address": "1 Near Street",
            },
        ]

        allocations, remaining = plan_allocations(donation, recipients)

        self.assertEqual(remaining, 0)
        self.assertEqual(
            [(item["recipientId"], item["quantity"]) for item in allocations],
            [("near", 20), ("far", 15)],
        )

    def test_does_not_match_different_units_or_missing_dropoff_address(self):
        donation = {"quantity": 5, "unit": "kg", "category": "produce", "location": "Lismore"}
        recipients = [
            {
                "id": "wrong-unit",
                "name": "Wrong unit",
                "capacity": 100,
                "capacityUnit": "portions",
                "accepts": ["produce"],
                "address": "1 Street",
            },
            {
                "id": "no-address",
                "name": "No address",
                "capacity": 100,
                "capacityUnit": "kg",
                "accepts": ["produce"],
            },
        ]

        allocations, remaining = plan_allocations(donation, recipients)

        self.assertEqual(allocations, [])
        self.assertEqual(remaining, 5)

    def test_keyword_classification_returns_none_when_uncertain(self):
        self.assertEqual(_keyword_category("Fresh zucchini and tomatoes"), "produce")
        self.assertIsNone(_keyword_category("Unidentified food item"))


if __name__ == "__main__":
    unittest.main()
