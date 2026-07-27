-- Mantém os registros operacionais vinculados ao perfil, mas permite
-- remover o acesso e ocultar o usuário das telas administrativas.

alter table public.profiles
  add column if not exists excluido_em timestamp with time zone;

alter table public.profiles
  add column if not exists excluido_por uuid;

comment on column public.profiles.excluido_em is
  'Data da exclusão segura do usuário no Supabase Auth.';

comment on column public.profiles.excluido_por is
  'ID do operador que realizou a exclusão segura, preservado sem FK.';

create index if not exists profiles_nao_excluidos_created_at_idx
  on public.profiles (created_at desc)
  where excluido_em is null;

notify pgrst, 'reload schema';
