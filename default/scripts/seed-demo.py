# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data into Lumera (idempotent - safe to run multiple times).

Usage:
    lumera run scripts/seed-demo.py
"""

from lumera import pb

# Seed demo items
demo_items = [
    {
        "external_id": "demo:item_1",
        "name": "Example Item 1",
        "status": "pending",
        "description": "This is an example item",
    },
    {
        "external_id": "demo:item_2",
        "name": "Example Item 2",
        "status": "pending",
        "description": "Another example item",
    },
]

print("Seeding demo data...")

for item in demo_items:
    pb.upsert("example_items", item)
    print(f"  ✓ {item['name']}")

print(f"\nSeeded {len(demo_items)} items")
