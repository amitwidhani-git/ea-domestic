#!/usr/bin/env python3
"""
Seed affiliates collection from data/affiliates.json into MongoDB.
Run once, then manage directly in Atlas Data Explorer.

    python seed_affiliates.py
    python seed_affiliates.py --data-dir "C:\path\to\ea-web\data"

Re-running is safe: upserts on id, so existing docs are updated not duplicated.
"""
import argparse
import json
import os
import sys
from pathlib import Path

from pymongo import MongoClient, UpdateOne


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", type=Path, default=Path("data"))
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI") or sys.exit("Set MONGODB_URI")
    db = MongoClient(uri)["edgeanalysts"]

    src = args.data_dir / "affiliates.json"
    if not src.exists():
        sys.exit(f"Not found: {src}")

    affiliates = json.loads(src.read_text())
    ops = [
        UpdateOne(
            {"id": a["id"]},
            {"$set": a},
            upsert=True
        )
        for a in affiliates
    ]
    r = db.affiliates.bulk_write(ops, ordered=False)
    print(f"affiliates: {r.upserted_count} inserted, {r.modified_count} updated")
    print("Verify in Atlas: Data Explorer -> edgeanalysts -> affiliates")


if __name__ == "__main__":
    main()
