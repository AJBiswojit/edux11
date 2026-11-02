/**
 * Minimal DOM rendering helpers for dropdown component tests (jsdom).
 * No new dependency is needed beyond jsdom itself — plain react-dom/client
 * + React's act().
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'

export { act }

export function renderDom(ui) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

export const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

/** Let microtasks + the 50–80ms settle timers inside dropdowns flush. */
export async function settle(ms = 90) {
  await act(async () => {
    await sleep(ms)
  })
}

/** Make jsdom report a plausible viewport size. */
export function setViewport(width, height) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true, writable: true })
}

/** Override an element's bounding rect (jsdom reports zeros by default). */
export function setRect(el, { top, left, width = 200, height = 24 }) {
  el.getBoundingClientRect = () => ({
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  })
}

/** Click a trigger after giving it a visible rect (dropdowns close on open
 * when their trigger is "off-screen" in jsdom's zero rects). */
export async function openSelect(trigger, { top = 100, left = 100, width = 220, height = 44 } = {}) {
  setRect(trigger, { top, left, width, height })
  await act(async () => {
    trigger.click()
  })
  await settle()
}

export const triggerOf = (container, label) =>
  [...container.querySelectorAll('button[aria-haspopup="listbox"]')].find((b) => (b.getAttribute('aria-label') ?? '').startsWith(label))

export const menuOf = (container, label) => {
  const trigger = triggerOf(container, label)
  const controls = trigger?.getAttribute('aria-controls')
  return controls ? document.getElementById(controls) : null
}

export const optionsOf = (menu) => [...menu.querySelectorAll('button[role="option"]')]

export const pointerDownAt = async (el) => {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
  })
}

export const keyDown = async (el, key, extra = {}) => {
  await act(async () => {
    el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }))
  })
}
