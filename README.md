# 太极 · 易经决策框架

> 把 64 卦当作情境原型，不当占卜符号。

## 这是什么

一个基于易经义理派传统的**情境分析工具**。你描述一个决策或局面，系统把它映射到最贴近的卦象，给出：

- 该情境的典型动力学（卦辞 + 象传的现代释读）
- 你可能处于的阶段（六爻 = 6 个 phase）
- 可执行的建议
- 跨文化参照（西方哲学 + 现代商业案例 + 文学影视）

**不预测未来，只识别现在。同样输入永远给同样输出。**

## 立场

- **义理派**（王弼、程颐、朱熹）：易经是哲学，不是巫术
- **祛魅但不取消**：尊重原典，拒绝神秘化
- **确定性映射**：不引入随机性，不模拟"起卦"

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000，输入你的情境。

## 项目结构

```
taiji/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 主页（输入 + 结果）
│   ├── layout.tsx          # 布局
│   ├── globals.css         # Tailwind 4 + 自定义主题
│   └── api/consult/        # 匹配 API
├── components/             # React 组件
│   ├── HexagramSymbol.tsx  # 卦象符号渲染
│   └── MatchCard.tsx       # 匹配结果卡片
├── content/hexagrams/      # 64 卦内容（当前 3/64）
│   ├── 01-qian.ts          # 乾
│   ├── 02-kun.ts           # 坤
│   ├── 03-zhun.ts          # 屯
│   └── index.ts            # 汇总导出
├── lib/                    # 核心逻辑
│   ├── types.ts            # 类型定义（Hexagram schema）
│   ├── feature-extractor.ts # 情境特征抽取（规则版）
│   └── matcher.ts          # 匹配引擎
└── docs/
    └── CONTENT-GUIDE.md    # 内容编写规范
```

## 技术栈

- **Next.js 15** + React 19 + TypeScript
- **Tailwind CSS 4**（CSS-first 配置）
- **匹配引擎**：规则 + 关键词 + bigram 语义（预留 LLM hook）
- 无外部 API 依赖，纯本地运行

## 下一步

- [ ] 补全 64 卦内容（最重要，见 `docs/CONTENT-GUIDE.md`）
- [ ] 接入 LLM 做特征抽取（提升匹配精度）
- [ ] 爻位定位问卷（identify which phase）
- [ ] 历史记录 + 回访验证（「征」模块）
- [ ] 双语（中 + English）
- [ ] 移动端适配

## License

MIT
