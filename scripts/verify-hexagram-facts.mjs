#!/usr/bin/env node
/**
 * 原文事实层校验器 — 卦内容流水线的「质量闸门」
 *
 * 用途：校验 AI/脚本从古籍提取出的 facts JSON（事实层），在进入演绎阶段前堵住
 *       漏爻、串爻、错位、卦序错乱、原文缺失等错误。与底本来源（PDF/TXT/OCR）无关。
 *
 * 跑法：  node scripts/verify-hexagram-facts.mjs
 *        npm run verify:facts
 *
 * 输入：  content/hexagrams/_facts/ 下的所有 *.json（每卦一个，见 03-zhun.facts.json）
 * 退出码：有 error → 1（CI/agent 可据此判断）；仅 warning 或全通过 → 0
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FACTS_DIR = join(ROOT, 'content', 'hexagrams', '_facts')

// 通行本 64 卦卦序→卦名（用于卦序错乱检测；别名以 warning 提示，不算 error）
const HEX_NAMES = {
  1: '乾',
  2: '坤',
  3: '屯',
  4: '蒙',
  5: '需',
  6: '讼',
  7: '师',
  8: '比',
  9: '小畜',
  10: '履',
  11: '泰',
  12: '否',
  13: '同人',
  14: '大有',
  15: '谦',
  16: '豫',
  17: '随',
  18: '蛊',
  19: '临',
  20: '观',
  21: '噬嗑',
  22: '贲',
  23: '剥',
  24: '复',
  25: '无妄',
  26: '大畜',
  27: '颐',
  28: '大过',
  29: '坎',
  30: '离',
  31: '咸',
  32: '恒',
  33: '遯',
  34: '大壮',
  35: '晋',
  36: '明夷',
  37: '家人',
  38: '睽',
  39: '蹇',
  40: '解',
  41: '损',
  42: '益',
  43: '夬',
  44: '姤',
  45: '萃',
  46: '升',
  47: '困',
  48: '井',
  49: '革',
  50: '鼎',
  51: '震',
  52: '艮',
  53: '渐',
  54: '归妹',
  55: '丰',
  56: '旅',
  57: '巽',
  58: '兑',
  59: '涣',
  60: '节',
  61: '中孚',
  62: '小过',
  63: '既济',
  64: '未济',
}

// 八经卦名 → 二进制（从上到下，1=阳 0=阴），用于交叉校验 trigrams 与 binary 是否自洽
const TRIGRAM_BIN = {
  乾: '111',
  兑: '011',
  离: '101',
  震: '001',
  巽: '110',
  坎: '010',
  艮: '100',
  坤: '000',
}

/**
 * 由 binary 反推 6 个标准爻题（杀手锏）。
 * binary 是「从上到下」：index 0 = 上爻 … index 5 = 初爻。
 * 阳爻(1)称「九」，阴爻(0)称「六」；初爻/上爻位置词在前，中四爻阴阳词在前。
 * 返回从下到上顺序：[初, 二, 三, 四, 五, 上]
 */
function expectedYaoNames(binary) {
  const mid = ['', '二', '三', '四', '五', '']
  const names = []
  for (let i = 0; i < 6; i++) {
    const bit = binary[5 - i] // 从下到上第 i 爻对应 binary 的第 (5-i) 位
    const yy = bit === '1' ? '九' : '六'
    if (i === 0) names.push('初' + yy)
    else if (i === 5) names.push('上' + yy)
    else names.push(yy + mid[i])
  }
  return names
}

const PLACEHOLDER = /待补|待填|TODO|占位|\?\?\?|^\s*$/

function isEmptyText(t) {
  return typeof t !== 'string' || !t.trim() || PLACEHOLDER.test(t.trim())
}

export function checkHexagramFacts(facts, file) {
  const errors = []
  const warnings = []
  const E = (m) => errors.push(m)
  const W = (m) => warnings.push(m)

  const n = facts.number
  if (!Number.isInteger(n) || n < 1 || n > 64) {
    E(`number 非法（应为 1-64）：${JSON.stringify(n)}`)
  }

  // 卦名 vs 通行本卦序
  const expectedName = HEX_NAMES[n]
  const gotName = facts?.name?.chinese
  if (!gotName) E('name.chinese 缺失')
  else if (expectedName && gotName !== expectedName) {
    E(`卦名与通行本卦序不一致：第 ${n} 卦应为「${expectedName}」，实为「${gotName}」`)
  }

  // binary 格式
  const binary = facts.binary
  if (typeof binary !== 'string' || !/^[01]{6}$/.test(binary)) {
    E(`binary 非法（应为 6 位 0/1）：${JSON.stringify(binary)}`)
    return { errors, warnings } // binary 不合法则后续爻题校验无意义
  }

  // trigrams 与 binary 自洽
  const up = facts?.trigrams?.upper
  const lo = facts?.trigrams?.lower
  if (!up || !TRIGRAM_BIN[up]) {
    E(`trigrams.upper 非法或缺失（应为乾/兑/离/震/巽/坎/艮/坤）：${JSON.stringify(up)}`)
  } else if (binary.slice(0, 3) !== TRIGRAM_BIN[up]) {
    E(`上卦「${up}」(${TRIGRAM_BIN[up]}) 与 binary 前三位 ${binary.slice(0, 3)} 不符`)
  }
  if (!lo || !TRIGRAM_BIN[lo]) {
    E(`trigrams.lower 非法或缺失（应为乾/兑/离/震/巽/坎/艮/坤）：${JSON.stringify(lo)}`)
  } else if (binary.slice(3, 6) !== TRIGRAM_BIN[lo]) {
    E(`下卦「${lo}」(${TRIGRAM_BIN[lo]}) 与 binary 后三位 ${binary.slice(3, 6)} 不符`)
  }

  // 原文非空
  if (isEmptyText(facts?.judgment?.text)) E('judgment.text（卦辞原文）缺失或为占位')
  if (isEmptyText(facts?.image?.text)) E('image.text（大象传原文）缺失或为占位')

  // 六爻：数量 + 爻题（由 binary 反推）+ 顺序 + 原文非空
  const yao = Array.isArray(facts.yao) ? facts.yao : []
  const expected = expectedYaoNames(binary)
  const isQianKun = binary === '111111' || binary === '000000'
  const expectCount = isQianKun ? [6, 7] : [6] // 乾坤可多一条「用九/用六」

  if (!expectCount.includes(yao.length)) {
    E(`六爻数量应为 ${expectCount.join(' 或 ')}，实为 ${yao.length}`)
  }

  for (let i = 0; i < 6; i++) {
    const y = yao[i]
    if (!y) {
      E(`缺第 ${i + 1} 爻（应为「${expected[i]}」）`)
      continue
    }
    if (y.name !== expected[i]) {
      E(`第 ${i + 1} 爻爻题错位：应为「${expected[i]}」，实为「${y.name ?? '空'}」`)
    }
    if (y.position != null && y.position !== i + 1) {
      W(`第 ${i + 1} 爻 position 应为 ${i + 1}，实为 ${y.position}`)
    }
    if (isEmptyText(y.text)) E(`第 ${i + 1} 爻（${expected[i]}）爻辞原文缺失或为占位`)
  }

  // 乾坤的第 7 条须是「用九/用六」
  if (yao.length === 7) {
    const tail = yao[6]?.name
    const want = binary === '111111' ? '用九' : '用六'
    if (tail !== want) E(`第 7 条应为「${want}」，实为「${tail ?? '空'}」`)
  }

  return { errors, warnings }
}

function main() {
  if (!existsSync(FACTS_DIR)) {
    console.error(`✗ 未找到事实层目录：${FACTS_DIR}`)
    console.error(
      '  请先让提取流程把 facts JSON 输出到该目录（参考 docs/AI-AUTHORING-PLAYBOOK.md）',
    )
    process.exit(1)
  }

  const files = readdirSync(FACTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
  if (files.length === 0) {
    console.error(`✗ ${FACTS_DIR} 下没有任何 .json`)
    process.exit(1)
  }

  let totalErrors = 0
  let totalWarnings = 0
  const seen = new Set()

  console.log(`\n校验 ${files.length} 个 facts 文件 …\n`)

  for (const file of files) {
    let facts
    try {
      facts = JSON.parse(readFileSync(join(FACTS_DIR, file), 'utf8'))
    } catch (e) {
      console.log(`✗ ${file}  JSON 解析失败：${e.message}`)
      totalErrors++
      continue
    }

    if (seen.has(facts.number)) {
      console.log(`✗ ${file}  卦序重复：number=${facts.number} 已出现过`)
      totalErrors++
    }
    seen.add(facts.number)

    const { errors, warnings } = checkHexagramFacts(facts, file)
    totalErrors += errors.length
    totalWarnings += warnings.length

    const tag = `[${String(facts.number).padStart(2, '0')} ${facts?.name?.chinese ?? '?'}]`
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✓ ${file}  ${tag}  通过`)
    } else {
      console.log(`${errors.length ? '✗' : '⚠'} ${file}  ${tag}`)
      for (const m of errors) console.log(`    ✗ ${m}`)
      for (const m of warnings) console.log(`    ⚠ ${m}`)
    }
  }

  // 进度：还缺哪些卦
  const missing = []
  for (let i = 1; i <= 64; i++) if (!seen.has(i)) missing.push(i)

  console.log('\n──────────── 汇总 ────────────')
  console.log(`已提取卦数：${seen.size}/64`)
  if (missing.length) console.log(`未提取卦序：${missing.join(', ')}`)
  console.log(`错误 ${totalErrors} 个，警告 ${totalWarnings} 个`)
  console.log(
    totalErrors === 0 ? '✓ 闸门通过（可进入演绎阶段）\n' : '✗ 闸门未通过，请先修正上述错误\n',
  )

  process.exit(totalErrors === 0 ? 0 : 1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
