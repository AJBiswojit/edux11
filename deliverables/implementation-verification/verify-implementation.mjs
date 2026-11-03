/**
 * Implementation verification — real backend, real auth, real exam data,
 * fresh real Chromium. Drives all six role/action combinations through the
 * actual Vite app after the Premium PDF consolidation.
 *
 * Investigation/verification only: no application source is changed here.
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
const DOWNLOADS = path.join(HERE, 'downloads')
const LIBS = '/tmp/al2023-libs/lib'
const STAMP = Date.now()
const APP = 'http://127.0.0.1:5173'

const live = JSON.parse(await fs.readFile(path.join(ROOT, 'deliverables/forensic-audit/live/live-data.json'), 'utf8'))
const ATTEMPT = live.attemptId
const STUDENT = live.studentId
const ROUTES = {
  student: `${APP}/student/exam-analysis`,
  faculty: `${APP}/faculty/my-students/${STUDENT}/exams/${ATTEMPT}`,
  admin: `${APP}/admin/students/${STUDENT}/exams/${ATTEMPT}`,
}
// Credentials are supplied at run time; no passwords are stored in the repo.
const ACCOUNTS = {
  student: { email: process.env.EDUX_STUDENT_EMAIL || 'student@edux.dev', password: process.env.EDUX_STUDENT_PASSWORD, label: 'Student' },
  faculty: { email: process.env.EDUX_FACULTY_EMAIL || 'faculty@edux.dev', password: process.env.EDUX_FACULTY_PASSWORD, label: 'Faculty' },
  admin: { email: process.env.EDUX_ADMIN_EMAIL || 'admin@edux.dev', password: process.env.EDUX_ADMIN_PASSWORD, label: 'Admin' },
}
for (const [role, acct] of Object.entries(ACCOUNTS)) {
  if (!acct.password) throw new Error(`Missing EDUX_${role.toUpperCase()}_PASSWORD environment variable`)
}

try {
  await fs.mkdir('/tmp/al2023-libs', { recursive: true })
  const tar = brotliDecompressSync(await fs.readFile(path.join(ROOT, 'frontend/node_modules/@sparticuz/chromium/bin/al2023.tar.br')))
  await fs.writeFile('/tmp/al2023.tar', tar)
  execFileSync('tar', ['-xf', '/tmp/al2023.tar', '-C', '/tmp/al2023-libs'])
} catch (e) { console.log('lib extraction skipped:', e.message) }

await fs.mkdir(DOWNLOADS, { recursive: true })
const exe = await chromium.executablePath()
const launchEnv = { ...process.env, LD_LIBRARY_PATH: [LIBS, '/tmp', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') }
let browserVersion = null
const profiles = []

const INSTRUMENT = () => {
  const F = { console: [], errors: [], rejections: [], downloads: [], blobs: {}, fetch: [] }
  window.__forensic = F
  const ser = (a) => {
    if (a instanceof Error) return { __error: true, name: a.name, message: a.message, stack: a.stack }
    if (a === undefined) return { __undefined: true }
    if (a === null || ['string', 'number', 'boolean'].includes(typeof a)) return a
    if (a instanceof Blob) return { __blob: true, type: a.type, size: a.size }
    try { return JSON.parse(JSON.stringify(a)) } catch { return String(a) }
  }
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const orig = console[level].bind(console)
    console[level] = (...args) => {
      F.console.push({
        level, at: Date.now(), args: args.map(ser),
        text: args.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : typeof x === 'object' ? (() => { try { return JSON.stringify(x) } catch { return String(x) } })() : String(x))).join(' '),
      })
      return orig(...args)
    }
  }
  window.addEventListener('error', (e) => F.errors.push({ message: e.message, filename: e.filename, error: e.error ? ser(e.error) : null }), true)
  window.addEventListener('unhandledrejection', (e) => F.rejections.push({ reason: ser(e.reason) }), true)
  const create = URL.createObjectURL.bind(URL)
  URL.createObjectURL = (blob) => {
    const href = create(blob)
    F.blobs[href] = blob
    F.downloads.push({ type: 'blob-created', href, size: blob.size, mime: blob.type, at: Date.now() })
    return href
  }
  const revoke = URL.revokeObjectURL.bind(URL)
  URL.revokeObjectURL = (href) => { F.downloads.push({ type: 'blob-revoked', href, at: Date.now() }); return revoke(href) }
  const click = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () {
    F.downloads.push({ type: 'download-initiated', href: this.href, filename: this.download, size: F.blobs[this.href]?.size ?? null, at: Date.now() })
    return click.call(this)
  }
  const of = window.fetch.bind(window)
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? String(args[0]))
    try { const r = await of(...args); F.fetch.push({ url, status: r.status }); return r }
    catch (e) { F.fetch.push({ url, error: String(e) }); throw e }
  }
}

const attach = async (page, role, allNetwork) => {
  const client = await page.createCDPSession()
  await client.send('Page.enable')
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  const req = new Map()
  client.on('Network.requestWillBeSent', (e) => req.set(e.requestId, { role, method: e.request.method, url: e.request.url, type: e.type }))
  client.on('Network.responseReceived', (e) => {
    const r = req.get(e.requestId) || { role, url: e.response.url }
    allNetwork.push({
      phase: 'response', role, url: r.url, method: r.method, status: e.response.status,
      mimeType: e.response.mimeType, fromDiskCache: !!e.response.fromDiskCache,
      fromServiceWorker: !!e.response.fromServiceWorker, encodedDataLength: e.response.encodedDataLength,
    })
  })
  client.on('Network.loadingFailed', (e) => allNetwork.push({ phase: 'failed', role, url: req.get(e.requestId)?.url, errorText: e.errorText }))
  await page.setCacheEnabled(false)
  return client
}

const results = []
const allNetwork = []
const allConsole = []

for (const role of ['student', 'faculty', 'admin']) {
  const acct = ACCOUNTS[role]
  const dir = path.join(DOWNLOADS, role)
  await fs.mkdir(dir, { recursive: true })
  const profile = `/tmp/edux-impl-chrome-${STAMP}-${role}`
  profiles.push(profile)
  await fs.mkdir(profile, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: exe, userDataDir: profile,
    args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run'],
    headless: true, env: launchEnv,
  })
  if (!browserVersion) browserVersion = await browser.version()
  console.log('BROWSER', role, browserVersion, 'profile', profile)

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const client = await attach(page, role, allNetwork)
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir })
  await page.evaluateOnNewDocument(INSTRUMENT)

  const puppeteerConsole = []
  const pageErrors = []
  const failedRequests = []
  page.on('console', (m) => puppeteerConsole.push({ level: m.type(), text: m.text() }))
  page.on('pageerror', (e) => pageErrors.push(String(e?.stack || e)))
  page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }))
  page.on('response', (r) => { if (r.status() >= 400) failedRequests.push({ url: r.url(), status: r.status() }) })

  const entry = {
    role, route: ROUTES[role], account: { email: acct.email, label: acct.label },
    login: {}, ui: {}, actions: [], downloads: [], files: [],
    puppeteerConsole, pageErrors, failedRequests,
    cache: { profile, dedicatedBrowserProcess: true, cacheDisabled: true },
  }

  // Real UI login.
  await page.goto(`${APP}/auth/login?role=${role}&_impl=${STAMP}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  entry.preLoginToken = await page.evaluate(() => localStorage.getItem('EduX_access_token'))
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 })
  entry.login.submitButtonText = await page.$eval('button[type="submit"]', (b) => (b.textContent || '').trim())
  await page.type('input[autocomplete="username"]', acct.email, { delay: 6 })
  await page.type('input[autocomplete="current-password"]', acct.password, { delay: 6 })
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !!localStorage.getItem('EduX_access_token') && !location.pathname.startsWith('/auth/login'), { timeout: 45000 })
  entry.login.status = 'ok'
  entry.login.pathAfterLogin = await page.evaluate(() => location.pathname)
  entry.login.user = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('EduX_user')) } catch { return null } })
  console.log(`LOGIN ${role}: ${entry.login.submitButtonText} -> ${entry.login.pathAfterLogin} user=${entry.login.user?.fullName}`)

  // Real analysis page.
  await page.goto(ROUTES[role], { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (role === 'student') {
    await page.waitForSelector('button[aria-haspopup="listbox"]', { timeout: 45000 })
    let tr = await page.$$('button[aria-haspopup="listbox"]')
    await tr[0].click(); await page.waitForSelector('button[role="option"]', { timeout: 15000 })
    await (await page.$$('button[role="option"]'))[0].click()
    await new Promise((r) => setTimeout(r, 400))
    tr = await page.$$('button[aria-haspopup="listbox"]')
    await tr[1].click(); await page.waitForSelector('button[role="option"]', { timeout: 15000 })
    entry.ui.subjectPicked = await page.evaluate(() => {
      const o = [...document.querySelectorAll('button[role="option"]')].find((b) => (b.textContent || '').trim() === 'Physics')
      if (o) { o.click(); return 'Physics' }
      return null
    })
    if (!entry.ui.subjectPicked) await (await page.$$('button[role="option"]'))[0].click()
    await new Promise((r) => setTimeout(r, 400))
    const genIdx = await page.$$eval('button', (bs) => bs.findIndex((b) => /Generate analysis/i.test(b.textContent || '')))
    await (await page.$$('button'))[genIdx].click()
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Report'), { timeout: 45000 })
  } else {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Report')
      && [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Full Analysis'), { timeout: 45000 })
  }

  entry.ui.buttons = await page.$$eval('button', (bs) => bs.map((b) => (b.textContent || '').trim()).filter(Boolean))
  entry.ui.reportButton = entry.ui.buttons.includes('Report')
  entry.ui.fullAnalysisButton = entry.ui.buttons.includes('Full Analysis')
  entry.ui.pdfButton = entry.ui.buttons.includes('PDF')
  entry.ui.headings = await page.$$eval('h1,h2,h3', (hs) => hs.map((h) => (h.textContent || '').trim()).filter(Boolean).slice(0, 8))

  const buttonState = async (text) => page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === t)
    return b ? { disabled: !!b.disabled, spinner: !!b.querySelector('.animate-spin') } : null
  }, text)

  // Report: two rapid clicks exercise duplicate-click protection; only one download may occur.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Report')
    b.click(); b.click()
  })
  let reportLoading = null
  try {
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Report')
      return b && b.disabled && b.querySelector('.animate-spin')
    }, { timeout: 8000 })
    reportLoading = await buttonState('Report')
  } catch { reportLoading = { observed: false } }
  entry.actions.push({ action: 'Report', duplicateClicks: 2, loading: reportLoading, independentFullEnabled: (await buttonState('Full Analysis'))?.disabled === false })
  await page.waitForFunction(() => window.__forensic.downloads.filter((d) => d.type === 'download-initiated').length >= 1, { timeout: 90000 })
  await new Promise((r) => setTimeout(r, 1400))
  const afterReport = await page.evaluate(() => window.__forensic.downloads.filter((d) => d.type === 'download-initiated').length)
  entry.actions[0].downloadsAfterAction = afterReport
  entry.actions[0].duplicateClickBlocked = afterReport === 1
  entry.actions[0].toastsAfterAction = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast],[role="alert"],[role="status"],.toast')].map((n) => (n.textContent || '').trim()).filter(Boolean))

  // Full Analysis: single click, second download.
  const fullIdx = await page.$$eval('button', (bs) => bs.findIndex((b) => (b.textContent || '').trim() === 'Full Analysis' && !b.disabled))
  await (await page.$$('button'))[fullIdx].click()
  let fullLoading = null
  try {
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Full Analysis')
      return b && b.disabled && b.querySelector('.animate-spin')
    }, { timeout: 8000 })
    fullLoading = await buttonState('Full Analysis')
  } catch { fullLoading = { observed: false } }
  entry.actions.push({ action: 'Full Analysis', loading: fullLoading })
  await page.waitForFunction(() => window.__forensic.downloads.filter((d) => d.type === 'download-initiated').length >= 2, { timeout: 90000 })
  await new Promise((r) => setTimeout(r, 2500))
  entry.actions[1].toastsAfterAction = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast],[role="alert"],[role="status"],.toast')].map((n) => (n.textContent || '').trim()).filter(Boolean))

  entry.downloads = await page.evaluate(() => window.__forensic.downloads)
  entry.forensic = await page.evaluate(() => ({
    console: window.__forensic.console, errors: window.__forensic.errors,
    rejections: window.__forensic.rejections, fetch: window.__forensic.fetch,
    resourceEntries: performance.getEntriesByType('resource').map((r) => r.name),
  }))
  allConsole.push(...entry.forensic.console.map((c) => ({ role, ...c })))
  entry.exactExceptions = entry.forensic.console.filter((c) => c.level === 'error' && c.args.some((a) => a && a.__error)).map((c) => ({ text: c.text, errors: c.args.filter((a) => a && a.__error) }))
  entry.resourceErrors = entry.forensic.errors.filter((e) => !e.error || !e.error.__error)
  entry.toasts = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast],[role="alert"],[role="status"],.toast')].map((n) => (n.textContent || '').trim()).filter(Boolean))
  entry.exportLogs = entry.forensic.console.filter((c) => /EduX PDF Export/.test(c.text)).map((c) => ({ level: c.level, text: c.text }))
  entry.files = (await fs.readdir(dir)).filter((f) => f.toLowerCase().endsWith('.pdf')).map((f) => ({ name: f, size: execFileSync('stat', ['-c', '%s', path.join(dir, f)]).toString().trim() }))

  const roleNetwork = allNetwork.filter((n) => n.role === role)
  entry.network = {
    responses: roleNetwork.filter((n) => n.phase === 'response').length,
    v1Responses: roleNetwork.filter((n) => n.phase === 'response' && (n.url || '').includes('/v1/')).length,
    non2xx: roleNetwork.filter((n) => n.phase === 'response' && n.status >= 400),
    analysisFetches: roleNetwork.filter((n) => n.phase === 'response' && (n.url || '').includes(`/exams/${ATTEMPT}/analysis`)).length
      + roleNetwork.filter((n) => n.phase === 'response' && (n.url || '').includes(`/student/exam-analysis/${ATTEMPT}`)).length,
    profile360Fetches: roleNetwork.filter((n) => n.phase === 'response' && (n.url || '').includes('/360')).length,
    fromDiskCache: roleNetwork.filter((n) => n.phase === 'response' && n.fromDiskCache).length,
  }

  entry.ok = entry.ui.reportButton && entry.ui.fullAnalysisButton && !entry.ui.pdfButton
    && entry.downloads.filter((d) => d.type === 'download-initiated').length === 2
    && entry.actions[0].duplicateClickBlocked
    && entry.pageErrors.length === 0 && entry.exactExceptions.length === 0
    && entry.network.analysisFetches === 1
  results.push(entry)
  console.log(`ROLE ${role}: buttons=[${entry.ui.buttons.filter((b) => /Report|Full Analysis|PDF/.test(b)).join(', ')}] downloads=${entry.downloads.filter((d) => d.type === 'download-initiated').length} pageErrors=${entry.pageErrors.length} exactExceptions=${entry.exactExceptions.length} analysisFetches=${entry.network.analysisFetches} duplicateBlocked=${entry.actions[0].duplicateClickBlocked}`)
  await browser.close()
}

const moduleResponses = allNetwork.filter((n) => n.phase === 'response' && /\/src\/|\/assets\//.test(n.url || ''))
const freshness = {
  head: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
  viteCwd: execFileSync('bash', ['-c', "for p in $(pgrep -f 'node .*vite --host'); do readlink /proc/$p/cwd; done | head -1"]).toString().trim(),
  browserVersion, profiles, dedicatedBrowserProcessPerRole: true, cacheDisabled: true,
  networkResponses: allNetwork.filter((n) => n.phase === 'response').length,
  moduleResponses: moduleResponses.length,
  fromDiskCacheResponses: allNetwork.filter((n) => n.phase === 'response' && n.fromDiskCache).length,
  serviceWorkerResponses: allNetwork.filter((n) => n.phase === 'response' && n.fromServiceWorker).length,
  notModified304: allNetwork.filter((n) => n.phase === 'response' && n.status === 304).length,
}

await fs.writeFile(path.join(HERE, 'browser-network.json'), JSON.stringify(allNetwork, null, 2))
await fs.writeFile(path.join(HERE, 'browser-network.log'), allNetwork.map((n) => `[${n.role || '-'}] ${n.phase} ${String(n.status ?? n.errorText ?? '')} ${n.url || ''}`).join('\n') + '\n')
await fs.writeFile(path.join(HERE, 'browser-console.log'), allConsole.map((c) => `[${c.role}] ${c.level.toUpperCase()} ${c.text}${c.args?.some((a) => a?.__error) ? '\n' + c.args.filter((a) => a?.__error).map((a) => `  EXACT_EXCEPTION ${a.name}: ${a.message}\n${a.stack}`).join('\n') : ''}`).join('\n') + '\n')
await fs.writeFile(path.join(HERE, 'freshness.json'), JSON.stringify(freshness, null, 2))
await fs.writeFile(path.join(HERE, 'implementation-runtime-results.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  browser: browserVersion,
  backend: 'Real FastAPI uvicorn app.main:app :8000 + documented local SQLite dev DB, /v1 proxied by Vite',
  frontend: `Vite dev server :5173 (${freshness.viteCwd}), VITE_API_BASE_URL=/v1, HEAD ${freshness.head}`,
  data: live, routes: ROUTES, freshness, results,
}, null, 2))
console.log('IMPLEMENTATION_RUNTIME_VERIFICATION_DONE', 'responses', freshness.networkResponses, 'fromDiskCache', freshness.fromDiskCacheResponses)
