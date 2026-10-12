import fs from 'node:fs'

const catalog = JSON.parse(fs.readFileSync(new URL('../references/catalog.json', import.meta.url), 'utf8'))
const terms = JSON.parse(fs.readFileSync(new URL('../references/terms.json', import.meta.url), 'utf8')).terms
const args = process.argv.slice(2)
const rooms = new Set(catalog.operators.flatMap(operator => operator.slots.flat().map(skill => skill.roomType)))

function fail(message) {
  throw new Error(message)
}

function phaseOf(skill) {
  const match = /^PHASE_([012])$/.exec(skill.unlock?.phase)
  if (!match) fail(`技能 ${skill.buffId} 的解锁阶段无效。`)
  return Number(match[1])
}

function referencedTerms(skills) {
  const result = {}
  function visit(text) {
    for (const match of String(text ?? '').matchAll(/<\$([^>]+)>/g)) {
      const id = match[1]
      if (Object.hasOwn(result, id)) continue
      const term = terms[id]
      if (!term) fail(`缺少术语定义：${id}`)
      result[id] = term
      visit(term.description)
    }
  }
  for (const skill of skills) visit(skill.description)
  return result
}

function query() {
  if (args.includes('--help')) {
    console.log(`用法：node query.mjs [国服正式代号] [--phase 0|1|2 --level 1..90] [--room 设施代码] [--no-terms]
不带参数：输出资料版本和来源清单。
不指定 --phase：保留全部技能阶段供核对，不能将同槽各阶段叠加。
指定 --phase：每个槽先选最高已解锁版本，再按 --room 筛选；--level 默认 1。
--level 必须与 --phase 一起使用；按目录原始数据校验可晋升阶段和等级上限。
默认附带所选技能引用的术语定义；--no-terms 可省略。
设施代码：${[...rooms].sort().join(', ')}
结果不是心情、联动、实际效率或排班收益模拟。`)
    return
  }
  if (!args.length) {
    console.log(JSON.stringify(catalog.manifest, null, 2))
    return
  }
  const name = args[0]
  if (name.startsWith('--')) fail('请先提供国服正式代号；仅查看版本时不要带参数。')
  const operator = catalog.operators.find(operator => operator.name === name)
  if (!operator) fail(`未识别正式代号：${name}；请使用国服游戏内原名。`)

  let currentPhase = null
  let currentLevel = null
  let room = null
  let includeTerms = true
  const seen = new Set()
  for (let index = 1; index < args.length; index++) {
    const flag = args[index]
    if (!['--phase', '--level', '--room', '--no-terms'].includes(flag)) fail(`未知参数：${flag}`)
    if (seen.has(flag)) fail(`重复参数：${flag}`)
    seen.add(flag)
    if (flag === '--no-terms') {
      includeTerms = false
      continue
    }
    const value = args[++index]
    if (value === undefined || value.startsWith('--')) fail(`${flag} 缺少值。`)
    if (flag === '--room') {
      if (!rooms.has(value)) fail(`未知设施代码：${value}；用 --help 查看可用值。`)
      room = value
    } else {
      if (!/^\d+$/.test(value)) fail(`${flag} 必须是整数。`)
      const number = Number(value)
      if (flag === '--phase') {
        if (![0, 1, 2].includes(number)) fail('--phase 必须是 0、1 或 2。')
        currentPhase = number
      } else {
        if (number < 1 || number > 90) fail('--level 必须在 1..90 范围内。')
        currentLevel = number
      }
    }
  }
  if (currentLevel !== null && currentPhase === null) fail('--level 必须与 --phase 一起使用。')
  if (currentPhase !== null && currentLevel === null) currentLevel = 1
  if (currentPhase !== null) {
    const cap = operator.levelCaps?.[currentPhase]
    if (!Number.isInteger(cap)) fail(`${name} 无法达到精英阶段 ${currentPhase}；请核对实际练度。`)
    if (currentLevel > cap) fail(`${name} 精英阶段 ${currentPhase} 的等级上限是 ${cap}。`)
  }

  const slots = operator.slots.map(slot => {
    let selected = slot
    if (currentPhase !== null) {
      const unlocked = slot.filter(skill => {
        const phase = phaseOf(skill)
        return phase < currentPhase || (phase === currentPhase && skill.unlock.level <= currentLevel)
      })
      const highest = unlocked.reduce((best, skill) => {
        if (!best || phaseOf(skill) > phaseOf(best) ||
          (phaseOf(skill) === phaseOf(best) && skill.unlock.level > best.unlock.level)) return skill
        return best
      }, null)
      selected = highest ? [highest] : []
    }
    return room ? selected.filter(skill => skill.roomType === room) : selected
  })
  const result = {
    ...operator,
    slots,
    selection: {
      mode: currentPhase === null ? 'all-stages' : 'highest-unlocked-per-slot',
      phase: currentPhase,
      level: currentLevel,
      room,
      note: '按原始阶段与等级上限筛选技能解锁版本；全部阶段不可叠加。未计算心情、联动或排班收益。'
    },
    referencedTerms: includeTerms ? referencedTerms(slots.flat()) : {},
    sourceVersion: catalog.manifest.sourceVersion,
    sourceCommit: catalog.manifest.sourceCommit
  }
  console.log(JSON.stringify(result, null, 2))
}

try {
  query()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
