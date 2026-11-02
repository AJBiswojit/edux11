"""Phase G — physical removal of seeded question records from SPA documents.

The SPA seed documents under ``app/data/spa/`` historically embedded seeded
question RECORDS (question stems, options, answers, fabricated question
collections such as ``CQ-*`` / ``UPYQ-*`` / the 14-record faculty bank) plus
fabricated question-derived statistics. Those records are NOT the real
question bank (``questions`` table served by ``GET /faculty/question-bank``);
they masqueraded as it.

This module is the SINGLE source of truth for removing them:

* ``clean_spa_document(doc)``  — pure, deterministic, idempotent transform
  that strips seeded question records and neutralises fabricated
  question-derived values while preserving every analytics field.
* ``clean_document_if_affected(name, doc)`` — applies the transform only to
  the documents known to have carried seeded question records. Unaffected
  documents (exam-agent exams, student portal examination data, papers, …)
  pass through untouched.
* CLI (``python -m app.services.spa_question_cleanup``) — cleans the source
  JSON seed files in place and prints a change report.

``seed_spa_documents`` applies the same transform to stored copies so an
existing database is healed on boot and re-seeding can never reintroduce the
records.

REMOVED (question records / fabricated question-derived values):
    questionBank.questions, adminQuestionBank.questions,
    competitiveQuestions, universityPyqQuestions, pyqRecords, universityPyq,
    mostRepeated, aiPredictedQuestions, aiImportantQuestions,
    questionStats (fabricated bank statistics → neutral),
    competitiveQuestionIntelligence (derived over removed records → neutral),
    pyqCorpus / pyq overview fabricated corpus counts → 0,
    assessmentSummary question-bank counts → 0,
    dashboard ``questionBankStatus`` fabricated strings → neutral,
    report summaries claiming fabricated bank stats → neutral,
    pattern ``example`` fabricated question stems,
    quizGeneratorSample seeded sample questions,
    demo-paper questionLists (bank records re-embedded as mock papers plus
    the GP1-Q-* authored demo questions — stems named in the removal list),
    assessment-health narrative claiming fabricated bank stats,
    report-template latest summaries, insight-pool generated-questions claims,
    AI-assistant transcript quizzes,
    assessment-summary input bank/PYQ totals, bank/PYQ export rows and
    report-template stats, narrative bank-coverage claims.

PRESERVED (legitimate analytics / contracts / metadata):
    trend analytics, difficulty trends, year distributions, topic frequency,
    weightage, gap analysis, PYQ corpus analytics structures, uploads,
    recommendations, blueprints, filters/taxonomy, question tags,
    unit coverage analytics, reports records (minus fabricated bank claims),
    exam generator blueprint sample, all unrelated intelligence.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "spa"

#: Documents that carried seeded question records and are cleaned in place.
AFFECTED_DOCUMENTS = frozenset(
    {
        "faculty-intelligence-summary",
        "pyq",
        "faculty-workspace",
        "admin-intelligence-summary",
        "admin-intelligence-datasets",
        "admin-intelligence-derived",
        "admin-catalog",
        "ai",
        "paper-generator",
    }
)

#: Question ids belonging to the seeded question bank (never paper-authored
#: content). Paper questionList items carrying these ids ARE the seeded
#: records re-embedded into fabricated mock papers.
BANK_QUESTION_ID_PREFIXES = ("CQ-", "UPYQ-")

#: Keys whose LIST values are seeded question-record collections.
QUESTION_RECORD_LIST_KEYS = frozenset(
    {
        "mostRepeated",
        "aiPredictedQuestions",
        "aiImportantQuestions",
        "competitiveQuestions",
        "universityPyqQuestions",
        "pyqRecords",
        "universityPyq",
        "paperPreview",
    }
)

#: Honest placeholder when no live question data exists.
NEUTRAL_BANK_STATUS = "Question bank status unavailable"
NEUTRAL_REPORT_SUMMARY = "No question data yet"

_BANK_CLAIM_RE = re.compile(r"\d+\s+questions|quality of \d|cohort accuracy|\d\d\.\d/100")

_AVERAGES = ("avgAccuracy", "qualityAvg")
_CORPUS_COUNTS = ("totalPapers", "totalQuestions", "repeatedQuestions", "coveragePct")
_SUMMARY_COUNT_KEYS = ("questionBank", "aiGenerated", "flagged", "pyqPapers")


def _neutral_count_dict(value: dict[str, Any]) -> dict[str, Any]:
    """Keep keys, zero numbers, empty mapping values (e.g. byType/bySubject)."""
    out: dict[str, Any] = {}
    for k, v in value.items():
        if isinstance(v, bool):
            out[k] = v
        elif isinstance(v, (int, float)):
            out[k] = 0
        elif isinstance(v, dict):
            out[k] = {}
        elif isinstance(v, list):
            out[k] = []
        else:
            out[k] = v
    return out


def _neutral_question_stats(value: dict[str, Any]) -> dict[str, Any]:
    """Neutral questionStats block — same contract, honest empty values."""
    out: dict[str, Any] = {}
    for k, v in value.items():
        if k in _AVERAGES:
            out[k] = None
        elif isinstance(v, list):
            out[k] = []
        elif isinstance(v, dict):
            # qualityBuckets keeps its level keys at 0; other maps empty.
            out[k] = {bk: 0 for bk in v} if k == "qualityBuckets" else {}
        elif isinstance(v, bool):
            out[k] = v
        elif isinstance(v, (int, float)):
            out[k] = 0
        else:
            out[k] = v
    return out


def _neutral_competitive_intelligence(value: dict[str, Any]) -> dict[str, Any]:
    """Neutral derived view over the (removed) competitive record collections."""
    out: dict[str, Any] = {}
    for k, v in value.items():
        if isinstance(v, bool):
            out[k] = v
        elif isinstance(v, (int, float)):
            out[k] = 0
        elif isinstance(v, (dict, list)):
            out[k] = type(v)()
        else:
            out[k] = v
    return out


def _zero_corpus_counts(value: dict[str, Any]) -> dict[str, Any]:
    out = dict(value)
    for k in _CORPUS_COUNTS:
        if k in out and isinstance(out[k], (int, float)) and not isinstance(out[k], bool):
            out[k] = 0
    return out


def _neutralize_list(key: str, items: list, path: str) -> tuple[list, list[str]]:
    """Neutralize fabricated question-derived values inside known list shapes."""
    changes: list[str] = []

    # a. Export rows for the (empty) question bank / PYQ corpus.
    if key in ("exportHistory", "exportOptions"):
        out_items = []
        for i, item in enumerate(items):
            if isinstance(item, dict) and isinstance(item.get("name"), str):
                name = item["name"]
                if "Question Bank" in name or "PYQ" in name.upper():
                    new_item = dict(item)
                    touched = False
                    if item.get("rows"):
                        new_item["rows"] = 0
                        touched = True
                    if (
                        isinstance(item.get("detail"), str)
                        and item["detail"] != "0 papers"
                        and re.fullmatch(r"\d+ papers", item["detail"])
                    ):
                        new_item["detail"] = "0 papers"
                        touched = True
                    if touched:
                        changes.append(f"{path}[{i}]: fabricated export record counts → 0")
                        out_items.append(new_item)
                        continue
            out_items.append(item)
        return out_items, changes

    # b. Report-template stats derived from the fabricated bank/PYQ corpus.
    if key == "templates":
        out_items = []
        for i, item in enumerate(items):
            if (
                isinstance(item, dict)
                and isinstance(item.get("id"), str)
                and item["id"].startswith("rt_")
                and isinstance(item.get("stat"), dict)
            ):
                stat = item["stat"]
                new_stat = dict(stat)
                touched = False
                if "qbank" in item["id"] and stat.get("value"):
                    new_stat["value"] = 0
                    touched = True
                if (
                    "pyq" in item["id"]
                    and isinstance(stat.get("value"), str)
                    and stat["value"] != "0 papers"
                    and re.fullmatch(r"\d+ papers", stat["value"])
                ):
                    new_stat["value"] = "0 papers"
                    touched = True
                if touched:
                    changes.append(f"{path}[{i}]: fabricated report-template stat → neutral")
                    out_items.append({**item, "stat": new_stat})
                    continue
            out_items.append(item)
        return out_items, changes

    # c. Narrative highlights claiming fabricated bank coverage.
    if key == "highlights":
        out_items = []
        for i, item in enumerate(items):
            if isinstance(item, str) and re.search(r"· \d+ bank questions", item):
                changes.append(f"{path}[{i}]: fabricated bank-coverage claim removed")
                out_items.append(re.sub(r"\s*· \d+ bank questions.*$", "", item))
                continue
            out_items.append(item)
        return out_items, changes

    return items, changes


def clean_spa_document(doc: Any) -> tuple[Any, list[str]]:
    """Return (cleaned_document, list_of_changes). Pure + idempotent."""

    changes: list[str] = []

    def walk(node: Any, path: str) -> Any:
        if isinstance(node, list):
            return [walk(v, f"{path}[{i}]") for i, v in enumerate(node)]
        if not isinstance(node, dict):
            return node

        out: dict[str, Any] = {}
        for key, value in node.items():
            child_path = f"{path}.{key}" if path else key

            # 1. Seeded question-record collections → empty lists.
            if key in QUESTION_RECORD_LIST_KEYS and isinstance(value, list) and value:
                changes.append(f"{child_path}: removed {len(value)} seeded question records")
                out[key] = []
                continue

            # 2. Bank collections: {summary, questions} → empty record list + neutral summary.
            if key in ("questionBank", "adminQuestionBank") and isinstance(value, dict) and "questions" in value:
                new_value = dict(value)
                if value.get("questions"):
                    changes.append(f"{child_path}.questions: removed {len(value['questions'])} seeded question records")
                new_value["questions"] = []
                if isinstance(new_value.get("summary"), dict):
                    new_value["summary"] = _neutral_count_dict(new_value["summary"])
                out[key] = {k: walk(v, f"{child_path}") for k, v in new_value.items()}
                continue

            # 3. Bank SUMMARY-ONLY blocks (admin derived questionBank counts) → neutral.
            if key in ("questionBank", "adminQuestionBank") and isinstance(value, dict) and "total" in value:
                neutral = _neutral_count_dict(value)
                if neutral != value:
                    changes.append(f"{child_path}: fabricated bank counts → neutral")
                out[key] = neutral
                continue

            # 4. Fabricated questionStats block → neutral.
            if key == "questionStats" and isinstance(value, dict):
                if value.get("total") or value.get("questions") or value.get("avgAccuracy") is not None:
                    changes.append(f"{child_path}: fabricated question stats → neutral")
                out[key] = _neutral_question_stats(value)
                continue

            # 5. Derived competitive question intelligence → neutral.
            if key == "competitiveQuestionIntelligence" and isinstance(value, dict):
                if value.get("total") or value.get("pyqRecords") or value.get("universityPyq"):
                    changes.append(f"{child_path}: derived seeded-record intelligence → neutral")
                out[key] = _neutral_competitive_intelligence(value)
                continue

            # 6. PYQ corpus fabricated counts → 0 (keep the analytics window).
            if key == "pyqCorpus" and isinstance(value, dict) and any(value.get(k) for k in _CORPUS_COUNTS):
                changes.append(f"{child_path}: fabricated PYQ corpus counts → 0")
                out[key] = _zero_corpus_counts(value)
                continue

            # 7. PYQ analysis overview fabricated corpus counts → 0.
            if key == "overview" and isinstance(value, dict) and "totalPapers" in value and any(
                value.get(k) for k in _CORPUS_COUNTS
            ):
                changes.append(f"{child_path}: fabricated PYQ overview counts → 0")
                out[key] = _zero_corpus_counts(value)
                continue

            # 8. assessmentSummary fabricated question-bank counts → 0.
            if key == "assessmentSummary" and isinstance(value, dict) and any(
                value.get(k) for k in _SUMMARY_COUNT_KEYS
            ):
                new_value = dict(value)
                for k in _SUMMARY_COUNT_KEYS:
                    if k in new_value and isinstance(new_value[k], (int, float)) and not isinstance(new_value[k], bool):
                        new_value[k] = 0
                changes.append(f"{child_path}: fabricated question-bank counts → 0")
                out[key] = new_value
                continue

            # 9. Fabricated dashboard bank-status strings → neutral.
            if key == "questionBankStatus" and isinstance(value, str) and value != NEUTRAL_BANK_STATUS:
                changes.append(f"{child_path}: fabricated bank status → neutral")
                out[key] = NEUTRAL_BANK_STATUS
                continue

            # 10. Report summaries claiming fabricated bank stats → neutral.
            if key == "summary" and isinstance(value, str) and "questions ·" in value:
                changes.append(f"{child_path}: fabricated report bank summary → neutral")
                out[key] = NEUTRAL_REPORT_SUMMARY
                continue

            # 11. Quiz-generator seeded sample questions → empty (no bundled samples).
            if key == "quizGeneratorSample" and isinstance(value, dict):
                new_value = dict(value)
                if new_value.get("questions"):
                    changes.append(f"{child_path}.questions: removed {len(new_value['questions'])} sample question records")
                new_value["questions"] = []
                if isinstance(new_value.get("title"), str):
                    new_value["title"] = "AI quiz generator"
                out[key] = new_value
                continue

            # 12. Pattern records: drop the fabricated example question stem.
            if key == "example" and isinstance(value, str) and "frequency" in node and "impact" in node:
                changes.append(f"{child_path}: fabricated pattern example stem removed")
                continue

            # 13. Paper questionLists in the seed are fabricated question
            #     records — either the seeded bank records re-embedded into
            #     mock papers (CQ-* / UPYQ-*) or the authored demo questions
            #     (GP1-Q-* whose stems the removal list names explicitly).
            #     Paper RECORDS are preserved; their seeded question content
            #     is not.
            if key == "questionList" and isinstance(value, list):
                seeded = [
                    q for q in value
                    if isinstance(q, dict)
                    and (
                        str(q.get("id", "")).startswith(BANK_QUESTION_ID_PREFIXES)
                        or ("text" in q and isinstance(q.get("text"), str))
                    )
                ]
                if seeded:
                    kept = [q for q in value if q not in seeded]
                    changes.append(f"{child_path}: removed {len(seeded)} seeded question records from paper question list")
                    out[key] = kept
                    continue
                out[key] = walk(value, child_path)
                continue

            # 15. Assessment summary narrative claiming fabricated bank stats.
            if (
                key == "summary"
                and isinstance(value, dict)
                and {"headline", "body"} <= set(value)
                and isinstance(value.get("body"), str)
                and _BANK_CLAIM_RE.search(value["body"])
            ):
                new_value = dict(value)
                changes.append(f"{child_path}: fabricated assessment-health narrative → neutral")
                if _BANK_CLAIM_RE.search(str(value.get("headline", ""))):
                    new_value["headline"] = "Assessment health unavailable"
                new_value["body"] = "Question bank data will appear here once real questions are added."
                if isinstance(value.get("highlights"), list):
                    new_value["highlights"] = [
                        NEUTRAL_REPORT_SUMMARY if isinstance(h, str) and _BANK_CLAIM_RE.search(h) else h
                        for h in value["highlights"]
                    ]
                out[key] = new_value
                continue

            # 16. Report-template "latest" run summaries claiming bank stats.
            if key == "latest" and isinstance(value, str) and re.search(r"\d+ questions", value):
                changes.append(f"{child_path}: fabricated report bank summary → neutral")
                out[key] = NEUTRAL_REPORT_SUMMARY
                continue

            # 17. Insight-pool cards must not claim fabricated generated counts.
            if key == "body" and isinstance(value, str) and "questions generated" in value:
                new_value = re.sub(r"\d+ questions generated,?\s*", "", value)
                if new_value != value:
                    changes.append(f"{child_path}: fabricated generated-questions claim removed")
                    out[key] = new_value
                    continue

            # 18. Assessment-summary input blocks: bank/PYQ totals → 0
            #     (papers/exams/quizzes record counts are metadata, kept).
            if key == "assessmentSummaryInputs" and isinstance(value, dict):
                new_value = dict(value)
                touched = False
                for k in ("questionBankTotal", "pyqPapers"):
                    if isinstance(new_value.get(k), (int, float)) and not isinstance(new_value[k], bool) and new_value[k]:
                        new_value[k] = 0
                        touched = True
                if touched:
                    changes.append(f"{child_path}: fabricated bank/PYQ input totals → 0")
                    out[key] = new_value
                    continue

            # 19. AI-assistant transcripts must not embed fabricated quizzes.
            if key == "text" and isinstance(value, str) and "**Q1" in value:
                changes.append(f"{child_path}: fabricated quiz transcript → neutral draft shell")
                out[key] = (
                    "Here’s a draft quiz shell on **network flows** (10 slots, medium difficulty). "
                    "Pick questions from your question bank to fill it — I can assemble the answer key once the questions are selected."
                )
                continue

            walked = walk(value, child_path)
            if isinstance(walked, list):
                walked, list_changes = _neutralize_list(key, walked, child_path)
                changes.extend(list_changes)
            out[key] = walked

        # 14. A paper whose seeded question list was removed must not keep a
        #     fabricated question count.
        if (
            "questionList" in out
            and isinstance(out["questionList"], list)
            and not out["questionList"]
            and isinstance(out.get("questions"), (int, float))
            and not isinstance(out.get("questions"), bool)
            and out["questions"]
        ):
            changes.append(f"{path}: fabricated paper question count → 0")
            out["questions"] = 0
        return out

    return walk(doc, ""), changes


def clean_document_if_affected(name: str, doc: Any) -> Any:
    """Apply the cleanup only to documents known to have carried seeded records."""
    if name not in AFFECTED_DOCUMENTS:
        return doc
    cleaned, _ = clean_spa_document(doc)
    return cleaned


def clean_source_files() -> dict[str, list[str]]:
    """Physically clean the seed JSON files. Idempotent; returns per-file changes."""
    report: dict[str, list[str]] = {}
    for path in sorted(DATA_DIR.glob("*.json")):
        if path.stem not in AFFECTED_DOCUMENTS:
            continue
        original = json.loads(path.read_text(encoding="utf-8"))
        cleaned, changes = clean_spa_document(original)
        if changes:
            path.write_text(json.dumps(cleaned, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        report[path.name] = changes
    return report


if __name__ == "__main__":  # pragma: no cover - manual/CI utility
    for file_name, changes in clean_source_files().items():
        print(f"== {file_name}: {len(changes)} change(s)")
        for change in changes:
            print(f"   - {change}")
