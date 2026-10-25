import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const skillRoot = fileURLToPath(new URL('../', import.meta.url))
const manifestPath = 'references/package-manifest.json'
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const json = (root, filename) => JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'))

function filesIn(root, current = root) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(current, entry.name)
    assert(!entry.isSymbolicLink(), `Symbolic link is not portable: ${filename}`)
    if (entry.isDirectory()) return filesIn(root, filename)
    assert(entry.isFile(), `Unsupported file type: ${filename}`)
    const relative = path.relative(root, filename).split(path.sep).join('/')
    return relative === manifestPath || relative === 'freshness-check.json' ? [] : [relative]
  }).sort()
}

export function packageManifest(root = skillRoot) {
  const files = filesIn(root).map(filename => {
    const bytes = fs.readFileSync(path.join(root, filename))
    return { path: filename, bytes: bytes.length, sha256: hash(bytes) }
  })
  return { schemaVersion: 1, algorithm: 'SHA-256', packageSha256: hash(JSON.stringify(files)), files }
}

function validateUnpackerEvidence(root, source, counts, versionControl) {
  if (source.unpackerEvidence === undefined) return
  const binding = source.unpackerEvidence
  assert(binding?.manifest === 'unpacker-source-manifest.json', 'Unpacker evidence filename must name the bundled receipt')
  const bytes = fs.readFileSync(path.join(root, 'references', binding.manifest))
  assert(/^[a-f0-9]{64}$/.test(binding.sha256 ?? '') && hash(bytes) === binding.sha256, 'Unpacker evidence SHA-256 differs from the bundled receipt')
  const evidence = JSON.parse(bytes.toString('utf8'))
  assert(evidence.schemaVersion === 1 && evidence.provider === 'ArknightsUnpacker', 'Unsupported Unpacker evidence schema')
  assert(evidence.localGame?.dataVersion === versionControl && binding.dataVersion === versionControl &&
    evidence.localGame.sourceVersion === source.sourceVersion, 'Unpacker data version differs from the fixed snapshot')
  assert(evidence.mirror?.commit === source.commit && evidence.mirror.sourceVersion === source.sourceVersion &&
    evidence.mirror.repository === 'Kengxxiao/ArknightsGameData', 'Unpacker mirror commit or version differs from the fixed snapshot')
  const required = ['building_data.json', 'character_table.json', 'data_version.txt', 'gamedata_const.json', 'item_table.json']
  for (const name of required) {
    const mirror = evidence.mirror.sources?.[name]
    assert(mirror?.sha256 === source.sources[name]?.sha256 && mirror?.url === source.sources[name]?.url &&
      /^[a-f0-9]{64}$/.test(mirror?.sha256 ?? '') && Number.isInteger(mirror?.bytes) && mirror.bytes > 0, 'Unpacker mirror source: ' + name)
  }
  for (const [key, count] of Object.entries(counts)) assert(evidence.verification?.[key] === count, 'Unpacker ' + key + ' count differs from the catalog')
  const isRelative = value => typeof value === 'string' && value.length > 0 &&
    !/^(?:[A-Za-z]:|[\\/]|file:)/.test(value) && !value.split(/[\\/]/).includes('..')
  const isFilename = value => isRelative(value) && !/[\\/]/.test(value)
  const isDigest = value => /^[a-f0-9]{64}$/.test(value ?? '')
  const isFileDigest = value => isDigest(value?.sha256) && Number.isInteger(value?.bytes) && value.bytes > 0
  assert(typeof evidence.checkedAt === 'string' && Number.isFinite(Date.parse(evidence.checkedAt)), 'Unpacker check timestamp missing')
  assert(typeof evidence.localGame.resourceVersion === 'string' && evidence.localGame.resourceVersion.length > 0 &&
    isFilename(evidence.localGame.activeIndex?.filename) && isDigest(evidence.localGame.activeIndex?.sha256), 'Unpacker active resource provenance missing')
  const tool = evidence.tool
  assert(typeof tool?.version === 'string' && tool.version.length > 0 && /^[a-f0-9]{40}$/.test(tool.commit ?? '') &&
    /^[a-f0-9]{40}$/.test(tool.schemaCommit ?? '') && typeof tool.decoderVersion === 'string' &&
    tool.decoderVersion.length > 0 && isDigest(tool.normalizerSha256), 'Unpacker tool provenance missing')
  assert(Array.isArray(tool.sourceFiles) && tool.sourceFiles.length > 0 &&
    tool.sourceFiles.every(file => isRelative(file.path) && isDigest(file.sha256)), 'Unpacker tool source provenance is not portable')
  for (const name of required) {
    const table = evidence.tables?.[name.replace(/\.(?:json|txt)$/, '')]
    assert(isFilename(table?.source?.filename), 'Unpacker source filename must be a portable basename: ' + name)
    assert(isRelative(table.source.logicalName) && typeof table.source.layer === 'string' && table.source.layer.length > 0 &&
      isFileDigest(table.source) && isFileDigest(table.raw) && isFileDigest(table.normalized), 'Unpacker table provenance missing: ' + name)
  }
  const unknown = ['recycleData', 'recycleRoomConsts', 'recycleRoomInputItemDatas', 'recycleRoomOutputPoolDatas', 'recycleRoomOutputPoolContentDatas']
  assert(Array.isArray(evidence.unknownFields?.buildingRoots) &&
    JSON.stringify([...evidence.unknownFields.buildingRoots].sort()) === JSON.stringify(unknown.sort()), 'Unpacker unknown building fields must preserve the five undecoded recycle roots')
  assert(typeof evidence.evidenceBoundary === 'string' && evidence.evidenceBoundary.length > 0, 'Unpacker evidence boundary missing')
}

export function validateSkill(root = skillRoot, { verifyManifest = true } = {}) {
  root = path.resolve(root)
  const entry = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8').replaceAll('\r\n', '\n')
  const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(entry)
  assert(frontmatter, 'SKILL.md must start with YAML frontmatter')
  const metadata = {}
  for (const line of frontmatter[1].split('\n')) {
    const field = /^(name|description): (.+)$/.exec(line)
    assert(field && !Object.hasOwn(metadata, field[1]), 'Expected one non-empty name and description, with no duplicate keys')
    metadata[field[1]] = field[2]
  }
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name ?? '') && metadata.name.length <= 64, 'Skill name must use lowercase letters, digits and single hyphens, at most 64 characters')
  assert(metadata.name === path.basename(root), 'Skill name must match its directory name')
  assert(metadata.description?.length > 0 && metadata.description.length <= 1024, 'Description must contain 1..1024 characters')
  assert(!/[<>]/.test(metadata.description), 'Description contains unsupported angle brackets')
  assert(!/(?:[A-Za-z]:[\\/]|file:\/\/)/.test(entry), 'Entrypoint contains a machine-specific absolute path')

  let references = 0
  const files = filesIn(root)
  for (const filename of files) {
    const bytes = fs.readFileSync(path.join(root, filename))
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (filename.endsWith('.json')) JSON.parse(text)
    if (!filename.endsWith('.md')) continue
    for (const link of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = link[1].replace(/^<|>$/g, '').split('#')[0]
      if (!target || /^https?:\/\//.test(target)) continue
      assert(!/^(?:[A-Za-z]+:|[\\/])/.test(target), `${filename}: reference must be relative: ${target}`)
      const resolved = path.resolve(path.dirname(path.join(root, filename)), decodeURIComponent(target))
      const relative = path.relative(root, resolved)
      assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `${filename}: reference escapes skill: ${target}`)
      assert(fs.statSync(resolved).isFile(), `${filename}: reference is not a file: ${target}`)
      references++
    }
  }

  const catalog = json(root, 'references/catalog.json')
  const decoded = json(root, 'references/catalog.decoded.json')
  const terms = json(root, 'references/terms.json')
  const source = json(root, 'references/gamedata-source-manifest.json')
  const update = json(root, 'references/logistics-update-manifest.json')
  const stages = catalog.operators.flatMap(operator => operator.slots.flat())
  const counts = { operators: catalog.operators.length, skillStages: stages.length,
    highestSkills: catalog.operators.flatMap(operator => operator.slots).filter(slot => slot.length).length,
    buffDefinitions: Object.keys(catalog.building.buffs).length, terms: Object.keys(terms.terms).length }
  for (const [key, count] of Object.entries(counts)) assert(source.counts[key] === count && update.gameData.counts[key] === count, `Inconsistent ${key} count`)
  assert(catalog.manifest.sourceCommit === source.commit && decoded.metadata.sourceCommit === source.commit && terms.sourceCommit === source.commit && update.gameData.commit === source.commit, 'Mixed source commits in package')
  const versionControl = /VersionControl:([^\s]+)/.exec(source.sourceVersion)?.[1]
  assert(catalog.manifest.sourceVersion === source.sourceVersion && decoded.metadata.sourceVersion === source.sourceVersion && terms.dataVersion === versionControl && update.gameData.version === versionControl, 'Mixed GameData versions in package')
  validateUnpackerEvidence(root, source, counts, versionControl)
  assert(catalog.manifest.operatorCount === counts.operators && catalog.manifest.skillStageCount === counts.skillStages && catalog.manifest.highestSkillCount === counts.highestSkills && catalog.manifest.buffDefinitionCount === counts.buffDefinitions, 'Catalog metadata count mismatch')
  assert(Object.keys(decoded.operators).length === counts.operators && decoded.metadata.skillStageCount === counts.skillStages, 'Decoded catalog is incomplete')
  for (const [filename, evidence] of Object.entries(source.sources)) assert(catalog.manifest.sources[filename]?.sha256 === evidence.sha256 && /^[a-f0-9]{64}$/.test(evidence.sha256) && evidence.url.includes(`/${source.commit}/`), `Inconsistent pinned source: ${filename}`)
  for (const text of [...stages.map(stage => stage.description), ...Object.values(terms.terms).map(term => term.description)]) {
    for (const [, id] of String(text ?? '').matchAll(/<\$([^>]+)>/g)) assert(Object.hasOwn(terms.terms, id), `Missing referenced term: ${id}`)
  }
  for (const page of update.prts) {
    const operator = catalog.operators.find(operator => operator.sourceId === page.characterId)
    assert(operator, `PRTS operator missing: ${page.name}`)
    const actual = operator.slots.flat()
    for (const check of page.checks) assert(actual.some(stage => stage.buffId === check.buffId && JSON.stringify(stage.unlock) === JSON.stringify(check.unlock)), `PRTS stage missing: ${page.name}/${check.buffId}`)
  }
  assert(update.prtsRecycle?.revision > 0 && /^[a-f0-9]{64}$/.test(update.prtsRecycle.responseSha256 ?? ''), 'Recycle PRTS provenance missing')
  assert(update.mowerRecycle?.branch === 'alpha' && /^[a-f0-9]{40}$/.test(update.mowerRecycle.commit ?? '') && update.mowerRecycle.files?.length > 0, 'Mower recycle provenance missing')
  const ui = fs.readFileSync(path.join(root, 'agents/openai.yaml'), 'utf8')
  const fields = [...ui.matchAll(/^  (display_name|short_description|default_prompt): "([^"\n]+)"$/gm)]
  assert(fields.length === 3, 'openai.yaml must contain three quoted interface strings')
  const shortDescription = fields.find(field => field[1] === 'short_description')?.[2]
  assert(shortDescription.length >= 25 && shortDescription.length <= 64, 'openai.yaml short_description must contain 25..64 characters')
  assert(ui.includes(`$${metadata.name}`), 'openai.yaml default_prompt must mention the skill name')
  const manifest = packageManifest(root)
  if (verifyManifest) {
    const expected = json(root, manifestPath)
    assert(JSON.stringify(expected) === JSON.stringify(manifest), 'Package file list or SHA-256 differs from package-manifest.json')
  }
  return { valid: true, name: metadata.name, counts, relativeReferences: references, files: manifest.files.length,
    packageSha256: manifest.packageSha256, sourceCommit: source.commit, sourceVersion: source.sourceVersion }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    assert(args.every(arg => arg === '--write-manifest'), 'Usage: node scripts/validate.mjs [--write-manifest]')
    const result = validateSkill(skillRoot, { verifyManifest: !args.includes('--write-manifest') })
    if (args.includes('--write-manifest')) fs.writeFileSync(path.join(skillRoot, manifestPath), JSON.stringify(packageManifest(), null, 2) + '\n')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
