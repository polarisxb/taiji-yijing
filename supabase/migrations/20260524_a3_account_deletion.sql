-- A3 account governance — 30-day soft-delete + restore + scheduled purge.
--
-- 这份 migration 提供两个 RPC + 一条 pg_cron schedule。
-- 部署时机：用户决定真正使用云端 + A1 migration 已经跑过之后。
-- 未部署也不会阻塞 A 包前端运行（authProvider 调用时返回 RPC missing 错误，
-- UI 层会捕获并显示"Supabase 未配置"友好提示）。

------------------------------------------------------------------------------
-- 1. RPC: request_account_deletion
--    标记当前登录用户为软删状态。zheng_records 的 deleted_at + auth.users
--    metadata 的 deleted_at（epoch seconds）。
------------------------------------------------------------------------------

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 软删 zheng_records（已存在 deleted_at 列；A1 migration 创建）
  update public.zheng_records
    set deleted_at = now()
    where user_id = uid
      and deleted_at is null;

  -- 在 auth.users.raw_user_meta_data 添加 deleted_at = epoch seconds
  update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('deleted_at', extract(epoch from now())::bigint)
    where id = uid;
end;
$$;

grant execute on function public.request_account_deletion to authenticated;

------------------------------------------------------------------------------
-- 2. RPC: restore_account
--    30 天内可撤回；恢复 zheng_records 的 deleted_at 标记 + 清除账号本体的
--    metadata.deleted_at。
------------------------------------------------------------------------------

create or replace function public.restore_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  deleted_epoch bigint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select (raw_user_meta_data->>'deleted_at')::bigint
    into deleted_epoch
    from auth.users
    where id = uid;

  if deleted_epoch is null then
    raise exception 'account not deleted';
  end if;
  if extract(epoch from now())::bigint - deleted_epoch > 30 * 86400 then
    raise exception 'restore window expired';
  end if;

  -- 还原 zheng_records 的 soft-delete（只还原本次注销期间软删的记录）
  update public.zheng_records
    set deleted_at = null
    where user_id = uid
      and deleted_at >= to_timestamp(deleted_epoch);

  -- 清账号本体的 deleted_at 标记
  update auth.users
    set raw_user_meta_data = raw_user_meta_data - 'deleted_at'
    where id = uid;
end;
$$;

grant execute on function public.restore_account to authenticated;

------------------------------------------------------------------------------
-- 3. pg_cron schedule: daily purge of accounts past 30-day window
--    需要先在 Supabase Dashboard 启用 pg_cron + pg_net 扩展。
--    Edge Function 部署见 supabase/functions/purge-deleted-accounts/index.ts。
--    edge_function_token 需提前通过 Supabase Vault 写入：
--      insert into vault.secrets (name, secret) values
--        ('edge_function_token', '<service_role_key 或自定义 webhook secret>');
------------------------------------------------------------------------------

-- 启用扩展（可能已存在）；忽略错误。
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 注册每天 UTC 03:00 调用 Edge Function。
-- 部署时替换 <project> 为实际 project ref。
-- select cron.schedule(
--   'purge-deleted-accounts-daily',
--   '0 3 * * *',
--   $$ select net.http_post(
--     url := 'https://<project>.supabase.co/functions/v1/purge-deleted-accounts',
--     headers := jsonb_build_object(
--       'Authorization',
--       'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_token')
--     ),
--     body := '{}'::jsonb
--   ); $$
-- );
