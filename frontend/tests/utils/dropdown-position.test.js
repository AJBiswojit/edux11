import { describe, expect, it } from 'vitest'
import {
  computeDropdownPosition,
  DROPDOWN_GAP,
  DROPDOWN_MIN_WIDTH,
  DROPDOWN_SAFE_MARGIN,
  triggerVisibleInViewport,
} from '../../src/utils/dropdown-position.js'

const VIEWPORT = { width: 1280, height: 800 }
const trigger = (top, left, width = 200, height = 24) => ({
  top,
  left,
  right: left + width,
  bottom: top + height,
  width,
  height,
})

describe('dropdown vertical placement', () => {
  it('opens downward when the menu fits below the trigger', () => {
    const result = computeDropdownPosition({ trigger: trigger(100, 100), menuHeight: 120, viewport: VIEWPORT })
    expect(result.placement).toBe('down')
    expect(result.top).toBe(100 + 24 + DROPDOWN_GAP)
    expect(result.bottom).toBeNull()
    expect(result.maxHeight).toBeGreaterThanOrEqual(120)
  })

  it('opens upward when the menu does not fit below but fits above', () => {
    // trigger near the bottom: 18px below, 742px above, menu 500px
    const result = computeDropdownPosition({ trigger: trigger(750, 100), menuHeight: 500, viewport: VIEWPORT })
    expect(result.placement).toBe('up')
    expect(result.top).toBeNull()
    expect(result.bottom).toBe(800 - 750 + DROPDOWN_GAP)
    expect(result.maxHeight).toBe(750 - DROPDOWN_SAFE_MARGIN)
  })

  it('chooses the roomier side and constrains the height when neither side fits', () => {
    // 2000px menu, trigger mid-viewport: 392 above vs 368 below
    const result = computeDropdownPosition({ trigger: trigger(400, 100), menuHeight: 2000, viewport: VIEWPORT })
    expect(result.placement).toBe('up')
    expect(result.maxHeight).toBe(400 - DROPDOWN_SAFE_MARGIN)

    const belowRoomier = computeDropdownPosition({ trigger: trigger(300, 100), menuHeight: 2000, viewport: VIEWPORT })
    expect(belowRoomier.placement).toBe('down')
    expect(belowRoomier.maxHeight).toBe(800 - 324 - DROPDOWN_SAFE_MARGIN)
  })

  it('max-height never exceeds the available space (long lists scroll internally)', () => {
    const result = computeDropdownPosition({ trigger: trigger(10, 10), menuHeight: 5000, viewport: VIEWPORT })
    expect(result.maxHeight).toBeLessThanOrEqual(VIEWPORT.height)
    expect(result.maxHeight).toBeGreaterThanOrEqual(1)
  })
})

describe('dropdown horizontal collision', () => {
  it('shifts left when opening toward the right would overflow', () => {
    // trigger flush with the right edge (40px wide) — menu must fit inside
    const result = computeDropdownPosition({ trigger: trigger(100, 1240, 40), menuHeight: 100, viewport: VIEWPORT })
    expect(result.left).toBe(VIEWPORT.width - DROPDOWN_MIN_WIDTH - DROPDOWN_SAFE_MARGIN)
    expect(result.width).toBe(DROPDOWN_MIN_WIDTH)
    expect(result.left + result.width).toBeLessThanOrEqual(VIEWPORT.width - DROPDOWN_SAFE_MARGIN)
  })

  it('shifts right when align:end would overflow the left edge', () => {
    const result = computeDropdownPosition({
      trigger: trigger(100, 5, 40),
      menuHeight: 100,
      viewport: VIEWPORT,
      align: 'end',
    })
    expect(result.left).toBe(DROPDOWN_SAFE_MARGIN)
  })

  it('keeps the trigger width when it fits, but never below the minimum width', () => {
    const wide = computeDropdownPosition({ trigger: trigger(100, 100, 300), menuHeight: 100, viewport: VIEWPORT })
    expect(wide.width).toBe(300)
    const narrow = computeDropdownPosition({ trigger: trigger(100, 100, 80), menuHeight: 100, viewport: VIEWPORT })
    expect(narrow.width).toBe(DROPDOWN_MIN_WIDTH)
  })

  it('clamps width to the viewport on narrow (mobile) viewports', () => {
    const result = computeDropdownPosition({
      trigger: trigger(100, 8, 343),
      menuHeight: 100,
      viewport: { width: 375, height: 667 },
    })
    expect(result.width).toBeLessThanOrEqual(375 - DROPDOWN_SAFE_MARGIN * 2)
    expect(result.left).toBeGreaterThanOrEqual(DROPDOWN_SAFE_MARGIN)
    expect(result.left + result.width).toBeLessThanOrEqual(375 - DROPDOWN_SAFE_MARGIN)
  })
})

describe('trigger visibility (scroll-out-of-view close)', () => {
  it('stays open while any part of the trigger is visible', () => {
    expect(triggerVisibleInViewport(trigger(796, 10), VIEWPORT)).toBe(true)
    expect(triggerVisibleInViewport(trigger(-20, 10), VIEWPORT)).toBe(true)
  })

  it('closes once the trigger scrolled fully out', () => {
    expect(triggerVisibleInViewport({ top: -24, left: 10, right: 210, bottom: 0, width: 200, height: 24 }, VIEWPORT)).toBe(false)
    expect(triggerVisibleInViewport({ top: 800, left: 10, right: 210, bottom: 824, width: 200, height: 24 }, VIEWPORT)).toBe(false)
  })
})
