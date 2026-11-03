/**
 * Controlled fault injection on the LIVE stack — verifies error handling for
 * all six role/action combinations after the implementation.
 *
 * One real PDF font asset fetch is rejected at runtime (no source change).
 * This is NOT a natural failure; it exists to capture the exact exception,
 * development logging, friendly toasts, loading-state reset and absence of
 * unhandled rejections.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { brotliDecompressSync } from 'node:zlib'

const require = createRequire('/home/user/edux11/frontend/package.json')
const chromiumModule = require('@sparticuz/chromium')
const chromium = chromiumModule.default ?? chromiumModule
const puppeteer = require('puppeteer-core')

const ROOT = '/home/user/edux11'
const HERE = path.join(ROOT, 'deliverables/implementation-verification')
const STAMP = Date.now()
const APP = 'http://127.0.0.1:5173'
const live = JSON.parse(await fs.readFile(path.join(ROOT, 'deliverables/forensic-audit/live/live-data.json'), 'utf8'))
const ATTEMPT = live.attemptId
const STUDENT = live.studentId

try {
  await fs.mkdir('/tmp/al2023-libs', { recursive: true })
  const tar = brotliDecompressSync(await fs.readFile(path.join(ROOT, 'frontend/node_modules/@sparticuz/chromium/bin/al2023.tar.br')))
  await fs.writeFile('/tmp/al2023.tar', tar)
  execFileSync('tar', ['-xf', '/tmp/al2023.tar', '-C', '/tmp/al2023-libs'])
} catch (e) { console.log('lib extraction skipped:', e.message) }

const exe = await chromium.executablePath()
const launchEnv = { ...process.env, LD_LIBRARY_PATH: ['/tmp/al2023-libs/lib', '/tmp', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') }

const INSTRUMENT = () => {
  const F = { console: [], downloads: [], errors: [], rejections: [] }
  window.__forensic = F
  const ser = (a) => {
    if (a instanceof Error) return { __error: true, name: a.name, message: a.message, stack: a.stack }
    if (a === undefined) return { __undefined: true }
    if (a === null || ['string', 'number', 'boolean'].includes(typeof a)) return a
    try { return JSON.parse(JSON.stringify(a)) } catch { return String(a) }
  }
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const orig = console[level].bind(console)
    console[level] = (...args) => {
      F.console.push({ level, at: Date.now(), args: args.map(ser), text: args.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : typeof x === 'object' ? (() => { try { return JSON.stringify(x) } catch { return String(x) } })() : String(x))).join(' ') })
      return orig(...args)
    }
  }
  window.addEventListener('error', (e) => F.errors.push({ message: e.message, error: e.error ? ser(e.error) : null }), true)
  window.addEventListener('unhandledrejection', (e) => F.rejections.push({ reason: ser(e.reason) }), true)
  const create = URL.createObjectURL.bind(URL)
  URL.createObjectURL = (blob) => { const h = create(blob); F.downloads.push({ type: 'blob-created', size: blob.size }); return h }
  const click = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () { F.downloads.push({ type: 'download-initiated', filename: this.download }); return click.call(this) }
}

// Credentials are supplied at run time; no passwords are stored in the repo.
const CASES = [
  { role: 'student', email: process.env.EDUX_STUDENT_EMAIL || 'student@edux.dev', password: process.env.EDUX_STUDENT_PASSWORD, route: `${APP}/student/exam-analysis` },
  { role: 'faculty', email: process.env.EDUX_FACULTY_EMAIL || 'faculty@edux.dev', password: process.env.EDUX_FACULTY_PASSWORD, route: `${APP}/faculty/my-students/${STUDENT}/exams/${ATTEMPT}` },
  { role: 'admin', email: process.env.EDUX_ADMIN_EMAIL || 'admin@edux.dev', password: process.env.EDUX_ADMIN_PASSWORD, route: `${APP}/admin/students/${STUDENT}/exams/${ATTEMPT}` },
]
for (const c of CASES) {
  if (!c.password) throw new Error(`Missing EDUX_${c.role.toUpperCase()}_PASSWORD environment variable`)
}

const results = []
for (const c of CASES) {
  const profile = `/tmp/edux-impl-fault-chrome-${STAMP}-${c.role}`
  await fs.mkdir(profile, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: exe, userDataDir: profile,
    args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run'],
    headless: true, env: launchEnv,
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const client = await page.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await page.setCacheEnabled(false)
  await page.evaluateOnNewDocument(INSTRUMENT)

  await page.goto(`${APP}/auth/login?role=${c.role}&_fault=${STAMP}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 })
  await page.type('input[autocomplete="username"]', c.email, { delay: 5 })
  await page.type('input[autocomplete="current-password"]', c.password, { delay: 5 })
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !!localStorage.getItem('EduX_access_token') && !location.pathname.startsWith('/auth/login'), { timeout: 45000 })

  await page.goto(c.route, { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (c.role === 'student') {
    await page.waitForSelector('button[aria-haspopup="listbox"]', { timeout: 45000 })
    let tr = await page.$$('button[aria-haspopup="listbox"]')
    await tr[0].click(); await page.waitForSelector('button[role="option"]', { timeout: 15000 })
    await (await page.$$('button[role="option"]'))[0].click()
    await new Promise((r) => setTimeout(r, 400))
    tr = await page.$$('button[aria-haspopup="listbox"]')
    await tr[1].click(); await page.waitForSelector('button[role="option"]', { timeout: 15000 })
    await (await page.$$('button[role="option"]'))[0].click()
    await new Promise((r) => setTimeout(r, 400))
    const idx = await page.$$eval('button', (bs) => bs.findIndex((b) => /Generate analysis/i.test(b.textContent || '')))
    await (await page.$$('button'))[idx].click()
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Report'), { timeout: 45000 })
  } else {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Report')
      && [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Full Analysis'), { timeout: 45000 })
  }

  // Reject one real premium font asset at runtime; no application source change.
  await page.evaluate(() => {
    const orig = window.fetch.bind(window)
    window.__faultInjectedUrls = []
    window.fetch = (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? '')
      if (url.includes('/src/assets/fonts/Inter-Regular.ttf') && !url.includes('?import')) {
        window.__faultInjectedUrls.push(url)
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return orig(...args)
    }
  })

  const actionSnapshots = []
  const clickAction = async (text) => {
    const idx = await page.$$eval('button', (bs, t) => bs.findIndex((b) => (b.textContent || '').trim() === t && !b.disabled), text)
    const before = await page.evaluate(() => window.__forensic.console.length)
    await (await page.$$('button'))[idx].click()
    await page.waitForFunction((n) => window.__forensic.console.slice(n).some((x) => /failed/i.test(x.text)), { timeout: 30000 }, before).catch(() => {})
    await new Promise((r) => setTimeout(r, 1200))
    actionSnapshots.push({
      action: text,
      consoleAfter: await page.evaluate((n) => window.__forensic.console.slice(n), before),
      toastsAfter: await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast],[role="alert"],[role="status"],.toast')].map((n) => (n.textContent || '').trim()).filter(Boolean)),
      buttonsReenabled: await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => ['Report', 'Full Analysis'].includes((b.textContent || '').trim())).every((b) => !b.disabled)),
      downloadsAfter: await page.evaluate(() => window.__forensic.downloads.filter((d) => d.type === 'download-initiated').length),
    })
  }

  await clickAction('Report')
  await clickAction('Full Analysis')

  const entry = {
    actionSnapshots,
    role: c.role, route: c.route,
    faultInjectedUrls: await page.evaluate(() => window.__faultInjectedUrls),
    downloads: await page.evaluate(() => window.__forensic.downloads),
    console: await page.evaluate(() => window.__forensic.console),
    errors: await page.evaluate(() => window.__forensic.errors),
    rejections: await page.evaluate(() => window.__forensic.rejections),
    toasts: await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast],[role="alert"],[role="status"],.toast')].map((n) => (n.textContent || '').trim()).filter(Boolean)),
    buttonsReenabled: await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => ['Report', 'Full Analysis'].includes((b.textContent || '').trim())).every((b) => !b.disabled)),
  }
  entry.exportLogs = entry.console.filter((x) => /EduX PDF Export/.test(x.text)).map((x) => ({ level: x.level, text: x.text }))
  entry.exactExceptions = entry.console
    .filter((x) => x.level === 'error' && x.args.some((a) => a && a.__error))
    .map((x) => ({ text: x.text, errors: x.args.filter((a) => a && a.__error) }))
  entry.ok = entry.faultInjectedUrls.length >= 2
    && entry.downloads.filter((d) => d.type === 'download-initiated').length === 0
    && entry.toasts.some((t) => t.includes('PDF failed'))
    && entry.exactExceptions.length >= 2
    && entry.exportLogs.some((l) => l.text.includes('Report failed'))
    && entry.exportLogs.some((l) => l.text.includes('Full Analysis failed'))
    && entry.rejections.length === 0
    && entry.buttonsReenabled

  results.push(entry)
  console.log(`FAULT ${c.role}: toasts=${entry.toasts.length} exactExceptions=${entry.exactExceptions.length} downloads=${entry.downloads.filter((d) => d.type === 'download-initiated').length} rejections=${entry.rejections.length} buttonsReenabled=${entry.buttonsReenabled}`)
  for (const e of entry.exactExceptions) console.log('   EXACT:', e.errors[0].name + ': ' + e.errors[0].message)
  await browser.close()
}

await fs.writeFile(path.join(HERE, 'fault-injection-results.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  note: 'Controlled runtime fault (one PDF font fetch rejected per export). NOT a natural failure; no source change.',
  results,
}, null, 2))
await fs.writeFile(path.join(HERE, 'fault-injection-console.log'), results.flatMap((r) => r.console.map((c) => `[${r.role}] ${c.level.toUpperCase()} ${c.text}${c.args.some((a) => a?.__error) ? '\n' + c.args.filter((a) => a?.__error).map((a) => `  EXACT_EXCEPTION ${a.name}: ${a.message}\n${a.stack}`).join('\n') : ''}`)).join('\n') + '\n')
console.log('IMPLEMENTATION_FAULT_VERIFICATION_DONE')
