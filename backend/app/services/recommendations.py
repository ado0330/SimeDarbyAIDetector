"""Explainable, rules-based recommended-action service.

Every recommendation is ADVISORY. The administrator decides and performs any real-world response; this prototype
never contacts emergency services. Emergency numbers are mentioned only as guidance text for Malaysia.
"""
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.enums import Category, PriorityLevel, Verification


@dataclass
class Recommendation:
    code: str
    text: str
    rationale: str

    def to_dict(self) -> Dict[str, str]:
        return {"code": self.code, "text": self.text, "rationale": self.rationale, "advisory": "true"}


def recommend(
    category: str,
    level: str,
    emergency: bool,
    needs_verification: bool,
    verification_status: str,
    evidence: Optional[Dict[str, Any]] = None,
    confidence: Optional[float] = None,
) -> List[Recommendation]:
    evidence = evidence or {}
    recs: List[Recommendation] = []
    verified = verification_status == Verification.VERIFIED.value
    serious = emergency or level in (PriorityLevel.CRITICAL.value, PriorityLevel.HIGH.value)

    if verification_status == Verification.FALSE_POSITIVE.value:
        return [Recommendation("close_false_positive", "No response needed — reviewer marked this as a false positive.",
                               "A human reviewer judged the detection to be incorrect.")]

    if needs_verification:
        recs.append(Recommendation(
            "verify_low_confidence",
            "Verify the camera evidence now to confirm what is happening (detection confidence is low).",
            "Low confidence does not lower priority, but the observation must be verified by a person."))

    if category == Category.ROAD_COLLISION.value:
        if serious and not verified and not needs_verification:
            recs.append(Recommendation("verify_collision", "Review the camera evidence and confirm whether anyone is injured or trapped.",
                                       "Collision may involve people at risk; verify before escalating."))
        if emergency or level == PriorityLevel.CRITICAL.value:
            recs.append(Recommendation(
                "consider_emergency_services",
                "If injury or entrapment is confirmed, consider contacting emergency services (999/112). The decision rests with the administrator.",
                "An emergency rule or critical score indicates a potentially life-threatening situation."))
        if evidence.get("blocks_emergency_access") is True:
            recs.append(Recommendation("clear_access", "Send a traffic marshal to divert traffic and keep emergency access open.",
                                       "The collision blocks an emergency route."))
        recs.append(Recommendation("dispatch_patrol", "Assign a security patrol to attend, secure the scene and document it.",
                                   "On-site presence is useful at any collision severity."))

    elif category == Category.PERSON_FALL.value:
        if evidence.get("person_attempting_to_stand") is True or evidence.get("bystander_assisting") is True:
            recs.append(Recommendation("monitor_fall", "Keep monitoring; send a patrol to check on the person if they do not recover quickly.",
                                       "Person appears to be recovering or receiving help."))
        elif emergency or level in (PriorityLevel.CRITICAL.value, PriorityLevel.HIGH.value):
            recs.append(Recommendation("verify_person_down", "Prompt immediate human verification of the camera view of the person on the ground.",
                                       "The person has been on the ground for an extended period or in a hazardous place."))
            recs.append(Recommendation("send_first_aid", "Send the nearest patrol / first-aid trained responder; if the person is unresponsive, consider emergency services (999/112).",
                                       "Appropriate escalation for a possible medical emergency; do not assume a cause from video alone."))
        else:
            recs.append(Recommendation("check_on_person", "Check the live view and send a patrol to check on the person if they remain on the ground.",
                                       "Not every fall is an emergency; verify before escalating."))

    elif category == Category.PARKING_OBSTRUCTION.value:
        if evidence.get("blocks_emergency_access") is True:
            recs.append(Recommendation("clear_fire_lane", "Treat as urgent: dispatch security to have the vehicle moved and keep the access route clear.",
                                       "An emergency access route is obstructed."))
        else:
            recs.append(Recommendation("assign_parking", "Assign to security or parking management to contact the owner or issue a notice.",
                                       "Routine obstruction with no emergency-access impact reported."))

    elif category == Category.FIRE_SMOKE.value:
        recs.append(Recommendation("verify_fire", "Prompt immediate verification of the camera view for smoke or flames.",
                                   "A credible fire indication must never be suppressed due to low confidence."))
        recs.append(Recommendation("consider_fire_services",
                                   "If confirmed, escalate to Fire & Rescue (BOMBA 994 / 999) and notify the on-site fire-safety warden. The decision rests with the administrator.",
                                   "Fire-safety escalation is appropriate once verified."))
        if evidence.get("people_in_vicinity") is True:
            recs.append(Recommendation("evacuate_area", "Consider initiating local evacuation procedures for the affected area.",
                                       "People are reported near the hazard."))

    if not recs:
        recs.append(Recommendation("review", "Review the incident and assign an appropriate responder.", "Default advisory action."))
    return recs


def primary_text(recs: List[Recommendation]) -> str:
    return recs[0].text if recs else ""
