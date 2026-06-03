# AI 批量编纂 64 卦内容 · 操作手册（Playbook）

> 本手册解决「**如何用 AI 把古籍整理成符合 `Hexagram` 结构的卦内容**」。
>
> 配合阅读：
>
> - `docs/CONTENT-GUIDE.md` —— 字段规范、字数、文风、引号规则（**什么是好内容**）
> - `lib/types.ts` —— `Hexagram` 类型定义（**结构的唯一真相来源**）
> - `content/hexagrams/01-qian.ts` —— 黄金质量样板（**深度与风格标杆**）

---

## 0. 核心原则：事实层 / 演绎层 分离

整条流水线的命门，也是防 AI 幻觉的关键——**把每卦拆成两层，分别用不同方式产出**：

| 层                     | 字段                                                                                                                                           | 谁来产出                                | 铁律                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| **事实层**（客观唯一） | `number` `name` `trigrams` `binary`、`judgment.text`、`image.text`、每爻 `text`、`classicalCommentary`（程颐/朱熹/王弼**原文**）               | **人工从权威底本转录**，AI 仅转录不创作 | 卦辞爻辞**绝不能让生成式 AI 凭空写**，它一定会编造 |
| **演绎层**（主观创作） | 所有 `modernReading` `scenario` `actionable` `indicators`、`features` `keywords` `themes` `appliesWhen` `antiPatterns` `parallels` `relations` | **AI 主战场**                           | 必须符合义理派 + 结构化 + 跨文化三铁律             |

一句话：**先用可信古籍把「事实卡」填好喂进去，AI 只负责把它翻译成现代决策语言并找对照案例。** 这样 AI 不可能伪造爻辞，质量下限被锁死。

### 事实层权威底本（告诉负责转录的人/AI 用这些，别用来路不明的网络文本）

- 原文（卦辞/爻辞/彖/象）：黄寿祺·张善文《周易译注》（中华书局），或《周易正义》（王弼注·孔颖达疏）
- 义理注疏：程颐《伊川易传》、朱熹《周易本义》、王弼《周易注》
- 在线校对：中国哲学书电子化计划 ctext.org 的《周易》

---

## 1. 模板

### 1.1 输入：单卦「事实卡」模板（人工填，逐卦一张）

```text
【卦 NN 事实卡】（所有原文以权威底本核对，缺失处标 [待补]，不要猜）
number:           （1-64，通行本卦序）
name:             中文 / pinyin / English
trigrams:         上卦＝?（卦象，如 艮/山）   下卦＝?（如 坎/水）
binary:           6 位，从上到下，1阳0阴（= 上卦三爻从上到下 + 下卦三爻从上到下，见 1.4）
卦辞原文:
大象传原文:
六爻爻辞原文:
  初_:
  __二:
  __三:
  __四:
  __五:
  上_:
义理注疏原文(可选，能找到就附):
  程颐:
  朱熹:
  王弼:
卦序关系(可选): 综卦/错卦/互卦/序卦 的目标卦号
```

### 1.2 输出：AI 必须产出的 TS 文件骨架

```typescript
import type { Hexagram } from '@/lib/types'

/**
 * 第 N 卦 · X · 一句话情境原型
 */
export const pinyin: Hexagram = {
  number: 0,
  name: { chinese: '', pinyin: '', english: '' },
  trigrams: { upper: '', lower: '' },
  binary: '',
  judgment: { text: '', modernReading: '' },
  image: { text: '', modernReading: '' },
  classicalCommentary: { chengYi: '', zhuXi: '' },
  features: { archetype: '', phase: '', scale: '', power: '', agency: '', risk: '' },
  keywords: [],
  themes: [],
  appliesWhen: [],
  antiPatterns: [],
  yao: [
    /* 6 爻，每爻：position / name / text / modernReading / scenario / actionable[] / indicators[] */
  ],
  parallels: { westernPhilosophy: [], modernCases: [], literature: [] },
  relations: [],
}
```

### 1.3 `features` 枚举速查（AI 最易出错，必须封闭选择，全小写英文）

```text
archetype: creating|sustaining|transforming|dissolving|waiting|advancing|retreating|conflicting|uniting|separating|learning|leading
phase:     germinal|emerging|developing|peak|declining|ending
scale:     personal|interpersonal|team|organizational|societal
power:     dominant|advantaged|balanced|disadvantaged|subordinate
agency:    active|responsive|patient|submissive
risk:      low|moderate|high|existential
modernCases.domain:  business|politics|culture|science|personal
modernCases.outcome: success|failure|mixed
relations.type:      complementary|inverse|nuclear|sequence
```

### 1.4 `binary` 怎么算（易错点，务必看）

规则：**6 位，从上到下，1=阳 0=阴**。即按 `上六 → 九五 → 六四 → 六三 → 六二 → 初九` 的顺序写出每爻阴阳。
等价做法：`binary = 上卦三爻(从上到下) + 下卦三爻(从上到下)`。

八经卦速查（从上到下）：

```text
乾 ☰ = 111      巽 ☴ = 110
兑 ☱ = 011      坎 ☵ = 010
离 ☲ = 101      艮 ☶ = 100
震 ☳ = 001      坤 ☷ = 000
```

验证：

- 屯（上坎下震）＝ `010` + `001` ＝ `010001` ✓（与 `03-zhun.ts` 一致）
- 蒙（上艮下坎）＝ `100` + `010` ＝ `100010`

---

## 2. 工作流（4 步流水线）

```text
第1步【人工·准备事实卡】 从底本转录 → 填好 1.1 的「事实卡」。不用生成式 AI 创作原文；可用 AI 做 OCR/排版，但必须人工核对。
第2步【AI·产出演绎层】   事实卡 + 乾卦样例 + 提示词A(System) → 输出完整 NN-拼音.ts
第3步【AI·审稿】         用提示词C 让另一个会话逐项查：原文准确 / 枚举合法 / 无幻觉案例 / 字数 / 引号
第4步【工程·入库】       存为 content/hexagrams/NN-拼音.ts → 在 index.ts import 并加入 ALL_HEXAGRAMS → 跑 npm run typecheck 兜底
```

> 建议**每次只做 1 卦**，跑通 `typecheck` 再做下一卦；不要让 AI 一次吐 64 卦（必然降质且难校验）。

---

## 3. 提示词（三个，可直接复制）

### 3.1 提示词 A — System Prompt（设定角色，每次都带）

```text
你是《易经决策框架》项目的内容编纂专家。本产品把 64 卦当作「情境原型 / 决策模式语言」，坚决反对占卜化、神秘化。你的任务：根据我给的【某卦事实卡】，产出一个严格符合 TypeScript `Hexagram` 类型的内容对象。

# 三条铁律
1. 义理派：卦是「情境模式」不是「天意指示」。禁止「天命/注定/命中/预测未来/大吉大凶」等占卜或宿命措辞。
2. 结构化：features 六维必须从给定枚举精确选取，不得自创、不得大写。
3. 跨文化锚点：必须有西方哲学 + 真实现代案例 + 文学影视对照，去神秘化。

# 事实层 vs 你的职责
- 事实卡里的原文（卦名/卦象/binary/卦辞/象辞/六爻爻辞/注疏）是客观事实，必须原样使用，禁止改写或杜撰。缺失项标 [待补]，绝不自己编爻辞。
- 你只负责演绎层：所有 modernReading / scenario / actionable / indicators / features / keywords / themes / appliesWhen / antiPatterns / parallels / relations。

# 防幻觉（针对 modernCases）
- 必须是真实、可核查的人物/公司/事件，注明结局，且至少包含 1 个非 success（failure 或 mixed）。
- 宁缺毋滥：不确定真实性的案例不要写；不要虚构估值、年份等数字。

# features 枚举（只能从中选，全小写英文）
archetype: creating|sustaining|transforming|dissolving|waiting|advancing|retreating|conflicting|uniting|separating|learning|leading
phase: germinal|emerging|developing|peak|declining|ending
scale: personal|interpersonal|team|organizational|societal
power: dominant|advantaged|balanced|disadvantaged|subordinate
agency: active|responsive|patient|submissive
risk: low|moderate|high|existential
modernCases.domain: business|politics|culture|science|personal
modernCases.outcome: success|failure|mixed
relations.type: complementary|inverse|nuclear|sequence

# 文风
克制（不煽情/不说教/不用感叹号）；具体（不说「要谨慎」，要说「决策前给自己 48 小时冷静期」）；可证伪（不写「怎么理解都对」的万能句）；有方向（明确说做什么/不做什么）；古文必翻译、术语必解释。

# 数量/字数
judgment.modernReading 200-400字；image.modernReading 100-200字；每爻 modernReading 150-300字、actionable 3-5条、indicators 3-5条；keywords≥10；themes≥4；appliesWhen≥3；antiPatterns≥2；parallels：≥1西哲 + ≥2现代案例 + ≥1文学。

# 输出格式（极重要）
- 只输出一个完整 TS 文件，可直接存为 content/hexagrams/NN-拼音.ts：首行 import type { Hexagram } from '@/lib/types'，然后 export const 拼音: Hexagram = { ... }。
- 引号规范：TS 字符串一律用单引号 ' ' 包裹；字符串内部需要引号时一律用中文方头括号「」；绝对禁止字符串内出现英文双引号 " 或与外层相同的单引号（会破坏语法）。
- binary 规则：6 位，从上到下，1阳0阴；直接用事实卡给的值。
- 不要输出任何解释文字，只输出代码。

# 质量标杆
下方附上已完成的第一卦「乾」作为深度与风格样例，请达到同等水平，但不要照抄它的案例与措辞。
<<在这里粘贴 content/hexagrams/01-qian.ts 的完整内容>>
```

### 3.2 提示词 B — User Prompt 模板（每卦换事实卡，附蒙卦示例）

```text
请为以下卦产出完整的 Hexagram 内容对象，严格遵守 System 的全部规则。

【事实卡】
number: 4
name: 蒙 / méng / Youthful Folly
trigrams: 上卦＝艮(山)  下卦＝坎(水)
binary: 100010
卦辞原文: 蒙：亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。
大象传原文: 山下出泉，蒙。君子以果行育德。
六爻爻辞原文:
  初六: 发蒙，利用刑人，用说桎梏，以往吝。
  九二: 包蒙吉，纳妇吉，子克家。
  六三: 勿用取女，见金夫，不有躬，无攸利。
  六四: 困蒙，吝。
  六五: 童蒙，吉。
  上九: 击蒙，不利为寇，利御寇。
义理注疏原文: [待补]
（以上原文请负责人用底本再核一遍；演绎层完全由你创作）

输出：04-meng.ts 的完整内容，只输出代码。
```

### 3.3 提示词 C — 审稿 Prompt（第 3 步质检）

```text
你是该项目的内容审校。对照清单逐项检查下面这份卦内容，每项给「✓ / ✗ + 问题」，最后给「通过 / 打回」结论：

1. 原文准确：卦辞、象辞、六爻爻辞是否与权威底本一致？有无错字/杜撰/漏爻？
2. 义理派合规：有无「天命/注定/预测/大吉大凶」等占卜化措辞？
3. features：六维是否都来自合法枚举（全小写）？binary 是否 6 位、从上到下、与卦象一致？
4. 防幻觉：modernCases 是否真实可核查？有无虚构人物/数字？是否至少 1 个非 success 结局？
5. 数量字数：keywords≥10、themes≥4、appliesWhen≥3、antiPatterns≥2、6 爻齐全、各字数达标？
6. 文风：是否克制/具体/可证伪/有方向？古文是否都翻译、术语是否都解释？
7. 引号：字符串内有无英文双引号 " 破坏语法？内嵌引号是否统一用「」？
8. 结构：字段是否齐全、能否通过 TypeScript typecheck？

【待审内容】
<<粘贴 AI 产出的 NN-拼音.ts>>
```

---

## 4. 入库 Checklist（第 4 步）

- [ ] 文件名 `content/hexagrams/NN-拼音.ts`（如 `04-meng.ts`），`NN` 为两位卦序
- [ ] 首行 `import type { Hexagram } from '@/lib/types'`
- [ ] `export const 拼音: Hexagram = { ... }`
- [ ] 在 `content/hexagrams/index.ts` 中 `import` 并加入 `ALL_HEXAGRAMS`
- [ ] 运行 `npm run typecheck` 通过（字段齐全、枚举合法）
- [ ] 运行 `npm run format` 统一格式
- [ ] 抽查渲染：`npm run dev` 打开该卦详情页确认显示正常

---

## 5. 原文提取自动化（给 Codex 类 agent 跑）

第 1 步「准备事实卡」可以半自动化：给 agent 一本底本（PDF/TXT），让它抽取每卦的 `facts` JSON，再用校验脚本当闸门。

> **关键：这是「从你给的底本里抽取」，不是「让 AI 凭记忆生成」——前者可靠，后者必编造爻辞。**

### 5.1 中间格式 `facts` JSON

提取产物先落成 `content/hexagrams/_facts/NN-拼音.facts.json`，字段对齐 `Hexagram` 的事实层（样例见 `content/hexagrams/_facts/03-zhun.facts.json`）：

```json
{
  "number": 3,
  "name": { "chinese": "屯", "pinyin": "zhūn", "english": "" },
  "trigrams": { "upper": "坎", "lower": "震" },
  "binary": "010001",
  "judgment": { "text": "卦辞原文" },
  "image": { "text": "大象传原文" },
  "yao": [{ "position": 1, "name": "初九", "text": "爻辞原文" }],
  "classicalCommentary": { "chengYi": "", "zhuXi": "", "wangBi": "" }
}
```

### 5.2 质量闸门

```bash
npm run verify:facts
```

校验内容：卦序不乱/不重复、`binary` 合法且与卦象自洽、**由 binary 反推 6 个标准爻题并逐爻比对（抓漏爻/串爻/爻题错位）**、原文非空非占位（标了「待补」会报错）、并汇报「已提取 N/64 + 还缺哪些卦序」。**有错退出码 = 1**，agent 应据此自修后重跑，直到全绿才轮到你审核。

### 5.3 给 agent 的提取指令（直接复制给 Codex）

```text
角色：你是古籍原文抽取器。任务：从我提供的《周易》底本中，逐卦抽取「事实层」原文，输出为 facts JSON。

# 输入探测（先做）
1. 列出 source/ 下的文件，判断类型：
   - .txt 或可复制文字的 PDF → 直接读取文本
   - 扫描/影印的图片 PDF → 先 OCR（优先支持中文竖排繁体的 OCR，如 PaddleOCR），OCR 结果存疑处标注
2. 文本层 PDF 转文本用 pdftotext（poppler）或 pdf-parse；不要凭书名臆测内容。

# 抽取铁律（最重要）
- 逐字照搬底本，禁止：修正你认为的错别字、补全缺字、繁简转换、改动或增删标点。
- 底本缺失/模糊处，对应字段填 "待补"（校验脚本会标红），绝不自行编造爻辞。
- 只抽事实层：卦名、上下卦、卦辞、大象传、六爻爻辞、（有则）程颐/朱熹/王弼注疏原文。不要写任何现代释读。

# 切分规则（《周易》结构高度规律）
- 每卦顺序：卦名 → 卦辞 → 彖传 → 大象传（象曰…）→ 六爻（爻题+爻辞，可能跟小象「象曰」）→（仅乾坤）用九/用六、文言。
- facts 只取：卦辞、大象传、六爻爻辞；彖传/小象/文言不进 facts（除非另行要求）。
- 爻题固定：初九/九二/九三/九四/九五/上九（阳）或 初六/六二/六三/六四/六五/上六（阴）。

# binary 怎么填
- 6 位，从上到下，1=阳 0=阴 = 上卦三爻(从上到下) + 下卦三爻(从上到下)。
- 八卦：乾111 兑011 离101 震001 巽110 坎010 艮100 坤000。例：屯=上坎下震=010+001=010001。

# 输出与闭环
1. 每卦写一个文件 content/hexagrams/_facts/NN-拼音.facts.json（格式见 _facts/03-zhun.facts.json）。
2. 每完成一批（建议 8 卦）运行 npm run verify:facts。
3. 把报告里的错误自行修正并重跑，直到该批全绿。
4. 然后停下，汇报「本批已通过 + 哪些字段填了待补需人工补」，等我确认再继续下一批。
```

### 5.4 你的审核闸口

每批全绿后 agent 停下等你。重点抽查两类：① 标了 `待补` 的字段（底本缺或 OCR 没认出，需你补原文）；② 校验脚本查不出的「字对了但选错异文版本」。确认后让 agent 继续下一批，直到 64 卦齐，再进入第 2 步（演绎层）。
