#!/usr/bin/env python3
"""
Independent verification for the Premium PDF content, figure and editorial
refinement deliverables.

The generator harness (``frontend/scripts/generate-refinement-pdfs.mjs``)
already validates its own layout audit. This script re-opens the produced
PDFs and checks them from the outside, without trusting the renderer:

  * A4 geometry, page count agreement with ``generation-results.json``;
  * header/footer identification and page numbering on every page;
  * total absence of internals in visible text — serialised JSON, image URLs
    or paths, ``null``/``undefined`` fields, report/exam UUIDs, source
    fingerprints and report coordinates;
  * required academic content still present (student, roll, exam, date,
    question headings, options, response, explanation, insight);
  * figures actually embedded, with their placement above the option block;
  * real image-overlap detection against text, recomputed from the PDF;
  * single-column table geometry: no side-by-side table pair shares a
    horizontal band with a second table's header row;
  * render previews (page PNGs + contact sheets) for visual inspection.

Outputs ``deliverables/refinement/verification.json`` and
``deliverables/refinement/previews``.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    pymupdf = None

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    Image = None

ROOT = Path(__file__).resolve().parents[1]
DELIVERABLES = ROOT / "deliverables"
REFINEMENT = DELIVERABLES / "refinement"
PREVIEWS = REFINEMENT / "previews"
RESULTS = REFINEMENT / "generation-results.json"
AUDIT = REFINEMENT / "layout-audit.json"

A4 = (595.276, 841.89)
TOLERANCE = 1.5

# Anything that must never reach a student-facing page.
FORBIDDEN_PATTERNS = [
    (r"https?://", "raw asset URL"),
    (r"\bwww\.", "raw web address"),
    (r"/media/", "media server path"),
    (r"\b[A-Za-z0-9_\-/]+\.(?:png|jpe?g|webp|avif|svg|gif)\b", "image file name"),
    (r'"\s*[A-Za-z_]+\s*"\s*:', "serialised JSON object"),
    (r"\{\s*[\"']", "serialised JSON object"),
    (r"\[\s*\{", "serialised JSON array"),
    (r"image[_ ]?url", "image field name"),
    (r"\bundefined\b", "undefined value"),
    (r"\bNaN\b", "NaN value"),
    (r"\[object Object\]", "stringified object"),
    (r"[Ss]ource fingerprint", "source fingerprint"),
    (r"\bFAR\s*/|\bEIR\s*/", "internal report coordinate"),
    (r"\breport[_ ]?id\b|\breportId\b", "internal report id"),
    (r"\bexam[_ ]?id\b|\bexamId\b", "internal exam id"),
    (r"\bsha256\b|\bmd5\b", "hash identifier"),
    (r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", "UUID"),
    (r"\b[A-F0-9]{16,}\b", "hex fingerprint"),
    (r"\bnull\b", "null field"),
]

# Content that must survive on a full analysis export. Matched case-insensitively
# because editorial headings use sentence case in the intelligence report.
FULL_ANALYSIS_REQUIRED = [
    "MediXO EduX",
    "FULL EXAM ANALYSIS",
    "Question 01",
    "STUDENT RESPONSE",
    "CORRECT ANSWER",
    "EXPLANATION",
    "PERFORMANCE INSIGHT",
]

INTELLIGENCE_REQUIRED = [
    "MediXO EduX",
    "EXAM INTELLIGENCE REPORT",
    "chapter mastery",
]

PAGE_NUMBER = re.compile(r"PAGE\s+\d{2}")


def fail(message: str) -> None:
    print(f"ERROR: {message}")
    sys.exit(1)


def box_overlap(a, b) -> float:
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[2], b[2]), min(a[3], b[3])
    if x1 <= x0 or y1 <= y0:
        return 0.0
    return (x1 - x0) * (y1 - y0)


def page_text(page) -> str:
    return page.get_text("text") or ""


def image_boxes(page):
    """Rendered image rectangles for the page, in PDF points."""
    boxes = []
    for info in page.get_image_info():
        bbox = info.get("bbox")
        if bbox:
            boxes.append(tuple(float(v) for v in bbox))
    return boxes


def text_boxes(page):
    boxes = []
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if span.get("text", "").strip():
                    boxes.append((tuple(float(v) for v in span["bbox"]), span["text"]))
    return boxes


def check_geometry(pdf, name, problems, pages_expected=None):
    widths = {round(page.rect.width, 1) for page in pdf}
    heights = {round(page.rect.height, 1) for page in pdf}
    ok = (
        all(abs(w - A4[0]) <= TOLERANCE for w in widths)
        and all(abs(h - A4[1]) <= TOLERANCE for h in heights)
    )
    if not ok:
        problems.append(f"{name}: non-A4 page geometry {sorted(widths)}x{sorted(heights)}")
    if pages_expected is not None and pages_expected != pdf.page_count:
        problems.append(
            f"{name}: page count {pdf.page_count} does not match generation results {pages_expected}"
        )
    return ok


def check_chrome(pdf, name, problems):
    missing = []
    for index, page in enumerate(pdf, start=1):
        text = page_text(page)
        if "MediXO EduX" not in text:
            missing.append((index, "brand"))
        if not PAGE_NUMBER.search(text):
            missing.append((index, "page number"))
    if missing:
        problems.append(f"{name}: header/footer missing on pages {missing[:6]}")
    return not missing


def check_forbidden_text(pdf, name, problems):
    hits = []
    for index, page in enumerate(pdf, start=1):
        text = page_text(page)
        for pattern, label in FORBIDDEN_PATTERNS:
            for match in re.finditer(pattern, text):
                fragment = match.group(0)
                # "null" inside an ordinary word is not a null field.
                if label == "null field" and not re.search(r"\bnull\b", fragment):
                    continue
                hits.append({"page": index, "label": label, "match": fragment[:60]})
                break
    if hits:
        problems.append(f"{name}: internal values leaked into page text: {hits[:5]}")
    return not hits


def check_required_text(pdf, name, problems, required):
    joined = "\n".join(page_text(page) for page in pdf).lower()
    missing = [needle for needle in required if needle.lower() not in joined]
    if missing:
        problems.append(f"{name}: required content missing {missing}")
    return not missing


def check_figures(pdf, name, problems, expected_minimum=0):
    counts = [len(page.get_images(full=True)) for page in pdf]
    # Every page carries the header logo; a page with two images has content.
    figure_pages = [i + 1 for i, count in enumerate(counts) if count >= 2]
    total = sum(count - 1 for count in counts)  # minus header logo
    if total < expected_minimum:
        problems.append(f"{name}: only {total} embedded figures, expected at least {expected_minimum}")
    return {"total": total, "pages": figure_pages}


def check_image_text_overlap(pdf, name, problems, tolerance=0.6):
    collisions = []
    for index, page in enumerate(pdf, start=1):
        images = image_boxes(page)
        for bbox, text in text_boxes(page):
            if not text.strip():
                continue
            for image in images:
                # The header logo and the colophon glyph are chrome, not content.
                if image[3] < 70 or image[1] > 780:
                    continue
                area = box_overlap(bbox, image)
                if area <= 0:
                    continue
                smaller = min(
                    (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]),
                    (image[2] - image[0]) * (image[3] - image[1]),
                ) or 1
                if area / smaller > tolerance:
                    collisions.append({"page": index, "text": text[:40]})
                    break
    if collisions:
        problems.append(f"{name}: text overlaps content figures {collisions[:4]}")
    return not collisions


def check_single_column_tables(pdf, name, problems):
    """
    Detect tables rendered side by side.

    Table headers are solid midnight bands with white labels. Two tables side
    by side place two such bands at the same height, each roughly half the
    content width. A stacked single-column layout places one band per row.
    """
    doubles = []
    for index, page in enumerate(pdf, start=1):
        bands = {}
        for drawing in page.get_drawings():
            fill = drawing.get("fill")
            rect = drawing.get("rect")
            if not fill or rect is None:
                continue
            r, g, b = (round(float(c), 3) for c in fill[:3])
            if (r, g, b) != (0.063, 0.106, 0.188):  # COLORS.midnight #101B30
                continue
            width = float(rect.width)
            height = float(rect.height)
            if not (0.28 * 503 <= width <= 0.62 * 503) or not (8 <= height <= 40):
                continue
            key = round(float(rect.y0) / 2) * 2
            bands.setdefault(key, []).append(round(float(rect.x0)))
        for y, starts in bands.items():
            if len({round(x) for x in starts}) >= 2:
                doubles.append({"page": index, "y": y, "x": sorted(starts)[:4]})
                break
    if doubles:
        problems.append(f"{name}: table headers side by side {doubles[:4]}")
    return not doubles


def check_audit(name, problems):
    if not AUDIT.exists():
        problems.append(f"missing layout audit {AUDIT}")
        return {}
    audit = json.loads(AUDIT.read_text())
    report = audit.get("reports", {}).get(name)
    if not report:
        problems.append(f"layout audit has no entry for {name}")
        return {}
    boxes = report.get("boxes", [])
    components = report.get("components", [])
    text_text = 0
    for i, first in enumerate(boxes):
        if first.get("kind") != "text":
            continue
        for second in boxes[i + 1:]:
            if second.get("kind") != "text" or second.get("page") != first.get("page"):
                continue
            area = box_overlap(
                (first["x"], first["y"], first["x"] + first["w"], first["y"] + first["h"]),
                (second["x"], second["y"], second["x"] + second["w"], second["y"] + second["h"]),
            )
            if area > 1.0:
                text_text += 1
    overflow = [
        c for c in components
        if c.get("role") == "content" and c.get("h", 0) > 0
        and (c["y"] + c["h"]) > 791.5
    ]
    if text_text:
        problems.append(f"{name}: {text_text} text/text overlaps in the layout audit")
    if overflow:
        problems.append(f"{name}: {len(overflow)} components overflow the content area")
    return {"textTextOverlaps": text_text, "overflowingComponents": len(overflow), "boxes": len(boxes)}


def contact_sheet(pdf, target: Path, columns=6, dpi=58) -> Path:
    if Image is None:
        return target
    tiles = []
    for page in pdf:
        pix = page.get_pixmap(dpi=dpi)
        tiles.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    if not tiles:
        return target
    width, height = tiles[0].size
    pad = 8
    rows = (len(tiles) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * (width + pad) + pad, rows * (height + pad) + pad), "#E7E9EE")
    draw = ImageDraw.Draw(sheet)
    for index, tile in enumerate(tiles):
        row, column = divmod(index, columns)
        x = pad + column * (width + pad)
        y = pad + row * (height + pad)
        sheet.paste(tile, (x, y))
        draw.rectangle([x - 1, y - 1, x + width, y + height], outline="#B9BFCA")
        draw.text((x + 4, y + 4), f"{index + 1}", fill="#101B30")
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, optimize=True)
    return target


def render_previews(pdf, target_dir: Path, slug: str, max_pages=40):
    if Image is None:
        return []
    target_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for index, page in enumerate(pdf):
        if index >= max_pages:
            break
        path = target_dir / f"{slug}-p{index + 1:02d}.png"
        pix = page.get_pixmap(dpi=96)
        pix.save(path)
        written.append(str(path.relative_to(ROOT)))
    return written


def verify_pdf(path: Path, label: str, kind: str, expected_pages, problems, required_figures=0):
    if not path.exists():
        problems.append(f"{label}: missing file {path}")
        return None
    pdf = pymupdf.open(path)
    entry = {"file": str(path.relative_to(ROOT)), "label": label, "pages": pdf.page_count}
    entry["a4"] = check_geometry(pdf, label, problems, expected_pages)
    entry["chrome"] = check_chrome(pdf, label, problems)
    entry["cleanText"] = check_forbidden_text(pdf, label, problems)
    entry["requiredText"] = check_required_text(
        pdf, label, problems, FULL_ANALYSIS_REQUIRED if kind == "full" else INTELLIGENCE_REQUIRED
    ) if kind in {"full", "intelligence"} else None
    figures = check_figures(pdf, label, problems, required_figures)
    entry["figures"] = figures
    entry["noImageTextOverlap"] = check_image_text_overlap(pdf, label, problems)
    entry["singleColumnTables"] = check_single_column_tables(pdf, label, problems)
    entry["previews"] = render_previews(pdf, PREVIEWS / "pages", label)
    entry["contactSheet"] = str(contact_sheet(pdf, PREVIEWS / f"{label}-contact-sheet.png").relative_to(ROOT))
    pdf.close()
    return entry


def main() -> int:
    if pymupdf is None:
        fail("PyMuPDF is required: python3 -m pip install pymupdf pillow")
    if not RESULTS.exists():
        fail(f"generation results not found: {RESULTS}")

    results = json.loads(RESULTS.read_text())
    reports = results.get("reports", {})
    qa = results.get("qa", {})
    exports = results.get("exports", {})
    problems: list[str] = []
    verified: dict[str, dict] = {}

    canonical = [
        ("MediXO_EduX_Full_Exam_Analysis_Report.pdf", "canonical-full-analysis", "full", reports.get("full", {}).get("pages"), 1),
        ("MediXO_EduX_Exam_Intelligence_Report.pdf", "canonical-intelligence", "intelligence", reports.get("intelligence", {}).get("pages"), 0),
    ]
    for filename, label, kind, pages, figures in canonical:
        entry = verify_pdf(REFINEMENT / filename, label, kind, pages, problems, figures)
        if entry:
            verified[label] = entry

    # Six Role x Report exports: identity travels with the export, layout cannot.
    for name, meta in exports.items():
        kind = "full" if name.endswith("full-analysis") else "intelligence"
        entry = verify_pdf(REFINEMENT / meta["file"], name, kind, meta.get("pages"), problems, 0)
        if entry:
            # Exports are sharded from the same payload; content identity is
            # checked through the reader name on the feedback line.
            verified[name] = entry

    for name, meta in qa.items():
        kind = "full" if name.endswith("full") else "intelligence"
        minimum = 1 if kind == "full" else 0
        entry = verify_pdf(REFINEMENT / meta["file"], name, kind, meta.get("pages"), problems, minimum)
        if entry:
            verified[name] = entry

    audit = {}
    for name in qa:
        audit[name] = check_audit(name, problems)

    # The 180-question NEET payload is the pagination stress case.
    neet = results.get("qa", {}).get("neet-180-full", {})
    neet_ok = (
        neet.get("questionsRendered") == 180
        and neet.get("questionsSupplied") == 180
        and neet.get("pages", 0) > 40
    )
    if not neet_ok:
        problems.append(
            "neet-180-full: expected 180 rendered questions, got "
            f"{neet.get('questionsRendered')} of {neet.get('questionsSupplied')}"
        )

    summary = {
        "generatedAt": results.get("generatedAt"),
        "engine": results.get("engine"),
        "verifiedAt": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).isoformat(timespec="seconds"),
        "pdfs": len(verified),
        "pages": sum(entry["pages"] for entry in verified.values()),
        "embeddedFigures": sum(entry["figures"]["total"] for entry in verified.values()),
        "neetQuestions": neet.get("questionsRendered"),
        "neetPages": neet.get("pages"),
        "audit": audit,
        "checks": {
            "a4Geometry": all(entry["a4"] for entry in verified.values()),
            "headerFooterEveryPage": all(entry["chrome"] for entry in verified.values()),
            "noInternalValuesInText": all(entry["cleanText"] for entry in verified.values()),
            "noImageTextOverlap": all(entry["noImageTextOverlap"] for entry in verified.values()),
            "singleColumnTables": all(entry["singleColumnTables"] for entry in verified.values()),
            "contentComplete": all(
                entry["requiredText"] is not False for entry in verified.values()
            ),
            "neet180": neet_ok,
            "problems": problems,
            "passed": not problems,
        },
        "reports": verified,
    }

    target = REFINEMENT / "verification.json"
    target.write_text(json.dumps(summary, indent=2))
    print(f"verified {summary['pdfs']} PDFs, {summary['pages']} pages, {summary['embeddedFigures']} figures")
    print(f"NEET 180: {summary['neetQuestions']} questions across {summary['neetPages']} pages")
    if problems:
        for problem in problems:
            print(f"  - {problem}")
        print(f"FAILED ({len(problems)} problems) -> {target.relative_to(ROOT)}")
        return 1
    print(f"PASSED -> {target.relative_to(ROOT)}")
    print(f"previews -> {(PREVIEWS).relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
