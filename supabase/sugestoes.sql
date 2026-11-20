-- Sugestões dos amigos: qualquer pessoa manda, só editores leem e apagam.
-- Cole tudo no SQL Editor do Supabase e clique em Run.

create table if not exists public.sugestoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(nome) between 2 and 120),
  link        text check (link is null or char_length(link) <= 500),
  quem        text check (quem is null or char_length(quem) <= 60),
  comentario  text check (comentario is null or char_length(comentario) <= 600),
  criado      timestamptz not null default now()
);

alter table public.sugestoes enable row level security;

drop policy if exists "qualquer um sugere" on public.sugestoes;
create policy "qualquer um sugere" on public.sugestoes for insert to anon, authenticated with check (true);

drop policy if exists "editores leem sugestoes" on public.sugestoes;
create policy "editores leem sugestoes" on public.sugestoes for select to authenticated
  using (exists (select 1 from public.editores e where e.user_id = auth.uid()));

drop policy if exists "editores apagam sugestoes" on public.sugestoes;
create policy "editores apagam sugestoes" on public.sugestoes for delete to authenticated
  using (exists (select 1 from public.editores e where e.user_id = auth.uid()));

grant insert on public.sugestoes to anon, authenticated;
grant select, delete on public.sugestoes to authenticated;
grant all on public.sugestoes to service_role;
