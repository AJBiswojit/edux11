"""Intervention display helpers matching the SPA contract.

Similar-issue grouping is computed in similar_issues_runtime from SQL evidence.
This module only formats persisted/derived records and status transitions.
"""

from __future__ import annotations

from datetime import datetime, timezone


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_similar_issues(students: list[dict]) -> dict:
    """Directory-only grouping is retired. Empty unless SQL evidence is used."""
    return {
        "groups": [],
        "individuals": [],
        "count": 0,
        "individualCount": 0,
        "demoExcluded": True,
        "note": "Derived from exam attempts and DNA. Empty when there is no weak-chapter evidence.",
    }


def intervention_from_group(group: dict, override: dict | None = None) -> dict:
    override = override or {}
    status = override.get("status") or "Detected"
    students = override.get("studentIds") or group.get("studentIds") or [s.get("studentId") for s in group.get("students") or []]
    return {
        "id": group["id"],
        "groupId": group["id"],
        "title": f"{group['subject']} — {group['chapter']}",
        "issue": f"{(group.get('examFamily') + ' ') if group.get('examFamily') else ''}{group['subject']} — {group['chapter']}",
        "issueType": group["issueType"],
        "domain": group["domain"],
        "examFamily": group.get("examFamily"),
        "subject": group["subject"],
        "chapter": group["chapter"],
        "priority": override.get("priority") or group.get("priority") or "Medium",
        "status": status,
        "students": len(students),
        "studentCount": len(students),
        "studentIds": students,
        "studentList": group.get("students") or [],
        "objectives": override.get("objectives")
        or [
            f"Achieve ≥70% accuracy on {group['chapter']} questions",
            "Reduce average solving time below 100 seconds per question",
        ],
        "practiceConfig": override.get("practiceConfig")
        or {
            "type": "Targeted Practice",
            "count": 8,
            "difficulty": "Medium",
            "duration": 20,
            "includePyq": True,
        },
        "evidence": group.get("evidence"),
        "whyDetected": group.get("whyDetected"),
        "recommendation": group.get("recommendation"),
        "notes": override.get("notes"),
        "action": override.get("action"),
        "baseline": {"accuracy": group.get("avgAccuracy"), "avgTime": group.get("avgTime"), "incorrect": group.get("totalIncorrect")},
        "effectiveness": override.get("effectiveness"),
        "assignedAt": override.get("assignedAt"),
        "completedAt": override.get("completedAt"),
        "updatedAt": override.get("updatedAt") or _iso(),
        "createdAt": override.get("createdAt") or _iso(),
        "persisted": False,
        "source": "derived",
    }


TRANSITIONS = {
    "Detected": ["Recommended", "Dismissed"],
    "Recommended": ["Approved", "Dismissed"],
    "Approved": ["Planned", "Dismissed"],
    "Planned": ["Assigned", "Dismissed"],
    "Assigned": ["In Progress", "Dismissed"],
    "In Progress": ["Completed"],
    "Completed": ["Re-test Pending"],
    "Re-test Pending": ["Evaluating"],
    "Evaluating": ["Resolved", "Improving", "Persistent"],
    "Resolved": [],
    "Improving": [],
    "Persistent": [],
    "Dismissed": [],
}


def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in TRANSITIONS.get(from_status, [])
