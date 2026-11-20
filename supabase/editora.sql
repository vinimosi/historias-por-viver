-- Rode depois de criar o seu usuário em Authentication > Users.
-- Ele vira editor. Funciona porque, neste momento, o seu é o único usuário.
insert into public.editores (user_id)
select id from auth.users
on conflict do nothing;

select count(*) as editores from public.editores;
