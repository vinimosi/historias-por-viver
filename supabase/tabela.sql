-- Pra Comer em SP: tabela dos lugares e regras de acesso.
-- Cole tudo no SQL Editor do Supabase e clique em Run.

create table if not exists public.lugares (
  id          text primary key,
  nome        text not null,
  tipo        text,
  bairro      text,
  endereco    text,
  lat         double precision,
  lng         double precision,
  preco       smallint,
  status      text not null default 'quero' check (status in ('quero', 'fui')),
  tiktok      text,
  porque      text,
  visita      jsonb,
  post        jsonb,
  criado      timestamptz not null default now(),
  atualizado  timestamptz not null default now()
);

-- Quem pode editar (só as contas que estiverem aqui).
create table if not exists public.editores (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.lugares  enable row level security;
alter table public.editores enable row level security;

-- Qualquer pessoa com o link vê os lugares.
drop policy if exists "todos leem" on public.lugares;
create policy "todos leem" on public.lugares for select using (true);

-- Só editores criam, mudam e tiram lugares.
drop policy if exists "editores criam" on public.lugares;
create policy "editores criam" on public.lugares for insert to authenticated
  with check (exists (select 1 from public.editores e where e.user_id = auth.uid()));
drop policy if exists "editores mudam" on public.lugares;
create policy "editores mudam" on public.lugares for update to authenticated
  using (exists (select 1 from public.editores e where e.user_id = auth.uid()))
  with check (exists (select 1 from public.editores e where e.user_id = auth.uid()));
drop policy if exists "editores tiram" on public.lugares;
create policy "editores tiram" on public.lugares for delete to authenticated
  using (exists (select 1 from public.editores e where e.user_id = auth.uid()));

-- Cada pessoa só consegue ver se ela mesma é editora.
drop policy if exists "ver a si mesmo" on public.editores;
create policy "ver a si mesmo" on public.editores for select to authenticated using (user_id = auth.uid());

-- Atualiza a data de mudança sozinho.
create or replace function public.marcar_atualizado() returns trigger language plpgsql as $$
begin new.atualizado = now(); return new; end $$;
drop trigger if exists lugares_atualizado on public.lugares;
create trigger lugares_atualizado before update on public.lugares
  for each row execute function public.marcar_atualizado();
-- Libera o acesso das tabelas para o site e para o envio dos dados.
-- (As regras de quem pode ver e mudar continuam valendo por cima disto.)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.lugares to anon;
grant select, insert, update, delete on public.lugares to authenticated;
grant all on public.lugares to service_role;
grant select on public.editores to authenticated;
grant all on public.editores to service_role;
