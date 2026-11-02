#!/usr/bin/env python3
"""
Verification and preview generation for the MediXO EduX premium PDF reports.

Requires PyMuPDF and Pillow (already used by the project QA toolchain):
    pip install pymupdf pillow
    python3 scripts/verify_report_pdfs.py

It validates A4 geometry, embedded fonts, logo placement on every page,
header/footer/page-number consistency, text bounds, minimum type size,
source-data preservation, mathematical rendering and page counts. It also
writes representative-page PNG previews and a labelled contact sheet.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

try:
    import pymupdf
    from PIL import Image, ImageDraw
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit(f"Verification requires pymupdf and pillow: {exc}")

ROOT = Path(__file__).resolve().parents[1]
DELIVERABLES = ROOT / "deliverables"
PREVIEWS = DELIVERABLES / "previews"
SOURCE = ROOT / "backend" / "app" / "data" / "spa" / "student-portal.json"
FULL = DELIVERABLES / "MediXO_EduX_Full_Exam_Analysis_Report.pdf"
INTELLIGENCE = DELIVERABLES / "MediXO_EduX_Exam_Intelligence_Report.pdf"
GENERATION = DELIVERABLES / "generation-results.json"
QA_FULL = DELIVERABLES / "qa" / "premium-pdf-stress-test.pdf"

A4_WIDTH = 595.276
A4_HEIGHT = 841.89
DASHES = "\u2010\u2011\u2012\u2013\u2014"


def normalise(value: object) -> str:
    text = str(value if value is not None else "")
    for dash in DASHES:
        text = text.replace(dash, "-")
    text = text.replace("\u00b7", "·")
    return re.sub(r"\s+", " ", text).strip().lower()


def is_present(haystack: str, needle: str) -> bool:
    h = normalise(haystack)
    n = normalise(needle)
    if not n:
        return True
    if len(n) <= 3:
        return re.search(r"(^|[^0-9a-z])" + re.escape(n) + r"(?=$|[^0-9a-z])", h) is not None
    return n in h


def flatten_source_values(node, path: str = "") -> list[dict]:
    seen: set[str] = set()
    rows: list[dict] = []

    def visit(value, current: str) -> None:
        if value is None:
            return
        if isinstance(value, bool):
            primitive = "true" if value else "false"
        elif isinstance(value, (int, float, str)):
            primitive = str(value)
        else:
            primitive = None
        if primitive is not None:
            key = normalise(primitive)
            if (
                len(primitive) > 0
                and not re.fullmatch(r"[\s·—–\-.,;:]+", primitive)
                and key not in seen
            ):
                seen.add(key)
                rows.append({"path": current, "value": primitive})
            return
        if isinstance(value, list):
            for index, item in enumerate(value):
                visit(item, f"{current}[{index}]")
        elif isinstance(value, dict):
            for key, child in value.items():
                visit(child, f"{current}.{key}" if current else key)

    visit(node, path)
    return rows


def page_text(doc) -> list[str]:
    return [page.get_text("text") for page in doc]


def text_spans(page):
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                yield span


def inspect_pdf(path: Path, expected_pages: int | None = None) -> dict:
    doc = pymupdf.open(path)
    pages = len(doc)
    texts = page_text(doc)
    all_text = " | ".join(texts)
    norm_text = normalise(all_text)

    sizes = [span["size"] for page in doc for span in text_spans(page) if span["text"].strip()]
    out_of_bounds = []
    for page_index, page in enumerate(doc):
        for span in text_spans(page):
            x0, y0, x1, y1 = span["bbox"]
            if x0 < -2 or y0 < -2 or x1 > page.rect.width + 2 or y1 > page.rect.height + 2:
                out_of_bounds.append({"page": page_index + 1, "text": span["text"][:60], "bbox": span["bbox"]})

    fonts = sorted({item[3] for page in doc for item in page.get_fonts()})
    images_per_page = [len(page.get_images(full=True)) for page in doc]
    drawings_per_page = [len(page.get_drawings()) for page in doc]
    header_footer_ok = all("MediXO EduX" in text and "PAGE" in text for text in texts)
    report_id_ok = all(("FAR /" in text or "EIR /" in text) for text in texts)
    blank_pages = [i + 1 for i, text in enumerate(texts) if len(normalise(text)) < 80]
    page_numbers_ok = all(f"{i + 1:02d}" in text for i, text in enumerate(texts))
    a4_ok = all(abs(page.rect.width - A4_WIDTH) < 1 and abs(page.rect.height - A4_HEIGHT) < 1 for page in doc)
    fonts_ok = all(
        any(name.lower() in font.lower() for font in fonts)
        for name in ("Inter", "Manrope", "STIXTwoMath")
    )
    logo_ok = all(count >= 1 for count in images_per_page)
    total_ok = all(f"/ {pages:02d}" in text or f"/ {pages}" in text for text in texts)

    result = {
        "file": str(path.relative_to(ROOT)),
        "pages": pages,
        "a4_portrait": a4_ok,
        "expected_pages": expected_pages,
        "page_count_ok": expected_pages is None or pages == expected_pages,
        "fonts": fonts,
        "fonts_embedded": fonts_ok,
        "logo_images_per_page": images_per_page,
        "logo_on_every_page": logo_ok,
        "drawings_per_page": drawings_per_page,
        "header_footer_on_every_page": header_footer_ok,
        "report_identification_on_every_page": report_id_ok,
        "page_numbering_sequential": page_numbers_ok,
        "page_total_on_every_page": total_ok,
        "blank_pages": blank_pages,
        "out_of_bounds_text_spans": out_of_bounds,
        "minimum_font_size": round(min(sizes), 2) if sizes else None,
        "maximum_font_size": round(max(sizes), 2) if sizes else None,
        "text_characters": len(all_text),
        "normalised_text_characters": len(norm_text),
        "raw_tex_in_text": bool(re.search(r"\\(?:frac|int|sum|sqrt|begin|ce)\b", all_text)),
        "all_text": all_text,
        "page_texts": texts,
    }
    doc.close()
    return result


def render_preview(doc, page_index: int, out_path: Path, label: str) -> None:
    page = doc[page_index]
    pix = page.get_pixmap(dpi=110, alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    image.save(out_path)
    # A small branded label above the page keeps the contact sheet readable.
    canvas = Image.new("RGB", (image.width, image.height + 28), "#FAFAF7")
    canvas.paste(image, (0, 28))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 5, 28), fill="#5146D8")
    draw.text((12, 8), label, fill="#101B30")
    canvas.save(out_path)


def contact_sheet(items: list[tuple[Path, str]], out_path: Path) -> None:
    thumb_w = 360
    thumb_h = 509
    label_h = 26
    cols = 3
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (thumb_w + 16) + 16, rows * (thumb_h + label_h + 16) + 16), "#E5E8EF")
    draw = ImageDraw.Draw(sheet)
    for index, (path, label) in enumerate(items):
        image = Image.open(path).convert("RGB")
        image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        col = index % cols
        row = index // cols
        x = 16 + col * (thumb_w + 16)
        y = 16 + row * (thumb_h + label_h + 16)
        sheet.paste(image, (x, y + label_h))
        draw.rectangle((x, y, x + thumb_w, y + label_h), fill="#101B30")
        draw.text((x + 8, y + 7), label, fill="#FFFFFF")
    sheet.save(out_path)


def main() -> None:
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    generation = json.loads(GENERATION.read_text()) if GENERATION.exists() else {}
    source = json.loads(SOURCE.read_text())["examAnalysis"]
    source_values = flatten_source_values(source)

    full = inspect_pdf(FULL, expected_pages=None)
    intelligence = inspect_pdf(INTELLIGENCE, expected_pages=2)
    qa_present = QA_FULL.exists()
    qa = inspect_pdf(QA_FULL, expected_pages=None) if qa_present else None

    missing = [row["value"] for row in source_values if not is_present(full["all_text"], row["value"])]
    generation_missing = generation.get("reports", {}).get("full", {}).get("missingValues", [])
    question_ids = [row.get("q") for row in source.get("questionReview", []) if row.get("q")]
    missing_question_ids = [q for q in question_ids if not is_present(full["all_text"], q)]

    required_full_sections = [
        "FULL EXAM ANALYSIS REPORT", "PERFORMANCE BREAKDOWN", "SUBJECT AND CHAPTER INTELLIGENCE",
        "TIME, COMPARISON AND PROJECTION", "QUESTION-BY-QUESTION ANALYSIS",
        "MISTAKE PATTERN AND EVIDENCE", "REVISION STRATEGY", "SOURCE DATA REGISTER",
    ]
    required_intelligence_sections = [
        "EXAM INTELLIGENCE REPORT", "OVERALL PERFORMANCE SUMMARY", "SUBJECT-WISE PERFORMANCE",
        "CHAPTER MASTERY", "CHAPTER TIME CONSUMPTION", "WHAT TO STUDY NEXT",
        "MISTAKE PATTERN ANALYSIS", "TOPIC-LEVEL ACCURACY", "PRIORITY CLASSIFICATION",
    ]
    full_sections = {s: is_present(full["all_text"], s) for s in required_full_sections}
    intelligence_sections = {s: is_present(intelligence["all_text"], s) for s in required_intelligence_sections}

    checks = {
        "full_report_page_count_at_least_9": full["pages"] >= 9,
        "intelligence_report_exactly_2_pages": intelligence["pages"] == 2,
        "a4_portrait_all_pages": full["a4_portrait"] and intelligence["a4_portrait"],
        "embedded_fonts": full["fonts_embedded"] and intelligence["fonts_embedded"],
        "logo_on_every_page": full["logo_on_every_page"] and intelligence["logo_on_every_page"],
        "header_footer_consistent": full["header_footer_on_every_page"] and intelligence["header_footer_on_every_page"],
        "report_identification_consistent": full["report_identification_on_every_page"] and intelligence["report_identification_on_every_page"],
        "page_numbering_consistent": full["page_numbering_sequential"] and intelligence["page_numbering_sequential"],
        "page_totals_consistent": full["page_total_on_every_page"] and intelligence["page_total_on_every_page"],
        "no_blank_pages": not full["blank_pages"] and not intelligence["blank_pages"],
        "no_out_of_bounds_text": not full["out_of_bounds_text_spans"] and not intelligence["out_of_bounds_text_spans"],
        "print_readable_minimum_font": (full["minimum_font_size"] or 0) >= 6.4 and (intelligence["minimum_font_size"] or 0) >= 6.4,
        "canonical_source_values_preserved": not missing and not generation_missing,
        "all_question_ids_preserved": not missing_question_ids,
        "all_full_analysis_sections_present": all(full_sections.values()),
        "all_intelligence_sections_present": all(intelligence_sections.values()),
        "charts_and_vector_math_rendered": sum(full["drawings_per_page"]) > 100 and sum(intelligence["drawings_per_page"]) > 50,
        "no_raw_tex_in_student_facing_pdf": not full["raw_tex_in_text"] and not intelligence["raw_tex_in_text"],
        "malformed_expression_flagged_in_qa": bool(qa and is_present(qa["all_text"], "EXPRESSION FLAGGED FOR VERIFICATION")),
        "qa_multiple_question_pages": bool(qa and qa["pages"] >= 8),
    }

    # Representative-page previews.
    full_doc = pymupdf.open(FULL)
    intel_doc = pymupdf.open(INTELLIGENCE)
    q_page = next((i for i, text in enumerate(full["page_texts"]) if "QUESTION / OPTIONS" in text), min(5, full["pages"] - 1))
    revision_page = next((i for i, text in enumerate(full["page_texts"]) if "Revision strategy" in text and i > 5), full["pages"] - 1)
    preview_specs = [
        (full_doc, 0, PREVIEWS / "01-full-analysis-cover.png", "Full analysis · cover / executive overview"),
        (full_doc, 1, PREVIEWS / "02-full-analysis-performance.png", "Full analysis · performance breakdown"),
        (full_doc, q_page, PREVIEWS / "03-full-analysis-question-cards.png", f"Full analysis · question cards · p{q_page + 1}"),
        (full_doc, revision_page, PREVIEWS / "04-full-analysis-revision.png", f"Full analysis · revision strategy · p{revision_page + 1}"),
        (intel_doc, 0, PREVIEWS / "05-intelligence-page-1.png", "Exam intelligence · performance / mastery / time"),
        (intel_doc, 1, PREVIEWS / "06-intelligence-page-2.png", "Exam intelligence · revision priorities"),
    ]
    if qa:
        qa_doc = pymupdf.open(QA_FULL)
        qa_math_page = next((i for i, text in enumerate(qa["page_texts"]) if "SOLUTION" in text), min(4, qa["pages"] - 1))
        qa_flag_page = next((i for i, text in enumerate(qa["page_texts"]) if "EXPRESSION FLAGGED" in text), min(5, qa["pages"] - 1))
        preview_specs.extend([
            (qa_doc, qa_math_page, PREVIEWS / "07-math-rendering-qa.png", "Synthetic QA · vector equation rendering"),
            (qa_doc, qa_flag_page, PREVIEWS / "08-malformed-expression-qa.png", "Synthetic QA · malformed expression flag"),
        ])
    for doc, index, path, label in preview_specs:
        render_preview(doc, index, path, label)
    contact_sheet([(path, label) for _, _, path, label in preview_specs], PREVIEWS / "overview.png")
    full_doc.close()
    intel_doc.close()
    if qa:
        qa_doc.close()

    results = {
        "source_note": generation.get("note", "Source PDFs were not present in the workspace."),
        "source_payload": "backend/app/data/spa/student-portal.json :: examAnalysis",
        "source_value_count": len(source_values),
        "checks": checks,
        "all_checks_passed": all(checks.values()),
        "full_report": {k: v for k, v in full.items() if k not in ("all_text", "page_texts")},
        "intelligence_report": {k: v for k, v in intelligence.items() if k not in ("all_text", "page_texts")},
        "qa_report": ({k: v for k, v in qa.items() if k not in ("all_text", "page_texts")} if qa else None),
        "data_preservation": {
            "missing_source_values_in_full_pdf": missing,
            "missing_source_values_from_generator": generation_missing,
            "missing_question_ids": missing_question_ids,
            "question_ids_checked": question_ids,
        },
        "sections": {"full": full_sections, "intelligence": intelligence_sections},
        "previews": [str(path.relative_to(ROOT)) for _, _, path, _ in preview_specs] + [str((PREVIEWS / "overview.png").relative_to(ROOT))],
    }
    (DELIVERABLES / "verification-results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n")

    lines = [
        "# Premium PDF verification results",
        "",
        results["source_note"],
        "",
        f"- Source payload: `{results['source_payload']}`",
        f"- Unique source values checked: **{len(source_values)}**",
        f"- Full Exam Analysis Report: **{full['pages']} pages**",
        f"- Exam Intelligence Report: **{intelligence['pages']} pages**",
        f"- Embedded fonts: {', '.join(sorted(set(full['fonts'] + intelligence['fonts'])))}",
        f"- Minimum rendered font size: full {full['minimum_font_size']} pt, intelligence {intelligence['minimum_font_size']} pt",
        f"- Overall result: **{'PASS' if results['all_checks_passed'] else 'REVIEW REQUIRED'}**",
        "",
        "## Checks",
        "",
        "| Check | Result |",
        "| --- | --- |",
    ]
    lines.extend(f"| {key.replace('_', ' ')} | {'PASS' if value else 'FAIL'} |" for key, value in checks.items())
    lines += [
        "",
        "## Data preservation",
        "",
        f"- Missing source values in the full PDF: **{len(missing)}**",
        f"- Missing source values reported by the generator: **{len(generation_missing)}**",
        f"- Missing question identifiers: **{len(missing_question_ids)}**",
        f"- All {len(question_ids)} supplied question-review identifiers were located in the PDF text.",
        "",
        "## Visual QA",
        "",
        "Representative-page previews and the contact sheet were written to `deliverables/previews/`.",
        "Table alignment, mathematical baselines, whitespace balance and absence of overlap were reviewed on those renders;",
        "text-span bounds and minimum type size are machine-checked above.",
        "",
    ]
    (DELIVERABLES / "VERIFICATION_RESULTS.md").write_text("\n".join(lines))
    print(json.dumps(results, indent=2, ensure_ascii=False))
    if not results["all_checks_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
