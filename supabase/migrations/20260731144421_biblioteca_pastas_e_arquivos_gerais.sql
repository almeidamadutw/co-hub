-- Organiza a Biblioteca CEO Club com pastas publicas/privadas e materiais
-- individuais, gerais ou internos. O bucket continua privado; a visibilidade
-- e controlada por RLS e pelas rotas autenticadas do sistema.

create table if not exists public.biblioteca_pastas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  visibilidade text not null default 'privada',
  criada_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biblioteca_pastas_nome_valido
    check (char_length(btrim(nome)) between 1 and 100),
  constraint biblioteca_pastas_visibilidade_valida
    check (visibilidade in ('publica', 'privada'))
);

alter table public.biblioteca_arquivos
  alter column mentorado_id drop not null;

alter table public.biblioteca_arquivos
  add column if not exists pasta_id uuid
    references public.biblioteca_pastas(id) on delete restrict;

alter table public.biblioteca_arquivos
  add column if not exists escopo text not null default 'mentorado';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'biblioteca_arquivos_escopo_valido'
      and conrelid = 'public.biblioteca_arquivos'::regclass
  ) then
    alter table public.biblioteca_arquivos
      add constraint biblioteca_arquivos_escopo_valido
      check (escopo in ('mentorado', 'geral', 'interno'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'biblioteca_arquivos_destino_valido'
      and conrelid = 'public.biblioteca_arquivos'::regclass
  ) then
    alter table public.biblioteca_arquivos
      add constraint biblioteca_arquivos_destino_valido
      check (
        (
          escopo = 'mentorado'
          and mentorado_id is not null
          and pasta_id is null
        )
        or (
          escopo = 'geral'
          and mentorado_id is null
        )
        or (
          escopo = 'interno'
          and mentorado_id is null
          and pasta_id is not null
        )
      );
  end if;
end;
$$;

create index if not exists idx_biblioteca_pastas_visibilidade_nome
  on public.biblioteca_pastas (visibilidade, nome);

create index if not exists idx_biblioteca_arquivos_escopo_created_at
  on public.biblioteca_arquivos (escopo, created_at desc);

create index if not exists idx_biblioteca_arquivos_pasta_id
  on public.biblioteca_arquivos (pasta_id)
  where pasta_id is not null;

create index if not exists idx_biblioteca_arquivos_mentorado_created_at
  on public.biblioteca_arquivos (mentorado_id, created_at desc)
  where mentorado_id is not null;

create index if not exists idx_biblioteca_arquivos_storage_path
  on public.biblioteca_arquivos (storage_path)
  where storage_path is not null;

create or replace function public.biblioteca_validar_destino()
returns trigger
language plpgsql
security invoker
set search_path to pg_catalog, public
as $$
declare
  v_visibilidade text;
begin
  if new.pasta_id is not null then
    select pasta.visibilidade
    into v_visibilidade
    from public.biblioteca_pastas as pasta
    where pasta.id = new.pasta_id;

    if v_visibilidade is null then
      raise exception 'Pasta da biblioteca nao encontrada.';
    end if;

    new.mentorado_id := null;
    new.escopo := case
      when v_visibilidade = 'publica' then 'geral'
      else 'interno'
    end;
  elsif new.escopo = 'mentorado' then
    if new.mentorado_id is null then
      raise exception 'Selecione o mentorado do material individual.';
    end if;
  elsif new.escopo = 'geral' then
    new.mentorado_id := null;
  else
    raise exception 'Materiais internos precisam estar em uma pasta privada.';
  end if;

  return new;
end;
$$;

drop trigger if exists biblioteca_arquivos_validar_destino
  on public.biblioteca_arquivos;

create trigger biblioteca_arquivos_validar_destino
before insert or update of pasta_id, escopo, mentorado_id
on public.biblioteca_arquivos
for each row
execute function public.biblioteca_validar_destino();

create or replace function public.biblioteca_sincronizar_visibilidade_pasta()
returns trigger
language plpgsql
security invoker
set search_path to pg_catalog, public
as $$
begin
  if new.visibilidade is distinct from old.visibilidade then
    update public.biblioteca_arquivos
    set
      escopo = case
        when new.visibilidade = 'publica' then 'geral'
        else 'interno'
      end,
      updated_at = now()
    where pasta_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists biblioteca_pastas_sincronizar_visibilidade
  on public.biblioteca_pastas;

create trigger biblioteca_pastas_sincronizar_visibilidade
after update of visibilidade
on public.biblioteca_pastas
for each row
execute function public.biblioteca_sincronizar_visibilidade_pasta();

drop trigger if exists biblioteca_pastas_set_updated_at
  on public.biblioteca_pastas;

create trigger biblioteca_pastas_set_updated_at
before update on public.biblioteca_pastas
for each row
execute function public.set_updated_at();

alter table public.biblioteca_pastas enable row level security;

drop policy if exists "biblioteca pastas select staff ou publicas"
  on public.biblioteca_pastas;
drop policy if exists "biblioteca pastas insert staff"
  on public.biblioteca_pastas;
drop policy if exists "biblioteca pastas update staff"
  on public.biblioteca_pastas;
drop policy if exists "biblioteca pastas delete staff"
  on public.biblioteca_pastas;

create policy "biblioteca pastas select staff ou publicas"
  on public.biblioteca_pastas
  for select
  to authenticated
  using (
    (select public.ceo_usuario_staff())
    or (
      visibilidade = 'publica'
      and exists (
        select 1
        from public.profiles as perfil
        where perfil.id = (select auth.uid())
          and lower(btrim(perfil.role)) = 'mentorado'
          and perfil.excluido_em is null
          and (
            coalesce(btrim(perfil.status), '') = ''
            or lower(btrim(perfil.status)) = 'ativo'
          )
      )
    )
  );

create policy "biblioteca pastas insert staff"
  on public.biblioteca_pastas
  for insert
  to authenticated
  with check ((select public.ceo_usuario_staff()));

create policy "biblioteca pastas update staff"
  on public.biblioteca_pastas
  for update
  to authenticated
  using ((select public.ceo_usuario_staff()))
  with check ((select public.ceo_usuario_staff()));

create policy "biblioteca pastas delete staff"
  on public.biblioteca_pastas
  for delete
  to authenticated
  using ((select public.ceo_usuario_staff()));

drop policy if exists "biblioteca select staff ou dono"
  on public.biblioteca_arquivos;
drop policy if exists "biblioteca insert autenticado"
  on public.biblioteca_arquivos;
drop policy if exists "biblioteca update autenticado"
  on public.biblioteca_arquivos;
drop policy if exists "biblioteca delete autenticado"
  on public.biblioteca_arquivos;

create policy "biblioteca select staff dono ou geral"
  on public.biblioteca_arquivos
  for select
  to authenticated
  using (
    (select public.ceo_usuario_staff())
    or (
      exists (
        select 1
        from public.profiles as perfil
        where perfil.id = (select auth.uid())
          and lower(btrim(perfil.role)) = 'mentorado'
          and perfil.excluido_em is null
          and (
            coalesce(btrim(perfil.status), '') = ''
            or lower(btrim(perfil.status)) = 'ativo'
          )
      )
      and (
        (
          escopo = 'mentorado'
          and mentorado_id = (select auth.uid())
        )
        or (
          escopo = 'geral'
          and (
            pasta_id is null
            or exists (
              select 1
              from public.biblioteca_pastas as pasta
              where pasta.id = pasta_id
                and pasta.visibilidade = 'publica'
            )
          )
        )
      )
    )
  );

create policy "biblioteca insert staff"
  on public.biblioteca_arquivos
  for insert
  to authenticated
  with check ((select public.ceo_usuario_staff()));

create policy "biblioteca update staff"
  on public.biblioteca_arquivos
  for update
  to authenticated
  using ((select public.ceo_usuario_staff()))
  with check ((select public.ceo_usuario_staff()));

create policy "biblioteca delete staff"
  on public.biblioteca_arquivos
  for delete
  to authenticated
  using ((select public.ceo_usuario_staff()));

grant select, insert, update, delete
  on public.biblioteca_pastas
  to authenticated, service_role;

grant select, insert, update, delete
  on public.biblioteca_arquivos
  to authenticated, service_role;

revoke all on function public.biblioteca_validar_destino()
  from public, anon, authenticated;
revoke all on function public.biblioteca_sincronizar_visibilidade_pasta()
  from public, anon, authenticated;

drop policy if exists ceo_storage_select_mentorado on storage.objects;

create policy ceo_storage_select_mentorado
  on storage.objects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as perfil
      where perfil.id = (select auth.uid())
        and lower(btrim(perfil.role)) = 'mentorado'
        and perfil.excluido_em is null
        and (
          coalesce(btrim(perfil.status), '') = ''
          or lower(btrim(perfil.status)) = 'ativo'
        )
    )
    and (
      (
        bucket_id = 'ceo-club-biblioteca'
        and exists (
          select 1
          from public.biblioteca_arquivos as arquivo
          where arquivo.storage_path = name
            and (
              (
                arquivo.escopo = 'mentorado'
                and arquivo.mentorado_id = (select auth.uid())
              )
              or arquivo.escopo = 'geral'
            )
        )
      )
      or (
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

update storage.buckets
set
  public = false,
  file_size_limit = 26214400
where id = 'ceo-club-biblioteca';
