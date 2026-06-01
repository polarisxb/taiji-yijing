// Edge Function: purge-deleted-accounts
//
// 触发：pg_cron 每日 UTC 03:00 调用一次。
// 行为：扫描 auth.users.raw_user_meta_data->'deleted_at' 早于 30 天前的账号，
//      硬删账号 + 关联 zheng_records（外键 cascade）。
//
// 部署：
//   supabase functions deploy purge-deleted-accounts \
//     --no-verify-jwt --import-map ./supabase/functions/import_map.json
//
// 验证：
//   curl -X POST 'https://<project>.supabase.co/functions/v1/purge-deleted-accounts' \
//     -H "Authorization: Bearer $SERVICE_ROLE_KEY"

// @ts-expect-error -- Deno runtime; provided by Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PURGE_WINDOW_SEC = 30 * 86400

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (req: Request) => Promise<Response> | Response): void
}

Deno.serve(async (_req) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const cutoffSec = Math.floor(Date.now() / 1000) - PURGE_WINDOW_SEC

  // List users with deleted_at metadata older than cutoff.
  // Supabase admin API: listUsers paginates; for now do a single page (<= 1000 users).
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const toPurge = data.users.filter((u) => {
    const meta = (u.user_metadata ?? {}) as { deleted_at?: number }
    return typeof meta.deleted_at === 'number' && meta.deleted_at <= cutoffSec
  })

  let purged = 0
  const failures: Array<{ id: string; error: string }> = []

  for (const u of toPurge) {
    // Cascade: deleting auth.users row cascades to public.zheng_records via FK.
    const { error: delErr } = await admin.auth.admin.deleteUser(u.id)
    if (delErr) {
      failures.push({ id: u.id, error: delErr.message })
    } else {
      purged += 1
    }
  }

  return new Response(
    JSON.stringify({
      ok: failures.length === 0,
      cutoff_sec: cutoffSec,
      candidates: toPurge.length,
      purged,
      failures,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
})
