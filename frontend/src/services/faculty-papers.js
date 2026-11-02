/**
 * Faculty Paper Generator & Library — live FastAPI routes.
 *
 * Persistence is SQL `papers` / `paper_questions`. Create sends
 * selectedQuestionIds; publish is POST .../papers/{id}/publish.
 *
 * Endpoints (real backend):
 *  GET    /faculty/paper-generator/catalog            -> generator config
 *  POST   /faculty/paper-generator/papers             -> create paper (selectedQuestionIds only)
 *  DELETE /faculty/paper-generator/papers/:id
 *  POST   /faculty/paper-generator/papers/:id/duplicate
 *  PATCH  /faculty/paper-generator/papers/:id/archive
 *  POST   /faculty/paper-generator/papers/:id/share
 *  POST   /faculty/paper-generator/generate-demo      -> deterministic bank generation
 *  GET    /faculty/paper-generator/ai-library         -> AI paper library
 *
 * Domain isolation preserved via domain+examFamily, not subject inference.
 * `{ ok: false }` HTTP 200 is rejected by the axios interceptor.
 *
 * The AI job endpoints (generate-ai / ai-status / ai-paper / ai-active) have no
 * runtime consumers: question generation runs through
 * /faculty/question-bank/generate (faculty-question-generation.js) and finished
 * AI papers are listed from ai-library in the Paper Library tab. Nothing may
 * auto-load an AI paper into the Generate Paper workflow.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { canonicalExamFamily } from '@/api/adapters/questions'
import { normalizePaper, normalizePaperGeneratorPayload } from '@/api/adapters/papers'

export async function fetchPaperGenerator() {
  const { data } = await api.get('/faculty/paper-generator')
  return normalizePaperGeneratorPayload(data)
}

// --- AI paper library (external microservice, Option A) ---
// The AI service writes generated papers/questions into the shared DB; EduX
// reads the finished records back for the Paper Library.

/** Paper Library backed by ai_generated_papers. */
export async function fetchAiLibrary() {
  const { data } = await api.get('/faculty/paper-generator/ai-library')
  return {
    generatedPapers: data?.generatedPapers ?? [],
    versionHistory: data?.versionHistory ?? {},
  }
}

/**
 * Full detail of one AI-generated paper, including its questions.
 *
 * Used by the Paper Library View modal: the list payload carries only
 * counts/metadata, while the question records (stem, options, solution,
 * explanation) live behind the read-back endpoint
 * GET /faculty/paper-generator/ai-paper/{id}.
 */
export async function fetchAiPaperDetail(id) {
  const { data } = await api.get(`/faculty/paper-generator/ai-paper/${id}`)
  return data
}

export async function fetchPapers() {
  const data = await fetchPaperGenerator()
  return {
    generatedPapers: data?.generatedPapers ?? [],
    config: data?.config ?? null,
    versionHistory: data?.versionHistory ?? {},
  }
}

/** Live route is not implemented (404). Callers must handle the error — no fake paper. */
export async function fetchPaperById(id) {
  const { data } = await api.get(`/faculty/paper-generator/papers/${id}`)
  return normalizePaper(data?.paper ?? data)
}

/**
 * Create paper — backend contract (Phase 9 updated):
 * selectedQuestionIds only (ID-based, no full objects). Builder stores IDs.
 */
export async function createPaper(payload) {
  const examFamily = payload.domain === 'Competitive' || payload.mode === 'Competitive'
    ? canonicalExamFamily(payload.examFamily ?? payload.exam)
    : null
  const body = {
    title: payload.title,
    domain: payload.domain ?? payload.mode ?? 'University',
    examFamily,
    mode: payload.domain ?? payload.mode ?? 'University',
    exam: examFamily,
    examType: payload.examType ?? payload.paperType ?? 'Mid Semester',
    paperType: payload.paperType ?? payload.examType ?? 'Mid Semester',
    course: payload.course ?? null,
    subject: payload.subject ?? null,
    chapter: payload.chapter ?? null,
    topic: payload.topic ?? null,
    program: payload.program ?? null,
    totalMarks: payload.totalMarks,
    duration: payload.duration,
    difficulty: payload.difficulty ?? 'Mixed',
    questions: payload.selectedQuestionIds?.length ?? payload.questions ?? 0,
    selectedQuestionIds: payload.selectedQuestionIds ?? [],
    bloomPreset: payload.bloomPreset ?? null,
    weightagePreset: payload.weightagePreset ?? null,
    coPreset: payload.coPreset ?? null,
    pyqPreference: payload.pyqPreference ?? null,
    negativeMarking: payload.negativeMarking ?? null,
    examPattern: payload.examPattern ?? null,
    config: payload.config ?? null,
    coverage: payload.coverage ?? 90,
    sets: payload.sets ?? 1,
    interventionId: payload.interventionId ?? null,
    // AI-generation provenance: the QuestionGeneration job ID whose questions
    // were selected for this paper.  Backend uses this to mark the paper as
    // AI-generated so it appears in the Paper Library.  null = non-AI paper.
    generationId: payload.generationId ?? null,
  }

  const { data } = await api.post('/faculty/paper-generator/papers', body)
  return { ...data, paper: data?.paper ? normalizePaper(data.paper) : data?.paper }
}

export async function deletePaper(id) {
  const { data } = await api.delete(`/faculty/paper-generator/papers/${id}`)
  return data
}

export async function duplicatePaper(id) {
  const { data } = await api.post(`/faculty/paper-generator/papers/${id}/duplicate`)
  return { ...data, paper: data?.paper ? normalizePaper(data.paper) : data?.paper }
}

export async function regeneratePaper(id) {
  const { data } = await api.post(`/faculty/paper-generator/papers/${id}/regenerate`)
  return { ...data, paper: data?.paper ? normalizePaper(data.paper) : data?.paper }
}

export async function archivePaper(id, archived) {
  const { data } = await api.patch(`/faculty/paper-generator/papers/${id}/archive`, { archived })
  return { ...data, paper: data?.paper ? normalizePaper(data.paper) : data?.paper }
}

export async function sharePaper(id, payload) {
  const { data } = await api.post(`/faculty/paper-generator/papers/${id}/share`, payload)
  return data
}

export async function publishPaper(id) {
  const { data } = await api.post(`/faculty/paper-generator/papers/${id}/publish`)
  return { ...data, paper: data?.paper ? normalizePaper(data.paper) : data?.paper }
}

export function usePaperGeneratorBackend() {
  return useQuery({
    queryKey: ['faculty', 'paper-generator', 'backend'],
    queryFn: fetchPaperGenerator,
    retry: false,
    staleTime: 1000 * 60 * 2,
  })
}

export function usePaperLibrary() {
  return useQuery({
    queryKey: ['faculty', 'paper-library', 'backend'],
    queryFn: fetchPapers,
    retry: false,
    staleTime: 1000 * 60 * 2,
  })
}

export function useAiPaperLibrary() {
  return useQuery({
    queryKey: ['faculty', 'paper-library', 'ai'],
    queryFn: fetchAiLibrary,
    retry: false,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Full paper + questions for the View modal. Enabled only while a paper is
 * open; data is cached per paper id, so re-opening a paper is instant.
 */
export function useAiPaperDetail(paperId) {
  return useQuery({
    queryKey: ['faculty', 'paper-library', 'ai-paper', paperId],
    queryFn: () => fetchAiPaperDetail(paperId),
    enabled: !!paperId,
    retry: false,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Full paper + questions for the View modal — SQL papers (source: 'sql-ai').
 * Calls GET /faculty/paper-generator/papers/{id} which returns questionList.
 * Enabled only while a sql-ai paper modal is open; cached per paper id.
 */
export function useSqlPaperDetail(paperId) {
  return useQuery({
    queryKey: ['faculty', 'paper-detail', 'sql', paperId],
    queryFn: () => fetchPaperById(paperId),
    enabled: !!paperId,
    retry: false,
    staleTime: 1000 * 60 * 2,
  })
}

export function usePaperCreateBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPaper,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-library'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator', 'backend'] })
      // Explicitly refetch the AI library so the new paper appears immediately
      // rather than waiting for the next background refetch cycle.
      qc.refetchQueries({ queryKey: ['faculty', 'paper-library', 'ai'] })
    },
  })
}

export function usePaperDeleteBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePaper,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-library'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator', 'backend'] })
    },
  })
}

export function usePaperDuplicateBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: duplicatePaper,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-library'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator', 'backend'] })
    },
  })
}

export function usePaperArchiveBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }) => archivePaper(id, archived),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-library'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator', 'backend'] })
    },
  })
}

export async function fetchPaperShares() {
  const { data } = await api.get('/faculty/paper-generator/shares')
  return data
}

export function usePaperShares() {
  return useQuery({
    queryKey: ['faculty', 'paper-shares'],
    queryFn: fetchPaperShares,
    retry: false,
    staleTime: 1000 * 60,
  })
}

export function usePaperShareBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => sharePaper(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-shares'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-library'] })
    },
  })
}

export function usePaperPublishBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: publishPaper,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-library'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator', 'backend'] })
    },
  })
}

// --- Paper Merge -----------------------------------------------------------

/** Fetch all published papers in the institution (for the merge wizard). */
export async function fetchPublishedPapers() {
  const { data } = await api.get('/faculty/papers/published')
  return data?.items ?? []
}

export function usePublishedPapers(enabled = true) {
  return useQuery({
    queryKey: ['faculty', 'papers', 'published'],
    queryFn: fetchPublishedPapers,
    enabled,
    retry: false,
    staleTime: 1000 * 60,
  })
}

/**
 * Merge multiple published papers into a new paper.
 * payload: { title, paperIds, duration?, totalMarks?, negativeMarking? }
 */
export async function mergePapers(payload) {
  const { data } = await api.post('/faculty/papers/merge', payload)
  return data
}

export function useMergePapers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mergePapers,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-library'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'paper-generator', 'backend'] })
      qc.refetchQueries({ queryKey: ['faculty', 'paper-library', 'ai'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'papers', 'published'] })
    },
  })
}
