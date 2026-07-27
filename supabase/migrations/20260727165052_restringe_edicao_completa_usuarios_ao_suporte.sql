-- Mantém a edição dos próprios dados pessoais, mas impede que mentores
-- alterem perfis de terceiros diretamente pela Data API. A gestão completa
-- continua exclusiva de quem possui acesso ao Suporte/T.I.

drop policy if exists "profiles_update_own_or_mentor"
  on public.profiles;

drop policy if exists "profiles_update_own"
  on public.profiles;

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $function$
begin
  -- Rotas administrativas validadas no servidor usam a secret key e não
  -- carregam auth.uid(); elas continuam responsáveis pela autorização.
  if auth.uid() is null then
    return new;
  end if;

  -- Nem o suporte pode alterar o próprio nível de acesso por uma atualização
  -- direta no perfil. Outro operador precisa realizar essa ação.
  if auth.uid() = old.id
    and (
      new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.acesso_suporte is distinct from old.acesso_suporte
    )
  then
    raise exception using
      errcode = '42501',
      message = 'Você não pode alterar sua própria permissão ou status.';
  end if;

  if public.is_suporte() then
    return new;
  end if;

  -- Usuários comuns podem manter os dados pessoais da própria conta, mas os
  -- campos administrativos e de autenticação permanecem protegidos.
  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.codigo_inscricao is distinct from old.codigo_inscricao
    or new.created_at is distinct from old.created_at
    or new.primeira_senha_alterada is distinct from old.primeira_senha_alterada
    or new.precisa_trocar_senha is distinct from old.precisa_trocar_senha
    or new.trocas_senha is distinct from old.trocas_senha
    or new.ultima_troca_senha is distinct from old.ultima_troca_senha
    or new.total_resets_senha is distinct from old.total_resets_senha
    or new.total_solicitacoes_senha is distinct from old.total_solicitacoes_senha
    or new.ultima_solicitacao_senha is distinct from old.ultima_solicitacao_senha
    or new.acesso_suporte is distinct from old.acesso_suporte
    or new.excluido_em is distinct from old.excluido_em
    or new.excluido_por is distinct from old.excluido_por
  then
    raise exception using
      errcode = '42501',
      message = 'Apenas o suporte pode alterar campos administrativos do perfil.';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_profile_privileged_fields()
from public, anon, authenticated;

grant execute on function public.protect_profile_privileged_fields()
to service_role;

notify pgrst, 'reload schema';
