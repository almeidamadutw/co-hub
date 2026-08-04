-- Separa a gestão financeira da operação de Suporte/T.I.
-- Mirelen mantém a gestão normal; somente a conta administrativa indicada
-- pode corrigir dados operacionais, sempre com motivo e auditoria.

alter table public.profiles
  add column if not exists acesso_ajuste_financeiro boolean not null default false;

comment on column public.profiles.acesso_ajuste_financeiro is
  'Permissão individual para ajustes administrativos auditados no Financeiro. Não é herdada pela role suporte.';

-- A permissão é intencionalmente individual. Uma nova concessão futura deve
-- acontecer em outra migração revisada, nunca pela tela comum de usuários.
update public.profiles
set acesso_ajuste_financeiro = false
where acesso_ajuste_financeiro is distinct from false;

do $$
declare
  v_afetados integer;
begin
  update public.profiles
  set
    acesso_ajuste_financeiro = true,
    updated_at = now()
  where lower(btrim(email)) = 'suporte@ceoclubmentoria.com.br'
    and excluido_em is null;

  get diagnostics v_afetados = row_count;

  if v_afetados <> 1 then
    raise exception 'A conta autorizada para ajuste financeiro não foi encontrada de forma única.';
  end if;
end
$$;

-- Mirelen é a responsável pela gestão financeira. O acesso adicional ao
-- Suporte é preservado e continua independente da role principal.
do $$
declare
  v_afetados integer;
begin
  update public.profiles
  set
    role = 'financeiro',
    updated_at = now()
  where lower(btrim(email)) = 'mirelensuporte@ceoclubmentoria.com.br'
    and excluido_em is null;

  get diagnostics v_afetados = row_count;

  if v_afetados <> 1 then
    raise exception 'A conta da responsável financeira não foi encontrada de forma única.';
  end if;
end
$$;

create or replace function public.pode_ajustar_financeiro()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles perfil
    where perfil.id = auth.uid()
      and coalesce(perfil.acesso_ajuste_financeiro, false)
      and perfil.excluido_em is null
      and lower(btrim(coalesce(perfil.status, 'ativo'))) = 'ativo'
  );
$$;

revoke all on function public.pode_ajustar_financeiro() from public, anon;
grant execute on function public.pode_ajustar_financeiro()
  to authenticated, service_role;

-- A flag nova não pode ser concedida pelo próprio usuário nem por uma
-- atualização direta feita por outro perfil de Suporte. Apenas operações
-- administrativas sem auth.uid(), como esta migração, podem alterá-la.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Rotas administrativas validadas no servidor usam a secret key e não
  -- carregam auth.uid(); elas continuam responsáveis pela autorização.
  if auth.uid() is null then
    return new;
  end if;

  if new.acesso_ajuste_financeiro is distinct from old.acesso_ajuste_financeiro then
    raise exception using
      errcode = '42501',
      message = 'A permissão de ajuste financeiro exige uma operação administrativa revisada.';
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
$$;

alter table public.financeiro_cobrancas_historico
  add column if not exists origem text not null default 'gestao',
  add column if not exists motivo text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financeiro_historico_origem_check'
      and conrelid = 'public.financeiro_cobrancas_historico'::regclass
  ) then
    alter table public.financeiro_cobrancas_historico
      add constraint financeiro_historico_origem_check
      check (origem in ('gestao', 'ajuste_administrativo', 'sistema'));
  end if;
end
$$;

create or replace function private.registrar_historico_financeiro()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_origem text := coalesce(
    nullif(current_setting('app.financeiro_origem', true), ''),
    'gestao'
  );
  v_motivo text := nullif(
    current_setting('app.financeiro_motivo', true),
    ''
  );
begin
  if tg_op = 'INSERT' then
    insert into public.financeiro_cobrancas_historico (
      cobranca_id,
      grupo_id,
      acao,
      status_novo,
      dados_novos,
      alterado_por,
      origem,
      motivo
    ) values (
      new.id,
      new.grupo_id,
      'criado',
      new.status,
      to_jsonb(new),
      coalesce(new.criado_por, auth.uid()),
      v_origem,
      v_motivo
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.financeiro_cobrancas_historico (
      cobranca_id,
      grupo_id,
      acao,
      status_anterior,
      status_novo,
      dados_anteriores,
      dados_novos,
      alterado_por,
      origem,
      motivo
    ) values (
      new.id,
      new.grupo_id,
      'atualizado',
      old.status,
      new.status,
      to_jsonb(old),
      to_jsonb(new),
      coalesce(new.atualizado_por, auth.uid()),
      v_origem,
      v_motivo
    );
    return new;
  end if;

  insert into public.financeiro_cobrancas_historico (
    cobranca_id,
    grupo_id,
    acao,
    status_anterior,
    dados_anteriores,
    alterado_por,
    origem,
    motivo
  ) values (
    old.id,
    old.grupo_id,
    'excluido',
    old.status,
    to_jsonb(old),
    auth.uid(),
    v_origem,
    v_motivo
  );
  return old;
end;
$$;

revoke all on function private.registrar_historico_financeiro() from public;

-- Mentora mantém a visão estratégica, mas somente o perfil Financeiro pode
-- criar ou alterar cobranças pela gestão normal.
drop policy if exists financeiro_gestao_visualiza
  on public.financeiro_cobrancas;
create policy financeiro_gestao_visualiza
on public.financeiro_cobrancas
for select
to authenticated
using (
  (select public.is_mentor())
  or (select public.is_financeiro())
);

drop policy if exists financeiro_gestao_insere
  on public.financeiro_cobrancas;
create policy financeiro_gestao_insere
on public.financeiro_cobrancas
for insert
to authenticated
with check ((select public.is_financeiro()));

drop policy if exists financeiro_gestao_atualiza
  on public.financeiro_cobrancas;
create policy financeiro_gestao_atualiza
on public.financeiro_cobrancas
for update
to authenticated
using ((select public.is_financeiro()))
with check ((select public.is_financeiro()));

drop policy if exists financeiro_visualiza_historico
  on public.financeiro_cobrancas_historico;
create policy financeiro_visualiza_historico
on public.financeiro_cobrancas_historico
for select
to authenticated
using (
  (select public.is_mentor())
  or (select public.is_financeiro())
);

drop policy if exists financeiro_visualiza_mentorados on public.profiles;
create policy financeiro_visualiza_mentorados
on public.profiles
for select
to authenticated
using (
  lower(btrim(role)) = 'mentorado'
  and (select public.is_financeiro())
);

-- Ajuste individual: não cria, não exclui e não altera valores ou conteúdo
-- interno. Toda chamada exige um motivo e produz uma entrada de auditoria.
create or replace function public.financeiro_ajustar_cobranca(
  p_cobranca_id uuid,
  p_data_vencimento date,
  p_data_pagamento date,
  p_forma_pagamento text,
  p_status text,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_cobranca public.financeiro_cobrancas%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_forma_pagamento text := nullif(btrim(coalesce(p_forma_pagamento, '')), '');
begin
  if v_usuario_id is null or not public.pode_ajustar_financeiro() then
    raise exception using
      errcode = '42501',
      message = 'Sua conta não possui permissão para ajuste administrativo financeiro.';
  end if;

  if char_length(v_motivo) < 10 or char_length(v_motivo) > 500 then
    raise exception 'Informe um motivo entre 10 e 500 caracteres.';
  end if;

  if p_data_vencimento is null then
    raise exception 'Informe a data de vencimento.';
  end if;

  if p_status not in ('Pago', 'Pendente', 'Atrasado', 'Cancelado') then
    raise exception 'Status financeiro inválido.';
  end if;

  if v_forma_pagamento is not null
    and v_forma_pagamento not in ('Crédito', 'Débito', 'Pix', 'Boleto', 'Dinheiro')
  then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if (p_status = 'Pago' and p_data_pagamento is null)
    or (p_status <> 'Pago' and p_data_pagamento is not null)
  then
    raise exception 'A data de pagamento deve existir somente quando o status for Pago.';
  end if;

  select cobranca.*
  into v_cobranca
  from public.financeiro_cobrancas cobranca
  where cobranca.id = p_cobranca_id
  for update;

  if not found then
    raise exception 'Cobrança não encontrada.';
  end if;

  if v_cobranca.data_vencimento is not distinct from p_data_vencimento
    and v_cobranca.data_pagamento is not distinct from p_data_pagamento
    and v_cobranca.forma_pagamento is not distinct from v_forma_pagamento
    and v_cobranca.status is not distinct from p_status
  then
    raise exception 'Nenhuma alteração foi informada.';
  end if;

  perform set_config('app.financeiro_origem', 'ajuste_administrativo', true);
  perform set_config('app.financeiro_motivo', v_motivo, true);

  update public.financeiro_cobrancas
  set
    data_vencimento = p_data_vencimento,
    data_pagamento = p_data_pagamento,
    forma_pagamento = v_forma_pagamento,
    status = p_status,
    atualizado_por = v_usuario_id,
    updated_at = now()
  where id = p_cobranca_id;

  return p_cobranca_id;
end;
$$;

revoke all on function public.financeiro_ajustar_cobranca(
  uuid, date, date, text, text, text
) from public, anon;
grant execute on function public.financeiro_ajustar_cobranca(
  uuid, date, date, text, text, text
) to authenticated, service_role;

-- Recria a visão técnica com motivo e autoria legíveis, sem liberar snapshots,
-- observações internas ou outros campos financeiros sensíveis.
drop function if exists public.financeiro_listar_historico_suporte(integer);

create function public.financeiro_listar_historico_suporte(
  p_limite integer default 30
)
returns table (
  id uuid,
  cobranca_id uuid,
  grupo_id uuid,
  acao text,
  status_anterior text,
  status_novo text,
  origem text,
  motivo text,
  alterado_por uuid,
  alterado_por_nome text,
  alterado_por_email text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_suporte() then
    raise exception 'Apenas o suporte pode consultar este histórico técnico.';
  end if;

  return query
  select
    historico.id,
    historico.cobranca_id,
    historico.grupo_id,
    historico.acao,
    historico.status_anterior,
    historico.status_novo,
    historico.origem,
    historico.motivo,
    historico.alterado_por,
    perfil.nome,
    perfil.email,
    historico.created_at
  from public.financeiro_cobrancas_historico historico
  left join public.profiles perfil on perfil.id = historico.alterado_por
  order by historico.created_at desc
  limit least(greatest(coalesce(p_limite, 30), 1), 100);
end;
$$;

revoke all on function public.financeiro_listar_historico_suporte(integer)
  from public, anon;
grant execute on function public.financeiro_listar_historico_suporte(integer)
  to authenticated, service_role;

comment on function public.financeiro_ajustar_cobranca(
  uuid, date, date, text, text, text
) is 'Ajuste administrativo individual e auditado, sem permissão para alterar valores ou excluir cobranças.';
comment on function public.financeiro_listar_historico_suporte(integer) is
  'Histórico técnico com origem, motivo e autoria, sem snapshots ou observações internas.';
