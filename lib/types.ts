/**
 * 易经决策框架 — 类型定义
 *
 * 设计原则：
 * 1. 义理派立场：把卦当作情境原型，不当占卜符号
 * 2. 结构化优先：所有判断维度可机器索引，便于匹配
 * 3. 跨文化锚点强制：每卦必须有西方哲学/现代案例对照，避免国学神秘化
 */

// ============================================================
// 情境维度 — 用于匹配引擎
// ============================================================

/** 情境的基本类型 */
export type Archetype =
  | 'creating' // 创建新事物
  | 'sustaining' // 维持已有
  | 'transforming' // 转变重塑
  | 'dissolving' // 消解结束
  | 'waiting' // 等待时机
  | 'advancing' // 主动推进
  | 'retreating' // 策略撤退
  | 'conflicting' // 冲突对抗
  | 'uniting' // 联合协作
  | 'separating' // 分离独立
  | 'learning' // 学习成长
  | 'leading' // 领导组织

/** 情境所处阶段 */
export type Phase =
  | 'germinal' // 萌芽（尚未明朗）
  | 'emerging' // 初现（刚开始）
  | 'developing' // 发展（在路上）
  | 'peak' // 顶峰（鼎盛）
  | 'declining' // 衰退（下行）
  | 'ending' // 终结（结束转换）

/** 情境规模 */
export type Scale =
  | 'personal' // 个人内部
  | 'interpersonal' // 人际（1对1）
  | 'team' // 小团队
  | 'organizational' // 组织
  | 'societal' // 社会

/** 力量对比 */
export type Power =
  | 'dominant' // 主导
  | 'advantaged' // 占优
  | 'balanced' // 均衡
  | 'disadvantaged' // 弱势
  | 'subordinate' // 从属

/** 应对方式 */
export type Agency =
  | 'active' // 主动出击
  | 'responsive' // 因势而动
  | 'patient' // 静待时机
  | 'submissive' // 顺从配合

/** 风险等级 */
export type Risk = 'low' | 'moderate' | 'high' | 'existential'

export type SituationDimension = {
  archetype: Archetype
  phase: Phase
  scale: Scale
  power: Power
  agency: Agency
  risk: Risk
}

// ============================================================
// 卦的内容结构
// ============================================================

/** 一爻（六爻之一） */
export type Yao = {
  /** 1=初, 2-5=中间, 6=上 */
  position: 1 | 2 | 3 | 4 | 5 | 6
  /** 爻名，如 "初九"、"六二" */
  name: string
  /** 原文爻辞 */
  text: string
  /** 现代释读 */
  modernReading: string
  /** 典型现代场景 */
  scenario: string
  /** 可执行建议 */
  actionable: string[]
  /** 表明用户正处于此爻的现象（用于 phase identification） */
  indicators: string[]
}

/** 跨文化锚点 */
export type CrossCulturalParallel = {
  westernPhilosophy?: {
    thinker: string
    concept: string
    note: string
  }[]
  modernCases?: {
    name: string
    domain: 'business' | 'politics' | 'culture' | 'science' | 'personal'
    outcome: 'success' | 'failure' | 'mixed'
    note: string
  }[]
  literature?: {
    title: string
    author?: string
    note: string
  }[]
}

/** 一卦的完整内容 */
export type Hexagram = {
  /** 卦序 1-64 */
  number: number
  name: {
    chinese: string
    pinyin: string
    english: string
  }
  /** 上下卦象（八经卦） */
  trigrams: {
    upper: string // 例: "乾"
    lower: string // 例: "坤"
  }
  /** 卦象的二进制表示，6 位，从下到上，1=阳 0=阴。例如乾="111111"，坤="000000" */
  binary: string

  // 经文
  judgment: {
    /** 卦辞原文 */
    text: string
    /** 现代释读 */
    modernReading: string
  }
  image: {
    /** 大象传原文 */
    text: string
    /** 现代释读 */
    modernReading: string
  }

  /** 义理派注释（可选） */
  classicalCommentary?: {
    /** 程颐《伊川易传》 */
    chengYi?: string
    /** 朱熹《周易本义》 */
    zhuXi?: string
    /** 王弼《周易注》 */
    wangBi?: string
  }

  // 结构化情境特征（用于匹配）
  features: SituationDimension

  /** 关键词（用于关键词匹配，中文 phrases） */
  keywords: string[]
  /** 主题标签 */
  themes: string[]

  /** 此卦适用于何种情境（自然语言描述，会被作为匹配的语义锚点） */
  appliesWhen: string[]

  /** 反模式：常见的对此卦的误解 */
  antiPatterns: string[]

  // 6 爻
  yao: Yao[]

  // 跨文化锚点
  parallels: CrossCulturalParallel
}

// ============================================================
// 匹配结果
// ============================================================

export type MatchScore = {
  /** 总得分 0-1 */
  total: number
  /** 关键词匹配得分 */
  keyword: number
  /** 特征匹配得分 */
  feature: number
  /** 主题匹配得分 */
  theme: number
}

export type MatchResult = {
  hexagram: Hexagram
  score: MatchScore
  /** 匹配理由（人类可读） */
  reasoning: string[]
}

export type ConsultRequest = {
  situation: string
  /** 可选：预先指定的特征（如果 LLM 已经抽取过） */
  features?: Partial<SituationDimension>
}

export type ConsultResponse = {
  matches: MatchResult[]
  extractedFeatures: Partial<SituationDimension>
  extractedKeywords: string[]
}
