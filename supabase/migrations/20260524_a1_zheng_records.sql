-- =====================================================
-- 太极易经 A 包 A1: zheng_records 表 + RLS 策略
--
-- Apply via Supabase Dashboard → SQL Editor → New query → Run
-- 或 supabase CLI: supabase db push
-- =====================================================

-- 主表：用户咨询记录
create table if not exists public.zheng_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  situation text not null,
  hexagram_id smallint not null,
  hexagram_name text not null,
  fit_score double precision not null,
  yao_location jsonb,
  ai_yao jsonb,
  consult_mode text,
  user_note text,
  verification text not null default 'unverified',
  verification_note text,
  verified_at timestamptz,
  deleted_at timestamptz
);

-- 索引：按用户 + 时间倒序的列表查询（过滤软删）
create index if not exists zheng_records_user_created_idx
  on public.zheng_records (user_id, created_at desc)
  where deleted_at is null;

-- updated_at 自动维护
create or replace function public.touch_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists zheng_records_touch_updated_at on public.zheng_records;
create trigger zheng_records_touch_updated_at
  before update on public.zheng_records
  for each row execute function public.touch_updated_at();

-- =====================================================
-- RLS 策略：每个用户只能访问自己的数据
-- =====================================================

alter table public.zheng_records enable row level security;

drop policy if exists "users select own records" on public.zheng_records;
create policy "users select own records"
  on public.zheng_records
  for select
  using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "users insert own records" on public.zheng_records;
create policy "users insert own records"
  on public.zheng_records
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own records" on public.zheng_records;
create policy "users update own records"
  on public.zheng_records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own records" on public.zheng_records;
create policy "users delete own records"
  on public.zheng_records
  for delete
  using (auth.uid() = user_id);
