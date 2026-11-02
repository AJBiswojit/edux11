/**
 * Canonical Select value → option → trigger-label resolution.
 *
 * JSX like `{count} questions` yields an array of children, not a string.
 * The trigger must flatten that into a label instead of showing
 * "Selected option".
 */

export function flattenSelectLabel(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenSelectLabel).join('')
  if (typeof node === 'object') {
    if (node.props?.searchText != null) return flattenSelectLabel(node.props.searchText)
    if (node.props?.children != null) return flattenSelectLabel(node.props.children)
  }
  return ''
}

export function sameSelectValue(a, b) {
  if (a == null || a === '' || b == null || b === '') return a === b
  return String(a) === String(b)
}

export function resolveSelectedOption(value, options = []) {
  return options.find((option) => sameSelectValue(option.value ?? option.props?.value, value)) ?? null
}

export function resolveSelectTriggerLabel({ value, options = [], placeholder = 'Select…' } = {}) {
  if (value == null || value === '') return placeholder
  const selected = resolveSelectedOption(value, options)
  if (!selected) return String(value)
  const label = (selected.label ?? selected.props?.searchText ?? flattenSelectLabel(selected.props?.children ?? selected.children) ?? '').toString().trim()
  return label || String(value)
}
