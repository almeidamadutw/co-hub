-- Separa escrita e leitura para manter uma única policy SELECT por tabela.
-- Isso evita avaliações duplicadas de RLS e adiciona os índices usados nos
-- relacionamentos de módulos e aulas.

create index if not exists aulas_modulo_id_idx
  on public.aulas (modulo_id);

create index if not exists modulos_criado_por_idx
  on public.modulos (criado_por)
  where criado_por is not null;

drop policy if exists "modulos_manage_mentor_ativo" on public.modulos;

create policy "modulos_insert_mentor_ativo"
  on public.modulos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  );

create policy "modulos_update_mentor_ativo"
  on public.modulos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  );

create policy "modulos_delete_mentor_ativo"
  on public.modulos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  );

drop policy if exists "aulas_manage_mentor_ativo" on public.aulas;

create policy "aulas_insert_mentor_ativo"
  on public.aulas
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  );

create policy "aulas_update_mentor_ativo"
  on public.aulas
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  );

create policy "aulas_delete_mentor_ativo"
  on public.aulas
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentor'
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
    )
  );

drop policy if exists "materiais_aula_manage_staff_ativo"
  on public.materiais_aula;

create policy "materiais_aula_insert_staff_ativo"
  on public.materiais_aula
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  );

create policy "materiais_aula_update_staff_ativo"
  on public.materiais_aula
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  );

create policy "materiais_aula_delete_staff_ativo"
  on public.materiais_aula
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  );

drop policy if exists "modulo_liberacoes_manage_staff_ativo"
  on public.modulo_liberacoes;

create policy "modulo_liberacoes_insert_staff_ativo"
  on public.modulo_liberacoes
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  );

create policy "modulo_liberacoes_update_staff_ativo"
  on public.modulo_liberacoes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  );

create policy "modulo_liberacoes_delete_staff_ativo"
  on public.modulo_liberacoes
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and perfil.excluido_em is null
        and (
          coalesce(trim(perfil.status), '') = ''
          or lower(trim(perfil.status)) = 'ativo'
        )
        and (
          lower(trim(perfil.role)) in ('mentor', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  );
