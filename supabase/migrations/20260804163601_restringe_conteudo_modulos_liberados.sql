-- Módulos podem aparecer como bloqueados para o mentorado, mas o conteúdo
-- interno (aulas, vídeos e materiais) só pode ser lido após a liberação.
-- Também remove políticas legadas que permitiam ao financeiro alterar módulos.

drop policy if exists "mentor gerencia modulos" on public.modulos;
drop policy if exists "modulos_manage_mentor" on public.modulos;
drop policy if exists "modulos_select_authenticated" on public.modulos;
drop policy if exists "todos autenticados veem modulos" on public.modulos;

create policy "modulos_select_perfis_autorizados"
  on public.modulos
  for select
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
          or (
            lower(trim(perfil.role)) = 'mentorado'
            and modulos.ativo is true
          )
        )
    )
  );

create policy "modulos_manage_mentor_ativo"
  on public.modulos
  for all
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

drop policy if exists "aulas_manage_mentor" on public.aulas;
drop policy if exists "aulas_select_authenticated" on public.aulas;

create policy "aulas_select_staff_ou_modulo_liberado"
  on public.aulas
  for select
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
          or (
            lower(trim(perfil.role)) = 'mentorado'
            and aulas.ativo is true
            and exists (
              select 1
              from public.modulos modulo
              join public.modulo_liberacoes liberacao
                on liberacao.modulo_id = modulo.id
              where modulo.id = aulas.modulo_id
                and modulo.ativo is true
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
    )
  );

create policy "aulas_manage_mentor_ativo"
  on public.aulas
  for all
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

drop policy if exists "materiais_manage_mentor" on public.materiais_aula;
drop policy if exists "materiais_aula_delete_staff" on public.materiais_aula;
drop policy if exists "materiais_aula_insert_staff" on public.materiais_aula;
drop policy if exists "materiais_aula_select_authenticated" on public.materiais_aula;
drop policy if exists "materiais_select_authenticated" on public.materiais_aula;
drop policy if exists "materiais_aula_update_staff" on public.materiais_aula;

create policy "materiais_aula_select_staff_ou_modulo_liberado"
  on public.materiais_aula
  for select
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
          or (
            lower(trim(perfil.role)) = 'mentorado'
            and exists (
              select 1
              from public.aulas aula
              join public.modulos modulo on modulo.id = aula.modulo_id
              join public.modulo_liberacoes liberacao
                on liberacao.modulo_id = modulo.id
              where aula.id = materiais_aula.aula_id
                and aula.ativo is true
                and modulo.ativo is true
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
    )
  );

create policy "materiais_aula_manage_staff_ativo"
  on public.materiais_aula
  for all
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

drop policy if exists "Mentores gerenciam liberacoes"
  on public.modulo_liberacoes;
drop policy if exists "Liberacoes visiveis para autenticados"
  on public.modulo_liberacoes;

create policy "modulo_liberacoes_select_perfis_autorizados"
  on public.modulo_liberacoes
  for select
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
          lower(trim(perfil.role)) in ('mentor', 'mentorado', 'suporte')
          or coalesce(perfil.acesso_suporte, false)
        )
    )
  );

create policy "modulo_liberacoes_manage_staff_ativo"
  on public.modulo_liberacoes
  for all
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
