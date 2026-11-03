import { describe, expect, it } from 'vitest'
import { layoutFigureStack, measureFigure } from '../../src/pages/student/premium-pdf/figures.js'

const image = (width, height) => ({ width, height, bytes: new Uint8Array(), format: 'png' })

describe('Premium PDF figure sizing', () => {
  it('fits the measured available width and preserves the source aspect ratio', () => {
    const asset = image(1200, 600)
    const size = measureFigure(asset, { field: 'statement', available: 190 })
    expect(size.w).toBeLessThanOrEqual(190)
    expect(size.w / size.h).toBeCloseTo(2, 2)
  })

  it('scales a multi-figure stack proportionally to fit its measured height budget', () => {
    const assets = [image(1200, 700), image(800, 600), image(900, 400)]
    const { items, height } = layoutFigureStack(assets, {
      field: 'statement', available: 340, gap: 8, budget: 180,
    })
    expect(height).toBeLessThanOrEqual(180)
    expect(items).toHaveLength(3)
    items.forEach((item, index) => {
      expect(item.w / item.h).toBeCloseTo(assets[index].width / assets[index].height, 2)
      expect(item.w).toBeLessThanOrEqual(340)
    })
  })
})
