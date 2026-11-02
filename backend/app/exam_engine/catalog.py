"""Official JEE / NEET paper schemes used for program result sheets."""

from __future__ import annotations

from dataclasses import dataclass

from app.services.exam_family import normalize_exam_family


@dataclass(frozen=True)
class SubjectScheme:
    code: str
    name: str
    questions: int


@dataclass(frozen=True)
class ExamScheme:
    family: str
    title: str
    total_questions: int
    correct_marks: int
    wrong_marks: int
    subjects: tuple[SubjectScheme, ...]

    @property
    def max_marks(self) -> int:
        return self.total_questions * self.correct_marks

    @property
    def subject_codes(self) -> tuple[str, ...]:
        return tuple(s.code for s in self.subjects)


JEE_MAIN_2026 = ExamScheme(
    family="JEE",
    title="JEE (Main) 2026",
    total_questions=75,
    correct_marks=4,
    wrong_marks=-1,
    subjects=(
        SubjectScheme("PHY", "Physics", 25),
        SubjectScheme("CHM", "Chemistry", 25),
        SubjectScheme("MATH", "Mathematics", 25),
    ),
)

NEET_2026 = ExamScheme(
    family="NEET",
    title="NEET (UG) 2026",
    total_questions=180,
    correct_marks=4,
    wrong_marks=-1,
    subjects=(
        SubjectScheme("PHY", "Physics", 45),
        SubjectScheme("CHM", "Chemistry", 45),
        SubjectScheme("BOT", "Botany", 45),
        SubjectScheme("ZOL", "Zoology", 45),
    ),
)

_SCHEMES = {"JEE": JEE_MAIN_2026, "NEET": NEET_2026}

_ALIASES: dict[str, tuple[str, ...]] = {
    "PHY": ("phy", "physics", "phys", "jee physics", "neet physics"),
    "CHM": ("chm", "chem", "chemistry", "che", "jee chemistry", "neet chemistry"),
    "MATH": ("math", "maths", "mathematics", "mat", "jee maths", "jee mathematics"),
    "BOT": ("bot", "botany", "plant", "plant physiology", "plant kingdom"),
    "ZOL": ("zol", "zoo", "zoology", "animal", "human physiology", "animal kingdom"),
}

_BIO_BOTANY_HINTS = (
    "botany",
    "plant",
    "photosynth",
    "angiosperm",
    "pteridophyt",
    "bryophyt",
    "algae",
    "morphology of flowering",
    "anatomy of flowering",
    "mineral nutrition",
    "respiration in plants",
    "transport in plants",
)
_BIO_ZOOLOGY_HINTS = (
    "zoology",
    "animal",
    "human",
    "frog",
    "cockroach",
    "earthworm",
    "locomotion",
    "neural",
    "endocrine",
    "reproduction",
    "immunity",
    "digestion",
    "circulation",
    "excretion",
    "breathing",
)


def scheme_for_family(family: str | None) -> ExamScheme | None:
    code = normalize_exam_family(family)
    if not code:
        return None
    return _SCHEMES.get(code)


def competitive_families() -> tuple[str, ...]:
    return tuple(_SCHEMES)


def display_subject_name(raw: str | None, *, family: str | None = None) -> str | None:
    """Return the scheme subject name only when `raw` is the subject itself.

    Chapter titles that merely mention a subject (for example 'chemical combination')
    are not mapped. Uses official scheme names/codes and the catalog alias list.
    """
    if raw is None or str(raw).strip() == "":
        return None
    blob = " ".join(str(raw).lower().replace("-", " ").replace("_", " ").split())
    family_code = normalize_exam_family(family)
    schemes = [scheme_for_family(family_code)] if family_code else list(_SCHEMES.values())
    schemes = [scheme for scheme in schemes if scheme]
    if not schemes:
        schemes = list(_SCHEMES.values())
    for scheme in schemes:
        prefix = scheme.family.lower()
        rest = blob[len(prefix):].strip() if blob.startswith(prefix + " ") or blob == prefix else blob
        if blob.startswith(prefix) and blob != prefix and not blob.startswith(prefix + " "):
            rest = blob[len(prefix):].strip()
        for spec in scheme.subjects:
            aliases = {spec.name.lower(), spec.code.lower(), *(_ALIASES.get(spec.code) or ())}
            if blob in aliases or rest in aliases:
                return spec.name
    return None


def map_subject_code(raw: str | None, *, family: str | None = None, chapter: str | None = None, topic: str | None = None) -> str | None:
    blob = " ".join(part for part in (raw, chapter, topic) if part).strip().lower()
    if not blob:
        return None
    family_code = normalize_exam_family(family)
    if family_code == "NEET" and "bio" in blob:
        if any(h in blob for h in _BIO_BOTANY_HINTS):
            return "BOT"
        if any(h in blob for h in _BIO_ZOOLOGY_HINTS):
            return "ZOL"
        if "bot" in blob:
            return "BOT"
        if "zoo" in blob or "zol" in blob:
            return "ZOL"
        return None
    for code, aliases in _ALIASES.items():
        if family_code == "JEE" and code in {"BOT", "ZOL"}:
            continue
        if family_code == "NEET" and code == "MATH":
            continue
        if any(alias == blob or alias in blob.split() or blob.startswith(alias) for alias in aliases):
            return code
        if any(alias in blob for alias in aliases if len(alias) >= 4):
            return code
    compact = blob.replace(" ", "")
    for code, aliases in _ALIASES.items():
        if compact == code.lower() or compact in aliases:
            return code
    return None
