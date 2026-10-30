-- 热研库 Supabase 建库脚本
-- 在 Supabase Dashboard -> SQL Editor 中完整运行一次。
-- 本脚本创建论文表、索引、更新时间触发器和按用户隔离的行级安全策略。

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  title_en text not null default '',
  authors text[] not null default '{}',
  year integer check (year is null or year between 1800 and 2100),
  venue text not null default '',
  doi text not null default '',
  url text not null default '',
  category text not null default '其他'
    check (category in ('医疗散热', '余热回收', '热泵与储热', '竞赛与综述', '其他')),
  status text not null default '待核验'
    check (status in ('待核验', '已核验', '已摘要', '已精读', '已引用')),
  data_type text not null default '其他'
    check (data_type in ('实验', '仿真', '综述', '案例', '标准/指南', '其他')),
  tags text[] not null default '{}',
  medical_scene text not null default '',
  thermal_route text not null default '',
  methods text not null default '',
  key_finding text not null default '',
  limitations text not null default '',
  notes text not null default '',
  relevance smallint not null default 3 check (relevance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists papers_user_updated_idx
  on public.papers (user_id, updated_at desc);

create index if not exists papers_user_category_idx
  on public.papers (user_id, category);

create index if not exists papers_user_status_idx
  on public.papers (user_id, status);

create index if not exists papers_title_trgm_idx
  on public.papers using gin (title gin_trgm_ops);

create index if not exists papers_title_en_trgm_idx
  on public.papers using gin (title_en gin_trgm_ops);

create index if not exists papers_authors_gin_idx
  on public.papers using gin (authors);

create index if not exists papers_tags_gin_idx
  on public.papers using gin (tags);

create or replace function public.set_paper_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_paper_updated_at on public.papers;
create trigger set_paper_updated_at
before update on public.papers
for each row execute function public.set_paper_updated_at();

alter table public.papers enable row level security;
alter table public.papers force row level security;

drop policy if exists "papers_select_own" on public.papers;
create policy "papers_select_own"
on public.papers for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "papers_insert_own" on public.papers;
create policy "papers_insert_own"
on public.papers for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "papers_update_own" on public.papers;
create policy "papers_update_own"
on public.papers for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "papers_delete_own" on public.papers;
create policy "papers_delete_own"
on public.papers for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.papers from anon;
revoke all on table public.papers from public;
grant select, insert, update, delete on table public.papers to authenticated;

comment on table public.papers is
  '热研库个人论文记录。每行由一个用户拥有，RLS 按 auth.uid() 隔离。';

comment on column public.papers.thermal_route is
  '散热或余热路线，例如相变储热、热泵、换热器、温差发电。';

comment on column public.papers.key_finding is
  '一句话结论，应写明对象、方法、条件和结果。';

-- 验证提示：
-- 1. 运行后到 Authentication -> Providers 确认 Email 登录已启用。
-- 2. 在 Authentication -> URL Configuration 中填写正式站点 URL。
-- 3. 不要关闭 RLS，也不要在前端使用 service_role key。
