-- Libera o acesso das tabelas para o site e para o envio dos dados.
-- (As regras de quem pode ver e mudar continuam valendo por cima disto.)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.lugares to anon;
grant select, insert, update, delete on public.lugares to authenticated;
grant all on public.lugares to service_role;
grant select on public.editores to authenticated;
grant all on public.editores to service_role;
