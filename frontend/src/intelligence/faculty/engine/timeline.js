/**
 * Faculty Intelligence Engine — Teaching Timeline (pure functions).
 * Merges teaching activity from the centralized datasets into one
 * chronological activity log: completed lectures, assignments published,
 * attendance submitted, evaluations completed, revision sessions, question
 * papers generated, quizzes published, exam drafts and announcements.
 */

import {  } from './scores.js'

const EVENT_TYPE = {
  lecture: { label: 'Lecture completed', icon: 'presentation' },
  attendance: { label: 'Attendance submitted', icon: 'calendar-check' },
  assignment: { label: 'Assignment published', icon: 'file-text' },
  evaluation: { label: 'Evaluation completed', icon: 'check-circle' },
  revision: { label: 'Revision session', icon: 'repeat' },
  paper: { label: 'Question paper generated', icon: 'file-check' },
  quiz: { label: 'Quiz published', icon: 'zap' },
  exam: { label: 'Exam draft', icon: 'clipboard' },
  announcement: { label: 'Announcement', icon: 'megaphone' },
}

/* ---------- Teaching timeline ---------- */
export function buildTeachingTimeline({ lecturePlanner, attendance, assignments, announcements, paperGenerator, quizBuilder, examBuilder, revisionSessions }) {
  const events = []

  ;(attendance?.classes ?? []).forEach((c) => {
    events.push({
      id: `tl_att_${c.id}`,
      type: 'attendance',
      date: c.date,
      title: `${c.course} · ${c.section} — ${c.pct}% present`,
      description: `${c.present}/${c.total} students · ${c.topic}`,
    })
  })

  ;(assignments ?? []).forEach((a) => {
    if (a.published) {
      events.push({
        id: `tl_pub_${a.id}`,
        type: 'assignment',
        date: a.published,
        title: `${a.title} published`,
        description: `${a.course} · due ${a.due} · max ${a.maxScore} marks`,
      })
    }
    if (a.status === 'Graded') {
      events.push({
        id: `tl_eval_${a.id}`,
        type: 'evaluation',
        date: a.due,
        title: `${a.title} — evaluation completed`,
        description: `${a.graded}/${a.submissions} graded · avg ${a.avgScore != null ? `${a.avgScore}/${a.maxScore}` : '—'} · ${a.failureRate ?? 0}% below pass mark`,
      })
    }
  })

  ;(lecturePlanner ?? []).filter((l) => l.status === 'Completed').forEach((l) => {
    events.push({
      id: `tl_lec_${l.id}`,
      type: 'lecture',
      date: l.date,
      title: `${l.course} · ${l.topic}`,
      description: `Lecture completed (${l.week}) · prep effort ${l.prep ?? '—'} min`,
    })
  })

  ;(revisionSessions ?? []).forEach((r) => {
    events.push({
      id: `tl_rev_${r.id}`,
      type: 'revision',
      date: r.date,
      title: `${r.title}`,
      description: `${r.course} · ${r.topic} · ${r.attendees ?? '—'} attendees`,
    })
  })

  ;(paperGenerator?.generatedPapers ?? []).forEach((p) => {
    events.push({
      id: `tl_paper_${p.id}`,
      type: 'paper',
      date: p.created ?? p.generated,
      title: `${p.title} generated`,
      description: `${p.course} · ${p.questions} questions · ${p.totalMarks} marks · blueprint coverage ${p.coverage}%`,
    })
  })

  ;(quizBuilder?.quizzes ?? []).filter((q) => q.status === 'Published').forEach((q) => {
    events.push({
      id: `tl_quiz_${q.id}`,
      type: 'quiz',
      date: q.published ?? q.window,
      title: `${q.title} published`,
      description: `${q.course} · ${q.questions} questions · ${q.participants ?? 0} participants · avg ${q.avgScore ?? '—'}/10`,
    })
  })

  ;(examBuilder?.drafts ?? []).forEach((d) => {
    events.push({
      id: `tl_exam_${d.id}`,
      type: 'exam',
      date: d.lastEdited,
      title: `${d.title} — draft ${d.status}`,
      description: `${d.course} · ${d.questions} questions · ${d.totalMarks} marks · coverage ${d.coverage}%`,
    })
  })

  ;(announcements ?? []).forEach((a) => {
    events.push({
      id: `tl_ann_${a.id}`,
      type: 'announcement',
      date: a.date,
      title: a.title,
      description: `Posted to ${a.audience}${a.pinned ? ' · pinned' : ''}`,
    })
  })

  const sorted = events
    .filter((e) => e.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((e) => ({ ...e, typeLabel: EVENT_TYPE[e.type]?.label ?? e.type, icon: EVENT_TYPE[e.type]?.icon ?? 'activity' }))

  const byType = {}
  sorted.forEach((e) => {
    byType[e.type] = byType[e.type] ?? []
    byType[e.type].push(e)
  })

  return {
    events: sorted,
    counts: Object.entries(byType).map(([type, list]) => ({ type, label: EVENT_TYPE[type]?.label ?? type, count: list.length })),
    total: sorted.length,
  }
}

export default buildTeachingTimeline
