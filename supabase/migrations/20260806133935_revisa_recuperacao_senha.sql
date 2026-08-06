-- Reestrutura a recuperação de senha como um fluxo reservado, auditado e
-- operado somente pela API do servidor. A primeira recuperação automática é
-- livre; as seguintes abrem/reutilizam um chamado até nova liberação do Suporte.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles
  add column if not exists recuperacao_automatica_disponivel boolean not null default true;

comment on column public.profiles.recuperacao_automatica_disponivel is
  'Indica se o perfil ainda pode receber um link automático sem liberação do Suporte.';

-- Preserva a regra já utilizada em produção. Quem já recebeu ou concluiu uma
-- recuperação continua bloqueado para um segundo envio automático.
update public.profiles
set recuperacao_automatica_disponivel = false
where coalesce(trocas_senha, 0) >= 1
   or coalesce(total_resets_senha, 0) >= 1;

create table if not exists private.recuperacao_senha_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  origem text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  estado text not null default 'reservado',
  disponivel_anterior boolean not null,
  erro_codigo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enviado_em timestamptz,
  concluido_em timestamptz,
  constraint recuperacao_senha_origem_check
    check (origem in ('automatico', 'suporte')),
  constraint recuperacao_senha_estado_check
    check (estado in ('reservado', 'enviado', 'falhou', 'concluido', 'expirado'))
);

comment on table private.recuperacao_senha_solicitacoes is
  'Reservas e auditoria interna de links de recuperação. Não exposta à Data API.';

revoke all on table private.recuperacao_senha_solicitacoes
  from public, anon, authenticated;
grant all on table private.recuperacao_senha_solicitacoes to service_role;

create index if not exists recuperacao_senha_profile_created_idx
  on private.recuperacao_senha_solicitacoes (profile_id, created_at desc);

create unique index if not exists recuperacao_senha_reserva_ativa_idx
  on private.recuperacao_senha_solicitacoes (profile_id)
  where estado = 'reservado';

create index if not exists recuperacao_senha_actor_idx
  on private.recuperacao_senha_solicitacoes (actor_id)
  where actor_id is not null;

create or replace function public.recuperacao_senha_reservar(
  p_profile_id uuid default null,
  p_email text default null,
  p_origem text default 'automatico',
  p_actor_id uuid default null
)
returns table (
  acao text,
  solicitacao_id uuid,
  profile_id uuid,
  email text,
  nome text,
  role text
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_origem text := lower(btrim(coalesce(p_origem, '')));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_perfil public.profiles%rowtype;
  v_actor public.profiles%rowtype;
  v_reserva private.recuperacao_senha_solicitacoes%rowtype;
  v_solicitacao_id uuid := gen_random_uuid();
  v_ticket_id uuid;
  v_agora timestamptz := now();
begin
  if v_origem not in ('automatico', 'suporte') then
    raise exception 'Origem de recuperação inválida.';
  end if;

  if v_origem = 'suporte' then
    select perfil.*
      into v_actor
    from public.profiles as perfil
    where perfil.id = p_actor_id;

    if not found
      or (
        lower(btrim(v_actor.role)) <> 'suporte'
        and not coalesce(v_actor.acesso_suporte, false)
      )
      or lower(btrim(coalesce(v_actor.status, 'ativo'))) <> 'ativo'
      or v_actor.excluido_em is not null
    then
      raise exception 'Usuário sem permissão para liberar recuperação de senha.';
    end if;

    select perfil.*
      into v_perfil
    from public.profiles as perfil
    where perfil.id = p_profile_id
    for update;
  else
    if v_email = '' then
      return query
      select 'ignorar'::text, null::uuid, null::uuid, null::text, null::text, null::text;
      return;
    end if;

    select perfil.*
      into v_perfil
    from public.profiles as perfil
    where lower(btrim(perfil.email)) = v_email
    for update;
  end if;

  if not found
    or v_perfil.excluido_em is not null
    or lower(btrim(coalesce(v_perfil.status, 'ativo'))) <> 'ativo'
  then
    if v_origem = 'suporte' then
      raise exception 'Usuário ativo não encontrado.';
    end if;

    return query
    select 'ignorar'::text, null::uuid, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  select solicitacao.*
    into v_reserva
  from private.recuperacao_senha_solicitacoes as solicitacao
  where solicitacao.profile_id = v_perfil.id
    and solicitacao.estado = 'reservado'
  order by solicitacao.created_at desc
  limit 1
  for update;

  if found and v_reserva.created_at > v_agora - interval '15 minutes' then
    return query
    select
      'aguardar'::text,
      v_reserva.id,
      case when v_origem = 'suporte' then v_perfil.id else null::uuid end,
      case when v_origem = 'suporte' then v_perfil.email else null::text end,
      case when v_origem = 'suporte' then v_perfil.nome else null::text end,
      case when v_origem = 'suporte' then v_perfil.role else null::text end;
    return;
  elsif found then
    update private.recuperacao_senha_solicitacoes
    set
      estado = 'expirado',
      erro_codigo = 'reserva_expirada',
      updated_at = v_agora
    where id = v_reserva.id;

    update public.profiles
    set recuperacao_automatica_disponivel = v_reserva.disponivel_anterior
    where id = v_perfil.id;

    v_perfil.recuperacao_automatica_disponivel := v_reserva.disponivel_anterior;
  end if;

  if v_origem = 'automatico'
    and v_perfil.ultima_solicitacao_senha is not null
    and v_perfil.ultima_solicitacao_senha > v_agora - interval '60 seconds'
  then
    return query
    select 'aguardar'::text, null::uuid, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  update public.profiles
  set
    total_solicitacoes_senha = coalesce(total_solicitacoes_senha, 0) + 1,
    ultima_solicitacao_senha = v_agora,
    updated_at = v_agora
  where id = v_perfil.id;

  if v_origem = 'automatico'
    and not coalesce(v_perfil.recuperacao_automatica_disponivel, true)
  then
    select ticket.id
      into v_ticket_id
    from public.suporte_tickets as ticket
    where ticket.usuario_id = v_perfil.id
      and ticket.categoria in ('alteracao_senha', 'Alteração de senha')
      and ticket.status in ('aberto', 'em_analise', 'respondido')
    order by ticket.created_at desc nulls last
    limit 1;

    if v_ticket_id is null then
      insert into public.suporte_tickets (
        usuario_id,
        nome_usuario,
        email_usuario,
        tipo_usuario,
        role_usuario,
        categoria,
        assunto,
        mensagem,
        status,
        prioridade,
        origem,
        criado_em,
        atualizado_em,
        created_at,
        updated_at
      ) values (
        v_perfil.id,
        coalesce(v_perfil.nome, 'Usuário sem nome'),
        v_perfil.email,
        v_perfil.role,
        v_perfil.role,
        'alteracao_senha',
        'Solicitação de nova recuperação de senha',
        'O usuário solicitou uma nova recuperação após utilizar o envio automático. É necessária a liberação do Suporte/T.I.',
        'aberto',
        'alta',
        'sistema',
        v_agora,
        v_agora,
        v_agora,
        v_agora
      )
      returning id into v_ticket_id;
    end if;

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
    ) values (
      null,
      'Sistema CEO Club',
      null,
      'recuperacao_senha_encaminhada',
      'suporte_tickets',
      v_ticket_id,
      'Nova solicitação de recuperação encaminhada ao Suporte.',
      jsonb_build_object(
        'profile_id', v_perfil.id,
        'ticket_id', v_ticket_id,
        'motivo', 'recuperacao_automatica_ja_utilizada'
      ),
      v_agora
    );

    return query
    select 'bloqueado'::text, null::uuid, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  insert into private.recuperacao_senha_solicitacoes (
    id,
    profile_id,
    origem,
    actor_id,
    estado,
    disponivel_anterior,
    created_at,
    updated_at
  ) values (
    v_solicitacao_id,
    v_perfil.id,
    v_origem,
    case when v_origem = 'suporte' then p_actor_id else null end,
    'reservado',
    coalesce(v_perfil.recuperacao_automatica_disponivel, true),
    v_agora,
    v_agora
  );

  update public.profiles
  set
    recuperacao_automatica_disponivel = false,
    updated_at = v_agora
  where id = v_perfil.id;

  return query
  select
    'enviar'::text,
    v_solicitacao_id,
    v_perfil.id,
    v_perfil.email,
    v_perfil.nome,
    v_perfil.role;
end;
$$;

create or replace function public.recuperacao_senha_finalizar_envio(
  p_solicitacao_id uuid,
  p_sucesso boolean,
  p_erro_codigo text default null
)
returns table (
  profile_id uuid,
  origem text,
  estado text
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_solicitacao private.recuperacao_senha_solicitacoes%rowtype;
  v_perfil public.profiles%rowtype;
  v_actor public.profiles%rowtype;
  v_profile_id uuid;
  v_agora timestamptz := now();
begin
  select solicitacao.profile_id
    into v_profile_id
  from private.recuperacao_senha_solicitacoes as solicitacao
  where solicitacao.id = p_solicitacao_id;

  if not found then
    raise exception 'Reserva de recuperação não encontrada.';
  end if;

  select perfil.*
    into v_perfil
  from public.profiles as perfil
  where perfil.id = v_profile_id
  for update;

  if not found then
    raise exception 'Perfil da recuperação não encontrado.';
  end if;

  select solicitacao.*
    into v_solicitacao
  from private.recuperacao_senha_solicitacoes as solicitacao
  where solicitacao.id = p_solicitacao_id
  for update;

  if v_solicitacao.estado <> 'reservado' then
    return query
    select v_solicitacao.profile_id, v_solicitacao.origem, v_solicitacao.estado;
    return;
  end if;

  if p_sucesso then
    update private.recuperacao_senha_solicitacoes
    set
      estado = 'enviado',
      enviado_em = v_agora,
      erro_codigo = null,
      updated_at = v_agora
    where id = v_solicitacao.id;

    update public.profiles
    set
      total_resets_senha = coalesce(total_resets_senha, 0) + 1,
      recuperacao_automatica_disponivel = false,
      updated_at = v_agora
    where id = v_perfil.id;
  else
    update private.recuperacao_senha_solicitacoes
    set
      estado = 'falhou',
      erro_codigo = left(nullif(btrim(coalesce(p_erro_codigo, '')), ''), 120),
      updated_at = v_agora
    where id = v_solicitacao.id;

    update public.profiles
    set
      recuperacao_automatica_disponivel = v_solicitacao.disponivel_anterior,
      updated_at = v_agora
    where id = v_perfil.id;
  end if;

  if v_solicitacao.origem = 'suporte' then
    select perfil.*
      into v_actor
    from public.profiles as perfil
    where perfil.id = v_solicitacao.actor_id;

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
    ) values (
      v_solicitacao.actor_id,
      v_actor.nome,
      v_actor.email,
      case when p_sucesso then 'reset_senha_liberado' else 'reset_senha_envio_falhou' end,
      'profiles',
      v_perfil.id,
      case
        when p_sucesso then 'Liberou e enviou uma nova recuperação de senha.'
        else 'A liberação foi revertida porque o e-mail de recuperação não foi enviado.'
      end,
      jsonb_build_object(
        'profile_id', v_perfil.id,
        'solicitacao_id', v_solicitacao.id,
        'sucesso', p_sucesso,
        'erro_codigo', left(nullif(btrim(coalesce(p_erro_codigo, '')), ''), 120)
      ),
      v_agora
    );
  end if;

  return query
  select
    v_solicitacao.profile_id,
    v_solicitacao.origem,
    case when p_sucesso then 'enviado'::text else 'falhou'::text end;
end;
$$;

create or replace function public.recuperacao_senha_validar(
  p_profile_id uuid
)
returns table (
  valida boolean,
  solicitacao_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select
    solicitacao.id is not null as valida,
    solicitacao.id as solicitacao_id
  from (values (1)) as base(valor)
  left join lateral (
    select item.id
    from private.recuperacao_senha_solicitacoes as item
    where item.profile_id = p_profile_id
      and item.estado = 'enviado'
      and item.enviado_em >= now() - interval '2 hours'
    order by item.enviado_em desc
    limit 1
  ) as solicitacao on true;
$$;

create or replace function public.recuperacao_senha_concluir(
  p_profile_id uuid,
  p_solicitacao_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_solicitacao private.recuperacao_senha_solicitacoes%rowtype;
  v_profile_id uuid;
  v_agora timestamptz := now();
begin
  select solicitacao.profile_id
    into v_profile_id
  from private.recuperacao_senha_solicitacoes as solicitacao
  where solicitacao.id = p_solicitacao_id
    and solicitacao.profile_id = p_profile_id;

  if not found then
    return false;
  end if;

  perform 1
  from public.profiles as perfil
  where perfil.id = v_profile_id
  for update;

  if not found then
    return false;
  end if;

  select solicitacao.*
    into v_solicitacao
  from private.recuperacao_senha_solicitacoes as solicitacao
  where solicitacao.id = p_solicitacao_id
    and solicitacao.profile_id = p_profile_id
  for update;

  if v_solicitacao.estado = 'concluido' then
    return true;
  end if;

  if v_solicitacao.estado <> 'enviado'
    or v_solicitacao.enviado_em < v_agora - interval '2 hours'
  then
    return false;
  end if;

  update private.recuperacao_senha_solicitacoes
  set
    estado = 'concluido',
    concluido_em = v_agora,
    updated_at = v_agora
  where id = v_solicitacao.id;

  update public.profiles
  set
    trocas_senha = coalesce(trocas_senha, 0) + 1,
    ultima_troca_senha = v_agora,
    updated_at = v_agora
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
  ) values (
    null,
    'Sistema CEO Club',
    null,
    'recuperacao_senha_concluida',
    'profiles',
    p_profile_id,
    'O usuário concluiu a recuperação de senha.',
    jsonb_build_object(
      'profile_id', p_profile_id,
      'solicitacao_id', p_solicitacao_id,
      'origem', v_solicitacao.origem
    ),
    v_agora
  );

  return true;
end;
$$;

revoke all on function public.recuperacao_senha_reservar(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.recuperacao_senha_finalizar_envio(uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.recuperacao_senha_validar(uuid)
  from public, anon, authenticated;
revoke all on function public.recuperacao_senha_concluir(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.recuperacao_senha_reservar(uuid, text, text, uuid)
  to service_role;
grant execute on function public.recuperacao_senha_finalizar_envio(uuid, boolean, text)
  to service_role;
grant execute on function public.recuperacao_senha_validar(uuid)
  to service_role;
grant execute on function public.recuperacao_senha_concluir(uuid, uuid)
  to service_role;

comment on function public.recuperacao_senha_reservar(uuid, text, text, uuid) is
  'Reserva envio e aplica a regra da primeira recuperação. Uso exclusivo da API.';
comment on function public.recuperacao_senha_finalizar_envio(uuid, boolean, text) is
  'Finaliza ou reverte uma reserva após o provedor de e-mail responder.';
comment on function public.recuperacao_senha_validar(uuid) is
  'Valida se a sessão pertence a uma recuperação enviada e ainda pendente.';
comment on function public.recuperacao_senha_concluir(uuid, uuid) is
  'Conclui de forma idempotente o histórico de uma recuperação de senha.';

-- A nova flag é administrativa e não pode ser alterada por atualizações
-- diretas do navegador, nem mesmo por um perfil com acesso ao Suporte.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.acesso_ajuste_financeiro is distinct from old.acesso_ajuste_financeiro then
    raise exception using
      errcode = '42501',
      message = 'A permissão de ajuste financeiro exige uma operação administrativa revisada.';
  end if;

  if new.recuperacao_automatica_disponivel is distinct from old.recuperacao_automatica_disponivel then
    raise exception using
      errcode = '42501',
      message = 'O controle de recuperação de senha exige uma operação administrativa auditada.';
  end if;

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
$$;

revoke all on function public.protect_profile_privileged_fields()
  from public, anon, authenticated;
grant execute on function public.protect_profile_privileged_fields()
  to service_role;
