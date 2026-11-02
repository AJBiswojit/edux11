import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { NAV_GROUPS } from '../../src/config/index.js'
import { Sidebar, sidebarItemEnd } from '../../src/components/layout/sidebar.jsx'

const FACULTY_ITEMS = NAV_GROUPS.faculty.flatMap((group) => group.items)
const ACTIVE_CLASS = 'bg-gradient-to-r from-indigo-600/12'

function renderFacultySidebar(path) {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar navGroups={NAV_GROUPS.faculty} role="faculty" />
    </MemoryRouter>,
  )
}

function itemMarkup(html, to, label) {
  const anchors = [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a>/g)]
  const match = anchors.find((entry) => entry[1] === to && (!label || entry[0].includes(label)))
  return match?.[0] ?? ''
}

function activeItems(html) {
  return FACULTY_ITEMS.filter((item) => itemMarkup(html, item.to, item.label).includes(ACTIVE_CLASS)).map((item) => item.label)
}

describe('Faculty sidebar route-aware active state', () => {
  it('uses exact matching for independent destinations and explicit descendant matching for parent surfaces', () => {
    expect(sidebarItemEnd({ to: '/faculty/question-intelligence' })).toBe(true)
    expect(sidebarItemEnd({ to: '/faculty/question-intelligence/micro-assessment' })).toBe(true)
    expect(sidebarItemEnd({ to: '/faculty/my-students', matchDescendants: true })).toBe(false)
  })

  it('activates only AI Micro-Assessment on its nested URL', () => {
    const html = renderFacultySidebar('/faculty/question-intelligence/micro-assessment')
    expect(activeItems(html)).toEqual(['AI Micro-Assessment Studio'])
    expect(itemMarkup(html, '/faculty/question-intelligence', 'Assessment Intelligence')).not.toContain(ACTIVE_CLASS)
    expect(itemMarkup(html, '/faculty/question-intelligence/micro-assessment', 'AI Micro-Assessment Studio')).toContain(ACTIVE_CLASS)
  })

  it('activates Assessment Intelligence only on its canonical route', () => {
    const html = renderFacultySidebar('/faculty/question-intelligence')
    expect(activeItems(html)).toEqual(['Assessment Intelligence'])
    expect(itemMarkup(html, '/faculty/question-intelligence', 'Assessment Intelligence')).toContain(ACTIVE_CLASS)
    expect(itemMarkup(html, '/faculty/question-intelligence/micro-assessment', 'AI Micro-Assessment Studio')).not.toContain(ACTIVE_CLASS)
  })

  it('keeps My Students active for its intentional detail descendants', () => {
    const html = renderFacultySidebar('/faculty/my-students/student-42')
    expect(activeItems(html)).toEqual(['My Students'])
  })

  it.each([
    ['/faculty', 'Dashboard'],
    ['/faculty/teaching', 'Teaching'],
    ['/faculty/my-students', 'My Students'],
    ['/faculty/reports', 'Reports'],
    ['/faculty/ai-assistant', 'AI Workspace'],
    ['/faculty/timetable', 'Calendar'],
    ['/faculty/support', 'Support'],
  ])('keeps %s mutually exclusive with all other Faculty items', (path, label) => {
    expect(activeItems(renderFacultySidebar(path))).toEqual([label])
  })

  it('derives state from URL across navigation changes rather than click state', () => {
    expect(activeItems(renderFacultySidebar('/faculty/question-intelligence'))).toEqual(['Assessment Intelligence'])
    expect(activeItems(renderFacultySidebar('/faculty/question-intelligence/micro-assessment'))).toEqual(['AI Micro-Assessment Studio'])
    expect(activeItems(renderFacultySidebar('/faculty/my-students'))).toEqual(['My Students'])
  })
})
