drop policy if exists "simulados select staff ou publicado"
  on public.simulados;

create policy "simulados select staff ou publicado"
  on public.simulados
  for select
  to authenticated
  using (
    (select public.ceo_usuario_staff())
    or (
      ativo = true
      and status = 'publicado'
      and exists (
        select 1
        from public.profiles perfil
        where perfil.id = (select auth.uid())
          and lower(trim(perfil.role)) = 'mentorado'
      )
      and (
        modulo_id is null
        or exists (
          select 1
          from public.modulo_liberacoes liberacao
          where liberacao.modulo_id = simulados.modulo_id
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

drop policy if exists "perguntas select staff ou simulado publicado"
  on public.simulado_perguntas;

create policy "perguntas select staff ou simulado publicado"
  on public.simulado_perguntas
  for select
  to authenticated
  using (
    (select public.ceo_usuario_staff())
    or exists (
      select 1
      from public.simulados simulado
      where simulado.id = simulado_perguntas.simulado_id
        and simulado.ativo = true
        and simulado.status = 'publicado'
        and (
          simulado.modulo_id is null
          or exists (
            select 1
            from public.modulo_liberacoes liberacao
            where liberacao.modulo_id = simulado.modulo_id
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
        and exists (
          select 1
          from public.profiles perfil
          where perfil.id = (select auth.uid())
            and lower(trim(perfil.role)) = 'mentorado'
        )
    )
  );

drop policy if exists "simulado_tentativas_insert_own"
  on public.simulado_tentativas;

create policy "simulado_tentativas_insert_own"
  on public.simulado_tentativas
  for insert
  to authenticated
  with check (
    (select auth.uid()) = mentorado_id
    and exists (
      select 1
      from public.profiles perfil
      where perfil.id = (select auth.uid())
        and lower(trim(perfil.role)) = 'mentorado'
    )
    and exists (
      select 1
      from public.simulados simulado
      where simulado.id = simulado_tentativas.simulado_id
        and simulado.ativo = true
        and simulado.status = 'publicado'
        and (
          simulado.modulo_id is null
          or exists (
            select 1
            from public.modulo_liberacoes liberacao
            where liberacao.modulo_id = simulado.modulo_id
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
