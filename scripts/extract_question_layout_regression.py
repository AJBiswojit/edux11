#!/usr/bin/env python3
"""Extract faithful, renderer-shaped regression data from the supplied PDFs.

Requires PyMuPDF (``pymupdf``).  The source PDFs remain the authoritative
references; this script preserves their selectable question text and uses only
checked-in media assets that could be matched to an exact question diagram.
Usage:
  python scripts/extract_question_layout_regression.py JEE.pdf NEET.pdf \
    --out deliverables/question-layout-fix/fixtures
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pymupdf

PROFILES = {
    "jee": {
        "examName": "JEE Main Mock Test - Phase 2",
        "examId": "JEE-PHASE2-2026-10-31",
        "student": "SUJJAL KUMAR NATH",
        "rollNo": "260094",
        "date": "2026-10-31",
        "totalMarks": 300,
        "score": 67,
        "percentage": 22.3,
        "correct": 23,
        "incorrect": 26,
        "skipped": 26,
        "subjects": [
            {
                "name": "Physics", "score": 17, "maxMarks": 100, "accuracy": 28,
                "rank": 12, "difficulty": "Medium",
                "strongAreas": ["Acceleration Calculation", "Motion Under Gravity", "Acceleration-Time Graph"],
                "weakAreas": ["Kinematics Graphs", "Vertical Motion Under Gravity", "Consecutive Time Distances"],
            },
            {
                "name": "Chemistry", "score": 37, "maxMarks": 100, "accuracy": 44,
                "rank": 10, "difficulty": "Medium",
                "strongAreas": ["Electronic Configuration", "Nodes in Orbitals", "Aufbau Principle"],
                "weakAreas": ["Discovery of Subatomic Particles", "Orbital Energies and Penetration", "Photoelectric Effect and Ionization"],
            },
            {
                "name": "Mathematics", "score": 13, "maxMarks": 100, "accuracy": 20,
                "rank": 11, "difficulty": "Medium",
                "strongAreas": ["Trigonometric Identities", "Exponential Equations", "Telescoping Sums"],
                "weakAreas": ["Modulus Properties", "Cosine Series", "Euler Form"],
            },
        ],
        "mistakes": [
            {"category": "Unit Error", "count": 5},
            {"category": "Formula Error", "count": 6},
            {"category": "Knowledge Gap", "count": 3},
            {"category": "Calculation Error", "count": 11},
            {"category": "Incomplete Reasoning", "count": 1},
        ],
        "timeIntelligence": {
            "avgTimePerQuestion": "2.4", "navigationCount": 0, "timeManagementScore": 19.7,
            "fastestQuestion": {"q": "Q34", "time": "0.02"},
            "slowestQuestion": {"q": "Q1", "time": "29.43"},
            "distribution": [
                {"section": "Physics", "allocated": 180, "used": 92.5, "efficiency": 51.4},
                {"section": "Chemistry", "allocated": 180, "used": 30.5, "efficiency": 16.9},
                {"section": "Mathematics", "allocated": 180, "used": 57.1, "efficiency": 31.7},
            ],
        },
    },
    "neet": {
        "examName": "NEET Mock Paper Set - 2",
        "examId": "NEET-SET2-2026-09-07",
        "student": "AAHANA PATTANAIK",
        "rollNo": "260201",
        "date": "2026-09-07",
        "totalMarks": 720,
        "score": 418,
        "percentage": 58.1,
        "correct": 113,
        "incorrect": 34,
        "skipped": 33,
        "subjects": [
            {
                "name": "Physics", "score": 51, "maxMarks": 180, "accuracy": 35.6,
                "rank": 14, "difficulty": "Medium",
                "strongAreas": ["Position and Displacement", "Scalars and Vectors", "Average and Instantaneous Velocity"],
                "weakAreas": ["Position and Displacement", "Average and Instantaneous Velocity", "Acceleration"],
            },
            {
                "name": "Chemistry", "score": 75, "maxMarks": 180, "accuracy": 46.7,
                "rank": 6, "difficulty": "Medium",
                "strongAreas": ["Dalton's Atomic Theory", "Rutherford Model", "Thomson Model"],
                "weakAreas": ["Rutherford Model", "Thomson Model", "Isotopes"],
            },
            {
                "name": "Biology", "score": 292, "maxMarks": 360, "accuracy": 84.4,
                "rank": 5, "difficulty": "Medium",
                "strongAreas": ["Five Kingdom Classification", "Monera", "Protista"],
                "weakAreas": ["Five Kingdom Classification", "Monera", "Protista"],
            },
        ],
        "mistakes": [
            {"category": "Calculation Error", "count": 6},
            {"category": "Knowledge Gap", "count": 16},
            {"category": "Formula Error", "count": 3},
            {"category": "Conceptual Error", "count": 9},
        ],
        "timeIntelligence": {
            "avgTimePerQuestion": "1.03", "navigationCount": 0, "timeManagementScore": 58.1,
            "fastestQuestion": {"q": "Q177", "time": "0.07"},
            "slowestQuestion": {"q": "Q10", "time": "5.53"},
            "distribution": [
                {"section": "Physics", "allocated": 200, "used": 85.8, "efficiency": 42.9},
                {"section": "Chemistry", "allocated": 200, "used": 61.5, "efficiency": 30.8},
                {"section": "Biology", "allocated": 200, "used": 37.7, "efficiency": 18.9},
            ],
        },
    },
}

FIGURES = {
    "jee": {
        1: {"imageUrl": "/media/pdf_extract/phase2-jee/phy_q7_q09_stem.png"},
        2: {
            "imageUrl": "/media/pdf_extract/phase2-jee/phy_q8_q03_stem.png",
            "options": {
                "A": "/media/pdf_extract/phase2-jee/phy_q8_q03_opt_a.png",
                "B": "/media/pdf_extract/phase2-jee/phy_q8_q03_opt_b.png",
                "C": "/media/pdf_extract/phase2-jee/phy_q8_q03_opt_c.png",
                "D": "/media/pdf_extract/phase2-jee/phy_q8_q03_opt_d.png",
            },
        },
        3: {
            "options": {
                "A": "/media/pdf_extract/phase2-jee/phy_q8_q04_opt_a.png",
                "B": "/media/pdf_extract/phase2-jee/phy_q8_q04_opt_b.png",
                "C": "/media/pdf_extract/phase2-jee/phy_q8_q04_opt_c.png",
                "D": "/media/pdf_extract/phase2-jee/phy_q8_q04_opt_d.png",
            },
        },
        6: {"imageUrl": "/media/pdf_extract/phase2-jee/phy_q8_q09_stem.png"},
        16: {"imageUrl": "/media/pdf_extract/phase2-jee/phy_q10_q06_stem.png"},
        17: {"imageUrl": "/media/pdf_extract/phase2-jee/phy_q10_q07_cart_stem.png"},
        19: {"imageUrl": "/media/pdf_extract/phase2-jee/phy_q10_q01_stem.png"},
        20: {"imageUrl": "/media/pdf_extract/phase2-jee/phy_q10_q13_stem.png"},
        24: {"imageUrl": "/media/pdf_extract/phase2-jee/phy_q10_q07_stem.png"},
        45: {
            "options": {
                "A": "/media/pdf_extract/phase2-jee/chem_q9_q12_opt_a.png",
                "B": "/media/pdf_extract/phase2-jee/chem_q9_q12_opt_b.png",
                "C": "/media/pdf_extract/phase2-jee/chem_q9_q12_opt_c.png",
                "D": "/media/pdf_extract/phase2-jee/chem_q9_q12_opt_d.png",
            },
        },
    },
    "neet": {},
}

# PyMuPDF omits several equations and single math glyphs that the supplied
# reports draw as vector outlines. These overrides were transcribed from the
# rendered source pages so the regression fixtures retain those statements and
# any affected explanation text. Keys are the question numbers in the source.
SOURCE_OVERRIDES = {
    "jee": {
        28: {"text": "Which gas-phase atom in its ground state could have an electron with the quantum numbers n = 3, l = 2, m_l = 0, m_s = −1/2? (Given atomic numbers: Na = 11, Mg = 12, P = 15, Ti = 22)"},
        51: {"text": "The sum of all real values of x that satisfy the equation {x} + {x + 1/3} + {x + 2/3} = x, where {x} denotes the fractional part of x, is:"},
        52: {
            "text": "The sum to infinity of the series Σ(k = 1 to ∞) 6^k / [(3^k − 2^k)(3^(k+1) − 2^(k+1))] is:",
            "explanation": "Write the k-th term as 2^k/(3^k − 2^k) − 2^(k+1)/(3^(k+1) − 2^(k+1)). Check: the combined numerator is 2^k(3^(k+1) − 2^(k+1)) − 2^(k+1)(3^k − 2^k) = 3·6^k − 2·4^k − 2·6^k + 2·4^k = 6^k. The series telescopes: S = 2^1/(3^1 − 2^1) − lim(k→∞) 2^(k+1)/(3^(k+1) − 2^(k+1)) = 2/1 − 0 = 2.",
        },
        54: {"text": "Find the sum of all real values of x satisfying the equation (x² − 5x + 5)^(x² + 4x − 60) = 1."},
        57: {"text": "If S_n = Σ(r = 1 to n) r/(r⁴ + r² + 1), then lim(n→∞) S_n is equal to:"},
        59: {
            "text": "Let α, β be the roots of x² − x − 1 = 0. Let P_n = α^n + β^n. Which of the following is true?",
            "explanation": "Since α and β satisfy x² = x + 1, multiplying by x^(n−1) gives x^(n+1) = x^n + x^(n−1). Applying this to α and β and adding yields P_(n+1) = P_n + P_(n−1).",
        },
        61: {
            "text": "If z = e^(iθ) (z ≠ −1), then (z − 1)/(z + 1) is always:",
            "explanation": "(e^(iθ) − 1)/(e^(iθ) + 1) = [e^(iθ/2)(e^(iθ/2) − e^(−iθ/2))]/[e^(iθ/2)(e^(iθ/2) + e^(−iθ/2))] = 2i sin(θ/2)/(2 cos(θ/2)) = i tan(θ/2), which is purely imaginary.",
        },
        62: {
            "text": "The minimum value of the function f(x) = (x² + 14x + 9)/(x² + 2x + 3) for x ∈ ℝ is:",
            "explanation": "Let y = (x² + 14x + 9)/(x² + 2x + 3) ⇒ (y − 1)x² + 2(y − 7)x + (3y − 9) = 0. Since x ∈ ℝ, the discriminant D ≥ 0: 4(y − 7)² − 4(y − 1)(3y − 9) ≥ 0 ⇒ (y² − 14y + 49) − (3y² − 12y + 9) ≥ 0 ⇒ −2y² − 2y + 40 ≥ 0 ⇒ y² + y − 20 ≤ 0 ⇒ (y + 5)(y − 4) ≤ 0 ⇒ −5 ≤ y ≤ 4. Minimum value is −5.",
        },
        63: {"text": "The set of all real x for which log_(0.5)(x² − 5x + 6) > −1 is:"},
        68: {
            "text": "If 1, z₁, z₂, …, z_(n−1) are the n-th roots of unity, then (1 − z₁)(1 − z₂)…(1 − z_(n−1)) equals:",
            "explanation": "z^n − 1 = (z − 1)(z − z₁)(z − z₂)…(z − z_(n−1)). Dividing by (z − 1): z^(n−1) + z^(n−2) + … + z + 1 = (z − z₁)(z − z₂)…(z − z_(n−1)). Setting z = 1 yields 1 + 1 + … + 1 (n terms) = n.",
        },
        69: {
            "text": "The coefficient of x^n in the expansion of 1/[(1 − x)(1 − 2x)] is:",
            "explanation": "1/[(1 − x)(1 − 2x)] = 2/(1 − 2x) − 1/(1 − x) = 2Σ(k = 0 to ∞)(2x)^k − Σ(k = 0 to ∞)x^k. Therefore, the coefficient of x^n is 2^(n+1) − 1.",
        },
        71: {"text": "Let ω be a complex cube root of unity with ω ≠ 1. A fair die is thrown three times. If r₁, r₂, r₃ are the numbers obtained on the die, find the probability that ω^(r₁) + ω^(r₂) + ω^(r₃) = 0. (Multiply your final probability by 216 to get the integer answer)."},
        72: {"text": "Let S_n = 1 + 1/2 + 1/4 + 1/8 + … up to n terms. If 2 − S_n < 1/1000, find the minimum integral value of n."},
    },
    "neet": {
        5: {"text": "A particle moves on a circular path of radius r. It completes one revolution in 40 s. Calculate the distance covered in 2 min 20 s."},
        7: {"text": "An athlete completes one round of a circular track of radius R in 40 s. What will be his displacement at the end of 2 min 20 s?"},
        8: {"text": "A person moves 30 m north, then 20 m towards east, and finally 30√2 m in the south-west direction. The displacement of the person from the origin will be:"},
        9: {"text": "If a car covers 2/5 of the total distance with speed v₁ and 3/5 of the distance with speed v₂, then the average speed is:"},
        13: {"text": "A car travels a distance d (in km) on a straight road in two hours and then returns to the starting point in the next three hours. Its average speed (in km/h) is:"},
        18: {"text": "Motion of a particle is described by the equation x = a + bt², where a = 15 cm and b = 3 cm/s². Its instantaneous velocity at time t = 3 s will be:"},
        19: {"text": "If for a particle, position x ∝ t, then:"},
        20: {"text": "A car moves along a straight line whose position is given by S = 12t + 3t² − 2t³, where S is in meters and t is in seconds. The velocity of the car at the start will be:"},
        21: {"text": "A particle located at position x = 0 at time t = 0 starts moving along the positive x-direction with a velocity v that varies as v = α√x. The velocity of the particle varies with time t as (α is a constant):"},
        22: {"text": "The velocity (v) of a body depends on time (t) according to the equation v = 20 + 0.1t. The body has:"},
        23: {"text": "A particle moves along a straight line such that its displacement (s) at any time t is given by s = t³ − 6t² + 3t + 4 metres. The displacement when the acceleration is zero is:"},
        25: {"text": "The displacement of a particle starting from rest (at t = 0) is given by s = 6t² − t³. The time (in seconds) at which the particle will attain zero velocity again is:"},
        26: {"text": "The displacement of a particle starting from rest (at t = 0) is given by s = 6t² − t³. The time when the particle will attain zero acceleration is:"},
        29: {"text": "A body starts from rest and moves with a uniform acceleration of 5 m/s² for 5 seconds. During the next 10 seconds, it moves with uniform velocity. The total distance travelled by the body is:"},
        30: {"text": "Due to an acceleration of 2 m/s², the velocity of a body increases from 20 m/s to 30 m/s over a certain period. Find the displacement (in m) of the body in that period."},
        31: {"text": "A particle moving with acceleration 4 m/s² along the x-axis covers 20 m in the 4th second. Find the distance covered by the particle in the 3rd and 5th seconds:"},
        32: {"text": "A car moving with speed v on a straight road can be stopped within a distance d on applying brakes. If the same car is moving with speed 3v and the brakes provide half the retardation, then the car will stop after travelling a distance of:"},
        35: {"text": "The angle between vectors (A × B) and (B × A) is:"},
        36: {"text": "A force F = 5i + 6j + 4k acting on a body produces a displacement S = 6i − 5k. The work done (W = F · S) by the force is:"},
        37: {"text": "For any two vectors A and B, if A · B = |A × B|, then the magnitude of A + B is equal to:"},
        38: {"text": "The angle between the two vectors A = 3i + 4j + 5k and B = 3i + 4j − 5k will be:"},
        39: {"text": "If a vector (2i + 3j + 8k) is perpendicular to the vector (−4i + 4j + αk), then the value of α is:"},
        40: {"text": "Two vectors A and B are such that |A + B| = |A − B|. The angle between the two vectors is:"},
        41: {"text": "A and B are two vectors and θ is the angle between them. If |A × B| = √3(A · B), the value of θ is:"},
        42: {"text": "The angle between the vectors A and B is θ. The value of the triple product A · (B × A) is:"},
        43: {"text": "Assertion (A): Vector addition is commutative. Reason (R): (A + B) ≠ (B + A)."},
        45: {"text": "A car covers AB distance with first one-third at velocity v₁, second one-third at velocity v₂ and last one-third at velocity v₃. If v₃ = 3v₁, v₂ = 2v₁ and v₁ = 11 m s⁻¹, then the average velocity of the car is:"},
        59: {"text": "Imagine that in an atom about 50% of the space is occupied by the atomic nucleus. If a silver foil is bombarded with α-particles, the majority of the α-particles would:"},
        61: {"text": "Rutherford's α-particle scattering experiments led to the conclusion that:"},
        62: {"text": "Statement I: Thomson proposed that an atom possesses a spherical shape in which the positive charge is uniformly distributed. Statement II: The radius of the atom is approximately 10⁻¹⁰ m."},
        63: {
            "text": "Which of these is incorrect?",
            "options": [
                {"key": "a", "text": "Thomson proposed that an atom consists of a uniform sphere of positive charge in which the electrons are distributed more or less uniformly."},
                {"key": "b", "text": "According to Rutherford's model, an atom consists of a heavy positively charged nucleus where all the protons and neutrons are present."},
                {"key": "c", "text": "The volume of the nucleus is very small and is only a minute fraction of the total volume of the atom."},
                {"key": "d", "text": "The number of electrons in an atom is not equal to the number of protons present in the nucleus."},
            ],
        },
        71: {
            "text": "Match List-I with List-II. List-I: A. Ge-76 and As-77, B. Fe-57 and Fe-58, C. N³⁻ and Al³⁺, D. H-3 and He-3. List-II: I. Isotopes, II. Isoelectronic (10 electrons), III. Isobars, IV. Isotones.",
            "explanation": "Ge-76 and As-77 both have 44 neutrons (isotones); Fe-57 and Fe-58 are the same element with different neutron numbers (isotopes); N³⁻ and Al³⁺ both have 10 electrons (isoelectronic); H-3 and He-3 have the same mass number 3 (isobars).",
        },
        80: {"text": "The molar composition of the universe may be 90% H₂ and 10% He. The average molecular mass of the universe should be:"},
        82: {"text": "A gaseous mixture contains 70% N₂ and 30% of an unknown gas, by volume. If the average molecular mass of the gaseous mixture is 37.60, the molecular mass of the unknown gas is:"},
        83: {"text": "The average molecular mass of a mixture of gases containing dinitrogen and carbon dioxide is 36. The mixture contains 280 g of dinitrogen; therefore, the amount of CO₂ present in the mixture is:"},
        84: {"text": "The molecular formula of a compound is X₄O₉. If the compound contains 40% X by mass, what is the atomic mass of X?"},
        85: {"text": "If the mass of a proton is doubled and that of a neutron is halved, the molecular weight of CO₂ (consisting only of C-12 and O-16 atoms) will:"},
        89: {"text": "The mass of 3.2 × 10⁵ atoms of an element is 8.0 × 10⁻¹⁸ g. The molar mass of the element is about (N_A = 6 × 10²³):"},
        90: {
            "text": "Calculate the number of neutrons present in 12 × 10²⁵ atoms of oxygen (¹⁷₈O):",
            "explanation": "Each oxygen-17 atom contains 9 neutrons (17 − 8 = 9). For $12 \\times 10^{25}$ atoms, this equals 200 moles of atoms, giving $200 \\times 9 \\times N_A = 1800N_A$ neutrons.",
        },
        125: {"text": "What is NOT true about Euglena?"},
        140: {"text": "Water → Ostia → Spongocoel → Osculum. The above pathway of water helps in:"},
        159: {"text": "Ctenoplana and Pleurobrachia are examples of phylum:"},
        160: {"text": "Female Ascaris can be identified on the basis of:"},
    },
}

SUBJECT_NAMES = {
    "jee": ["Physics", "Chemistry", "Mathematics"],
    "neet": ["Physics", "Chemistry", "Biology"],
}

SOURCE_DISCREPANCIES = {
    "jee": [],
    "neet": [
        {
            "questionNumber": 84,
            "markedAnswer": "B",
            "markedOption": "12",
            "explanationOption": "A",
            "explanationValue": "24",
            "handling": "Preserved as printed; not reconciled.",
        },
    ],
}

HEADER_RE = re.compile(r"^.*\s·\sQ\d+\s·\s(?:question|explanation) continued$", re.I)
QUESTION_RE = re.compile(r"^QUESTION\s+(\d{1,3})\s*$", re.I | re.M)
TIME_RE = re.compile(r"^(?:(\d+)\s*m(?:\s*(\d{1,2})\s*s)?|(\d+)\s*s)$", re.I)


def clean_lines(text: str, profile: dict) -> list[str]:
    lines = []
    exam_name = profile["examName"]
    student = profile["student"]
    for raw in text.splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if not line:
            continue
        if line in {"MediXO EduX", "FULL EXAM ANALYSIS", "All Subjects", exam_name}:
            continue
        if line.upper().startswith(student.upper()) or re.match(r"^PAGE\s+\d+\s*$", line, re.I):
            continue
        if re.fullmatch(r"/\s*\d+", line):
            continue
        if HEADER_RE.match(line):
            continue
        lines.append(line)
    # A subject band can follow the final question on a page; it belongs to
    # the next subject, not to the explanation in this question block.
    clean = []
    i = 0
    while i < len(lines):
        known_subjects = SUBJECT_NAMES.get("jee", []) + SUBJECT_NAMES.get("neet", [])
        if (re.fullmatch(r"\d{2}", lines[i]) and i + 2 < len(lines)
                and lines[i + 1] in known_subjects
                and re.fullmatch(r"\d+ questions", lines[i + 2], re.I)):
            i += 3
            continue
        clean.append(lines[i])
        i += 1
    return clean


def join_text(lines: list[str]) -> str:
    out = ""
    for line in lines:
        if not out:
            out = line
        elif out.endswith("-"):
            out += line
        else:
            out += " " + line
    return re.sub(r"\s+", " ", out).strip()


def parse_time_minutes(text: str) -> float:
    text = text.strip()
    match = TIME_RE.match(text)
    if match:
        if match.group(3):
            return int(match.group(3)) / 60
        return int(match.group(1) or 0) + int(match.group(2) or 0) / 60
    try:
        return float(text)
    except ValueError:
        return 0.0


def parse_marks(text: str) -> int | float:
    normalized = text.replace("−", "-").replace("–", "-")
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*marks?", normalized, re.I)
    if not match:
        return 0
    value = float(match.group(1))
    return int(value) if value.is_integer() else value


def parse_question_blocks(doc, key: str) -> list[dict]:
    full_text = "\n".join(page.get_text("text") or "" for page in doc)
    matches = list(QUESTION_RE.finditer(full_text))
    expected = 75 if key == "jee" else 180
    if len(matches) != expected:
        raise ValueError(f"{key}: expected {expected} question headings in source, found {len(matches)}")
    profile = PROFILES[key]
    out = []
    for pos, match in enumerate(matches):
        end = matches[pos + 1].start() if pos + 1 < len(matches) else len(full_text)
        lines = clean_lines(full_text[match.end():end], profile)
        if len(lines) < 4:
            raise ValueError(f"{key} Q{pos + 1}: incomplete extracted question block")

        subject_index = next((
            index for index, line in enumerate(lines)
            if any(line.casefold() == name.casefold() for name in SUBJECT_NAMES[key])
        ), 0)
        subject_line = lines[subject_index]
        subject = next((name for name in SUBJECT_NAMES[key] if subject_line.casefold() == name.casefold()), "")
        if subject_index + 2 >= len(lines):
            raise ValueError(f"{key} Q{pos + 1}: subject/status/meta missing")
        status = lines[subject_index + 1]
        meta_line = lines[subject_index + 2]
        meta = [part.strip() for part in meta_line.split("·")]
        statement_start = subject_index + 3
        time_text = meta[-1] if meta else ""
        # The metadata line can wrap its duration onto the next line (for
        # example, `0 marks ·` followed by `33s`). Treat that wrapped duration
        # as metadata rather than leaking it into the question stem.
        if not TIME_RE.fullmatch(time_text) and meta_line.rstrip().endswith("·") and statement_start < len(lines):
            first_time_line = lines[statement_start]
            if TIME_RE.fullmatch(first_time_line):
                time_text = first_time_line
                statement_start += 1
                if (
                    re.fullmatch(r"\d+\s*m", first_time_line, re.I)
                    and statement_start < len(lines)
                    and re.fullmatch(r"\d{1,2}\s*s", lines[statement_start], re.I)
                ):
                    time_text += " " + lines[statement_start]
                    statement_start += 1
                meta[-1] = time_text
        chapter = meta[0] if meta else ""
        topic = meta[1] if len(meta) > 1 else ""
        difficulty = meta[2] if len(meta) > 2 and meta[2] in {"Easy", "Medium", "Hard", "Very Hard"} else ""
        kind = meta[3] if len(meta) > 3 else ""
        marks = parse_marks(meta[-2]) if len(meta) >= 2 else 0
        time_minutes = parse_time_minutes(time_text) if meta else 0

        try:
            options_start = lines.index("OPTIONS", statement_start)
        except ValueError:
            options_start = -1
        try:
            response_start = lines.index("STUDENT RESPONSE", statement_start)
        except ValueError:
            response_start = len(lines)
        statement_end = options_start if options_start >= 0 else response_start
        statement = join_text(lines[statement_start:statement_end])

        options = []
        if options_start >= 0:
            option_lines = lines[options_start + 1:response_start]
            current = None
            for line in option_lines:
                label = re.fullmatch(r"([A-H])\.", line)
                if label:
                    if current:
                        current["text"] = join_text(current.pop("_lines"))
                        options.append(current)
                    current = {"key": label.group(1).lower(), "text": "", "_lines": []}
                elif current is not None:
                    current["_lines"].append(line)
            if current:
                current["text"] = join_text(current.pop("_lines"))
                options.append(current)

        def between(start_label: str, end_labels: list[str]) -> list[str]:
            try:
                start = lines.index(start_label, subject_index + 3) + 1
            except ValueError:
                return []
            end_positions = [lines.index(label, start) for label in end_labels if label in lines[start:]]
            return lines[start:min(end_positions)] if end_positions else lines[start:]

        response_lines = between("STUDENT RESPONSE", ["CORRECT ANSWER", "PERFORMANCE INSIGHT", "EXPLANATION", "MISTAKE NOTE"])
        correct_lines = between("CORRECT ANSWER", ["PERFORMANCE INSIGHT", "EXPLANATION", "MISTAKE NOTE"])
        insight_lines = between("PERFORMANCE INSIGHT", ["EXPLANATION", "MISTAKE NOTE"])
        explanation_lines = between("EXPLANATION", ["MISTAKE NOTE"])
        mistake_lines = between("MISTAKE NOTE", [])
        insight = join_text(insight_lines)
        mistake_category = ""
        insight_parts = [part.strip() for part in insight.split("·")]
        if len(insight_parts) >= 3:
            mistake_category = insight_parts[1]
        selected_text = join_text(response_lines)
        selected = None if re.search(r"not attempted|unattempted", selected_text, re.I) else selected_text
        correct_answer = join_text(correct_lines)

        record = {
            "q": f"Q{pos + 1}",
            "subject": subject,
            "chapter": chapter,
            "topic": topic,
            "difficulty": difficulty,
            "type": kind,
            "status": status,
            "marks": marks,
            "time": round(time_minutes, 6),
            "text": statement,
            "selected": selected,
            "correctAnswer": correct_answer,
            "mistakeCategory": mistake_category,
            "mistakeHint": join_text(mistake_lines),
            "explanation": join_text(explanation_lines),
            "options": options,
        }
        record.update(SOURCE_OVERRIDES[key].get(pos + 1, {}))
        figure = FIGURES[key].get(pos + 1, {})
        if figure.get("imageUrl"):
            record["imageUrl"] = figure["imageUrl"]
        for option in record["options"]:
            url = figure.get("options", {}).get(option["key"].upper())
            if url:
                option["imageUrl"] = url
        out.append(record)
    return out


def parse_chapters(doc, key: str) -> list[dict]:
    page_text = doc[3].get_text("text") or ""
    lines = [re.sub(r"\s+", " ", line).strip() for line in page_text.splitlines() if line.strip()]
    try:
        start = lines.index("MASTERY") + 1
    except ValueError:
        raise ValueError(f"{key}: chapter mastery table header not found")
    names = SUBJECT_NAMES[key]
    rows = []
    subject = ""
    pending = []
    i = start
    while i < len(lines):
        line = lines[i]
        if line in names:
            subject = line
            pending = []
            i += 1
            continue
        if re.fullmatch(r"\d+(?:\.\d+)?%", line):
            if i + 3 >= len(lines):
                break
            chapter = " ".join(pending).strip() or subject
            # A wrapped row name can repeat its subject after a page break.
            if chapter == subject:
                chapter = subject
            try:
                accuracy = float(line.rstrip("%"))
                marks = float(lines[i + 1])
                if marks.is_integer():
                    marks = int(marks)
            except ValueError:
                pending = []
                i += 1
                continue
            time = parse_time_minutes(lines[i + 2])
            mastery = lines[i + 3]
            if mastery not in {"Critical", "Weak", "Average", "Strong"}:
                break
            rows.append({
                "chapter": chapter, "subject": subject, "accuracy": accuracy,
                "marks": marks, "time": round(time, 6), "mastery": mastery,
            })
            pending = []
            i += 4
            continue
        if line.startswith(("PACE INTELLIGENCE", "Time intelligence", "Chapter time consumption")):
            break
        if line not in {"CHAPTER", "ACCURACY", "MARKS", "TIME", "MASTERY"}:
            pending.append(line)
        i += 1
    if not rows:
        raise ValueError(f"{key}: no chapter rows extracted")
    return rows


def build_data(doc, key: str) -> dict:
    profile = PROFILES[key]
    questions = parse_question_blocks(doc, key)
    chapters = parse_chapters(doc, key)
    elapsed = int(round(sum(float(q.get("time") or 0) for q in questions) * 60))
    meta = {
        "examId": profile["examId"],
        "examName": profile["examName"],
        "course": "JEE Main" if key == "jee" else "NEET (UG)",
        "pattern": "JEE Main (Paper 1)" if key == "jee" else "NEET (UG)",
        "student": profile["student"],
        "rollNo": profile["rollNo"],
        "date": profile["date"],
        "totalMarks": profile["totalMarks"],
        "duration": "3 hrs",
        "sections": SUBJECT_NAMES[key],
        "examStatus": "Completed",
    }
    max_rank = {"jee": 11, "neet": 7}[key]
    hero = {
        "score": profile["score"],
        "maxScore": profile["totalMarks"],
        "percentage": profile["percentage"],
        "grade": "D" if key == "jee" else "C",
        "rank": max_rank,
        "batchRank": max_rank,
        "cohortSize": 51 if key == "jee" else 55,
        "percentile": "",
        "overallAccuracy": 46.94 if key == "jee" else 76.87,
        "overallSpeed": 2.4 if key == "jee" else 1.03,
        "confidenceIndex": 46.9 if key == "jee" else 76.9,
        "readinessScore": 19.7 if key == "jee" else 58.1,
        "healthScore": 19.7 if key == "jee" else 58.1,
        "badge": "Completed",
        "aiSummary": "",
    }
    qi = {
        "total": len(questions),
        "attempted": profile["correct"] + profile["incorrect"],
        "correct": profile["correct"],
        "incorrect": profile["incorrect"],
        "skipped": profile["skipped"],
        "negativeMarks": 25 if key == "jee" else 34,
        "guessAttempts": 0,
        "attemptRatio": round((profile["correct"] + profile["incorrect"]) / len(questions) * 100, 1),
    }
    mistakes = [
        {"q": row["q"], "subject": row["subject"],
         "detail": " · ".join(part for part in [row.get("mistakeCategory"), row.get("topic")] if part)}
        for row in questions if row.get("mistakeCategory")
    ]
    return {
        "meta": meta,
        "hero": hero,
        "questionIntelligence": qi,
        "attempt": {"elapsedSeconds": elapsed},
        "subjects": profile["subjects"],
        "chapters": chapters,
        "mistakes": profile["mistakes"],
        "mistakeList": mistakes,
        "questionReview": questions,
        "timeIntelligence": profile["timeIntelligence"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("jee_pdf", type=Path)
    parser.add_argument("neet_pdf", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for key, source in (("jee", args.jee_pdf), ("neet", args.neet_pdf)):
        data = build_data(pymupdf.open(source), key)
        payload = {
            "reference": {
                "file": source.name,
                "pageCount": pymupdf.open(source).page_count,
                "questionCount": len(data["questionReview"]),
                "figureAssetMappings": sum(
                    bool(question.get("imageUrl")) + sum(bool(option.get("imageUrl")) for option in question.get("options", []))
                    for question in data["questionReview"]
                ),
                "manualMathRestorations": [
                    f"Q{number}" for number in sorted(SOURCE_OVERRIDES[key])
                ],
                "sourceDiscrepancies": SOURCE_DISCREPANCIES[key],
                "note": "Question text and page references were extracted from the supplied PDF. Math glyphs omitted by the PDF text layer were restored from rendered source pages; only source-matched, checked-in question figures are attached. Known source discrepancies are preserved rather than reconciled.",
            },
            "data": data,
        }
        path = args.out / f"{key}-phase2-regression.json" if key == "jee" else args.out / "neet-set2-regression.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{path}: {len(data['questionReview'])} questions, {len(data['chapters'])} chapters")


if __name__ == "__main__":
    main()
