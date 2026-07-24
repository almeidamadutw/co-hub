-- Prevent authenticated users from promoting themselves or tampering with
-- authentication/support state through direct Data API updates.

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $function$
declare
  v_actor_role text;
begin
  -- Server-side operations performed with service_role do not carry an end-user
  -- auth.uid() and remain responsible for their own authorization checks.
  if auth.uid() is null then
    return new;
  end if;

  select lower(btrim(profile.role))
  into v_actor_role
  from public.profiles as profile
  where profile.id = auth.uid();

  -- Even privileged users cannot change their own access level through a direct
  -- profile update. Administrative server routes remain available for recovery.
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

  -- Mentors and support can keep managing other users through the existing,
  -- validated application flows. Other roles may edit only personal fields.
  if v_actor_role in ('mentor', 'suporte') then
    return new;
  end if;

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
  then
    raise exception using
      errcode = '42501',
      message = 'Você não tem permissão para alterar campos administrativos do perfil.';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_profile_privileged_fields()
from public, anon, authenticated;

grant execute on function public.protect_profile_privileged_fields()
to service_role;

drop trigger if exists protect_profile_privileged_fields
on public.profiles;

create trigger protect_profile_privileged_fields
before update on public.profiles
for each row
execute function public.protect_profile_privileged_fields();
