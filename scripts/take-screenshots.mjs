import puppeteer from 'puppeteer'
import { mkdirSync } from 'fs'

const OUT  = 'public/screenshots'
mkdirSync(OUT, { recursive: true })

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const BASE   = 'http://localhost:5173'
const API    = 'http://localhost:3000/api'

const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwibmFtZSI6IkFkbWluIiwiZW1haWwiOiJhZG1pbkBqdWdhcmxhcGVsb3RhLmNvbSIsImlhdCI6MTc4MDM0MDI4NywiZXhwIjoxNzgwMzQ3NDg3fQ.qgAF5dj-FPDDbQConzXr8ztul_EOSiajb47Z2jZsfLU'
const REF_TOKEN   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6InJlZmVyZWUiLCJuYW1lIjoiR3VzdGF2byIsImVtYWlsIjoiZ3VzQGdtYWlsLmNvbSIsImlhdCI6MTc4MDM0MDI4NywiZXhwIjoxNzgwMzQ3NDg3fQ.jXVGP2lHe4Aw4381kRjY8e2AcAftY7Qf6ZCvD7hHgow'
const LIVE_MATCH_ID = 1571

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })

async function authShot(token, role, url, file, wait = 3500) {
  const p = await browser.newPage()
  await p.setViewport(MOBILE)
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
  await p.evaluate((t, r) => {
    localStorage.setItem('jlp_token', t)
    localStorage.setItem('jlp_user', JSON.stringify({
      id: r === 'referee' ? 3 : 1,
      name: 'Gustavo Gutiérrez',
      role: r,
      email: r === 'referee' ? 'gus@gmail.com' : 'admin@jugarlapelota.com'
    }))
  }, token, role)
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
  await new Promise(r => setTimeout(r, wait))
  await p.screenshot({ path: `${OUT}/${file}` })
  console.log('✓', file)
  await p.close()
}

async function publicShot(url, file, wait = 2500) {
  const p = await browser.newPage()
  await p.setViewport(MOBILE)
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
  await new Promise(r => setTimeout(r, wait))
  await p.screenshot({ path: `${OUT}/${file}` })
  console.log('✓', file)
  await p.close()
}

// Referee portal — match live asignado al árbitro 3
await authShot(REF_TOKEN, 'referee', `${BASE}/arbitro`, 'referee-portal.png', 4000)

// Public match detail (live match)
await publicShot(`${BASE}/COPACARIBE/partido/${LIVE_MATCH_ID}`, 'public-match.png', 3000)

// Public media
await publicShot(`${BASE}/COPACARIBE/media`, 'public-media.png', 2500)

await browser.close()
console.log('\n✅ public/screenshots/')
