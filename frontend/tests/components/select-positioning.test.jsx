// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { Select, SelectItem } from '../../src/components/ui/select.jsx'
import {
  act, menuOf, openSelect, renderDom, setRect, settle, sleep, setViewport, triggerOf,
} from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const cleanups = []
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']

function mount() {
  const view = renderDom(
    <Select ariaLabel="Subject" placeholder="Select subject…">
      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
    </Select>,
  )
  cleanups.push(view.unmount)
  return view
}

/**
 * Open the select at `rect`, give the portaled menu a "real" content height
 * (jsdom reports scrollHeight 0), and force one re-measure so the final
 * styles reflect that height — the same path a real browser takes once
 * content settles.
 */
async function openPositioned(view, { vw, vh, rect, menuHeight }) {
  setViewport(vw, vh)
  const trigger = triggerOf(view.container, 'Subject')
  await openSelect(trigger, rect)
  const menu = menuOf(view.container, 'Subject')
  expect(menu).toBeTruthy()
  Object.defineProperty(menu, 'scrollHeight', { value: menuHeight, configurable: true })
  await act(async () => {
    window.dispatchEvent(new window.Event('scroll'))
    await sleep(50)
  })
  return { trigger, menu }
}

describe('Select — viewport-aware placement', () => {
  it('opens DOWN with an 8px gap when the menu fits below the trigger', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 1280, vh: 800,
      rect: { top: 100, left: 100, width: 220, height: 44 },
      menuHeight: 200,
    })
    // top = triggerBottom(144) + gap(8); maxHeight = 800 - 144 - 8 = 648
    expect(menu.style.top).toBe('152px')
    expect(menu.style.bottom).toBe('auto')
    expect(menu.style.left).toBe('100px')
    expect(menu.style.width).toBe('220px')
    expect(menu.style.maxHeight).toBe('648px')
  })

  it('opens UP when the menu no longer fits below the trigger', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 1280, vh: 800,
      rect: { top: 700, left: 100, width: 220, height: 44 },
      menuHeight: 500,
    })
    // space below = 800 - 744 - 8 = 48 < 500 → up: bottom = 800 - 700 + 8 = 108
    expect(menu.style.top).toBe('auto')
    expect(menu.style.bottom).toBe('108px')
    // maxHeight bounded by the space above = 700 - 8 = 692
    expect(menu.style.maxHeight).toBe('692px')
  })

  it('picks the ROOMIER side and constrains the height when it fits neither', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 1280, vh: 800,
      rect: { top: 400, left: 100, width: 220, height: 44 },
      menuHeight: 2000,
    })
    // space below = 800 - 444 - 8 = 348, space above = 400 - 8 = 392 → up (roomier)
    expect(menu.style.bottom).toBe('408px')
    expect(menu.style.maxHeight).toBe('392px') // constrained to the roomier side
  })

  it('never lets a long list grow the page: maxHeight ≤ available space', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 1024, vh: 768,
      rect: { top: 300, left: 100, width: 220, height: 44 },
      menuHeight: 5000,
    })
    const max = parseInt(menu.style.maxHeight, 10)
    const top = menu.style.top === 'auto' ? 0 : parseInt(menu.style.top, 10)
    const bottom = menu.style.bottom === 'auto' ? 0 : parseInt(menu.style.bottom, 10)
    // the menu box (anchor offset + max content) never leaves the viewport
    expect(top + max).toBeLessThanOrEqual(768)
    expect(bottom + max).toBeLessThanOrEqual(768)
    expect(max).toBeGreaterThan(1)
  })
})

describe('Select — horizontal collision', () => {
  it('clamps the menu inside the viewport at the right edge', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 1024, vh: 800,
      rect: { top: 100, left: 900, width: 220, height: 44 },
      menuHeight: 200,
    })
    // width 220 would overflow past 1024 - 8 → left = 1024 - 220 - 8 = 796
    expect(menu.style.left).toBe('796px')
    expect(menu.style.width).toBe('220px')
  })

  it('keeps the menu at least 8px inside a narrow (mobile) viewport', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 375, vh: 700,
      rect: { top: 100, left: 20, width: 400, height: 44 },
      menuHeight: 200,
    })
    // width clamped to 375 - 16 = 359, then left clamped to the 8px margin
    expect(menu.style.width).toBe('359px')
    expect(menu.style.left).toBe('8px')
    expect(menu.style.top).toBe('152px')
  })

  it('never renders narrower than the 192px minimum on wide screens', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 1280, vh: 800,
      rect: { top: 100, left: 100, width: 80, height: 44 },
      menuHeight: 200,
    })
    expect(menu.style.width).toBe('192px')
  })
})

describe('Select — scroll and resize behavior', () => {
  it('closes when the trigger scrolls fully out of the viewport', async () => {
    const view = mount()
    const { trigger } = await openPositioned(view, {
      vw: 1280, vh: 800,
      rect: { top: 100, left: 100, width: 220, height: 44 },
      menuHeight: 200,
    })
    // the page scrolled: the trigger is now 900px down — fully below the fold
    setRect(trigger, { top: 900, left: 100, width: 220, height: 44 })
    await act(async () => {
      window.dispatchEvent(new window.Event('scroll'))
      await sleep(50)
    })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await settle(250)
    expect(menuOf(view.container, 'Subject')).toBeNull()
  })

  it('repositions (does not close) on window resize', async () => {
    const view = mount()
    const { menu } = await openPositioned(view, {
      vw: 1280, vh: 800,
      rect: { top: 100, left: 100, width: 220, height: 44 },
      menuHeight: 200,
    })
    expect(menu.style.maxHeight).toBe('648px')

    setViewport(1280, 1200)
    await act(async () => {
      window.dispatchEvent(new window.Event('resize'))
      await sleep(50)
    })
    // same anchor, more vertical space → larger maxHeight, still anchored
    expect(menu.style.top).toBe('152px')
    expect(menu.style.maxHeight).toBe('1048px')
  })
})
