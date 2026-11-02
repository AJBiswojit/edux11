"""Named 360 bands. Same rules as the existing faculty engines.

Accuracy: frontend `CHAPTER_LEVELS` in exam-agent.js (Strong 75 / Developing 55).
Student trend: `deriveStudentStatus` in students-directory.js (±8).
Chapter trend: `classifyChapterTrend` in exam-attempt-intelligence.js (±12).
Time flags: `computeStudentStrengthsWeaknesses` in student-360.js (fast ≤60s, high ≥100s).
"""

from app.exam_engine.catalog import competitive_families, scheme_for_family

STRONG_ACCURACY = 75
DEVELOPING_ACCURACY = 55
STUDENT_TREND_POINTS = 8
CHAPTER_TREND_POINTS = 12
FAST_SECONDS = 60
HIGH_TIME_SECONDS = 100
SLOW_SUBJECT_RATIO = 1.4
MIN_EVIDENCE_ATTEMPTED = 2

UNIVERSITY_DOMAIN = "University"
DOMAINS = (UNIVERSITY_DOMAIN, *competitive_families())


def subject_sort_key(name: str, family: str | None) -> tuple[int, str]:
    scheme = scheme_for_family(family)
    if scheme:
        for index, spec in enumerate(scheme.subjects):
            if spec.name == name:
                return (index, name)
        return (len(scheme.subjects), name)
    return (0, name)
