/**
 * Vite-only asset loader. PDFKit receives byte buffers, so font and logo URLs
 * are fetched as ArrayBuffers and registered before any page is drawn.
 * The original logo PNG is embedded with its transparency intact and is never
 * rasterised against a coloured background or recreated from text.
 */

import logoUrl from '../../../assets/logo.png?url'
import coverDoorwayUrl from '../../../assets/premium-cover-doorway.png?url'
import interRegularUrl from '../../../assets/fonts/Inter-Regular.ttf?url'
import interSemiBoldUrl from '../../../assets/fonts/Inter-SemiBold.ttf?url'
import interBoldUrl from '../../../assets/fonts/Inter-Bold.ttf?url'
import manropeBoldUrl from '../../../assets/fonts/Manrope-Bold.ttf?url'
import stixMathUrl from '../../../assets/fonts/STIXTwoMath-Regular.ttf?url'
import stixTextUrl from '../../../assets/fonts/STIXTwoText-Regular.ttf?url'
import { createAssetLoader, convertImageWithCanvas } from './media.js'

async function fetchBytes(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load report asset: ${url}`)
  return new Uint8Array(await response.arrayBuffer())
}

export async function loadBrowserAssets() {
  const [logo, coverDoorway, inter, interSemi, interBold, manrope, stixMath, stixText] = await Promise.all([
    fetchBytes(logoUrl),
    fetchBytes(coverDoorwayUrl),
    fetchBytes(interRegularUrl),
    fetchBytes(interSemiBoldUrl),
    fetchBytes(interBoldUrl),
    fetchBytes(manropeBoldUrl),
    fetchBytes(stixMathUrl),
    fetchBytes(stixTextUrl),
  ])
  return {
    logo,
    coverDoorway,
    fonts: {
      Inter: inter,
      InterSemi: interSemi,
      InterBold: interBold,
      Manrope: manrope,
      STIXMath: stixMath,
      STIXText: stixText,
    },
    // Figure bytes are fetched from the configured media origin and converted
    // with the browser's own decoder when PDFKit cannot embed the format.
    imageLoader: createAssetLoader({ convertImage: convertImageWithCanvas }),
  }
}
