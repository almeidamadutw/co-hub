-- Mantém os lançamentos já vencidos coerentes no banco.
-- A aplicação também calcula o status efetivo em tempo de leitura para que
-- parcelas que vencerem depois desta migration não dependam de uma rotina cron.
update public.financeiro_cobrancas
set
  status = 'Atrasado',
  updated_at = now()
where status = 'Pendente'
  and data_vencimento < current_date;

-- Arquivos particulares da biblioteca só podem ser lidos pela equipe
-- autorizada ou pelo próprio mentorado.
drop policy if exists "biblioteca select autenticado"
  on public.biblioteca_arquivos;

create policy "biblioteca select staff ou dono"
  on public.biblioteca_arquivos
  for select
  to authenticated
  using (
    (select public.ceo_usuario_staff())
    or mentorado_id = (select auth.uid())
  );

-- Rascunhos de simulados não devem ser expostos para qualquer usuário
-- autenticado.
drop policy if exists "Usuários autenticados podem ver simulados"
  on public.simulados;
drop policy if exists "simulados_select_authenticated"
  on public.simulados;
drop policy if exists "mentorado ve simulados ativos"
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
    )
  );

drop policy if exists "Usuários autenticados podem ver perguntas"
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
        and exists (
          select 1
          from public.profiles perfil
          where perfil.id = (select auth.uid())
            and lower(trim(perfil.role)) = 'mentorado'
        )
    )
  );

-- O campo "correta" contém o gabarito. Mentorados recebem somente as
-- alternativas públicas pela rota de servidor, que remove esse campo.
drop policy if exists "Usuários autenticados podem ver alternativas"
  on public.simulado_alternativas;

create policy "alternativas select somente staff"
  on public.simulado_alternativas
  for select
  to authenticated
  using ((select public.ceo_usuario_staff()));

-- Uma tentativa só pode ser criada para simulados efetivamente publicados.
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
    )
  );

-- Corrige a comparação tautológica que aceitava uma resposta cujo simulado
-- não correspondia ao da tentativa.
drop policy if exists "simulado_respostas_insert_own"
  on public.simulado_respostas;

create policy "simulado_respostas_insert_own"
  on public.simulado_respostas
  for insert
  to authenticated
  with check (
    (select auth.uid()) = mentorado_id
    and exists (
      select 1
      from public.simulado_tentativas tentativa
      where tentativa.id = simulado_respostas.tentativa_id
        and tentativa.mentorado_id = (select auth.uid())
        and tentativa.simulado_id = simulado_respostas.simulado_id
    )
  );
