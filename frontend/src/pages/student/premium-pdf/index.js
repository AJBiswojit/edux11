/**
 * Browser entry point for the premium PDF workflow.
 *
 * The heavy PDFKit / MathJax modules are intentionally behind this dynamic
 * import so the student dashboard does not pay their bundle cost until a
 * report is actually downloaded.
 */

import { loadBrowserAssets } from './browser-assets.js'
import { loadQuestionMedia } from './media.js'
import { renderPremiumPdf } from './renderer.js'

/**
 * Resolve and embed every question figure before the synchronous layout pass.
 * A figure that cannot be retrieved is recorded in `mediaDiagnostics` and the
 * report continues without printing its path.
 */
export async function createPremiumPdf({ kind, model, loader, onDiagnostic }) {
  const assets = await loadBrowserAssets()
  const questions = Array.isArray(model?.questions) ? model.questions : []
  const media = await loadQuestionMedia(questions, {
    loader: loader || assets.imageLoader,
    onDiagnostic,
  })
  const result = await renderPremiumPdf({ kind, model, assets })
  return { ...result, mediaDiagnostics: media.diagnostics, media }
}

export { renderPremiumPdf }
