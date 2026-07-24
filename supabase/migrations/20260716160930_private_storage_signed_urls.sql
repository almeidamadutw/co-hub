-- CEO Club private Storage migration
--
-- Persist stable Storage references instead of expiring/public URLs, make the
-- two application buckets private, and narrow direct reads by user role.

-- Existing lesson materials were stored as public object URLs. Keep the
-- object path in its dedicated column and replace the URL with a stable marker
-- that the application resolves to a signed URL at read time.
update public.materiais_aula
set storage_path = split_part(
  url,
  '/storage/v1/object/public/ceo-club-materiais/',
  2
)
where url like '%/storage/v1/object/public/ceo-club-materiais/%'
  and coalesce(btrim(storage_path), '') = '';

update public.materiais_aula
set url = 'storage://ceo-club-materiais/' || storage_path
where coalesce(btrim(storage_path), '') <> ''
  and url like '%/storage/v1/object/public/ceo-club-materiais/%';

-- The individual library currently has no uploaded production objects, but
-- this backfill keeps the migration safe if a file is added before rollout.
update public.biblioteca_arquivos
set storage_path = split_part(
  url,
  '/storage/v1/object/public/ceo-club-biblioteca/',
  2
)
where url like '%/storage/v1/object/public/ceo-club-biblioteca/%'
  and coalesce(btrim(storage_path), '') = '';

update public.biblioteca_arquivos
set url = 'storage://ceo-club-biblioteca/' || storage_path
where coalesce(btrim(storage_path), '') <> ''
  and url like '%/storage/v1/object/public/ceo-club-biblioteca/%';

create index if not exists idx_materiais_aula_storage_path
  on public.materiais_aula (storage_path)
  where storage_path is not null;

update storage.buckets
set public = false
where id in ('ceo-club-biblioteca', 'ceo-club-materiais')
  and public = true;

-- Staff can read every CEO Club object. Mentorados can request signed URLs only
-- for their own individual folder or for materials in globally released
-- modules. API routes continue using service_role for authorized server reads.
drop policy if exists ceo_storage_select_authenticated on storage.objects;
drop policy if exists ceo_storage_select_staff on storage.objects;
drop policy if exists ceo_storage_select_mentorado on storage.objects;

create policy ceo_storage_select_staff
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('ceo-club-biblioteca', 'ceo-club-materiais')
    and (select public.ceo_usuario_staff())
  );

create policy ceo_storage_select_mentorado
  on storage.objects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and lower(btrim(profile.role)) = 'mentorado'
    )
    and (
      (
        bucket_id = 'ceo-club-biblioteca'
        and split_part(name, '/', 1) = (select auth.uid())::text
      )
      or
      (
        bucket_id = 'ceo-club-materiais'
        and exists (
          select 1
          from public.materiais_aula as material
          join public.aulas as aula
            on aula.id = material.aula_id
          join public.modulo_liberacoes as liberacao
            on liberacao.modulo_id = aula.modulo_id
          where material.storage_path = name
            and (
              liberacao.status_liberacao = 'aberto'
              or (
                liberacao.status_liberacao = 'agendado'
                and liberacao.liberar_em is not null
                and liberacao.liberar_em <= now()
              )
            )
        )
      )
    )
  );
