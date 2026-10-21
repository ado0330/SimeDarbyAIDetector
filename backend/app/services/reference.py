"""Fictional reference data: township locations, cameras and responders (no real personal data)."""
from typing import Dict, List

from sqlalchemy.orm import Session

from app.models import Camera, Location

# Schematic map coordinates are on a 0-100 grid (x → right, y → down).
LOCATIONS: List[Dict] = [
    {"id": "LOC-GATE", "name": "Main Gate Roundabout", "zone": "Roads & Access", "map_x": 14, "map_y": 52,
     "description": "Primary vehicle entrance and roundabout."},
    {"id": "LOC-PROM", "name": "Lakeside Promenade", "zone": "Public Realm", "map_x": 60, "map_y": 20,
     "description": "Pedestrian promenade along the township lake."},
    {"id": "LOC-MALL", "name": "Harmoni Mall - Parking Deck B", "zone": "Retail", "map_x": 80, "map_y": 60,
     "description": "Multi-storey parking next to the retail mall."},
    {"id": "LOC-RESA", "name": "Residensi Aman - Block A", "zone": "Residential", "map_x": 38, "map_y": 78,
     "description": "Residential tower with fire-engine access lane."},
    {"id": "LOC-PARK", "name": "Central Park Playground", "zone": "Public Realm", "map_x": 46, "map_y": 48,
     "description": "Community park with playground and benches."},
    {"id": "LOC-SCH", "name": "Sentosa School Drop-off", "zone": "Education", "map_x": 26, "map_y": 22,
     "description": "School pick-up and drop-off bay."},
]

CAMERAS: List[Dict] = [
    {"id": "CAM-GATE-01", "name": "Gate Roundabout North Approach", "location_id": "LOC-GATE", "map_x": 17, "map_y": 47},
    {"id": "CAM-GATE-02", "name": "Gate Security Booth", "location_id": "LOC-GATE", "map_x": 11, "map_y": 57},
    {"id": "CAM-PROM-01", "name": "Promenade East Walkway", "location_id": "LOC-PROM", "map_x": 66, "map_y": 17},
    {"id": "CAM-PROM-02", "name": "Promenade Lake Edge", "location_id": "LOC-PROM", "map_x": 56, "map_y": 24},
    {"id": "CAM-MALL-01", "name": "Deck B Level 1 Entry", "location_id": "LOC-MALL", "map_x": 84, "map_y": 56},
    {"id": "CAM-MALL-02", "name": "Deck B Service Road", "location_id": "LOC-MALL", "map_x": 76, "map_y": 66},
    {"id": "CAM-RESA-01", "name": "Block A Lobby", "location_id": "LOC-RESA", "map_x": 34, "map_y": 74},
    {"id": "CAM-RESA-02", "name": "Block A Fire Access Lane", "location_id": "LOC-RESA", "map_x": 43, "map_y": 82},
    {"id": "CAM-PARK-01", "name": "Playground Bench Area", "location_id": "LOC-PARK", "map_x": 50, "map_y": 52},
    {"id": "CAM-SCH-01", "name": "School Drop-off Bay", "location_id": "LOC-SCH", "map_x": 29, "map_y": 26},
]

RESPONDERS: List[Dict] = [
    {"id": "ambulance", "name": "Ambulance & Paramedics", "role": "Emergency medical & trauma response"},
    {"id": "traffic-police", "name": "Traffic Police & Enforcement", "role": "Traffic control & accident investigation"},
    {"id": "patrol-a", "name": "Security Patrol Alpha", "role": "Site security & perimeter patrol"},
    {"id": "patrol-b", "name": "Security Patrol Bravo", "role": "Site security & rapid response"},
    {"id": "fire-warden", "name": "Fire & Rescue (Bomba)", "role": "Firefighting & rescue operations"},
    {"id": "first-aid", "name": "On-site First-Aid Team", "role": "First aid & triage"},
    {"id": "traffic-marshal", "name": "Traffic Marshal", "role": "Traffic & access control"},
    {"id": "parking-mgmt", "name": "Parking Management", "role": "Parking enforcement"},
    {"id": "facilities", "name": "Township Facilities & Maintenance", "role": "Infrastructure & hazard clearing"},
]
RESPONDER_BY_ID = {r["id"]: r for r in RESPONDERS}


def seed_reference_data(db: Session) -> None:
    """Idempotent: inserts missing locations/cameras only."""
    existing_loc = {l.id for l in db.query(Location.id).all()}
    for row in LOCATIONS:
        if row["id"] not in existing_loc:
            db.add(Location(**row))
    db.flush()
    existing_cam = {c.id for c in db.query(Camera.id).all()}
    for row in CAMERAS:
        if row["id"] not in existing_cam:
            db.add(Camera(**row))
    db.commit()
