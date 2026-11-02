from app.models.ai import AiConversation, AiMessage, AiPromptTemplate, AiTrace
from app.models.ai_papers import AiGeneratedPaper, AiGeneratedPaperQuestion, AiPaperStatus
from app.models.assessment import AiPaperShare, ContentChunk, ContentSource, Paper, PaperQuestion, PaperShare, Question, QuestionGeneration, QuestionGenerationItem, QuestionStudioSession, QuestionVersion
from app.models.catalog import AcademicTerm, Batch, Campus, CalendarEvent, Chapter, Course, Department, Program, Subject, Topic
from app.models.teaching import Announcement, Assignment, AssignmentSubmission, AttendanceRecord, AttendanceSession
from app.models.capabilities import (
    GeneratedReport,
    LessonPlan,
    MicroAssessment,
    MicroAssessmentAttempt,
    MicroAssessmentQuestion,
    MicroAssessmentTarget,
    ResearchPublication,
    TimetableSlot,
)
from app.models.exams import ExamAttempt, ExamQuestionAttempt, ExamSitting
from app.models.identity import AuthSession, Institution, OtpChallenge, RegistrationDraft, Role, User, UserRole
from app.models.intelligence import InstitutionHealthSnapshot, StudentDnaSnapshot
from app.models.interventions import Intervention, InterventionEffectiveness, InterventionStatusHistory, InterventionStudent, IssueGroup
from app.models.ops import AppKv, AuditLog, FileObject, NewsletterSubscriber, ContactInquiry, SupportTicket
from app.models.people import Enrollment, FacultyProfile, Guardian, GuardianStudent, StudentProfile

__all__ = [
    "AiConversation",
    "AiMessage",
    "AiPromptTemplate",
    "AiTrace",
    "AiGeneratedPaper",
    "AiGeneratedPaperQuestion",
    "AiPaperStatus",
    "ContentChunk",
    "ContentSource",
    "Paper",
    "PaperQuestion",
    "PaperShare",
    "AiPaperShare",
    "Question",
    "QuestionGeneration",
    "QuestionGenerationItem",
    "QuestionStudioSession",
    "QuestionVersion",
    "AcademicTerm",
    "Batch",
    "Chapter",
    "Course",
    "Department",
    "Program",
    "Subject",
    "Topic",
    "ExamAttempt",
    "ExamQuestionAttempt",
    "ExamSitting",
    "AuthSession",
    "Institution",
    "OtpChallenge",
    "RegistrationDraft",
    "Role",
    "User",
    "UserRole",
    "InstitutionHealthSnapshot",
    "StudentDnaSnapshot",
    "Intervention",
    "IssueGroup",
    "AppKv",
    "AuditLog",
    "ContactInquiry",
    "FileObject",
    "NewsletterSubscriber",
    "SupportTicket",
    "Enrollment",
    "FacultyProfile",
    "Guardian",
    "GuardianStudent",
    "StudentProfile",
    "AttendanceRecord",
    "AttendanceSession",
]
