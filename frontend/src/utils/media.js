/**
 * Utilities for resolving question crops, figures, and media assets.
 *
 * Ensures media paths work consistently in:
 *  - Production behind Nginx (same-origin /media/... proxying to backend :8000)
 *  - Development via Vite proxy (proxying /media -> http://localhost:8000)
 *  - Remote client browsers where "http://localhost:8000" causes connection refused
 */

/**
 * Normalizes an image / figure URL so the browser can load it correctly.
 *
 * Handles:
 *  1. Localhost/loopback URLs baked or returned from backend:
 *     "http://localhost:8000/media/crops/p1.png" -> "/media/crops/p1.png"
 *  2. Any host URL pointing to /media/:
 *     "http://18.60.0.133:8000/media/crops/p1.png" -> "/media/crops/p1.png"
 *  3. Unslashed relative paths:
 *     "media/pdf_extract/..." -> "/media/pdf_extract/..."
 *     "pdf_extract/..." -> "/media/pdf_extract/..."
 *  4. External absolute URLs (e.g. S3 / CDN):
 *     "https://cdn.example.com/fig.png" -> preserved
 *  5. Data / Blob URIs:
 *     "data:image/png;base64,..." -> preserved
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Pass through inline data/blob URIs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }

  // 1. If it contains /media/ anywhere (e.g. http://localhost:8000/media/..., http://any-host:8000/media/...)
  const mediaIdx = trimmed.indexOf('/media/')
  if (mediaIdx !== -1) {
    return trimmed.slice(mediaIdx)
  }

  // 2. If it starts with "media/" (without leading slash)
  if (trimmed.startsWith('media/')) {
    return `/${trimmed}`
  }

  // 3. If it starts with "pdf_extract/"
  if (trimmed.startsWith('pdf_extract/')) {
    return `/media/${trimmed}`
  }

  // 4. External absolute URLs (e.g. S3, Cloudinary)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // 5. Fallback for relative path: ensure single leading slash
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Normalizes an array or pipe-separated string of media URLs.
 *
 * @param {string[]|string|null|undefined} urls
 * @returns {string[]}
 */
export function resolveMediaUrls(urls) {
  if (!urls) return []
  const list = Array.isArray(urls) ? urls : String(urls).split('|')
  return list.map(resolveMediaUrl).filter(Boolean)
}

export default resolveMediaUrl
