-- Mantém a role principal do usuário e trata acesso_suporte como uma
-- permissão adicional para todas as rotinas e políticas da área de suporte.

create or replace function public.is_suporte()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        lower(trim(role)) = 'suporte'
        or coalesce(acesso_suporte, false)
      )
  );
$$;

revoke all on function public.is_suporte() from public, anon;
grant execute on function public.is_suporte() to authenticated, service_role;

-- As rotinas administrativas existentes preservam toda a validação e
-- auditoria atuais; apenas passam a centralizar a autorização em is_suporte().
do $migration$
declare
  v_signature text;
  v_definition text;
  v_updated_definition text;
begin
  foreach v_signature in array array[
    'public.suporte_atualizar_profile(uuid,text,text)',
    'public.suporte_atualizar_status_mentorado(uuid,text)',
    'public.suporte_atualizar_ticket_com_chat(uuid,text,text)',
    'public.suporte_liberar_reset_senha(uuid)'
  ]
  loop
    select pg_get_functiondef(v_signature::regprocedure)
      into v_definition;

    v_updated_definition := replace(
      v_definition,
      'if v_suporte_role is distinct from ''suporte'' then',
      'if not public.is_suporte() then'
    );

    if v_updated_definition = v_definition then
      raise exception
        'Não foi possível atualizar a autorização da função %.',
        v_signature;
    end if;

    execute v_updated_definition;
  end loop;
end;
$migration$;

do $migration$
declare
  v_definition text;
  v_updated_definition text;
begin
  select pg_get_functiondef(
    'public.suporte_registrar_log(text,text,uuid,text,jsonb)'::regprocedure
  )
    into v_definition;

  v_updated_definition := replace(
    v_definition,
    'and role = ''suporte'';',
    ';'
  );

  v_updated_definition := replace(
    v_updated_definition,
    'if v_email is null then',
    'if v_email is null or not public.is_suporte() then'
  );

  if v_updated_definition = v_definition
    or position(
      'if v_email is null or not public.is_suporte() then'
      in v_updated_definition
    ) = 0
  then
    raise exception
      'Não foi possível atualizar a autorização da função suporte_registrar_log.';
  end if;

  execute v_updated_definition;
end;
$migration$;

drop policy if exists "suporte pode criar logs"
  on public.suporte_logs;
create policy "suporte pode criar logs"
  on public.suporte_logs
  for insert
  to authenticated
  with check (public.is_suporte());

drop policy if exists "suporte pode ver logs"
  on public.suporte_logs;
create policy "suporte pode ver logs"
  on public.suporte_logs
  for select
  to authenticated
  using (public.is_suporte());

drop policy if exists "suporte pode criar mensagens de tickets"
  on public.suporte_ticket_mensagens;
create policy "suporte pode criar mensagens de tickets"
  on public.suporte_ticket_mensagens
  for insert
  to authenticated
  with check (public.is_suporte());

drop policy if exists "suporte pode ver mensagens de tickets"
  on public.suporte_ticket_mensagens;
create policy "suporte pode ver mensagens de tickets"
  on public.suporte_ticket_mensagens
  for select
  to authenticated
  using (public.is_suporte());

drop policy if exists "suporte pode gerenciar tickets"
  on public.suporte_tickets;
create policy "suporte pode gerenciar tickets"
  on public.suporte_tickets
  for all
  to authenticated
  using (public.is_suporte())
  with check (public.is_suporte());

drop policy if exists "suporte ve todos tickets"
  on public.suporte_tickets;
create policy "suporte ve todos tickets"
  on public.suporte_tickets
  for select
  to authenticated
  using (public.is_suporte());
