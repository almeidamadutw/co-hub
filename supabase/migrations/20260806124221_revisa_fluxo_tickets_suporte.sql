-- Reestrutura a Central de Chamados sem remover o histórico existente.
-- Esta primeira etapa é retrocompatível com as telas antigas. A restrição das
-- permissões legadas acontece em uma migração separada, depois do deploy.

alter table public.suporte_tickets
  add column if not exists responsavel_id uuid,
  add column if not exists responsavel_nome text,
  add column if not exists assumido_em timestamptz,
  add column if not exists primeira_resposta_em timestamptz,
  add column if not exists resolvido_por_id uuid,
  add column if not exists resolvido_por_nome text;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'suporte_tickets_responsavel_id_fkey'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_responsavel_id_fkey
      foreign key (responsavel_id)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'suporte_tickets_resolvido_por_id_fkey'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_resolvido_por_id_fkey
      foreign key (resolvido_por_id)
      references public.profiles(id)
      on delete set null;
  end if;
end;
$migration$;

-- Normaliza os registros legados antes de adicionar as constraints.
update public.suporte_tickets
set categoria = case lower(btrim(categoria))
  when 'alteração de senha' then 'alteracao_senha'
  when 'alteracao de senha' then 'alteracao_senha'
  when 'problema técnico' then 'problema_tecnico'
  when 'duvida sobre aula' then 'duvida_aula'
  when 'dúvida sobre aula' then 'duvida_aula'
  when 'duvida financeira' then 'duvida_financeira'
  when 'dúvida financeira' then 'duvida_financeira'
  when 'duvida sobre atividade' then 'duvida_atividade'
  when 'dúvida sobre atividade' then 'duvida_atividade'
  else lower(btrim(categoria))
end;

update public.suporte_tickets
set prioridade = case lower(btrim(prioridade))
  when 'normal' then 'media'
  when 'média' then 'media'
  when 'critica' then 'urgente'
  when 'crítica' then 'urgente'
  else lower(btrim(prioridade))
end;

update public.suporte_tickets as ticket
set
  role_usuario = coalesce(
    nullif(lower(btrim(ticket.role_usuario)), ''),
    nullif(lower(btrim(ticket.tipo_usuario)), ''),
    (
      select lower(btrim(perfil.role))
      from public.profiles as perfil
      where perfil.id = ticket.usuario_id
    )
  ),
  tipo_usuario = coalesce(
    nullif(lower(btrim(ticket.tipo_usuario)), ''),
    nullif(lower(btrim(ticket.role_usuario)), ''),
    (
      select lower(btrim(perfil.role))
      from public.profiles as perfil
      where perfil.id = ticket.usuario_id
    )
  ),
  created_at = coalesce(ticket.created_at, ticket.criado_em, now()),
  criado_em = coalesce(ticket.created_at, ticket.criado_em, now()),
  updated_at = coalesce(ticket.updated_at, ticket.atualizado_em, ticket.created_at, now()),
  atualizado_em = coalesce(ticket.updated_at, ticket.atualizado_em, ticket.created_at, now());

update public.suporte_tickets as ticket
set primeira_resposta_em = (
  select mensagem.created_at
  from public.suporte_ticket_mensagens as mensagem
  where mensagem.ticket_id = ticket.id
    and lower(btrim(coalesce(mensagem.autor_role, ''))) = 'suporte'
    and coalesce(mensagem.tipo, 'mensagem') = 'mensagem'
  order by mensagem.created_at asc nulls last
  limit 1
)
where ticket.primeira_resposta_em is null
  and exists (
    select 1
    from public.suporte_ticket_mensagens as mensagem
    where mensagem.ticket_id = ticket.id
      and lower(btrim(coalesce(mensagem.autor_role, ''))) = 'suporte'
      and coalesce(mensagem.tipo, 'mensagem') = 'mensagem'
  );

update public.suporte_tickets as ticket
set
  resolvido_por_id = (
    select mensagem.autor_id
    from public.suporte_ticket_mensagens as mensagem
    where mensagem.ticket_id = ticket.id
      and lower(btrim(coalesce(mensagem.autor_role, ''))) = 'suporte'
    order by mensagem.created_at desc nulls last
    limit 1
  ),
  resolvido_por_nome = (
    select coalesce(mensagem.autor_nome, mensagem.autor_email)
    from public.suporte_ticket_mensagens as mensagem
    where mensagem.ticket_id = ticket.id
      and lower(btrim(coalesce(mensagem.autor_role, ''))) = 'suporte'
    order by mensagem.created_at desc nulls last
    limit 1
  )
where lower(btrim(ticket.status)) = 'resolvido'
  and ticket.resolvido_por_id is null
  and exists (
    select 1
    from public.suporte_ticket_mensagens as mensagem
    where mensagem.ticket_id = ticket.id
      and lower(btrim(coalesce(mensagem.autor_role, ''))) = 'suporte'
  );

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_tickets_status_check'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_status_check
      check (status in ('aberto', 'em_analise', 'respondido', 'resolvido'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_tickets_categoria_check'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_categoria_check
      check (categoria in (
        'problema_tecnico',
        'alteracao_senha',
        'duvida_aula',
        'duvida_financeira',
        'duvida_atividade',
        'outro'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_tickets_prioridade_check'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_prioridade_check
      check (prioridade in ('baixa', 'media', 'alta', 'urgente'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_tickets_assunto_tamanho_check'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_assunto_tamanho_check
      check (char_length(btrim(assunto)) between 3 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_tickets_mensagem_tamanho_check'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_mensagem_tamanho_check
      check (char_length(btrim(mensagem)) between 5 and 5000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'suporte_ticket_mensagens_texto_tamanho_check'
      and conrelid = 'public.suporte_ticket_mensagens'::regclass
  ) then
    alter table public.suporte_ticket_mensagens
      add constraint suporte_ticket_mensagens_texto_tamanho_check
      check (char_length(btrim(mensagem)) between 1 and 5000);
  end if;
end;
$migration$;

create index if not exists idx_suporte_tickets_usuario_updated_at
  on public.suporte_tickets (usuario_id, updated_at desc);

create index if not exists idx_suporte_tickets_responsavel_status
  on public.suporte_tickets (responsavel_id, status, updated_at desc);

create index if not exists idx_suporte_tickets_prioridade_fila
  on public.suporte_tickets (status, prioridade, updated_at desc)
  where status <> 'resolvido';

create index if not exists idx_suporte_tickets_resolvido_por_id
  on public.suporte_tickets (resolvido_por_id)
  where resolvido_por_id is not null;

create index if not exists idx_suporte_ticket_mensagens_autor_id
  on public.suporte_ticket_mensagens (autor_id)
  where autor_id is not null;

create or replace function public.ticket_portal_criar(
  p_actor_id uuid,
  p_categoria text,
  p_assunto text,
  p_mensagem text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_nome text;
  v_email text;
  v_role text;
  v_status text;
  v_excluido_em timestamptz;
  v_categoria text := lower(btrim(coalesce(p_categoria, '')));
  v_assunto text := btrim(coalesce(p_assunto, ''));
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
  v_ticket_id uuid;
begin
  select
    perfil.nome,
    perfil.email,
    lower(btrim(perfil.role)),
    lower(btrim(coalesce(perfil.status, 'ativo'))),
    perfil.excluido_em
  into v_nome, v_email, v_role, v_status, v_excluido_em
  from public.profiles as perfil
  where perfil.id = p_actor_id;

  if v_role is distinct from 'mentorado'
    or v_status <> 'ativo'
    or v_excluido_em is not null
  then
    raise exception 'Usuário sem permissão para abrir chamado.';
  end if;

  if v_categoria not in (
    'problema_tecnico',
    'alteracao_senha',
    'duvida_aula',
    'duvida_financeira',
    'duvida_atividade',
    'outro'
  ) then
    raise exception 'Categoria inválida.';
  end if;

  if char_length(v_assunto) not between 3 and 160 then
    raise exception 'O assunto deve ter entre 3 e 160 caracteres.';
  end if;

  if char_length(v_mensagem) not between 5 and 5000 then
    raise exception 'A mensagem deve ter entre 5 e 5000 caracteres.';
  end if;

  select ticket.id
  into v_ticket_id
  from public.suporte_tickets as ticket
  where ticket.usuario_id = p_actor_id
    and ticket.status <> 'resolvido'
    and lower(btrim(ticket.assunto)) = lower(v_assunto)
    and ticket.created_at >= now() - interval '2 minutes'
  order by ticket.created_at desc
  limit 1;

  if v_ticket_id is not null then
    return v_ticket_id;
  end if;

  insert into public.suporte_tickets (
    usuario_id,
    nome_usuario,
    email_usuario,
    tipo_usuario,
    role_usuario,
    categoria,
    prioridade,
    status,
    assunto,
    mensagem,
    origem,
    criado_em,
    atualizado_em,
    created_at,
    updated_at
  ) values (
    p_actor_id,
    coalesce(v_nome, 'Usuário sem nome'),
    coalesce(v_email, 'E-mail não informado'),
    'mentorado',
    'mentorado',
    v_categoria,
    'media',
    'aberto',
    v_assunto,
    v_mensagem,
    'portal',
    now(),
    now(),
    now(),
    now()
  )
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;

create or replace function public.ticket_portal_responder(
  p_actor_id uuid,
  p_ticket_id uuid,
  p_mensagem text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_nome text;
  v_email text;
  v_role text;
  v_status_perfil text;
  v_excluido_em timestamptz;
  v_ticket_usuario_id uuid;
  v_ticket_status text;
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
begin
  select
    perfil.nome,
    perfil.email,
    lower(btrim(perfil.role)),
    lower(btrim(coalesce(perfil.status, 'ativo'))),
    perfil.excluido_em
  into v_nome, v_email, v_role, v_status_perfil, v_excluido_em
  from public.profiles as perfil
  where perfil.id = p_actor_id;

  if v_role is distinct from 'mentorado'
    or v_status_perfil <> 'ativo'
    or v_excluido_em is not null
  then
    raise exception 'Usuário sem permissão para responder chamado.';
  end if;

  if char_length(v_mensagem) not between 1 and 5000 then
    raise exception 'A resposta deve ter entre 1 e 5000 caracteres.';
  end if;

  select ticket.usuario_id, ticket.status
  into v_ticket_usuario_id, v_ticket_status
  from public.suporte_tickets as ticket
  where ticket.id = p_ticket_id
  for update;

  if not found then
    raise exception 'Chamado não encontrado.';
  end if;

  if v_ticket_usuario_id is distinct from p_actor_id then
    raise exception 'Você não pode responder este chamado.';
  end if;

  if v_ticket_status = 'resolvido' then
    raise exception 'Este chamado foi resolvido e não aceita novas mensagens.';
  end if;

  insert into public.suporte_ticket_mensagens (
    ticket_id,
    autor_id,
    autor_nome,
    autor_email,
    autor_role,
    mensagem,
    tipo,
    created_at
  ) values (
    p_ticket_id,
    p_actor_id,
    v_nome,
    v_email,
    'mentorado',
    v_mensagem,
    'mensagem',
    now()
  );

  update public.suporte_tickets
  set
    status = 'aberto',
    updated_at = now(),
    atualizado_em = now()
  where id = p_ticket_id;
end;
$$;

create or replace function public.ticket_suporte_operar(
  p_actor_id uuid,
  p_ticket_id uuid,
  p_acao text,
  p_mensagem text default null,
  p_prioridade text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_nome text;
  v_actor_email text;
  v_actor_role text;
  v_actor_status text;
  v_actor_acesso_suporte boolean;
  v_actor_excluido_em timestamptz;
  v_acao text := lower(btrim(coalesce(p_acao, '')));
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
  v_prioridade text := lower(btrim(coalesce(p_prioridade, '')));
  v_ticket public.suporte_tickets%rowtype;
  v_status_novo text;
  v_descricao text;
  v_log_acao text;
  v_inserir_sistema boolean := false;
begin
  select
    perfil.nome,
    perfil.email,
    lower(btrim(perfil.role)),
    lower(btrim(coalesce(perfil.status, 'ativo'))),
    coalesce(perfil.acesso_suporte, false),
    perfil.excluido_em
  into
    v_actor_nome,
    v_actor_email,
    v_actor_role,
    v_actor_status,
    v_actor_acesso_suporte,
    v_actor_excluido_em
  from public.profiles as perfil
  where perfil.id = p_actor_id;

  if (v_actor_role is distinct from 'suporte' and not v_actor_acesso_suporte)
    or v_actor_status <> 'ativo'
    or v_actor_excluido_em is not null
  then
    raise exception 'Usuário sem permissão para operar chamados.';
  end if;

  select ticket.*
  into v_ticket
  from public.suporte_tickets as ticket
  where ticket.id = p_ticket_id
  for update;

  if not found then
    raise exception 'Chamado não encontrado.';
  end if;

  if v_ticket.status = 'resolvido' then
    raise exception 'Este chamado já foi resolvido.';
  end if;

  if v_acao = 'assumir' then
    if v_ticket.responsavel_id = p_actor_id and v_ticket.status = 'em_analise' then
      raise exception 'Este chamado já está sob sua responsabilidade.';
    end if;

    v_status_novo := case
      when v_ticket.status = 'aberto' then 'em_analise'
      else v_ticket.status
    end;
    v_descricao := 'Chamado assumido por ' || coalesce(v_actor_nome, v_actor_email, 'Suporte') || '.';
    v_log_acao := 'ticket_assumido';
    v_inserir_sistema := true;

    update public.suporte_tickets
    set
      responsavel_id = p_actor_id,
      responsavel_nome = coalesce(v_actor_nome, v_actor_email, 'Suporte'),
      assumido_em = now(),
      status = v_status_novo,
      updated_at = now(),
      atualizado_em = now()
    where id = p_ticket_id;

  elsif v_acao = 'prioridade' then
    if v_prioridade not in ('baixa', 'media', 'alta', 'urgente') then
      raise exception 'Prioridade inválida.';
    end if;

    if v_prioridade = v_ticket.prioridade then
      raise exception 'O chamado já possui essa prioridade.';
    end if;

    v_status_novo := v_ticket.status;
    v_descricao := 'Prioridade alterada de ' || v_ticket.prioridade || ' para ' || v_prioridade || '.';
    v_log_acao := 'ticket_prioridade_alterada';
    v_inserir_sistema := true;

    update public.suporte_tickets
    set
      prioridade = v_prioridade,
      updated_at = now(),
      atualizado_em = now()
    where id = p_ticket_id;

  elsif v_acao = 'em_analise' then
    if v_ticket.status = 'em_analise' then
      raise exception 'Este chamado já está em análise.';
    end if;

    v_status_novo := 'em_analise';
    v_descricao := 'Status alterado para em análise.';
    v_log_acao := 'ticket_status_alterado';
    v_inserir_sistema := true;

    update public.suporte_tickets
    set
      status = 'em_analise',
      responsavel_id = coalesce(responsavel_id, p_actor_id),
      responsavel_nome = coalesce(responsavel_nome, v_actor_nome, v_actor_email, 'Suporte'),
      assumido_em = coalesce(assumido_em, now()),
      updated_at = now(),
      atualizado_em = now()
    where id = p_ticket_id;

  elsif v_acao = 'responder' then
    if char_length(v_mensagem) not between 1 and 5000 then
      raise exception 'A resposta deve ter entre 1 e 5000 caracteres.';
    end if;

    v_status_novo := 'respondido';
    v_descricao := 'Resposta enviada ao usuário.';
    v_log_acao := 'ticket_respondido';

    insert into public.suporte_ticket_mensagens (
      ticket_id,
      autor_id,
      autor_nome,
      autor_email,
      autor_role,
      mensagem,
      tipo,
      created_at
    ) values (
      p_ticket_id,
      p_actor_id,
      v_actor_nome,
      v_actor_email,
      'suporte',
      v_mensagem,
      'mensagem',
      now()
    );

    update public.suporte_tickets
    set
      status = 'respondido',
      resposta = v_mensagem,
      responsavel_id = coalesce(responsavel_id, p_actor_id),
      responsavel_nome = coalesce(responsavel_nome, v_actor_nome, v_actor_email, 'Suporte'),
      assumido_em = coalesce(assumido_em, now()),
      primeira_resposta_em = coalesce(primeira_resposta_em, now()),
      updated_at = now(),
      atualizado_em = now()
    where id = p_ticket_id;

  elsif v_acao = 'resolver' then
    if v_mensagem = '' and v_ticket.status <> 'respondido' then
      raise exception 'Envie uma orientação antes de resolver o chamado.';
    end if;

    if char_length(v_mensagem) > 5000 then
      raise exception 'A resposta deve ter no máximo 5000 caracteres.';
    end if;

    v_status_novo := 'resolvido';
    v_descricao := 'Chamado resolvido.';
    v_log_acao := 'ticket_resolvido';

    if v_mensagem <> '' then
      insert into public.suporte_ticket_mensagens (
        ticket_id,
        autor_id,
        autor_nome,
        autor_email,
        autor_role,
        mensagem,
        tipo,
        created_at
      ) values (
        p_ticket_id,
        p_actor_id,
        v_actor_nome,
        v_actor_email,
        'suporte',
        v_mensagem,
        'mensagem',
        now()
      );
    else
      v_inserir_sistema := true;
      v_descricao := 'Chamado encerrado após a orientação enviada pelo suporte.';
    end if;

    update public.suporte_tickets
    set
      status = 'resolvido',
      resposta = case when v_mensagem <> '' then v_mensagem else resposta end,
      responsavel_id = coalesce(responsavel_id, p_actor_id),
      responsavel_nome = coalesce(responsavel_nome, v_actor_nome, v_actor_email, 'Suporte'),
      assumido_em = coalesce(assumido_em, now()),
      primeira_resposta_em = case
        when v_mensagem <> '' then coalesce(primeira_resposta_em, now())
        else primeira_resposta_em
      end,
      resolvido_em = now(),
      resolvido_por_id = p_actor_id,
      resolvido_por_nome = coalesce(v_actor_nome, v_actor_email, 'Suporte'),
      updated_at = now(),
      atualizado_em = now()
    where id = p_ticket_id;

  else
    raise exception 'Ação de chamado inválida.';
  end if;

  if v_inserir_sistema then
    insert into public.suporte_ticket_mensagens (
      ticket_id,
      autor_id,
      autor_nome,
      autor_email,
      autor_role,
      mensagem,
      tipo,
      created_at
    ) values (
      p_ticket_id,
      p_actor_id,
      v_actor_nome,
      v_actor_email,
      'suporte',
      v_descricao,
      'sistema',
      now()
    );
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
    p_actor_id,
    v_actor_nome,
    v_actor_email,
    v_log_acao,
    'suporte_tickets',
    p_ticket_id,
    v_descricao,
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'assunto', v_ticket.assunto,
      'usuario_id', v_ticket.usuario_id,
      'status_anterior', v_ticket.status,
      'status_novo', v_status_novo,
      'prioridade_anterior', v_ticket.prioridade,
      'prioridade_nova', case when v_acao = 'prioridade' then v_prioridade else v_ticket.prioridade end,
      'responsavel_anterior', v_ticket.responsavel_id,
      'responsavel_novo', case when v_acao = 'assumir' then p_actor_id else v_ticket.responsavel_id end,
      'teve_mensagem', v_mensagem <> ''
    ),
    now()
  );
end;
$$;

revoke all on function public.ticket_portal_criar(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.ticket_portal_responder(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.ticket_suporte_operar(uuid, uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.ticket_portal_criar(uuid, text, text, text)
  to service_role;
grant execute on function public.ticket_portal_responder(uuid, uuid, text)
  to service_role;
grant execute on function public.ticket_suporte_operar(uuid, uuid, text, text, text)
  to service_role;

comment on function public.ticket_portal_criar(uuid, text, text, text) is
  'Cria chamado em transação. Uso exclusivo da API autenticada com service_role.';
comment on function public.ticket_portal_responder(uuid, uuid, text) is
  'Registra resposta do mentorado em transação. Uso exclusivo da API autenticada.';
comment on function public.ticket_suporte_operar(uuid, uuid, text, text, text) is
  'Opera atribuição, prioridade, resposta e resolução com auditoria. Uso exclusivo da API.';
