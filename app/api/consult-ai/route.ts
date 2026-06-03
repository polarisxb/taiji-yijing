import { consultAI, streamInterpretation } from '@/lib/ai/consult-agent'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

const DEFAULT_RATE_LIMIT = 20
const DEFAULT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

function envPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return forwarded || realIp || 'anonymous'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.situation || typeof body.situation !== 'string') {
      return Response.json({ error: '请提供 situation 字段' }, { status: 400 })
    }
    if (body.situation.length > 2000) {
      return Response.json({ error: '情境描述不要超过 2000 字' }, { status: 400 })
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json({ error: '服务暂时不可用，请稍后重试' }, { status: 503 })
    }

    const rateLimit = checkRateLimit(`consult-ai:${clientKey(req)}`, {
      limit: envPositiveInt('CONSULT_AI_RATE_LIMIT', DEFAULT_RATE_LIMIT),
      windowMs: envPositiveInt('CONSULT_AI_RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS),
    })
    if (!rateLimit.allowed) {
      return Response.json(
        { error: '请求太频繁，请稍后重试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }

    // 阶段 1：匹配 + 爻位（非流式）
    const result = await consultAI(body.situation)

    // 阶段 2：个性化解读（流式）
    const stream = streamInterpretation(body.situation, result.hexagram, result.yaoPosition)

    // 用 SSE 格式返回
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // 先发匹配结果
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'match',
              data: {
                hexagramNumber: result.hexagram.number,
                reasoning: result.reasoning,
                confidence: result.confidence,
                yaoPosition: result.yaoPosition,
                yaoConfidence: result.yaoConfidence,
                yaoBrief: result.yaoBrief,
                runners: result.runners,
              },
            })}\n\n`,
          ),
        )

        // 流式发送解读
        try {
          const textStream = (await stream).textStream
          for await (const chunk of textStream) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'interpretation', delta: chunk })}\n\n`,
              ),
            )
          }
        } catch {
          // 解读流失败不影响匹配结果
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    if (message.includes('API') || message.includes('fetch')) {
      return Response.json({ error: '服务暂时不可用，请稍后重试' }, { status: 503 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
