/**
 * Student · Micro-Assessments.
 *
 * Formative assignments created in the faculty Micro-Assessment Studio. The
 * runner uses a separate attempt contract and never writes official exams.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, BrainCircuit, CheckCircle2, ClipboardCheck, Clock3, FileQuestion, Sparkles, Target } from 'lucide-react'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/contexts/auth-context'
import { useStudentMicroAssessment, useStudentMicroAssessments, useSubmitMicroAssessmentAttempt } from '@/services/micro-assessments'
import { StudentMicroAssessmentRunner } from '@/components/micro-assessment-studio/student-runner'

const STATUS_STYLE = { 'Not Started': 'info', 'In Progress': 'warning', Completed: 'success' }

function AssessmentCard({ assessment, onOpen }) {
  return <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/20"><ClipboardCheck className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-500">{assessment.subject} · {assessment.domain === 'competitive' ? assessment.examFamily : 'University'}</p><h2 className="mt-1 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{assessment.title}</h2></div></div><Badge variant={STATUS_STYLE[assessment.status] ?? 'secondary'} size="sm">{assessment.status}</Badge></div><p className="mt-3 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">Faculty: {assessment.faculty ?? 'EduX Faculty'} · {assessment.chapter} · {assessment.topic}</p><div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline" size="sm"><FileQuestion className="h-3 w-3" /> {assessment.questionCount} questions</Badge><Badge variant="outline" size="sm"><Clock3 className="h-3 w-3" /> {assessment.duration} min</Badge><Badge variant="outline" size="sm">Due {assessment.deadline}</Badge></div><div className="mt-auto pt-4"><Button size="sm" className="w-full" variant={assessment.status === 'Completed' ? 'outline' : 'default'} onClick={onOpen}>{assessment.status === 'Completed' ? 'Review status' : assessment.status === 'In Progress' ? 'Continue assessment' : 'Start assessment'} <ArrowRight className="h-3.5 w-3.5" /></Button></div></Card>
}

function CompletedNotice({ assessment, onBack }) {
  return <Card className="mx-auto max-w-xl border-emerald-200/70 bg-emerald-50/60 p-7 text-center dark:border-emerald-500/25 dark:bg-emerald-500/10"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"><CheckCircle2 className="h-7 w-7" /></span><h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Response submitted</h2><p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">Your response for <strong>{assessment.title}</strong> is saved. This formative attempt stays separate from your official examination record.</p><Button className="mt-5" onClick={onBack}>Back to My Assessments</Button></Card>
}

function MicroAssessments() {
  const { user } = useAuth()
  const studentId = user?.id
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: listData, isLoading: listLoading, isError: listError, refetch: refetchList } = useStudentMicroAssessments(studentId)
  const { data: detailData, isLoading: detailLoading, isError: detailError, refetch: refetchDetail } = useStudentMicroAssessment(assessmentId, studentId)
  const submit = useSubmitMicroAssessmentAttempt()
  const [submitted, setSubmitted] = useState(false)

  if (listLoading || (assessmentId && detailLoading)) return <DashboardSkeleton cards={3} />
  if (listError || (assessmentId && detailError)) return <ErrorState title="Micro-assessments unavailable" onRetry={() => { refetchList(); if (assessmentId) refetchDetail() }} />

  if (assessmentId && detailData?.assessment) {
    const assessment = detailData.assessment
    if (submitted || detailData.attempt?.status === 'completed') return <div><PageHeader eyebrow="Student · Micro-Assessments" title="My Assessments" description="Short formative checks from your faculty — a safe place to practise and show what you understand." breadcrumbs={[{ label: 'Student' }, { label: 'My Assessments' }]} /><CompletedNotice assessment={assessment} onBack={() => { setSubmitted(false); navigate('/student/micro-assessments') }} /></div>
    return <StudentMicroAssessmentRunner assessment={assessment} attempt={detailData.attempt} onBack={() => navigate('/student/micro-assessments')} onSubmit={(payload) => new Promise((resolve, reject) => submit.mutate({ id: assessment.id, studentId, ...payload }, { onSuccess: () => { setSubmitted(true); toast.success('Assessment submitted', 'Your formative response is saved separately from official exams.'); resolve() }, onError: (error) => { toast.error('Submission failed', error?.response?.data?.message ?? error.message); reject(error) } }))} />
  }

  const items = listData?.items ?? []
  return <div><PageHeader eyebrow="Student · Formative Learning" title="My Assessments" description="Short, source-grounded micro-assessments sent by your faculty. Complete them to practise a concept without changing your official exam record." breadcrumbs={[{ label: 'Student' }, { label: 'My Assessments' }]} actions={<Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> {items.length} assigned</Badge>} /><div className="mb-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10"><BrainCircuit className="h-5 w-5 text-indigo-500" /><p className="mt-2 text-[13px] font-bold text-slate-800 dark:text-white">Targeted practice</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">Each set is connected to a chapter and concept your faculty has taught.</p></div><div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 dark:border-teal-500/20 dark:bg-teal-500/10"><Target className="h-5 w-5 text-teal-500" /><p className="mt-2 text-[13px] font-bold text-slate-800 dark:text-white">Quick feedback</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">Answer a small set, then use the results to decide what to revisit.</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10"><CheckCircle2 className="h-5 w-5 text-amber-500" /><p className="mt-2 text-[13px] font-bold text-slate-800 dark:text-white">Not an official exam</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">Formative attempts are tracked separately from university, JEE and NEET analytics.</p></div></div>{items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((assessment) => <AssessmentCard key={assessment.id} assessment={assessment} onOpen={() => navigate(`/student/micro-assessments/${assessment.id}`)} />)}</div> : <EmptyState icon={ClipboardCheck} title="No micro-assessments yet" description="When your faculty sends a formative assessment for your batch, it will appear here." />}</div>
}

export { MicroAssessments }
export default MicroAssessments
