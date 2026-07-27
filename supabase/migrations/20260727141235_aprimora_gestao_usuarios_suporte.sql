-- Permite que o suporte gerencie a role principal, o status e o acesso
-- adicional à área de Suporte/T.I. em uma única operação auditada.

create or replace function public.suporte_atualizar_acessos_profile(
  p_profile_id uuid,
  p_role text,
  p_status text,
  p_acesso_suporte boolean
)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $function$
declare
  v_suporte_nome text;
  v_suporte_email text;

  v_nome_alterado text;
  v_email_alterado text;
  v_role_antiga text;
  v_status_antigo text;
  v_acesso_suporte_antigo boolean;

  v_role_nova text := lower(btrim(p_role));
  v_status_novo text := lower(btrim(p_status));
  v_acesso_suporte_novo boolean := coalesce(p_acesso_suporte, false);
begin
  select nome, email
  into v_suporte_nome, v_suporte_email
  from public.profiles
  where id = auth.uid();

  if v_suporte_email is null or not public.is_suporte() then
    raise exception 'Apenas o suporte pode atualizar usuários.';
  end if;

  if v_role_nova not in ('mentor', 'mentorado', 'financeiro', 'suporte') then
    raise exception 'Perfil de acesso inválido: %', p_role;
  end if;

  if v_status_novo not in (
    'ativo',
    'pendente',
    'inativo',
    'bloqueado',
    'cancelado',
    'suspenso'
  ) then
    raise exception 'Status inválido: %', p_status;
  end if;

  select
    nome,
    email,
    role,
    status,
    coalesce(acesso_suporte, false)
  into
    v_nome_alterado,
    v_email_alterado,
    v_role_antiga,
    v_status_antigo,
    v_acesso_suporte_antigo
  from public.profiles
  where id = p_profile_id;

  if v_email_alterado is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if p_profile_id = auth.uid()
    and (
      lower(btrim(v_role_antiga)) is distinct from v_role_nova
      or lower(btrim(coalesce(v_status_antigo, ''))) is distinct from v_status_novo
      or v_acesso_suporte_antigo is distinct from v_acesso_suporte_novo
    )
  then
    raise exception 'Você não pode alterar o próprio perfil, status ou acesso de suporte.';
  end if;

  if lower(btrim(v_role_antiga)) = v_role_nova
    and lower(btrim(coalesce(v_status_antigo, ''))) = v_status_novo
    and v_acesso_suporte_antigo = v_acesso_suporte_novo
  then
    return;
  end if;

  update public.profiles
  set
    role = v_role_nova,
    status = v_status_novo,
    acesso_suporte = v_acesso_suporte_novo,
    updated_at = now()
  where id = p_profile_id;

  insert into public.suporte_logs (
    suporte_id,
    suporte_nome,
    suporte_email,
    acao,
    entidade,
    entidade_id,
    descricao,
    metadata,
    created_at
  )
  values (
    auth.uid(),
    v_suporte_nome,
    v_suporte_email,
    'atualizacao_usuario',
    'profiles',
    p_profile_id,
    'Atualizou os acessos de ' ||
      coalesce(v_nome_alterado, v_email_alterado, p_profile_id::text) ||
      '. Perfil: ' || coalesce(v_role_antiga, 'sem perfil') ||
      ' -> ' || v_role_nova ||
      '. Status: ' || coalesce(v_status_antigo, 'sem status') ||
      ' -> ' || v_status_novo ||
      '. Suporte/T.I.: ' ||
      case when v_acesso_suporte_antigo then 'sim' else 'não' end ||
      ' -> ' ||
      case when v_acesso_suporte_novo then 'sim' else 'não' end ||
      '.',
    jsonb_build_object(
      'usuario_alterado_id', p_profile_id,
      'usuario_alterado_nome', v_nome_alterado,
      'usuario_alterado_email', v_email_alterado,
      'perfil_anterior', v_role_antiga,
      'perfil_novo', v_role_nova,
      'status_anterior', v_status_antigo,
      'status_novo', v_status_novo,
      'acesso_suporte_anterior', v_acesso_suporte_antigo,
      'acesso_suporte_novo', v_acesso_suporte_novo
    ),
    now()
  );
end;
$function$;

revoke all on function public.suporte_atualizar_acessos_profile(
  uuid,
  text,
  text,
  boolean
) from public, anon;

grant execute on function public.suporte_atualizar_acessos_profile(
  uuid,
  text,
  text,
  boolean
) to authenticated, service_role;

notify pgrst, 'reload schema';
