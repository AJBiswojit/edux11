/**
 * Presentation helpers for the student competitive dashboard.
 * Reshapes values from the intelligence snapshot for display.
 * No data fetching, no side effects.
 */

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Compute the single "Overall Readiness" KPI from competitive readiness data.
 * Falls back to university readiness if competitive is absent.
 */
function buildOverallReadinessKpi({ derived }) {
  const competitive = derived.readiness?.competitive ?? []
  const university = derived.readiness?.university ?? []
  const allExams = [...competitive, ...university]

  if (allExams.length === 0) {
    return {
      id: 'readiness',
      label: 'Overall Readiness',
      value: '—',
      delta: '—',
      up: false,
      sub: 'No exams scheduled',
      icon: 'Target',
      gradient: 'from-indigo-500 to-violet-500',
    }
  }

  const avg = Math.round(allExams.reduce((s, e) => s + (e.readiness ?? 0), 0) / allExams.length)
  const families = Object.keys(derived.readiness?.byExamFamily ?? {})
  const sub = families.length > 0 ? `Across ${families.join(' · ')}` : `Across ${allExams.length} exam(s)`

  // Delta: compare to confidence index as a proxy for prior readiness
  const delta = derived.confidenceIndex != null ? +(avg - derived.confidenceIndex).toFixed(0) : null

  return {
    id: 'readiness',
    label: 'Overall Readiness',
    value: `${avg}%`,
    delta: delta != null ? `${delta >= 0 ? '+' : ''}${delta}%` : '—',
    up: delta == null ? avg >= 60 : delta >= 0,
    sub,
    icon: 'Target',
    gradient: 'from-indigo-500 to-violet-500',
  }
}

/**
 * Build chapter mastery rows from datasets.chapterMastery.
 * Shape from data: { subjectCode, subject, chapter, mastery, level }
 * Sorted by mastery descending so strongest chapters show first.
 * Falls back to subject mastery ranking when chapter data is absent.
 */
function buildChapterMasteryRows({ derived, datasets }) {
  const chapters = datasets.chapterMastery ?? datasets.competitiveChapters ?? []
  if (chapters.length > 0) {
    return chapters
      .filter((c) => c.mastery != null)
      .sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0))
      .slice(0, 6)
      .map((c, i) => ({
        id: c.id ?? `${c.subjectCode}-${i}`,
        subject: c.chapter ?? c.title ?? c.subject ?? 'Chapter',
        subjectLabel: c.subject,
        mastery: asNumber(c.mastery),
        color: c.color ?? null,
        examFamily: c.examFamily ?? null,
      }))
  }

  // Fallback: subject mastery ranking
  const ranking = derived.subjectMasteryRanking ?? []
  return ranking
    .filter((r) => r.mastery != null)
    .slice(0, 6)
    .map((r, i) => ({
      id: r.subjectCode ?? r.subject ?? `rank-${i}`,
      subject: r.subject,
      mastery: asNumber(r.mastery),
      color: r.color ?? null,
    }))
}

/**
 * Build syllabus coverage rows — one row per subject, derived by grouping
 * datasets.chapterMastery and computing average mastery per subject.
 * Falls back to subject mastery ranking when chapter data is absent.
 */
function buildSyllabusCoverageRows({ derived, datasets }) {
  // Prefer explicit syllabus coverage data if it ever arrives
  const explicit = datasets.syllabusCoverage ?? datasets.competitiveSyllabus ?? []
  if (explicit.length > 0) {
    return explicit.slice(0, 4).map((s, i) => ({
      id: s.id ?? `syl-${i}`,
      subject: s.subject ?? s.title,
      progress: asNumber(s.progress ?? s.pct) ?? 0,
      chaptersTotal: s.chaptersTotal ?? s.total ?? null,
      chaptersDone: s.chaptersDone ?? s.done ?? null,
      color: s.color ?? null,
      examFamily: s.examFamily ?? null,
    }))
  }

  // Derive from chapterMastery: group by subject, avg mastery = coverage proxy
  const chapters = datasets.chapterMastery ?? []
  if (chapters.length > 0) {
    const bySubject = {}
    for (const c of chapters) {
      const key = c.subjectCode ?? c.subject ?? 'Unknown'
      if (!bySubject[key]) bySubject[key] = { subject: c.subject ?? key, values: [], color: c.color ?? null }
      if (c.mastery != null) bySubject[key].values.push(c.mastery)
    }
    return Object.entries(bySubject)
      .slice(0, 4)
      .map(([key, g], i) => ({
        id: key,
        subject: g.subject,
        progress: g.values.length
          ? Math.round(g.values.reduce((s, v) => s + v, 0) / g.values.length)
          : 0,
        chaptersDone: g.values.filter((v) => v >= 70).length,
        chaptersTotal: g.values.length,
        color: g.color,
      }))
  }

  // Final fallback: subject mastery ranking
  const ranking = derived.subjectMasteryRanking ?? []
  return ranking.slice(0, 4).map((r, i) => ({
    id: r.subjectCode ?? `rank-${i}`,
    subject: r.subject,
    progress: asNumber(r.mastery) ?? 0,
    color: r.color ?? null,
  }))
}

export {
  buildOverallReadinessKpi,
  buildChapterMasteryRows,
  buildSyllabusCoverageRows,
}
