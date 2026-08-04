-- Remove a mutação privilegiada do schema exposto. A interface cria uma
-- solicitação protegida por RLS; um trigger interno aplica o ajuste na mesma
-- transação e preserva a auditoria.

create table if not exists public.financeiro_ajustes_administrativos (
  id uuid primary key default gen_random_uuid(),
  cobranca_id uuid not null references public.financeiro_cobrancas(id),
  data_vencimento date not null,
  data_pagamento date,
  forma_pagamento text,
  status text not null,
  motivo text not null,
  solicitado_por uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  aplicado_em timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financeiro_ajustes_status_check'
      and conrelid = 'public.financeiro_ajustes_administrativos'::regclass
  ) then
    alter table public.financeiro_ajustes_administrativos
      add constraint financeiro_ajustes_status_check
      check (status in ('Pago', 'Pendente', 'Atrasado', 'Cancelado'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'financeiro_ajustes_forma_check'
      and conrelid = 'public.financeiro_ajustes_administrativos'::regclass
  ) then
    alter table public.financeiro_ajustes_administrativos
      add constraint financeiro_ajustes_forma_check
      check (
        forma_pagamento is null
        or forma_pagamento in ('Crédito', 'Débito', 'Pix', 'Boleto', 'Dinheiro')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'financeiro_ajustes_motivo_check'
      and conrelid = 'public.financeiro_ajustes_administrativos'::regclass
  ) then
    alter table public.financeiro_ajustes_administrativos
      add constraint financeiro_ajustes_motivo_check
      check (char_length(btrim(motivo)) between 10 and 500);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'financeiro_ajustes_pagamento_check'
      and conrelid = 'public.financeiro_ajustes_administrativos'::regclass
  ) then
    alter table public.financeiro_ajustes_administrativos
      add constraint financeiro_ajustes_pagamento_check
      check (
        (status = 'Pago' and data_pagamento is not null)
        or (status <> 'Pago' and data_pagamento is null)
      );
  end if;
end
$$;

create index if not exists financeiro_ajustes_cobranca_created_idx
  on public.financeiro_ajustes_administrativos (cobranca_id, created_at desc);
create index if not exists financeiro_ajustes_usuario_created_idx
  on public.financeiro_ajustes_administrativos (solicitado_por, created_at desc);

alter table public.financeiro_ajustes_administrativos enable row level security;

drop policy if exists financeiro_ajuste_insere_proprio
  on public.financeiro_ajustes_administrativos;
create policy financeiro_ajuste_insere_proprio
on public.financeiro_ajustes_administrativos
for insert
to authenticated
with check (
  (select auth.uid()) = solicitado_por
  and (select public.pode_ajustar_financeiro())
);

drop policy if exists financeiro_ajuste_visualiza_proprio
  on public.financeiro_ajustes_administrativos;
create policy financeiro_ajuste_visualiza_proprio
on public.financeiro_ajustes_administrativos
for select
to authenticated
using (
  (select auth.uid()) = solicitado_por
  or (select public.is_financeiro())
  or (select public.is_mentor())
);

create or replace function private.aplicar_ajuste_financeiro_solicitado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_cobranca public.financeiro_cobrancas%rowtype;
begin
  if v_usuario_id is null
    or new.solicitado_por is distinct from v_usuario_id
    or not exists (
      select 1
      from public.profiles perfil
      where perfil.id = v_usuario_id
        and coalesce(perfil.acesso_ajuste_financeiro, false)
        and perfil.excluido_em is null
        and lower(btrim(coalesce(perfil.status, 'ativo'))) = 'ativo'
    )
  then
    raise exception using
      errcode = '42501',
      message = 'Sua conta não possui permissão para ajuste administrativo financeiro.';
  end if;

  new.motivo := btrim(new.motivo);
  new.forma_pagamento := nullif(btrim(coalesce(new.forma_pagamento, '')), '');
  new.created_at := now();

  select cobranca.*
  into v_cobranca
  from public.financeiro_cobrancas cobranca
  where cobranca.id = new.cobranca_id
  for update;

  if not found then
    raise exception 'Cobrança não encontrada.';
  end if;

  if v_cobranca.data_vencimento is not distinct from new.data_vencimento
    and v_cobranca.data_pagamento is not distinct from new.data_pagamento
    and v_cobranca.forma_pagamento is not distinct from new.forma_pagamento
    and v_cobranca.status is not distinct from new.status
  then
    raise exception 'Nenhuma alteração foi informada.';
  end if;

  perform set_config('app.financeiro_origem', 'ajuste_administrativo', true);
  perform set_config('app.financeiro_motivo', new.motivo, true);

  update public.financeiro_cobrancas
  set
    data_vencimento = new.data_vencimento,
    data_pagamento = new.data_pagamento,
    forma_pagamento = new.forma_pagamento,
    status = new.status,
    atualizado_por = v_usuario_id,
    updated_at = now()
  where id = new.cobranca_id;

  new.aplicado_em := now();
  return new;
end;
$$;

revoke all on function private.aplicar_ajuste_financeiro_solicitado()
  from public, anon, authenticated, service_role;

drop trigger if exists financeiro_aplica_ajuste_administrativo
  on public.financeiro_ajustes_administrativos;
create trigger financeiro_aplica_ajuste_administrativo
before insert on public.financeiro_ajustes_administrativos
for each row execute function private.aplicar_ajuste_financeiro_solicitado();

-- A antiga RPC pública privilegiada deixa de existir. Nenhuma tela depende
-- dela após esta migração.
drop function if exists public.financeiro_ajustar_cobranca(
  uuid, date, date, text, text, text
);

revoke all on table public.financeiro_ajustes_administrativos
  from public, anon;
revoke update, delete, truncate, references, trigger
  on table public.financeiro_ajustes_administrativos
  from authenticated;
grant select, insert on table public.financeiro_ajustes_administrativos
  to authenticated;
grant all on table public.financeiro_ajustes_administrativos
  to service_role;

comment on table public.financeiro_ajustes_administrativos is
  'Solicitações imutáveis de ajustes administrativos. O trigger interno aplica a alteração e o histórico financeiro registra antes/depois, motivo e autoria.';
