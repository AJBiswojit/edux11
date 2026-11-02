import { describe, expect, it } from 'vitest'
import { flattenSelectLabel, resolveSelectTriggerLabel, resolveSelectedOption, sameSelectValue } from '../../src/utils/select-option.js'

const COUNTS = [5, 10, 15, 20].map((value) => ({
  value: String(value),
  label: `${value} questions`,
}))

describe('select option resolution', () => {
  it('flattens interpolated JSX children into a single label', () => {
    expect(flattenSelectLabel([5, ' questions'])).toBe('5 questions')
    expect(flattenSelectLabel({ props: { children: [20, ' questions'] } })).toBe('20 questions')
  })

  it('treats string and numeric option values as the same selection', () => {
    expect(sameSelectValue('5', 5)).toBe(true)
    expect(sameSelectValue('', 5)).toBe(false)
    expect(resolveSelectedOption(5, COUNTS)?.label).toBe('5 questions')
    expect(resolveSelectedOption('20', COUNTS)?.label).toBe('20 questions')
  })

  it('shows a placeholder only when there is no selection', () => {
    expect(resolveSelectTriggerLabel({ value: '', options: COUNTS, placeholder: 'Select question count' })).toBe('Select question count')
    expect(resolveSelectTriggerLabel({ value: null, options: COUNTS, placeholder: 'Select question count' })).toBe('Select question count')
  })

  it('maps each canonical count to its option label', () => {
    for (const count of [5, 10, 15, 20]) {
      expect(resolveSelectTriggerLabel({ value: String(count), options: COUNTS, placeholder: 'Select question count' })).toBe(`${count} questions`)
      expect(Number(resolveSelectedOption(String(count), COUNTS).value)).toBe(count)
    }
  })

  it('never returns Selected option after a valid match', () => {
    expect(resolveSelectTriggerLabel({ value: '5', options: COUNTS })).not.toBe('Selected option')
    expect(resolveSelectTriggerLabel({ value: 'Astronomy', options: COUNTS })).toBe('Astronomy')
  })
})
