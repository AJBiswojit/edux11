/**
 * Browser-side PDFKit standard-font registration.
 *
 * PDFKit 0.20 ships two different ESM entry points. The Node entry point
 * installs lazy standard-font loaders automatically. The browser entry point
 * deliberately omits those font metrics and exports `registerStdFonts`
 * instead; without registering them, `new PDFDocument()` throws while setting
 * its default Helvetica font:
 *
 *   Standard font "Helvetica" is not registered. Call registerStdFonts()
 *   before using it.
 *
 * The premium reports use embedded Inter/Manrope/STIX fonts for all visible
 * typography, but PDFKit still resolves its built-in default font during
 * document construction. Registering the standard metrics once keeps the
 * browser build compatible without replacing PDFKit or altering report
 * typography. Node builds do not export `registerStdFonts` and already have
 * their own loaders, so they are left untouched.
 */

import * as PDFKit from 'pdfkit'
import Courier from 'pdfkit/standard-fonts/Courier'
import CourierBold from 'pdfkit/standard-fonts/CourierBold'
import CourierBoldOblique from 'pdfkit/standard-fonts/CourierBoldOblique'
import CourierOblique from 'pdfkit/standard-fonts/CourierOblique'
import Helvetica from 'pdfkit/standard-fonts/Helvetica'
import HelveticaBold from 'pdfkit/standard-fonts/HelveticaBold'
import HelveticaBoldOblique from 'pdfkit/standard-fonts/HelveticaBoldOblique'
import HelveticaOblique from 'pdfkit/standard-fonts/HelveticaOblique'
import SymbolFont from 'pdfkit/standard-fonts/Symbol'
import TimesBold from 'pdfkit/standard-fonts/TimesBold'
import TimesBoldItalic from 'pdfkit/standard-fonts/TimesBoldItalic'
import TimesItalic from 'pdfkit/standard-fonts/TimesItalic'
import TimesRoman from 'pdfkit/standard-fonts/TimesRoman'
import ZapfDingbats from 'pdfkit/standard-fonts/ZapfDingbats'

const STANDARD_FONT_DATA = [
  Courier,
  CourierBold,
  CourierBoldOblique,
  CourierOblique,
  Helvetica,
  HelveticaBold,
  HelveticaBoldOblique,
  HelveticaOblique,
  SymbolFont,
  TimesBold,
  TimesBoldItalic,
  TimesItalic,
  TimesRoman,
  ZapfDingbats,
]

let registered = false

/**
 * Ensure the PDFKit browser build can resolve all Base 14 fonts. Repeated
 * report downloads share a single idempotent registration.
 */
export function ensurePdfKitStandardFonts() {
  if (registered || typeof window === 'undefined' || typeof PDFKit.registerStdFonts !== 'function') {
    return Promise.resolve()
  }
  PDFKit.registerStdFonts(...STANDARD_FONT_DATA)
  registered = true
  return Promise.resolve()
}
