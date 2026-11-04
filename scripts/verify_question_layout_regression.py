#!/usr/bin/env python3
"""Independently verify source-faithful Full Analysis regression PDFs.

Requires PyMuPDF and Pillow. This reopens the supplied source PDFs, generated
PDFs, fixtures and renderer audit; it checks every question field, math option,
section label, chapter-table header, figure ratio and layout-audit result, then
writes before/after contact sheets and verification-results.json.

Usage:
  python scripts/verify_question_layout_regression.py JEE.pdf NEET.pdf
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DELIVERABLES = ROOT / "deliverables" / "question-layout-fix"
PREVIEWS = DELIVERABLES / "previews"
QUESTION_HEADING = re.compile(r"^[ \t]*QUESTION[ \t]+0*(\d{1,3})[ \t]*$", re.I | re.M)
MATH_DELIMITED = re.compile(r"(?<!\\)\$(.+?)\$", re.S)
SECTION_MARKERS = [
    ("01", "PERFORMANCE INTELLIGENCE", "PERFORMANCE INTELLIGENCE"),
    ("02", "MASTERY MAP", "SUBJECT AND CHAPTER MASTERY"),
    ("03", "PACE INTELLIGENCE", "TIME INTELLIGENCE"),
    ("04", "QUESTION ANALYSIS", "QUESTION-BY-QUESTION ANALYSIS"),
    ("05", "LEARNING INTELLIGENCE", "LEARNING INTELLIGENCE"),
]
SECTION_LABELS = [
    "01 Performance Intelligence",
    "02 Subject and Chapter Mastery",
    "03 Time Intelligence",
    "04 Question Analysis",
    "05 Learning Intelligence",
]
TABLE_HEADERS = ["CHAPTER", "ACCURACY", "MARKS", "TIME", "MASTERY"]
REPORTS = [
    {
        "key": "jee-phase2",
        "fixture": "fixtures/jee-phase2-regression.json",
        "after": "after/jee-phase2-full-analysis.pdf",
        "source_count": 75,
        "figure_count": 20,
    },
    {
        "key": "neet-set2",
        "fixture": "fixtures/neet-set2-regression.json",
        "after": "after/neet-set2-full-analysis.pdf",
        "source_count": 180,
        "figure_count": 0,
    },
]


def flatten(value: str) -> str:
    return " ".join(str(value or "").split())


def tokens(value: str) -> list[str]:
    value = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return re.findall(r"[^\W_]+", value, flags=re.UNICODE)


def ordered_coverage(expected: str, actual: str) -> tuple[float, list[str]]:
    wanted = tokens(expected)
    available = tokens(actual)
    cursor = 0
    missing = []
    for token in wanted:
        try:
            cursor = available.index(token, cursor) + 1
        except ValueError:
            missing.append(token)
    return (1 - len(missing) / len(wanted)) if wanted else 1.0, missing


def normalized_tex(value: str) -> str:
    return re.sub(r"\s+", "", str(value or "")).casefold()


def plain_without_tex(value: str) -> str:
    return MATH_DELIMITED.sub(" ", str(value or ""))


def pdf_texts(pdf) -> list[str]:
    return [page.get_text("text") or "" for page in pdf]


def question_pages(texts: list[str]) -> dict[int, int]:
    pages: dict[int, int] = {}
    for page_number, text in enumerate(texts, start=1):
        for match in QUESTION_HEADING.finditer(text):
            pages.setdefault(int(match.group(1)), page_number)
    return pages


def chapter_header(pdf) -> dict:
    for page_number, page in enumerate(pdf, start=1):
        text = page.get_text("text") or ""
        if "CHAPTER MASTERY" not in text.upper() or "GROUPED BY SUBJECT" not in text.upper():
            continue
        spans = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    label = span.get("text", "").strip().upper()
                    if label in TABLE_HEADERS:
                        spans.append({"label": label, "bbox": span["bbox"]})
        # PDFKit emits each table header as a separate text operation. Group
        # the five spans by their shared baseline rather than requiring a
        # single extraction line.
        for anchor in spans:
            y = float(anchor["bbox"][1])
            row = [span for span in spans if abs(float(span["bbox"][1]) - y) <= 1.5]
            labels = [span["label"] for span in row]
            if not set(TABLE_HEADERS).issubset(labels):
                continue
            ordered = sorted(row, key=lambda span: span["bbox"][0])
            ordered_labels = [span["label"] for span in ordered]
            non_overlapping = all(
                float(left["bbox"][2]) <= float(right["bbox"][0]) + 0.5
                for left, right in zip(ordered, ordered[1:])
            )
            return {
                "page": page_number,
                "line": " ".join(ordered_labels),
                "headerLabels": labels,
                "accuracyIsOneUnbrokenSpan": labels.count("ACCURACY") == 1,
                "columnsInLeftToRightOrder": ordered_labels == TABLE_HEADERS,
                "columnsDoNotOverlap": non_overlapping,
            }
    return {"page": None, "line": "", "headerLabels": [],
            "accuracyIsOneUnbrokenSpan": False,
            "columnsInLeftToRightOrder": False,
            "columnsDoNotOverlap": False}


def render_panel(pdf, page_number: int, caption: str, panel_w: int = 444,
                 panel_h: int = 650) -> Image.Image:
    page = pdf[page_number - 1]
    top = 30
    canvas = Image.new("RGB", (panel_w, panel_h), "#eef1f6")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, panel_w, top), fill="#15223a")
    draw.text((9, 7), caption[:68], fill="white")
    max_w, max_h = panel_w - 14, panel_h - top - 8
    scale = min(max_w / page.rect.width, max_h / page.rect.height)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    canvas.paste(image, ((panel_w - image.width) // 2, top + 3))
    return canvas


def find_chapter_page(texts: list[str]) -> int:
    for page_number, text in enumerate(texts, start=1):
        upper = text.upper()
        if "CHAPTER MASTERY" in upper and "GROUPED BY SUBJECT" in upper:
            return page_number
    return 1


def build_contact_sheet(key: str, source_pdf, after_pdf, source_texts: list[str],
                        after_texts: list[str], source_pages: dict[int, int],
                        after_pages: dict[int, int]) -> str:
    rows = []
    chapter_source = find_chapter_page(source_texts)
    chapter_after = find_chapter_page(after_texts)
    if key == "jee-phase2":
        rows = [
            ("Cover", 1, 1),
            ("Subject mastery and accuracy table", 3, 3),
            ("Chapter mastery table", chapter_source, chapter_after),
            ("Matched question figures · Q2", source_pages.get(2, 1), after_pages.get(2, 1)),
            ("Rendered series · Q52", source_pages.get(52, 1), after_pages.get(52, 1)),
            ("Restored logarithm · Q63", source_pages.get(63, 1), after_pages.get(63, 1)),
            ("Final pagination page", len(source_texts), len(after_texts)),
        ]
    else:
        rows = [
            ("Cover", 1, 1),
            ("Chapter mastery table", chapter_source, chapter_after),
            ("Restored radius variable · Q5", source_pages.get(5, 1), after_pages.get(5, 1)),
            ("Wrapped duration kept in metadata · Q27", source_pages.get(27, 1), after_pages.get(27, 1)),
            ("Split stem/options restored · Q63", source_pages.get(63, 1), after_pages.get(63, 1)),
            ("Isotope and charge matching · Q71", source_pages.get(71, 1), after_pages.get(71, 1)),
            ("Atom-count calculation · Q89", source_pages.get(89, 1), after_pages.get(89, 1)),
            ("Neutron-count notation · Q90", source_pages.get(90, 1), after_pages.get(90, 1)),
            ("Final pagination page", len(source_texts), len(after_texts)),
        ]
    panel_w, panel_h, gutter = 444, 650, 8
    sheet = Image.new("RGB", (panel_w * 2 + gutter, panel_h * len(rows) + gutter * (len(rows) + 1)), "#dce2ec")
    for index, (label, source_page, after_page) in enumerate(rows):
        y = gutter + index * (panel_h + gutter)
        left = render_panel(source_pdf, source_page, f"SOURCE · p.{source_page:02d} · {label}", panel_w, panel_h)
        right = render_panel(after_pdf, after_page, f"RENDERED · p.{after_page:02d} · {label}", panel_w, panel_h)
        sheet.paste(left, (0, y))
        sheet.paste(right, (panel_w + gutter, y))
    path = PREVIEWS / f"{key}-before-after-contact-sheet.jpg"
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, quality=92, optimize=True)
    return str(path.relative_to(ROOT))


def verify_one(spec: dict, source_path: Path, source_pdf, after_pdf,
               fixture: dict, audit: dict, generation: dict) -> tuple[dict, list[str]]:
    key = spec["key"]
    problems: list[str] = []
    data = fixture["data"]
    questions = data["questionReview"]
    source_texts = pdf_texts(source_pdf)
    after_texts = pdf_texts(after_pdf)
    full = "\n".join(after_texts)
    flat = flatten(full).upper()
    matches = list(QUESTION_HEADING.finditer(full))
    heading_ids = [int(match.group(1)) for match in matches]
    expected_ids = list(range(1, spec["source_count"] + 1))
    if heading_ids != expected_ids:
        problems.append(f"{key}: rendered question heading sequence is not 1..{spec['source_count']}")
    if len(questions) != spec["source_count"]:
        problems.append(f"{key}: fixture has {len(questions)} questions, expected {spec['source_count']}")

    content_checks = 0
    content_failures = []
    math_checks = 0
    math_failures = []
    components = audit.get("components", [])
    boxes = audit.get("boxes", [])
    math_boxes = [box for box in boxes if box.get("kind") == "math"]
    for index, match in enumerate(matches):
        q_number = int(match.group(1))
        end = matches[index + 1].start() if index + 1 < len(matches) else len(full)
        segment = full[match.end():end]
        question = questions[q_number - 1]
        q_components = {
            component["id"] for component in components
            if re.match(rf"^Q{q_number}\b", component.get("label", ""), re.I)
        }
        q_math = collections.Counter(
            normalized_tex(box.get("tex", ""))
            for box in math_boxes
            if box.get("owner") in q_components or set(box.get("ownerPath", [])) & q_components
        )
        expected_math = collections.Counter()
        fields = [("stem", question.get("text", ""))]
        fields.extend(("option", option.get("text", "")) for option in question.get("options", []))
        fields.extend([
            ("selected", question.get("selected", "")),
            ("correct answer", question.get("correctAnswer", "")),
            ("explanation", question.get("explanation", "")),
            ("mistake note", question.get("mistakeHint", "")),
        ])
        for label, raw in fields:
            if raw is None or not str(raw).strip():
                continue
            raw = str(raw)
            for tex in MATH_DELIMITED.findall(raw):
                expected_math[normalized_tex(tex)] += 1
                math_checks += 1
            plain = plain_without_tex(raw)
            score, missing = ordered_coverage(plain, segment)
            content_checks += 1
            threshold = 0.78 if label == "option" else 0.9
            if score < threshold:
                content_failures.append({"q": q_number, "field": label,
                                         "coverage": round(score, 3), "missing": missing[:8]})
        for tex, count in expected_math.items():
            if q_math[tex] < count:
                math_failures.append({"q": q_number, "tex": tex, "expected": count,
                                      "rendered": q_math[tex]})
    if content_failures:
        problems.append(f"{key}: {len(content_failures)} question-field content checks fell below threshold")
    if math_failures:
        problems.append(f"{key}: {len(math_failures)} TeX expressions were not found as rendered math")

    source_discrepancy_checks = []
    for discrepancy in fixture.get("reference", {}).get("sourceDiscrepancies", []):
        q_number = int(discrepancy.get("questionNumber", 0))
        index = q_number - 1
        if not 0 <= index < len(questions) or index >= len(matches):
            source_discrepancy_checks.append({"questionNumber": q_number, "preserved": False})
            problems.append(f"{key}: source discrepancy metadata points to missing Q{q_number}")
            continue
        question = questions[index]
        options = {
            str(option.get("key", "")).upper(): flatten(option.get("text", ""))
            for option in question.get("options", [])
        }
        marked_answer = str(discrepancy.get("markedAnswer", "")).upper()
        marked_option = str(discrepancy.get("markedOption", ""))
        explanation_option = str(discrepancy.get("explanationOption", "")).upper()
        explanation_value = str(discrepancy.get("explanationValue", ""))
        answer_preserved = str(question.get("correctAnswer", "")).upper() == marked_answer
        marked_option_preserved = options.get(marked_answer) == marked_option
        explanation_option_preserved = options.get(explanation_option) == explanation_value
        explanation_text_preserved = explanation_value in flatten(question.get("explanation", ""))
        end = matches[index + 1].start() if index + 1 < len(matches) else len(full)
        segment = flatten(full[matches[index].end():end]).upper()
        output_answer_preserved = bool(re.search(
            rf"\bCORRECT\s+ANSWER\s+{re.escape(marked_answer)}\b", segment,
        ))
        output_marked_option_preserved = bool(marked_option and marked_option.upper() in segment)
        output_explanation_value_preserved = bool(explanation_value and explanation_value.upper() in segment)
        preserved = all((
            answer_preserved, marked_option_preserved, explanation_option_preserved,
            explanation_text_preserved, output_answer_preserved,
            output_marked_option_preserved, output_explanation_value_preserved,
        ))
        source_discrepancy_checks.append({
            "questionNumber": q_number,
            "markedAnswer": marked_answer,
            "markedOption": marked_option,
            "explanationOption": explanation_option,
            "explanationValue": explanation_value,
            "handling": discrepancy.get("handling", ""),
            "preserved": preserved,
        })
        if not preserved:
            problems.append(f"{key}: known source discrepancy at Q{q_number} was not preserved")

    section_positions = []
    for number, kicker, title in SECTION_MARKERS:
        marker = rf"\b{number}\s+{re.escape(kicker)}\s+{re.escape(title)}\b"
        match = re.search(marker, flat)
        section_positions.append(match.start() if match else -1)
    sections_ok = all(position >= 0 for position in section_positions) and section_positions == sorted(section_positions)
    if not sections_ok:
        problems.append(f"{key}: expected numbered analysis sections 01–05 are missing or out of order")
    removed_comparison = not re.search(r"COMPARISON\s+(?:AND|&)\s+(?:PROJECTION|TRAJECTORY)", flat)
    if not removed_comparison:
        problems.append(f"{key}: comparison/projection section text remains")

    meta = data["meta"]
    cover = after_texts[0] if after_texts else ""
    cover_fields = [str(meta.get("examName", "")), str(meta.get("student", "")), str(meta.get("rollNo", ""))]
    cover_ok = all(value and value.casefold() in cover.casefold() for value in cover_fields)
    if not cover_ok:
        problems.append(f"{key}: exam identity is incomplete on the generated cover")
    page_numbers_ok = all(
        index == 1 or re.search(r"\bPAGE\s+\d{2}\b", text)
        for index, text in enumerate(after_texts, start=1)
    )
    if not page_numbers_ok:
        problems.append(f"{key}: one or more interior pages lack a folio")
    a4_ok = all(abs(page.rect.width - 595.276) < 1.5 and abs(page.rect.height - 841.89) < 1.5 for page in after_pdf)
    if not a4_ok:
        problems.append(f"{key}: generated PDF has non-A4 page geometry")

    header = chapter_header(after_pdf)
    header_ok = (
        set(TABLE_HEADERS).issubset(header["headerLabels"])
        and header["accuracyIsOneUnbrokenSpan"]
        and header["columnsInLeftToRightOrder"]
        and header["columnsDoNotOverlap"]
    )
    if not header_ok:
        problems.append(f"{key}: chapter-mastery table headers are missing, wrapped or overlapping")

    figure_boxes = [
        box for box in boxes
        if box.get("kind") == "image" and box.get("figurePixels")
    ]
    figure_ratio_errors = []
    for box in figure_boxes:
        try:
            pixel_w, pixel_h = (float(part) for part in box["figurePixels"].split("x", 1))
            error = abs((float(box["w"]) / float(box["h"])) / (pixel_w / pixel_h) - 1)
            if error > 0.015:
                figure_ratio_errors.append({"id": box.get("id"), "relativeError": round(error, 5)})
        except (ValueError, ZeroDivisionError):
            figure_ratio_errors.append({"id": box.get("id"), "relativeError": None})
    if figure_ratio_errors:
        problems.append(f"{key}: {len(figure_ratio_errors)} question figures changed aspect ratio")

    audit_summary = generation.get("audit", {})
    audit_ok = generation.get("audit", {}).get("zeroUnintendedOverlaps") is True and all(
        value == 0 for name, value in audit_summary.items() if name != "zeroUnintendedOverlaps"
    )
    if not audit_ok:
        problems.append(f"{key}: renderer layout audit reports unintended collisions or overflow")
    if generation.get("questionsRendered") != spec["source_count"] or generation.get("missingQuestions"):
        problems.append(f"{key}: renderer did not complete every question")
    if generation.get("flags") or generation.get("figuresFailed") or generation.get("mediaDiagnostics"):
        problems.append(f"{key}: unresolved math or figure diagnostics remain")
    if generation.get("figuresEmbedded") != spec["figure_count"]:
        problems.append(f"{key}: embedded figure count differs from the source-matched expectation")

    source_pages = question_pages(source_texts)
    after_pages = question_pages(after_texts)
    if len(source_pages) != spec["source_count"]:
        problems.append(f"{key}: source PDF headings map to {len(source_pages)} questions")
    if len(after_pages) != spec["source_count"]:
        problems.append(f"{key}: generated PDF headings map to {len(after_pages)} questions")

    result = {
        "sourceFile": source_path.name,
        "sourcePages": source_pdf.page_count,
        "generatedPages": after_pdf.page_count,
        "questionCount": len(questions),
        "questionHeadingSequence": heading_ids == expected_ids,
        "questionFieldChecks": {"passed": content_checks - len(content_failures), "total": content_checks,
                                 "failures": content_failures[:20]},
        "renderedMathExpressionChecks": {"passed": math_checks - len(math_failures), "total": math_checks,
                                          "failures": math_failures[:20]},
        "numberedSections": {"passed": sections_ok, "headings": SECTION_LABELS},
        "comparisonProjectionSectionRemoved": removed_comparison,
        "coverIdentity": {"passed": cover_ok, "exam": meta.get("examName"),
                          "student": meta.get("student"), "rollNo": meta.get("rollNo")},
        "a4Geometry": a4_ok,
        "interiorPageFolios": page_numbers_ok,
        "chapterMasteryHeader": {**header, "passed": header_ok},
        "sourceMathRestorations": fixture.get("reference", {}).get("manualMathRestorations", []),
        "sourceDiscrepancyChecks": source_discrepancy_checks,
        "figureAssetMappings": fixture.get("reference", {}).get("figureAssetMappings", 0),
        "embeddedQuestionFigures": len(figure_boxes),
        "figureAspectRatioFailures": figure_ratio_errors,
        "rendererAudit": audit_summary,
        "rendererDiagnostics": {"flags": generation.get("flags", 0),
                                "figuresFailed": generation.get("figuresFailed", 0),
                                "mediaDiagnostics": generation.get("mediaDiagnostics", []),
                                "missingQuestions": generation.get("missingQuestions", [])},
        "contactSheet": "",
    }
    return result, problems


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("jee_source_pdf", type=Path)
    parser.add_argument("neet_source_pdf", type=Path)
    parser.add_argument("--out", type=Path, default=DELIVERABLES)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)

    generation_all = json.loads((args.out / "generation-results.json").read_text(encoding="utf-8"))
    audit_all = json.loads((args.out / "layout-audit.json").read_text(encoding="utf-8"))
    source_paths = {"jee-phase2": args.jee_source_pdf, "neet-set2": args.neet_source_pdf}
    result = {"generatedAt": datetime.now(timezone.utc).isoformat(), "reports": {}}
    all_problems = []
    for spec in REPORTS:
        key = spec["key"]
        source_path = source_paths[key]
        fixture = json.loads((args.out / spec["fixture"]).read_text(encoding="utf-8"))
        source_pdf = pymupdf.open(source_path)
        after_pdf = pymupdf.open(args.out / spec["after"])
        report, problems = verify_one(
            spec, source_path, source_pdf, after_pdf, fixture,
            audit_all["reports"][key], generation_all["reports"][key],
        )
        source_texts = pdf_texts(source_pdf)
        after_texts = pdf_texts(after_pdf)
        report["contactSheet"] = build_contact_sheet(
            key, source_pdf, after_pdf, source_texts, after_texts,
            question_pages(source_texts), question_pages(after_texts),
        )
        result["reports"][key] = report
        all_problems.extend(problems)
        print(f"{key}: {report['generatedPages']} pages; {report['questionCount']} questions; "
              f"{report['questionFieldChecks']['passed']}/{report['questionFieldChecks']['total']} field checks; "
              f"{report['rendererAudit'].get('zeroUnintendedOverlaps') and 'layout audit clear' or 'layout audit failed'}")
    result["problems"] = all_problems
    result["passed"] = not all_problems
    path = args.out / "verification-results.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if all_problems:
        for problem in all_problems:
            print(f"ERROR: {problem}")
        raise SystemExit(1)
    print(f"Verification passed; results written to {path}")


if __name__ == "__main__":
    main()
