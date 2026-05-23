/**
 * 情境特征抽取器（规则版）
 *
 * 输入：用户的自然语言情境描述
 * 输出：结构化的 SituationDimension（部分填充）+ 关键词列表
 *
 * 设计原则：
 * - 规则版 ≠ 简陋。基于精心设计的中文模式词典，召回率比初看上去高
 * - 输出"部分填充"——拿不准的字段不填，避免假阳性
 * - 留 LLM hook：如果配置了 API key，可以替换为 LLM 抽取
 */

import type { Archetype, Phase, Scale, Power, Agency, Risk, SituationDimension } from './types'

// ============================================================
// 模式词典 — 维度判断
// ============================================================

const ARCHETYPE_PATTERNS: Record<Archetype, RegExp[]> = {
  creating: [
    /创业|创立|新项目|新公司|从零|起步|刚开始|初创|草创|创建|建立|搭建/,
    /启动|发起|开办|筹办|开张|开店|首发/,
  ],
  sustaining: [/维持|保持|延续|守住|稳定|常态|继续|不变/, /日常|按部就班|惯例|平稳/],
  transforming: [
    /转变|转型|改革|变革|重塑|重构|迭代|升级|蜕变|进化/,
    /换工作|换方向|转行|换跑道|转身/,
  ],
  dissolving: [/结束|解散|停止|终止|关闭|退出|关门|了结|告终/, /分手|离婚|离职|撤资|清算|关停/],
  waiting: [/等待|观望|按兵不动|静观|憋|耐心|时机未到|还没到|不急/, /蛰伏|潜伏|养精蓄锐|韬光养晦/],
  advancing: [
    /推进|前进|加速|扩张|做大|放量|拓展|进攻|出击|加码/,
    /冲刺|加速|all in|全力以赴|大干一场/,
  ],
  retreating: [/撤退|后撤|收缩|放弃|退让|放手|抽身|脱身/, /辞职|离开|裸辞|跳槽前|撤离/],
  conflicting: [
    /冲突|对抗|争执|争吵|分歧|对立|矛盾|纠纷|官司|诉讼|撕|互怼/,
    /翻脸|闹翻|不合|对峙|针锋相对/,
  ],
  uniting: [/合伙|联合|结盟|合作|抱团|联手|搭伙|组队|同盟/, /并购|入股|投资|加入|集结/],
  separating: [/分离|独立|分开|划清|脱离|出走|单干|分家/, /拆分|剥离|拆伙|分道扬镳/],
  learning: [/学习|入门|新手|不懂|不会|请教|拜师|进修|深造/, /被指导|带教|职场新人|初学/],
  leading: [/带团队|管理|领导|指挥|带人|当头|做主|拍板|负责/, /上任|接班|做老板|做CEO|执掌/],
}

const PHASE_PATTERNS: Record<Phase, RegExp[]> = {
  germinal: [/还没开始|准备阶段|想做但|计划中|酝酿|刚有想法|脑子里|考虑做/],
  emerging: [/刚开始|初期|起步|刚启动|新近|前几个月|这几周/],
  developing: [/正在做|进行中|半路|中途|进展中|做了一段|展开/],
  peak: [/巅峰|顶峰|鼎盛|最好的时候|最强|最大|爆发期|高光/],
  declining: [/下滑|衰退|不如以前|颓势|走下坡|动力不足|疲软|往下/],
  ending: [/快结束|尾声|要散|要结束|临近终点|最后阶段|收尾/],
}

const SCALE_PATTERNS: Record<Scale, RegExp[]> = {
  personal: [/我自己|内心|个人|私下|独自|一个人/],
  interpersonal: [/我和他|我们俩|两个人|朋友之间|伴侣|搭档/],
  team: [/团队|小组|几个人|合伙人|创始团队|班底/],
  organizational: [/公司|组织|部门|集团|企业|机构/],
  societal: [/社会|行业|国家|时代|公众|大众/],
}

const POWER_PATTERNS: Record<Power, RegExp[]> = {
  dominant: [/我说了算|主导|掌舵|拍板|决定权在我/],
  advantaged: [/占优|领先|强势|有筹码|主动权/],
  balanced: [/旗鼓相当|势均力敌|对等|平等|不相上下/],
  disadvantaged: [/弱势|劣势|被动|没筹码|话语权小|矮一截/],
  subordinate: [/下属|执行|听话|被领导|从属|跟随/],
}

const AGENCY_PATTERNS: Record<Agency, RegExp[]> = {
  active: [/主动|出击|进攻|发起|抢先|先发制人/],
  responsive: [/见招拆招|因势而动|跟进|响应|应对/],
  patient: [/耐心|等|静待|不急|沉住气|憋住/],
  submissive: [/听话|顺从|配合|按要求|不违抗|顺势/],
}

const RISK_PATTERNS: Record<Risk, RegExp[]> = {
  low: [/小事|小问题|不痛不痒|无伤大雅|低风险/],
  moderate: [/有风险|要谨慎|权衡|代价|得失/],
  high: [/重大决定|高风险|搏一把|输不起|押上/],
  existential: [/生死存亡|关乎一切|全部身家|破产|散伙|致命/],
}

// ============================================================
// 抽取主函数
// ============================================================

export type ExtractedFeatures = {
  features: Partial<SituationDimension>
  keywords: string[]
  evidence: Record<string, string[]> // 每个维度的命中证据
}

function findFirstMatch<T extends string>(
  text: string,
  patterns: Record<T, RegExp[]>,
): { value: T; matched: string } | null {
  for (const key of Object.keys(patterns) as T[]) {
    for (const re of patterns[key]) {
      const m = text.match(re)
      if (m) return { value: key, matched: m[0] }
    }
  }
  return null
}

/**
 * 从用户输入中抽取所有关键词（命中任一模式词典的中文片段）
 */
function extractKeywords(text: string): string[] {
  const found = new Set<string>()
  const allDicts = [
    ARCHETYPE_PATTERNS,
    PHASE_PATTERNS,
    SCALE_PATTERNS,
    POWER_PATTERNS,
    AGENCY_PATTERNS,
    RISK_PATTERNS,
  ]
  for (const dict of allDicts) {
    for (const patterns of Object.values(dict) as RegExp[][]) {
      for (const re of patterns) {
        const m = text.match(re)
        if (m) found.add(m[0])
      }
    }
  }
  return Array.from(found)
}

/**
 * 主抽取函数
 */
export function extractFeatures(situation: string): ExtractedFeatures {
  const features: Partial<SituationDimension> = {}
  const evidence: Record<string, string[]> = {}

  const archetype = findFirstMatch(situation, ARCHETYPE_PATTERNS)
  if (archetype) {
    features.archetype = archetype.value
    evidence.archetype = [archetype.matched]
  }

  const phase = findFirstMatch(situation, PHASE_PATTERNS)
  if (phase) {
    features.phase = phase.value
    evidence.phase = [phase.matched]
  }

  const scale = findFirstMatch(situation, SCALE_PATTERNS)
  if (scale) {
    features.scale = scale.value
    evidence.scale = [scale.matched]
  }

  const power = findFirstMatch(situation, POWER_PATTERNS)
  if (power) {
    features.power = power.value
    evidence.power = [power.matched]
  }

  const agency = findFirstMatch(situation, AGENCY_PATTERNS)
  if (agency) {
    features.agency = agency.value
    evidence.agency = [agency.matched]
  }

  const risk = findFirstMatch(situation, RISK_PATTERNS)
  if (risk) {
    features.risk = risk.value
    evidence.risk = [risk.matched]
  }

  return {
    features,
    keywords: extractKeywords(situation),
    evidence,
  }
}
