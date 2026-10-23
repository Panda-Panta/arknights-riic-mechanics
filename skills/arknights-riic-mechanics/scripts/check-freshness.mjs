import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { skillRoot, validateSkill } from './validate.mjs'

const read = filename => JSON.parse(fs.readFileSync(path.join(skillRoot, 'references', filename), 'utf8'))
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const ensure = (condition, message) => { if (!condition) throw new Error(message) }
async function get(url, asJson = true) {
  const response = await fetch(url, { headers: { 'User-Agent': 'arknights-riic-mechanics-freshness/1', Accept: 'application/json' }, signal: AbortSignal.timeout(40000) })
  ensure(response.ok, `HTTP ${response.status} from ${url}`)
  return asJson ? response.json() : Buffer.from(await response.arrayBuffer())
}

async function githubSnapshot(provider, repository, branch, pinnedCommit, files) {
  const url = `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(branch)}`
  const head = await get(url)
  ensure(/^[a-f0-9]{40}$/.test(head.sha ?? ''), `Invalid ${provider} branch response`)
  if (head.sha === pinnedCommit) return { provider, status: 'current', url, pinnedCommit, observedCommit: head.sha, branch,
    note: 'Current branch commit matches pinned snapshot.' }
  const comparisons = await Promise.all(files.map(async file => {
    const latestUrl = file.url.replace(`/${pinnedCommit}/`, `/${head.sha}/`)
    ensure(latestUrl !== file.url, `Source URL is not pinned: ${file.url}`)
    const bytes = await get(latestUrl, false)
    const observedSha256 = sha256(bytes)
    return { path: file.path, url: latestUrl, pinnedSha256: file.sha256, observedSha256, matched: observedSha256 === file.sha256 }
  }))
  return { provider, status: comparisons.every(file => file.matched) ? 'current' : 'stale', url, branch,
    pinnedCommit, observedCommit: head.sha, comparisons,
    note: 'Branch advanced; current relevant source files were compared by SHA-256. This does not claim whole-repository parity.' }
}

async function toolboxSnapshot(manifest) {
  const check = await get(manifest.checkUrl)
  ensure(typeof check.mapMd5 === 'string' && /^[a-f0-9]+$/.test(check.mapMd5), 'Invalid Toolbox map reference')
  const mapUrl = `https://data.arkntools.app/map.${check.mapMd5}.json`
  const mapBytes = await get(mapUrl, false)
  const map = JSON.parse(mapBytes.toString('utf8'))
  const comparisons = await Promise.all(Object.entries(manifest.resources).map(async ([name, resource]) => {
    const unhashed = new URL(resource.url).pathname.slice(1).replace(/\.[a-f0-9]+\.json$/, '.json')
    const resourceHash = map[unhashed]
    ensure(typeof resourceHash === 'string' && /^[a-f0-9]+$/.test(resourceHash), `Missing Toolbox resource mapping: ${unhashed}`)
    const url = `https://data.arkntools.app/${unhashed.replace(/\.json$/, `.${resourceHash}.json`)}`
    const observedSha256 = sha256(await get(url, false))
    return { name, url, pinnedSha256: resource.sha256, observedSha256, matched: observedSha256 === resource.sha256 }
  }))
  return { provider: 'toolbox', status: comparisons.every(resource => resource.matched) ? 'current' : 'stale',
    pinnedVersion: manifest.check.version, observedVersion: check.version, pinnedMapMd5: manifest.check.mapMd5,
    observedMapMd5: check.mapMd5, observedMapSha256: sha256(mapBytes), comparisons,
    note: 'Compared the current five RIIC, character and term resources. Other Toolbox pages are outside this scope.' }
}

async function prtsSnapshot(pages) {
  const query = new URL('https://prts.wiki/api.php')
  query.search = new URLSearchParams({ action: 'query', titles: pages.map(page => page.title ?? page.name).join('|'), prop: 'info', format: 'json' }).toString()
  const response = await get(query.href)
  ensure(!response.error && response.query?.pages, 'Invalid PRTS page response')
  const currentPages = Object.values(response.query.pages)
  const comparisons = pages.map(page => {
    const title = page.title ?? page.name
    const current = currentPages.find(value => value.title === title)
    ensure(Number.isInteger(current?.lastrevid) && current.lastrevid > 0, `PRTS page unavailable: ${title}`)
    return { title, url: page.url, pinnedRevision: page.revision, observedRevision: current.lastrevid, matched: current.lastrevid === page.revision }
  })
  return { provider: 'prts', status: comparisons.every(page => page.matched) ? 'current' : 'stale', url: query.href, comparisons,
    note: 'Checks only the listed operator and recycle pages, including Greyy and Gladiia. Changed revisions require review even when edits may concern combat or formatting.' }
}

export async function checkFreshness() {
  const validation = validateSkill()
  const game = read('gamedata-source-manifest.json')
  const update = read('logistics-update-manifest.json')
  const plan = read('mower-plan-source-manifest.json')
  const planSource = plan.latestMechanicsImport?.mower ?? plan.mower
  const checks = [
    ['gameData', () => githubSnapshot('gameData', 'Kengxxiao/ArknightsGameData', 'master', game.commit,
      Object.entries(game.sources).map(([name, source]) => ({ path: name, ...source })))],
    ['toolbox', () => toolboxSnapshot(update.toolbox)],
    ['prts', () => prtsSnapshot([...update.prts, update.prtsRecycle, ...plan.prts])],
    ['mowerRecycle', () => githubSnapshot('mowerRecycle', 'ArkMowers/arknights-mower', update.mowerRecycle.branch,
      update.mowerRecycle.commit, update.mowerRecycle.files)],
    ['mowerPlanCompatibility', () => githubSnapshot('mowerPlanCompatibility', planSource.repository, planSource.branch,
      planSource.commit, planSource.files)]
  ]
  const startedAt = new Date().toISOString()
  const results = await Promise.all(checks.map(async ([provider, run]) => {
    try { return await run() } catch (error) { return { provider, status: 'unknown', error: error.message } }
  }))
  const status = results.some(result => result.status === 'unknown') ? 'unknown'
    : results.some(result => result.status === 'stale') ? 'stale' : 'current'
  return { schemaVersion: 1, startedAt, checkedAt: new Date().toISOString(), status,
    packageSha256: validation.packageSha256, sourceCommit: game.commit,
    scope: 'Pinned RIIC source files, five Toolbox resources, the listed operator pages, recycle facility page, Mower recycle/collection/QR files and separately pinned modern plan contracts.',
    results, note: 'Read-only source check; no data update, installation or live agent/game validation was performed.' }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    ensure(args.length === 0 || (args.length === 2 && args[0] === '--output' && args[1]), 'Usage: node scripts/check-freshness.mjs [--output report.json]')
    const report = await checkFreshness()
    if (args.length) fs.writeFileSync(path.resolve(args[1]), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = report.status === 'current' ? 0 : report.status === 'stale' ? 2 : 3
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
