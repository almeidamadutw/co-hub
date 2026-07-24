-- CEO Club security hardening
--
-- This migration keeps the current application contract intact while applying
-- least privilege to the browser-facing database roles. Buckets intentionally
-- remain public for now because existing database rows store public object URLs.

-- ---------------------------------------------------------------------------
-- Public tables: remove anonymous access and expose only the operations used by
-- the current client. RLS remains the source of row-level authorization.
-- ---------------------------------------------------------------------------

alter table public.modulo_atividades_mentorados enable row level security;
alter table public.simulado_tentativas enable row level security;
alter table public.simulado_respostas enable row level security;

revoke all on table
  public.modulo_atividades_mentorados,
  public.simulado_tentativas,
  public.simulado_respostas,
  public.modulo_aulas,
  public.modulo_liberacoes_mentorados,
  public.modulos_status_mentorados,
  public.suporte_mensagens
from anon;

-- Legacy/unused tables stay closed until a concrete feature defines their
-- ownership model. service_role and the table owner keep administrative access.
revoke all on table
  public.modulo_aulas,
  public.modulo_liberacoes_mentorados,
  public.modulos_status_mentorados,
  public.suporte_mensagens
from authenticated;

revoke all on table public.modulo_atividades_mentorados from authenticated;
grant select, insert, update, delete
  on table public.modulo_atividades_mentorados
  to authenticated;

revoke all on table public.simulado_tentativas from authenticated;
grant select, insert
  on table public.simulado_tentativas
  to authenticated;

revoke all on table public.simulado_respostas from authenticated;
grant select, insert
  on table public.simulado_respostas
  to authenticated;

drop policy if exists modulo_atividades_select_own
  on public.modulo_atividades_mentorados;
create policy modulo_atividades_select_own
  on public.modulo_atividades_mentorados
  for select
  to authenticated
  using ((select auth.uid()) = mentorado_id);

drop policy if exists modulo_atividades_manage_mentor
  on public.modulo_atividades_mentorados;
create policy modulo_atividades_manage_mentor
  on public.modulo_atividades_mentorados
  for all
  to authenticated
  using ((select public.is_mentor()))
  with check ((select public.is_mentor()));

drop policy if exists simulado_tentativas_select_own_or_mentor
  on public.simulado_tentativas;
create policy simulado_tentativas_select_own_or_mentor
  on public.simulado_tentativas
  for select
  to authenticated
  using (
    (select auth.uid()) = mentorado_id
    or (select public.is_mentor())
  );

drop policy if exists simulado_tentativas_insert_own
  on public.simulado_tentativas;
create policy simulado_tentativas_insert_own
  on public.simulado_tentativas
  for insert
  to authenticated
  with check (
    (select auth.uid()) = mentorado_id
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and lower(trim(profile.role)) = 'mentorado'
    )
    and exists (
      select 1
      from public.simulados as simulado
      where simulado.id = simulado_id
        and simulado.ativo = true
    )
  );

drop policy if exists simulado_respostas_select_own_or_mentor
  on public.simulado_respostas;
create policy simulado_respostas_select_own_or_mentor
  on public.simulado_respostas
  for select
  to authenticated
  using (
    (select auth.uid()) = mentorado_id
    or (select public.is_mentor())
  );

drop policy if exists simulado_respostas_insert_own
  on public.simulado_respostas;
create policy simulado_respostas_insert_own
  on public.simulado_respostas
  for insert
  to authenticated
  with check (
    (select auth.uid()) = mentorado_id
    and exists (
      select 1
      from public.simulado_tentativas as tentativa
      where tentativa.id = tentativa_id
        and tentativa.mentorado_id = (select auth.uid())
        and tentativa.simulado_id = simulado_id
    )
  );

create index if not exists idx_simulado_tentativas_mentorado_id
  on public.simulado_tentativas (mentorado_id);
create index if not exists idx_simulado_respostas_mentorado_id
  on public.simulado_respostas (mentorado_id);

-- ---------------------------------------------------------------------------
-- Privileged functions: remove anonymous/PUBLIC execution and pin search_path.
-- The functions keep their existing auth.uid()/role checks.
-- ---------------------------------------------------------------------------

alter function public.ceo_usuario_staff()
  set search_path to pg_catalog, public;
alter function public.is_ceo_staff()
  set search_path to pg_catalog, public;
alter function public.is_mentor()
  set search_path to pg_catalog, public;
alter function public.is_suporte()
  set search_path to pg_catalog, public;
alter function public.mentorado_criar_ticket(text, text, text, text)
  set search_path to pg_catalog, public;
alter function public.mentorado_responder_ticket(uuid, text)
  set search_path to pg_catalog, public;
alter function public.suporte_atualizar_profile(uuid, text, text)
  set search_path to pg_catalog, public;
alter function public.suporte_atualizar_status_mentorado(uuid, text)
  set search_path to pg_catalog, public;
alter function public.suporte_atualizar_ticket_com_chat(uuid, text, text)
  set search_path to pg_catalog, public;
alter function public.suporte_liberar_reset_senha(uuid)
  set search_path to pg_catalog, public;
alter function public.suporte_registrar_log(text, text, uuid, text, jsonb)
  set search_path to pg_catalog, public;

revoke all on function public.ceo_usuario_staff() from public, anon;
revoke all on function public.is_ceo_staff() from public, anon;
revoke all on function public.is_mentor() from public, anon;
revoke all on function public.is_suporte() from public, anon;
revoke all on function public.mentorado_criar_ticket(text, text, text, text) from public, anon;
revoke all on function public.mentorado_responder_ticket(uuid, text) from public, anon;
revoke all on function public.suporte_atualizar_profile(uuid, text, text) from public, anon;
revoke all on function public.suporte_atualizar_status_mentorado(uuid, text) from public, anon;
revoke all on function public.suporte_atualizar_ticket_com_chat(uuid, text, text) from public, anon;
revoke all on function public.suporte_liberar_reset_senha(uuid) from public, anon;
revoke all on function public.suporte_registrar_log(text, text, uuid, text, jsonb) from public, anon;

grant execute on function public.ceo_usuario_staff() to authenticated, service_role;
grant execute on function public.is_ceo_staff() to authenticated, service_role;
grant execute on function public.is_mentor() to authenticated, service_role;
grant execute on function public.is_suporte() to authenticated, service_role;
grant execute on function public.mentorado_criar_ticket(text, text, text, text) to authenticated, service_role;
grant execute on function public.mentorado_responder_ticket(uuid, text) to authenticated, service_role;
grant execute on function public.suporte_atualizar_profile(uuid, text, text) to authenticated, service_role;
grant execute on function public.suporte_atualizar_status_mentorado(uuid, text) to authenticated, service_role;
grant execute on function public.suporte_atualizar_ticket_com_chat(uuid, text, text) to authenticated, service_role;
grant execute on function public.suporte_liberar_reset_senha(uuid) to authenticated, service_role;
grant execute on function public.suporte_registrar_log(text, text, uuid, text, jsonb) to authenticated, service_role;

-- Trigger/helper functions flagged by the database advisor.
alter function public.gerar_codigo_inscricao()
  set search_path to pg_catalog, public;
alter function public.set_codigo_inscricao_profile()
  set search_path to pg_catalog, public;
alter function public.set_updated_at()
  set search_path to pg_catalog;

revoke all on function public.gerar_codigo_inscricao() from public, anon;
revoke all on function public.set_codigo_inscricao_profile() from public, anon;
revoke all on function public.set_updated_at() from public, anon;

grant execute on function public.gerar_codigo_inscricao() to authenticated, service_role;
grant execute on function public.set_codigo_inscricao_profile() to authenticated, service_role;
grant execute on function public.set_updated_at() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: remove duplicated broad write policies. API routes use service_role;
-- direct browser writes are restricted to CEO Club staff.
-- ---------------------------------------------------------------------------

drop policy if exists "Materiais CEO Club delete autenticado" on storage.objects;
drop policy if exists "Materiais CEO Club update autenticado" on storage.objects;
drop policy if exists "Materiais CEO Club upload autenticado" on storage.objects;
drop policy if exists "biblioteca storage delete" on storage.objects;
drop policy if exists "biblioteca storage insert" on storage.objects;
drop policy if exists "biblioteca storage select" on storage.objects;
drop policy if exists "biblioteca storage update" on storage.objects;
drop policy if exists ceo_materiais_delete_staff on storage.objects;
drop policy if exists ceo_materiais_insert_staff on storage.objects;
drop policy if exists ceo_materiais_select_authenticated on storage.objects;
drop policy if exists ceo_materiais_storage_delete_staff on storage.objects;
drop policy if exists ceo_materiais_storage_insert_staff on storage.objects;
drop policy if exists ceo_materiais_storage_select_authenticated on storage.objects;
drop policy if exists ceo_materiais_storage_update_staff on storage.objects;
drop policy if exists ceo_materiais_update_staff on storage.objects;

drop policy if exists ceo_storage_select_authenticated on storage.objects;
create policy ceo_storage_select_authenticated
  on storage.objects
  for select
  to authenticated
  using (bucket_id in ('ceo-club-biblioteca', 'ceo-club-materiais'));

drop policy if exists ceo_storage_insert_staff on storage.objects;
create policy ceo_storage_insert_staff
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('ceo-club-biblioteca', 'ceo-club-materiais')
    and (select public.ceo_usuario_staff())
  );

drop policy if exists ceo_storage_update_staff on storage.objects;
create policy ceo_storage_update_staff
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('ceo-club-biblioteca', 'ceo-club-materiais')
    and (select public.ceo_usuario_staff())
  )
  with check (
    bucket_id in ('ceo-club-biblioteca', 'ceo-club-materiais')
    and (select public.ceo_usuario_staff())
  );

drop policy if exists ceo_storage_delete_staff on storage.objects;
create policy ceo_storage_delete_staff
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('ceo-club-biblioteca', 'ceo-club-materiais')
    and (select public.ceo_usuario_staff())
  );
