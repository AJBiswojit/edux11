"""Canonical JEE / NEET labels from messy stored exam_family values."""


def normalize_exam_family(raw: str | None) -> str | None:
    """Collapse stored family labels (jee, JEE_MAIN, NEET-UG, …) to JEE | NEET."""
    label = str(raw or "").strip().upper().replace("_", " ").replace("-", " ")
    if not label:
        return None
    if "NEET" in label:
        return "NEET"
    if "JEE" in label:
        return "JEE"
    return None
