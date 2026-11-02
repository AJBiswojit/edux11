from typing import Annotated

import json
from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.services.pg_submission_queue import PgSubmissionService

from app.core.config import get_settings
from app.core.deps import DbDep, require_roles
from app.models.identity import User
from app.models.assessment import Paper
from app.models.exams import ExamAttempt
from app.services import admin_runtime
from app.services import admin_intel_cache
from app.services import reports_runtime
from app.services.similar_issues_runtime import similar_issues_for_admin
from sqlalchemy import select

_submission_service: PgSubmissionService | None = None


def _get_submission_service() -> PgSubmissionService:
    global _submission_service
    if _submission_service is None:
        _submission_service = PgSubmissionService(get_settings())
    return _submission_service

router = APIRouter(tags=["admin"])
AdminDep = Annotated[User, Depends(require_roles("admin"))]


def _intel(db, user):
    return admin_intel_cache.get_summary(db, user)


@router.get("/admin-intelligence/summary")
def admin_summary(db: DbDep, user: AdminDep):
    return _intel(db, user)


@router.get("/admin-intelligence/teaching")
def admin_teaching(db: DbDep, user: AdminDep):
    return admin_intel_cache.get_teaching(db, user)


@router.get("/admin-intelligence/profile")
def admin_profile(db: DbDep, user: AdminDep):
    admin_runtime.require_admin(user)
    return admin_runtime.build_admin_profile(db, user)


@router.get("/admin-intelligence/datasets")
def admin_datasets(db: DbDep, user: AdminDep):
    return _intel(db, user)["datasets"]


@router.get("/admin-intelligence/derived")
def admin_derived(db: DbDep, user: AdminDep):
    return _intel(db, user)["derived"]


@router.get("/admin/feature-flags")
def flags():
    return {"parentPortal": get_settings().parent_portal_enabled}


@router.get("/admin/students")
def admin_students(db: DbDep, user: AdminDep):
    return admin_intel_cache.get_students(db, user)


@router.post("/admin/students")
def create_admin_student(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_student(db, user, body or {})


@router.get("/admin/faculty")
def admin_faculty(db: DbDep, user: AdminDep):
    return admin_intel_cache.get_faculty(db, user)


@router.post("/admin/faculty")
def create_admin_faculty(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_faculty(db, user, body or {})


@router.get("/admin/faculty/{faculty_id}/analytics")
def faculty_analytics(faculty_id: str, db: DbDep, user: AdminDep):
    return admin_runtime.faculty_analytics_bundle(db, user, faculty_id)


@router.get("/admin/dashboard")
def admin_dashboard(db: DbDep, user: AdminDep):
    return admin_runtime.dashboard_payload(db, user.institution_id)


@router.get("/admin/users")
def admin_users(db: DbDep, user: AdminDep):
    return {"users": admin_runtime.list_users(db, user.institution_id)}


@router.post("/admin/users/invite")
def invite_admin_users(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.invite_users(db, user, body or {})


@router.patch("/admin/users/{user_id}/status")
def patch_user_status(user_id: str, body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.set_user_status(db, user, user_id, body or {})


@router.get("/admin/departments")
def admin_departments(db: DbDep, user: AdminDep):
    return {"departments": admin_runtime.list_departments(db, user.institution_id)}


@router.post("/admin/departments")
def create_admin_department(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_department(db, user, body or {})


@router.get("/admin/courses")
def admin_courses(db: DbDep, user: AdminDep):
    return {"courses": admin_runtime.list_courses(db, user.institution_id)}


@router.post("/admin/courses")
def create_admin_course(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_course(db, user, body or {})


@router.get("/admin/analytics")
def admin_analytics(db: DbDep, user: AdminDep):
    return _intel(db, user)["datasets"]["analytics"]["adminAnalytics"]


@router.get("/admin/performance")
def admin_performance(db: DbDep, user: AdminDep):
    return _intel(db, user)["datasets"]["analytics"]["adminPerformance"]


@router.get("/admin/placements")
def admin_placements():
    return admin_runtime.empty_p3("placements")


@router.get("/admin/research")
def admin_research(db: DbDep, user: AdminDep):
    return admin_runtime.research_payload(db, user.institution_id)


@router.get("/admin/roles")
def admin_roles(db: DbDep, user: AdminDep):
    return admin_runtime.roles_payload(db, user.institution_id)


@router.get("/admin/permissions")
def admin_permissions():
    return admin_runtime.empty_p3("permissions")


@router.get("/admin/audit-logs")
def admin_audit_logs(db: DbDep, user: AdminDep):
    return admin_runtime.audit_logs_payload(db, user.institution_id)


@router.get("/admin/ai-config")
def admin_ai_config():
    return admin_runtime.empty_p3("ai-config")


@router.get("/admin/settings")
def admin_settings(db: DbDep, user: AdminDep):
    return admin_runtime.settings_payload(db, user)


@router.patch("/admin/settings")
def patch_admin_settings(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.save_settings(db, user, body or {})


@router.get("/admin/revenue")
def admin_revenue():
    return admin_runtime.empty_p3("revenue")


@router.get("/admin/programs")
def admin_programs(db: DbDep, user: AdminDep):
    return {"programs": admin_runtime.list_programs(db, user.institution_id)}


@router.post("/admin/programs")
def create_admin_program(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_program(db, user, body or {})


@router.get("/admin/programs/{program_id}/results")
def admin_program_results(program_id: str, db: DbDep, user: AdminDep):
    from app.exam_engine.engine import program_results

    return program_results(db, user, program_id)


@router.get("/admin/subjects")
def admin_subjects(db: DbDep, user: AdminDep):
    return {"subjects": admin_runtime.list_subjects(db, user.institution_id)}


@router.post("/admin/subjects")
def create_admin_subject(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_subject(db, user, body or {})


@router.get("/admin/batches")
def admin_batches(db: DbDep, user: AdminDep):
    return {"batches": admin_runtime.list_batches(db, user.institution_id)}


@router.post("/admin/batches")
def create_admin_batch(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_batch(db, user, body or {})


@router.get("/admin/calendar")
def admin_calendar(db: DbDep, user: AdminDep):
    return {"events": admin_runtime.list_calendar(db, user.institution_id)}


@router.post("/admin/calendar")
def create_admin_calendar(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_calendar_event(db, user, body or {})


@router.get("/admin/attendance-analytics")
def attendance_analytics(db: DbDep, user: AdminDep):
    return _intel(db, user)["datasets"]["analytics"]["adminAttendanceAnalytics"]


@router.get("/admin/assignment-analytics")
def assignment_analytics(db: DbDep, user: AdminDep):
    return _intel(db, user)["datasets"]["analytics"]["adminAssignmentAnalytics"]


@router.get("/admin/exam-analytics")
def exam_analytics(db: DbDep, user: AdminDep):
    return _intel(db, user)["datasets"]["analytics"]["adminExamAnalytics"]


@router.get("/admin/similar-issues")
def admin_similar_issues(db: DbDep, user: AdminDep):
    return similar_issues_for_admin(db, user.institution_id)


@router.get("/admin/exams")
def admin_exams(db: DbDep, user: AdminDep):
    from collections import defaultdict
    papers = db.scalars(select(Paper).where(Paper.institution_id == user.institution_id)).all()
    attempts = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.institution_id == user.institution_id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_not(None),
        )
    ).all()

    # Group attempts by exam_id (falls back to exam_name for attempts without an exam_id)
    attempt_by_exam: dict[str, list[ExamAttempt]] = defaultdict(list)
    for a in attempts:
        key = a.exam_id or a.exam_name or "unknown"
        attempt_by_exam[key].append(a)

    # Build exam list from Paper rows (source of truth for published exams)
    papers_by_id = {p.id: p for p in papers}
    exams = []
    seen_keys: set[str] = set()

    for p in papers:
        paper_attempts = attempt_by_exam.get(p.id, [])
        accuracies = []
        for a in paper_attempts:
            try:
                sc = json.loads(a.scoring or '{}')
                scored = sc.get('scoredMarks') or sc.get('scored') or 0
                total = sc.get('totalMarks') or sc.get('total') or 0
                if total:
                    accuracies.append(round(scored / total * 100, 1))
            except (json.JSONDecodeError, TypeError, ZeroDivisionError):
                pass
        avg_score = round(sum(accuracies) / len(accuracies), 1) if accuracies else None
        seen_keys.add(p.id)
        exams.append({
            "id": p.id,
            "title": p.title or "Untitled",
            "subject": p.subject_id,
            "examMode": p.exam_mode or "university",
            "examFamily": p.exam_family,
            "status": p.status or "draft",
            "createdAt": p.created_at.isoformat()[:10] if p.created_at else None,
            "attemptCount": len(paper_attempts),
            "avgScore": avg_score,
        })

    exams.sort(key=lambda e: e.get("createdAt") or "", reverse=True)
    return {"exams": exams}


@router.get("/admin/question-bank")
def admin_question_bank(db: DbDep, user: AdminDep):
    return admin_runtime.question_bank_payload(db, user.institution_id)


@router.get("/admin/scholarships")
def scholarships():
    return admin_runtime.empty_p3("scholarships")


@router.get("/admin/cms")
def cms():
    return admin_runtime.empty_p3("cms")


@router.get("/admin/api-config")
def api_config():
    return admin_runtime.empty_p3("api-config")


@router.get("/admin/data-tools")
def data_tools():
    return admin_runtime.empty_p3("data-tools")


@router.get("/admin/support")
def admin_support(db: DbDep, user: AdminDep):
    return admin_runtime.support_tickets(db, user)


@router.post("/admin/support")
def create_admin_support(body: dict, db: DbDep, user: AdminDep):
    return admin_runtime.create_support_ticket(db, user, body or {})


@router.get("/admin/reports")
def list_admin_reports(db: DbDep, user: AdminDep):
    return {"items": reports_runtime.list_reports(db, user)}


@router.post("/admin/reports")
def create_admin_report(body: dict, db: DbDep, user: AdminDep):
    return reports_runtime.create_report(db, user, body or {})


@router.delete("/admin/reports/{report_id}")
def delete_admin_report(report_id: str, db: DbDep, user: AdminDep):
    return reports_runtime.delete_report(db, user, report_id)


@router.patch("/admin/reports/{report_id}/archive")
def archive_admin_report(report_id: str, body: dict, db: DbDep, user: AdminDep):
    return reports_runtime.archive_report(db, user, report_id, body.get("archived") if isinstance(body, dict) else None)


@router.get("/admin/reports/{report_id}/download")
def download_admin_report(report_id: str, db: DbDep, user: AdminDep):
    row, data = reports_runtime.download_report(db, user, report_id)
    payload = reports_runtime.serialize_report(row)
    filename = f"{payload.get('title') or 'report'}.pdf".replace(" ", "_")
    return Response(content=data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/directory/faculty")
def directory_faculty(db: DbDep, user: AdminDep):
    return {"items": admin_runtime.faculty_payload(db, user.institution_id).get("faculty") or []}


@router.get("/directory/students")
def directory_students(db: DbDep, user: AdminDep):
    return {"items": admin_runtime.students_payload(db, user.institution_id).get("students") or []}


@router.get("/directory/users")
def directory_users(db: DbDep, user: AdminDep):
    return {"items": admin_runtime.list_users(db, user.institution_id)}


@router.get("/admin/queue/metrics")
async def queue_metrics(user: AdminDep):
    """Return queue health metrics. Requires admin role."""
    try:
        svc = _get_submission_service()
        return await svc.queue_metrics()
    except Exception:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(503, detail={"error": "Service temporarily unavailable"})


# ---------------------------------------------------------------------------
# Exam resume / restart — admin-controlled
# ---------------------------------------------------------------------------

@router.get("/admin/exam-attempts/terminated")
def admin_terminated_attempts(db: DbDep, user: AdminDep):
    """List all terminated exam attempts in the institution so the admin can act on them."""
    from app.services.examination import admin_list_terminated_attempts
    return {"items": admin_list_terminated_attempts(db, user)}


@router.post("/admin/exam-attempts/{attempt_id}/grant-resume")
def admin_grant_resume(attempt_id: str, db: DbDep, user: AdminDep):
    """Admin grants a student permission to resume a terminated exam with all previous answers intact."""
    from app.services.examination import admin_grant_exam_resume
    return admin_grant_exam_resume(db, user, attempt_id)


@router.post("/admin/exam-attempts/{attempt_id}/restart")
def admin_restart(attempt_id: str, db: DbDep, user: AdminDep):
    """Admin lets a student restart a terminated exam completely from scratch (old attempt is discarded)."""
    from app.services.examination import admin_restart_exam
    return admin_restart_exam(db, user, attempt_id)
