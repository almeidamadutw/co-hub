-- Financeiro CEO Club
-- Consolida permissões por perfil, cria agrupamento/auditoria e oferece ao
-- mentorado uma leitura segura sem a observação interna da equipe.

alter table public.financeiro_cobrancas
  add column if not exists grupo_id uuid,
  add column if not exists criado_por uuid,
  add column if not exists atualizado_por uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_cobrancas_criado_por_fkey'
      and conrelid = 'public.financeiro_cobrancas'::regclass
  ) then
    alter table public.financeiro_cobrancas
      add constraint financeiro_cobrancas_criado_por_fkey
      foreign key (criado_por) references public.profiles(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_cobrancas_atualizado_por_fkey'
      and conrelid = 'public.financeiro_cobrancas'::regclass
  ) then
    alter table public.financeiro_cobrancas
      add constraint financeiro_cobrancas_atualizado_por_fkey
      foreign key (atualizado_por) references public.profiles(id) on delete set null
      not valid;
  end if;
end
$$;

alter table public.financeiro_cobrancas
  validate constraint financeiro_cobrancas_criado_por_fkey;
alter table public.financeiro_cobrancas
  validate constraint financeiro_cobrancas_atualizado_por_fkey;

-- Agrupa as parcelas legadas pelo mentorado, cobrança, quantidade e mês-base.
with grupos as materialized (
  select
    mentorado_id,
    titulo,
    quantidade_parcelas,
    (
      extract(year from data_vencimento)::integer * 12
      + extract(month from data_vencimento)::integer
      - parcela_atual
    ) as mes_base,
    gen_random_uuid() as grupo_id
  from public.financeiro_cobrancas
  where grupo_id is null
  group by
    mentorado_id,
    titulo,
    quantidade_parcelas,
    (
      extract(year from data_vencimento)::integer * 12
      + extract(month from data_vencimento)::integer
      - parcela_atual
    )
)
update public.financeiro_cobrancas cobranca
set grupo_id = grupos.grupo_id
from grupos
where cobranca.grupo_id is null
  and cobranca.mentorado_id is not distinct from grupos.mentorado_id
  and cobranca.titulo is not distinct from grupos.titulo
  and cobranca.quantidade_parcelas = grupos.quantidade_parcelas
  and (
    extract(year from cobranca.data_vencimento)::integer * 12
    + extract(month from cobranca.data_vencimento)::integer
    - cobranca.parcela_atual
  ) = grupos.mes_base;

update public.financeiro_cobrancas
set grupo_id = gen_random_uuid()
where grupo_id is null;

alter table public.financeiro_cobrancas
  alter column grupo_id set not null,
  alter column mentorado_id set not null,
  alter column titulo set not null,
  alter column data_vencimento set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_cobrancas_titulo_preenchido_check'
      and conrelid = 'public.financeiro_cobrancas'::regclass
  ) then
    alter table public.financeiro_cobrancas
      add constraint financeiro_cobrancas_titulo_preenchido_check
      check (char_length(btrim(titulo)) between 1 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_cobrancas_status_check'
      and conrelid = 'public.financeiro_cobrancas'::regclass
  ) then
    alter table public.financeiro_cobrancas
      add constraint financeiro_cobrancas_status_check
      check (status in ('Pago', 'Pendente', 'Atrasado', 'Cancelado'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_cobrancas_valores_positivos_check'
      and conrelid = 'public.financeiro_cobrancas'::regclass
  ) then
    alter table public.financeiro_cobrancas
      add constraint financeiro_cobrancas_valores_positivos_check
      check (valor_total > 0 and valor_parcela > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_cobrancas_parcelas_validas_check'
      and conrelid = 'public.financeiro_cobrancas'::regclass
  ) then
    alter table public.financeiro_cobrancas
      add constraint financeiro_cobrancas_parcelas_validas_check
      check (
        quantidade_parcelas between 1 and 120
        and parcela_atual between 1 and quantidade_parcelas
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_cobrancas_pagamento_coerente_check'
      and conrelid = 'public.financeiro_cobrancas'::regclass
  ) then
    alter table public.financeiro_cobrancas
      add constraint financeiro_cobrancas_pagamento_coerente_check
      check (
        (status = 'Pago' and data_pagamento is not null)
        or (status <> 'Pago' and data_pagamento is null)
      );
  end if;
end
$$;

create index if not exists financeiro_cobrancas_mentorado_vencimento_idx
  on public.financeiro_cobrancas (mentorado_id, data_vencimento);
create index if not exists financeiro_cobrancas_status_vencimento_idx
  on public.financeiro_cobrancas (status, data_vencimento);
create index if not exists financeiro_cobrancas_grupo_parcela_idx
  on public.financeiro_cobrancas (grupo_id, parcela_atual);

-- Histórico imutável das alterações financeiras.
create table if not exists public.financeiro_cobrancas_historico (
  id uuid primary key default gen_random_uuid(),
  cobranca_id uuid,
  grupo_id uuid,
  acao text not null check (acao in ('criado', 'atualizado', 'excluido')),
  status_anterior text,
  status_novo text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  alterado_por uuid,
  created_at timestamptz not null default now()
);

alter table public.financeiro_cobrancas_historico enable row level security;

create index if not exists financeiro_historico_cobranca_created_idx
  on public.financeiro_cobrancas_historico (cobranca_id, created_at desc);
create index if not exists financeiro_historico_grupo_created_idx
  on public.financeiro_cobrancas_historico (grupo_id, created_at desc);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.registrar_historico_financeiro()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.financeiro_cobrancas_historico (
      cobranca_id, grupo_id, acao, status_novo, dados_novos, alterado_por
    ) values (
      new.id, new.grupo_id, 'criado', new.status, to_jsonb(new), auth.uid()
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
      alterado_por
    ) values (
      new.id,
      new.grupo_id,
      'atualizado',
      old.status,
      new.status,
      to_jsonb(old),
      to_jsonb(new),
      coalesce(new.atualizado_por, auth.uid())
    );
    return new;
  end if;

  insert into public.financeiro_cobrancas_historico (
    cobranca_id,
    grupo_id,
    acao,
    status_anterior,
    dados_anteriores,
    alterado_por
  ) values (
    old.id, old.grupo_id, 'excluido', old.status, to_jsonb(old), auth.uid()
  );
  return old;
end;
$$;

revoke all on function private.registrar_historico_financeiro() from public;

drop trigger if exists financeiro_cobrancas_historico_trigger
  on public.financeiro_cobrancas;
create trigger financeiro_cobrancas_historico_trigger
after insert or update or delete on public.financeiro_cobrancas
for each row execute function private.registrar_historico_financeiro();

-- Corrige somente diferenças de arredondamento inferiores a R$ 1 na última
-- parcela. No estado auditado antes desta migration, são três contratos:
-- -R$ 0,08, +R$ 0,26 e +R$ 0,04. O trigger acima preserva antes/depois.
with totais as (
  select
    grupo_id,
    max(valor_total) as valor_total,
    sum(valor_parcela) as soma_parcelas
  from public.financeiro_cobrancas
  group by grupo_id
), ultimas as (
  select distinct on (cobranca.grupo_id)
    cobranca.id,
    cobranca.grupo_id,
    cobranca.valor_parcela,
    totais.valor_total - totais.soma_parcelas as ajuste
  from public.financeiro_cobrancas cobranca
  join totais on totais.grupo_id = cobranca.grupo_id
  where abs(totais.valor_total - totais.soma_parcelas) between 0.001 and 0.999
  order by cobranca.grupo_id, cobranca.parcela_atual desc, cobranca.id
)
update public.financeiro_cobrancas cobranca
set
  valor_parcela = round((cobranca.valor_parcela + ultimas.ajuste)::numeric, 2),
  updated_at = now()
from ultimas
where cobranca.id = ultimas.id;

-- Remove o conjunto de policies duplicadas/legadas e recria um modelo claro:
-- mentorado lê somente via RPC segura; suporte lê; mentor/financeiro gerenciam.
create or replace function public.is_financeiro()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles perfil
    where perfil.id = auth.uid()
      and lower(btrim(perfil.role)) = 'financeiro'
      and perfil.excluido_em is null
  );
$$;

revoke all on function public.is_financeiro() from public, anon;
grant execute on function public.is_financeiro() to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financeiro_cobrancas'
  loop
    execute format(
      'drop policy if exists %I on public.financeiro_cobrancas',
      policy_record.policyname
    );
  end loop;
end
$$;

create policy financeiro_gestao_visualiza
on public.financeiro_cobrancas
for select
to authenticated
using (
  public.is_mentor()
  or public.is_financeiro()
);

create policy financeiro_gestao_insere
on public.financeiro_cobrancas
for insert
to authenticated
with check (
  public.is_mentor()
  or public.is_financeiro()
);

create policy financeiro_gestao_atualiza
on public.financeiro_cobrancas
for update
to authenticated
using (
  public.is_mentor()
  or public.is_financeiro()
)
with check (
  public.is_mentor()
  or public.is_financeiro()
);

drop policy if exists financeiro_visualiza_historico
  on public.financeiro_cobrancas_historico;
create policy financeiro_visualiza_historico
on public.financeiro_cobrancas_historico
for select
to authenticated
using (
  public.is_mentor()
  or public.is_financeiro()
);

-- O perfil financeiro precisa dos dados mínimos dos mentorados para operar.
drop policy if exists financeiro_visualiza_mentorados on public.profiles;
create policy financeiro_visualiza_mentorados
on public.profiles
for select
to authenticated
using (
  lower(btrim(role)) = 'mentorado'
  and public.is_financeiro()
);

-- Retorna apenas os campos que o mentorado pode conhecer. Observação interna,
-- autoria e snapshots de auditoria nunca saem desta função.
create or replace function public.financeiro_listar_minhas_cobrancas()
returns table (
  id uuid,
  grupo_id uuid,
  mentorado_id uuid,
  titulo text,
  descricao text,
  valor_total numeric,
  quantidade_parcelas integer,
  parcela_atual integer,
  valor_parcela numeric,
  data_vencimento date,
  data_pagamento date,
  forma_pagamento text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  role_atual text;
begin
  select lower(btrim(perfil.role))
  into role_atual
  from public.profiles perfil
  where perfil.id = auth.uid()
    and perfil.excluido_em is null;

  if role_atual is distinct from 'mentorado' then
    raise exception 'Apenas o mentorado pode consultar esta visão financeira.';
  end if;

  return query
  select
    cobranca.id,
    cobranca.grupo_id,
    cobranca.mentorado_id,
    cobranca.titulo,
    cobranca.descricao,
    cobranca.valor_total,
    cobranca.quantidade_parcelas,
    cobranca.parcela_atual,
    cobranca.valor_parcela,
    cobranca.data_vencimento,
    cobranca.data_pagamento,
    cobranca.forma_pagamento,
    cobranca.status,
    cobranca.created_at,
    cobranca.updated_at
  from public.financeiro_cobrancas cobranca
  where cobranca.mentorado_id = auth.uid()
  order by cobranca.data_vencimento, cobranca.parcela_atual;
end;
$$;

revoke all on function public.financeiro_listar_minhas_cobrancas()
  from public, anon;
grant execute on function public.financeiro_listar_minhas_cobrancas()
  to authenticated;

-- Visão operacional de Suporte/T.I.: suficiente para diagnosticar totais,
-- vencimentos e integridade, sem descrição, observação ou autoria da gestão.
create or replace function public.financeiro_listar_cobrancas_suporte()
returns table (
  id uuid,
  grupo_id uuid,
  mentorado_id uuid,
  titulo text,
  valor_total numeric,
  quantidade_parcelas integer,
  parcela_atual integer,
  valor_parcela numeric,
  data_vencimento date,
  data_pagamento date,
  forma_pagamento text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_suporte() then
    raise exception 'Apenas o suporte pode consultar esta visão financeira.';
  end if;

  return query
  select
    cobranca.id,
    cobranca.grupo_id,
    cobranca.mentorado_id,
    cobranca.titulo,
    cobranca.valor_total,
    cobranca.quantidade_parcelas,
    cobranca.parcela_atual,
    cobranca.valor_parcela,
    cobranca.data_vencimento,
    cobranca.data_pagamento,
    cobranca.forma_pagamento,
    cobranca.status,
    cobranca.created_at,
    cobranca.updated_at
  from public.financeiro_cobrancas cobranca
  order by cobranca.data_vencimento, cobranca.parcela_atual;
end;
$$;

revoke all on function public.financeiro_listar_cobrancas_suporte()
  from public, anon;
grant execute on function public.financeiro_listar_cobrancas_suporte()
  to authenticated;

-- Suporte recebe apenas metadados técnicos do histórico. Os snapshots JSON
-- podem conter observações internas e permanecem restritos à gestão.
create or replace function public.financeiro_listar_historico_suporte(
  p_limite integer default 30
)
returns table (
  id uuid,
  cobranca_id uuid,
  grupo_id uuid,
  acao text,
  status_anterior text,
  status_novo text,
  alterado_por uuid,
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
    historico.alterado_por,
    historico.created_at
  from public.financeiro_cobrancas_historico historico
  order by historico.created_at desc
  limit least(greatest(coalesce(p_limite, 30), 1), 100);
end;
$$;

revoke all on function public.financeiro_listar_historico_suporte(integer)
  from public, anon;
grant execute on function public.financeiro_listar_historico_suporte(integer)
  to authenticated;

-- Criação transacional: preserva o dia do vencimento e ajusta a última
-- parcela em centavos para que a soma feche exatamente o valor total.
create or replace function public.financeiro_criar_cobranca(
  p_mentorado_id uuid,
  p_titulo text,
  p_descricao text,
  p_valor_total numeric,
  p_quantidade_parcelas integer,
  p_data_vencimento date,
  p_forma_pagamento text,
  p_status_inicial text,
  p_observacao text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_grupo_id uuid := gen_random_uuid();
  v_total_centavos bigint;
  v_valor_base_centavos bigint;
  v_valor_parcela_centavos bigint;
  v_inicio_mes date;
  v_vencimento date;
  v_dia integer;
  v_ultimo_dia integer;
  v_indice integer;
  v_status text;
begin
  if p_mentorado_id is null
    or nullif(btrim(coalesce(p_titulo, '')), '') is null
    or p_data_vencimento is null
    or coalesce(p_valor_total, 0) <= 0
    or coalesce(p_quantidade_parcelas, 0) < 1
    or p_quantidade_parcelas > 120
    or char_length(btrim(coalesce(p_titulo, ''))) > 160
  then
    raise exception 'Informe mentorado, título, valor, de 1 a 120 parcelas e vencimento.';
  end if;

  if coalesce(p_status_inicial, '') not in ('Pago', 'Pendente', 'Atrasado', 'Cancelado') then
    raise exception 'Status financeiro inválido.';
  end if;

  if p_forma_pagamento is not null
    and p_forma_pagamento not in ('Crédito', 'Débito', 'Pix', 'Boleto', 'Dinheiro')
  then
    raise exception 'Forma de pagamento inválida.';
  end if;

  v_total_centavos := round(p_valor_total * 100)::bigint;
  v_valor_base_centavos := floor(v_total_centavos::numeric / p_quantidade_parcelas)::bigint;
  v_dia := extract(day from p_data_vencimento)::integer;

  for v_indice in 0..(p_quantidade_parcelas - 1) loop
    v_inicio_mes := (
      date_trunc('month', p_data_vencimento)::date
      + make_interval(months => v_indice)
    )::date;
    v_ultimo_dia := extract(
      day from (v_inicio_mes + interval '1 month - 1 day')
    )::integer;
    v_vencimento := v_inicio_mes + (least(v_dia, v_ultimo_dia) - 1);
    v_valor_parcela_centavos := case
      when v_indice = p_quantidade_parcelas - 1
        then v_total_centavos - (v_valor_base_centavos * (p_quantidade_parcelas - 1))
      else v_valor_base_centavos
    end;
    v_status := case when v_indice = 0 then p_status_inicial else 'Pendente' end;

    insert into public.financeiro_cobrancas (
      grupo_id,
      mentorado_id,
      titulo,
      descricao,
      valor_total,
      quantidade_parcelas,
      parcela_atual,
      valor_parcela,
      data_vencimento,
      data_pagamento,
      forma_pagamento,
      status,
      observacao,
      criado_por,
      atualizado_por,
      updated_at
    ) values (
      v_grupo_id,
      p_mentorado_id,
      btrim(p_titulo),
      nullif(btrim(coalesce(p_descricao, '')), ''),
      round(p_valor_total, 2),
      p_quantidade_parcelas,
      v_indice + 1,
      v_valor_parcela_centavos::numeric / 100,
      v_vencimento,
      case when v_status = 'Pago' then current_date else null end,
      nullif(btrim(coalesce(p_forma_pagamento, '')), ''),
      v_status,
      nullif(btrim(coalesce(p_observacao, '')), ''),
      auth.uid(),
      auth.uid(),
      now()
    );
  end loop;

  return v_grupo_id;
end;
$$;

revoke all on function public.financeiro_criar_cobranca(
  uuid, text, text, numeric, integer, date, text, text, text
) from public, anon;
grant execute on function public.financeiro_criar_cobranca(
  uuid, text, text, numeric, integer, date, text, text, text
) to authenticated;

-- Em 2026, tabelas novas podem não receber grants automáticos no Data API.
revoke all on table public.financeiro_cobrancas_historico from anon;
grant select on table public.financeiro_cobrancas_historico to authenticated;
grant all on table public.financeiro_cobrancas_historico to service_role;

-- A tabela principal continua acessível pelo Data API, sempre protegida por RLS.
revoke truncate, references, trigger on table public.financeiro_cobrancas
  from anon, authenticated;
revoke select, insert, update, delete on table public.financeiro_cobrancas
  from anon;
grant select, insert, update on table public.financeiro_cobrancas
  to authenticated;
grant all on table public.financeiro_cobrancas to service_role;

comment on column public.financeiro_cobrancas.observacao is
  'Observação interna da equipe. Nunca retornar na visão do mentorado.';
comment on function public.financeiro_listar_minhas_cobrancas() is
  'Visão financeira segura do mentorado, sem campos internos.';
comment on function public.financeiro_listar_cobrancas_suporte() is
  'Visão operacional do suporte sem descrição, observação ou autoria da gestão.';
comment on function public.financeiro_listar_historico_suporte(integer) is
  'Histórico técnico do suporte sem snapshots financeiros ou observações internas.';
