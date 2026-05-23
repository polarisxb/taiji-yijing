import { NextResponse } from 'next/server'
import { matchHexagrams } from '@/lib/matcher'
import type { ConsultRequest } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConsultRequest
    if (!body.situation || typeof body.situation !== 'string') {
      return NextResponse.json({ error: '请提供 situation 字段（你的情境描述）' }, { status: 400 })
    }
    if (body.situation.length > 2000) {
      return NextResponse.json({ error: '情境描述不要超过 2000 字' }, { status: 400 })
    }
    const result = matchHexagrams(body, 3)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
