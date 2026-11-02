// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Select, SelectItem } from '../../src/components/ui/select.jsx'
import {
  act, keyDown, menuOf, openSelect, optionsOf, pointerDownAt, renderDom, setRect, settle, triggerOf,
} from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const cleanups = []
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

function mount(props = {}, children = []) {
  const view = renderDom(<Select ariaLabel="Subject" placeholder="Select subject…" {...props}>{children}</Select>)
  cleanups.push(view.unmount)
  return view
}

/** Wait for the portal exit animation to finish, then read the menu (null = closed). */
async function closedMenu(view, label) {
  await settle(250)
  return menuOf(view.container, label)
}

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']

describe('Select — composite option labels (question count)', () => {
  it('shows the placeholder before a count is chosen', () => {
    const view = mount(
      { value: '', placeholder: 'Select question count', ariaLabel: 'Question count' },
      [5, 10, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>),
    )
    expect(triggerOf(view.container, 'Question count').textContent).toContain('Select question count')
    expect(view.container.textContent).not.toContain('Selected option')
  })

  it('resolves interpolated children so 5 / 10 / 15 / 20 display as “N questions”, not Selected option', () => {
    for (const n of [5, 10, 15, 20]) {
      const view = mount(
        { value: String(n), placeholder: 'Select question count', ariaLabel: 'Question count' },
        [5, 10, 15, 20].map((count) => <SelectItem key={count} value={String(count)}>{count} questions</SelectItem>),
      )
      const trigger = triggerOf(view.container, 'Question count')
      expect(trigger.textContent).toContain(`${n} questions`)
      expect(trigger.getAttribute('aria-label')).toBe(`Question count: ${n} questions`)
      expect(trigger.textContent).not.toContain('Selected option')
    }
  })

  it('keeps the checkmark and trigger label in sync after changing count, and clear restores the placeholder', async () => {
    const onValueChange = vi.fn()
    const StatefulCount = () => {
      const [value, setValue] = useState('')
      return (
        <Select
          ariaLabel="Question count"
          placeholder="Select question count"
          value={value}
          clearable
          onValueChange={(next) => {
            onValueChange(next)
            setValue(next)
          }}
        >
          {[5, 10, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>)}
        </Select>
      )
    }
    const view = renderDom(<StatefulCount />)
    cleanups.push(view.unmount)
    const trigger = triggerOf(view.container, 'Question count')
    await openSelect(trigger)
    await act(async () => { optionsOf(menuOf(view.container, 'Question count'))[0].click() })
    expect(onValueChange).toHaveBeenLastCalledWith('5')
    expect(Number(onValueChange.mock.calls.at(-1)[0])).toBe(5)
    expect(trigger.textContent).toContain('5 questions')
    await openSelect(trigger)
    expect(optionsOf(menuOf(view.container, 'Question count'))[0].getAttribute('aria-selected')).toBe('true')
    await act(async () => { optionsOf(menuOf(view.container, 'Question count'))[3].click() })
    expect(onValueChange).toHaveBeenLastCalledWith('20')
    expect(trigger.textContent).toContain('20 questions')
    await openSelect(trigger)
    expect(optionsOf(menuOf(view.container, 'Question count'))[3].getAttribute('aria-selected')).toBe('true')
    await act(async () => { trigger.querySelector('[role="button"]').click() })
    expect(trigger.textContent).toContain('Select question count')
  })
})

describe('Select — selected value & placeholder', () => {
  it('shows the placeholder when nothing is selected', () => {
    const view = mount({ value: '' })
    expect(view.container.textContent).toContain('Select subject…')
  })

  it('shows the selected option label in the trigger (never a stale placeholder)', () => {
    const view = mount({ value: 'Physics' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    expect(trigger.textContent).toContain('Physics')
    expect(trigger.getAttribute('aria-label')).toBe('Subject: Physics')
    expect(view.container.textContent).not.toContain('Select subject…')
  })

  it('shows a value that is no longer in the option set as itself (no ambiguous placeholder)', () => {
    const view = mount({ value: 'Astronomy' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    expect(triggerOf(view.container, 'Subject').textContent).toContain('Astronomy')
  })

  it('updates the trigger after a selection and calls onValueChange (controlled, as features use it)', async () => {
    const onValueChange = vi.fn()
    const StatefulSubject = () => {
      const [value, setValue] = useState('')
      return (
        <Select
          ariaLabel="Subject"
          placeholder="Select subject…"
          value={value}
          onValueChange={(next) => {
            onValueChange(next)
            setValue(next)
          }}
        >
          {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </Select>
      )
    }
    const view = renderDom(<StatefulSubject />)
    cleanups.push(view.unmount)
    const trigger = triggerOf(view.container, 'Subject')
    await openSelect(trigger)
    const menu = menuOf(view.container, 'Subject')
    expect(menu).toBeTruthy()
    await act(async () => {
      optionsOf(menu)[1].click()
    })
    expect(onValueChange).toHaveBeenCalledWith('Chemistry')
    expect(trigger.textContent).toContain('Chemistry')
    expect(document.activeElement).toBe(trigger) // focus returns to the trigger
    expect(await closedMenu(view, 'Subject')).toBeNull()
  })
})

describe('Select — clear / disabled / loading', () => {
  it('clearable: clicking clear resets the value and closes (controlled, as features use it)', async () => {
    const onValueChange = vi.fn()
    const StatefulSubject = () => {
      const [value, setValue] = useState('Physics')
      return (
        <Select
          ariaLabel="Subject"
          placeholder="Select subject…"
          value={value}
          clearable
          onValueChange={(next) => {
            onValueChange(next)
            setValue(next)
          }}
        >
          {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </Select>
      )
    }
    const view = renderDom(<StatefulSubject />)
    cleanups.push(view.unmount)
    const trigger = triggerOf(view.container, 'Subject')
    const clear = trigger.querySelector('[role="button"]')
    expect(clear).toBeTruthy()
    await act(async () => {
      clear.click()
    })
    expect(onValueChange).toHaveBeenCalledWith('')
    expect(trigger.textContent).toContain('Select subject…')
    expect(menuOf(view.container, 'Subject')).toBeNull() // menu was never opened
  })

  it('does not offer a clear control without a value or when disabled', () => {
    const empty = mount({ value: '', clearable: true }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    expect(triggerOf(empty.container, 'Subject').querySelector('[role="button"]')).toBeNull()

    const disabled = mount({ value: 'Physics', clearable: true, disabled: true }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    expect(triggerOf(disabled.container, 'Subject').querySelector('[role="button"]')).toBeNull()
  })

  it('disabled: cannot open, trigger is disabled', async () => {
    const view = mount({ value: '', disabled: true }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    expect(trigger.disabled).toBe(true)
    await act(async () => {
      trigger.click()
    })
    expect(menuOf(view.container, 'Subject')).toBeNull()
  })

  it('loading: trigger is busy/disabled and opening is blocked', async () => {
    const onValueChange = vi.fn()
    const view = mount({ value: '', loading: true, onValueChange }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    expect(trigger.disabled).toBe(true)
    expect(trigger.getAttribute('aria-busy')).toBe('true')
    await act(async () => {
      trigger.click()
    })
    // opening is blocked while options are still loading
    expect(menuOf(view.container, 'Subject')).toBeNull()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('Select — keyboard support', () => {
  it('ArrowDown on the trigger opens and focuses the search field', async () => {
    const view = mount({ value: '' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    setRect(trigger, { top: 100, left: 100, width: 220, height: 44 })
    trigger.focus()
    await keyDown(trigger, 'ArrowDown')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await settle()
    expect(document.activeElement.getAttribute('aria-label')).toBe('Search options')
  })

  it('arrow keys navigate options, Home/End jump, Enter selects, Escape closes and refocuses', async () => {
    const onValueChange = vi.fn()
    const view = mount({ value: '', onValueChange }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    await openSelect(trigger)
    const menu = menuOf(view.container, 'Subject')
    const options = optionsOf(menu)

    await keyDown(document.activeElement, 'ArrowDown') // search → first option
    expect(document.activeElement).toBe(options[0])
    await keyDown(document.activeElement, 'ArrowDown')
    expect(document.activeElement).toBe(options[1])
    await keyDown(document.activeElement, 'Home')
    expect(document.activeElement).toBe(options[0])
    await keyDown(document.activeElement, 'End')
    expect(document.activeElement).toBe(options[2])
    await keyDown(document.activeElement, 'Enter')
    // jsdom does not emulate native button activation (Enter → click on a
    // focused <button>); fire the same click a browser would fire.
    await act(async () => {
      document.activeElement.click()
    })
    expect(onValueChange).toHaveBeenCalledWith('Mathematics')
    expect(document.activeElement).toBe(trigger)

    // Escape path
    await openSelect(trigger)
    await keyDown(document, 'Escape')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    expect(await closedMenu(view, 'Subject')).toBeNull()
  })

  it('skips disabled options during keyboard navigation', async () => {
    const view = mount({ value: '' }, [
      <SelectItem key="a" value="a">A</SelectItem>,
      <SelectItem key="b" value="b" disabled>B</SelectItem>,
      <SelectItem key="c" value="c">C</SelectItem>,
    ])
    const trigger = triggerOf(view.container, 'Subject')
    await openSelect(trigger)
    const options = optionsOf(menuOf(view.container, 'Subject'))
    expect(options[1].disabled).toBe(true)
    await keyDown(document.activeElement, 'ArrowDown') // → A
    await keyDown(document.activeElement, 'ArrowDown') // skips B
    expect(document.activeElement).toBe(options[2])
    await act(async () => {
      options[1].click()
    })
    // disabled option cannot be selected
    expect(trigger.textContent).toBe('Select subject…')
  })
})

describe('Select — search / empty state', () => {
  it('search filters the current option set only', async () => {
    const view = mount({ value: '' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    await openSelect(trigger)
    const menu = menuOf(view.container, 'Subject')
    const search = menu.querySelector('input[aria-label="Search options"]')
    const setNative = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setNative.call(search, 'phys')
      search.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    const visible = optionsOf(menu).map((o) => o.textContent.trim())
    expect(visible).toEqual(['Physics'])
  })

  it('shows a distinct empty state with no options, and a search-aware one', async () => {
    const empty = mount({ value: '' }, [])
    const trigger = triggerOf(empty.container, 'Subject')
    await openSelect(trigger)
    expect(menuOf(empty.container, 'Subject').textContent).toContain('No options')

    const searched = mount({ value: '' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger2 = triggerOf(searched.container, 'Subject')
    await openSelect(trigger2)
    const menu2 = menuOf(searched.container, 'Subject')
    const search2 = menu2.querySelector('input[aria-label="Search options"]')
    const setNative = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setNative.call(search2, 'zzz')
      search2.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    expect(menu2.textContent).toContain('No matching options')
  })
})

describe('Select — outside click, group, portal', () => {
  it('outside click closes the menu (trigger and menu clicks do not)', async () => {
    const view = mount({ value: '' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    await openSelect(trigger)
    const menu = menuOf(view.container, 'Subject')

    // click inside the menu keeps it open
    await pointerDownAt(menu)
    expect(menuOf(view.container, 'Subject')).not.toBeNull()
    // click on the trigger closes it
    await pointerDownAt(trigger)
    await act(async () => {
      trigger.click()
    })
    expect(await closedMenu(view, 'Subject')).toBeNull()

    await openSelect(trigger)
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    await pointerDownAt(outside)
    expect(await closedMenu(view, 'Subject')).toBeNull()
  })

  it('within one filter group only one dropdown stays open', async () => {
    const view = renderDom(
      <>
        <Select ariaLabel="Subject" placeholder="Subject" group="filters">{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</Select>
        <Select ariaLabel="Chapter" placeholder="Chapter" group="filters">
          <SelectItem value="c1">Chapter One</SelectItem>
        </Select>
      </>,
    )
    cleanups.push(view.unmount)
    const subjectTrigger = triggerOf(view.container, 'Subject')
    const chapterTrigger = triggerOf(view.container, 'Chapter')
    await openSelect(subjectTrigger)
    expect(menuOf(view.container, 'Subject')).not.toBeNull()
    await openSelect(chapterTrigger, { top: 200 })
    expect(menuOf(view.container, 'Chapter')).not.toBeNull()
    expect(await closedMenu(view, 'Subject')).toBeNull() // sibling closed (after its exit animation)
  })

  it('dropdowns in different groups can both stay open', async () => {
    const view = renderDom(
      <>
        <Select ariaLabel="Subject" placeholder="Subject" group="group-a">{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</Select>
        <Select ariaLabel="Chapter" placeholder="Chapter" group="group-b">
          <SelectItem value="c1">Chapter One</SelectItem>
        </Select>
      </>,
    )
    cleanups.push(view.unmount)
    await openSelect(triggerOf(view.container, 'Subject'))
    await openSelect(triggerOf(view.container, 'Chapter'), { top: 200 })
    expect(menuOf(view.container, 'Subject')).not.toBeNull()
    expect(menuOf(view.container, 'Chapter')).not.toBeNull()
  })

  it('menus portal to document.body by default and into the nearest data-portal-scope', async () => {
    const plain = mount({ value: '' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(plain.container, 'Subject')
    await openSelect(trigger)
    const menu = menuOf(plain.container, 'Subject')
    expect(menu.parentElement).toBe(document.body)

    const scoped = renderDom(
      <div data-portal-scope>
        <Select ariaLabel="Subject" placeholder="Subject">{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</Select>
      </div>,
    )
    cleanups.push(scoped.unmount)
    const scopedTrigger = triggerOf(scoped.container, 'Subject')
    await openSelect(scopedTrigger)
    const scopedMenu = menuOf(scoped.container, 'Subject')
    expect(scopedMenu.closest('[data-portal-scope]')).toBeTruthy()
    expect(scopedMenu.parentElement.hasAttribute('data-portal-scope')).toBe(true)
  })

  it('exposes listbox semantics on the trigger', async () => {
    const view = mount({ value: '' }, SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>))
    const trigger = triggerOf(view.container, 'Subject')
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
    await openSelect(trigger)
    const menu = menuOf(view.container, 'Subject')
    expect(menu.getAttribute('role')).toBe('listbox')
    expect(menuOf(view.container, 'Subject').id).toBe(trigger.getAttribute('aria-controls'))
    expect(optionsOf(menu)[0].getAttribute('role')).toBe('option')
  })
})
