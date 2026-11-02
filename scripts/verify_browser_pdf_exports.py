"""Verify PDFs downloaded through the browser export buttons.

The script is independent of the frontend generator: it opens each downloaded
file with PyMuPDF and pypdf, renders every page, checks embedded fonts and
branding, and confirms the selected report's identifying text is present.
It is written for the browser-export QA directories and writes a compact
machine-readable result next to the deliverables.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import fitz
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
CASES = [
    {
        "name": "All Subjects / Report",
        "source": ROOT / "deliverables/browser-export/all-subjects-report.pdf",
        "expected_text": ["NEET UG", "Full Mock 01", "All Subjects", "EXAM INTELLIGENCE REPORT"],
    },
    {
        "name": "All Subjects / Full Analysis",
        "source": ROOT / "deliverables/browser-export/all-subjects-full-analysis.pdf",
        "expected_text": ["NEET UG", "Full Mock 01", "All Subjects", "FULL EXAM ANALYSIS REPORT", "Source data register"],
    },
    {
        "name": "Physics / Report",
        "source": ROOT / "deliverables/browser-export/physics-report.pdf",
        "expected_text": ["NEET UG", "Physics", "EXAM INTELLIGENCE REPORT"],
    },
    {
        "name": "Physics / Full Analysis",
        "source": ROOT / "deliverables/browser-export/physics-full-analysis.pdf",
        "expected_text": ["NEET UG", "Physics", "FULL EXAM ANALYSIS REPORT", "Source data register"],
    },
    {
        "name": "QA edge cases / Report",
        "source": ROOT / "deliverables/browser-export/qa-edge-cases-report.pdf",
        "expected_text": ["QA Edge-Case Analysis", "EXAM INTELLIGENCE REPORT"],
    },
    {
        "name": "QA edge cases / Full Analysis",
        "source": ROOT / "deliverables/browser-export/qa-edge-cases-full-analysis.pdf",
        "expected_text": ["QA Edge-Case Analysis", "FULL EXAM ANALYSIS REPORT", "Source data register"],
    },
]

FONT_MARKERS = ("Inter", "Manrope", "STIX")


def verify_case(case: dict) -> dict:
    source: Path = case["source"]
    result = {"name": case["name"], "filename": source.name, "exists": source.is_file()}
    if not source.is_file():
        result["passed"] = False
        result["error"] = "downloaded file not found"
        return result

    raw = source.read_bytes()
    result["bytes"] = len(raw)
    result["sha256"] = hashlib.sha256(raw).hexdigest()
    result["pdf_header"] = raw[:8].decode("latin1", errors="replace")
    result["has_eof"] = b"%%EOF" in raw[-2048:]

    reader = PdfReader(str(source))
    result["pypdf_pages"] = len(reader.pages)
    result["pypdf_trailer_root"] = "/Root" in reader.trailer

    doc = fitz.open(str(source))
    result["pages"] = doc.page_count
    result["page_sizes"] = sorted({tuple(round(v, 2) for v in (page.rect.width, page.rect.height)) for page in doc})
    result["rendered_pages"] = 0
    result["non_empty_pages"] = 0
    result["pages_with_logo_image"] = 0
    result["embedded_fonts"] = set()
    result["text"] = ""
    for page in doc:
        text = page.get_text("text")
        result["text"] += text + "\n"
        for font in page.get_fonts(full=True):
            name = str(font[3] or "")
            if any(marker.lower() in name.lower() for marker in FONT_MARKERS):
                result["embedded_fonts"].add(name)
        if page.get_images(full=True):
            result["pages_with_logo_image"] += 1
        pix = page.get_pixmap(matrix=fitz.Matrix(0.35, 0.35), alpha=False)
        result["rendered_pages"] += 1
        if pix.width > 0 and pix.height > 0 and len(pix.samples) > 0:
            result["non_empty_pages"] += 1
    doc.close()

    normalized = re.sub(r"\s+", " ", result["text"]).strip()
    result["expected_text"] = {needle: needle in normalized for needle in case["expected_text"]}
    result["embedded_fonts"] = sorted(result["embedded_fonts"])
    result["font_count"] = len(result["embedded_fonts"])
    del result["text"]

    result["passed"] = all([
        result["pdf_header"].startswith("%PDF-"),
        result["has_eof"],
        result["pypdf_pages"] == result["pages"],
        result["pypdf_trailer_root"],
        result["pages"] > 0,
        result["rendered_pages"] == result["pages"],
        result["non_empty_pages"] == result["pages"],
        result["pages_with_logo_image"] == result["pages"],
        result["font_count"] >= 3,
        all(result["expected_text"].values()),
    ])
    return result


def main() -> None:
    results = [verify_case(case) for case in CASES]
    report = {
        "all_checks_passed": all(item.get("passed") for item in results),
        "case_count": len(results),
        "cases": results,
    }
    output = ROOT / "deliverables" / "browser-export-verification.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "all_checks_passed": report["all_checks_passed"],
        "cases": [{
            "name": item["name"],
            "pages": item.get("pages"),
            "bytes": item.get("bytes"),
            "fonts": item.get("font_count"),
            "logo_pages": item.get("pages_with_logo_image"),
            "rendered_pages": item.get("rendered_pages"),
            "passed": item.get("passed"),
        } for item in results],
    }, indent=2))


if __name__ == "__main__":
    main()
