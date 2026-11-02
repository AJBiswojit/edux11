/**
 * Browser entry point for the premium PDF workflow.
 *
 * The heavy PDFKit / MathJax modules are intentionally behind this dynamic
 * import so the student dashboard does not pay their bundle cost until a
 * report is actually downloaded.
 */

import { loadBrowserAssets } from './browser-assets.js'
import { renderPremiumPdf } from './renderer.js'

export async function createPremiumPdf({ kind, model }) {
  const assets = await loadBrowserAssets()
  return renderPremiumPdf({ kind, model, assets })
}

export { renderPremiumPdf }
