-- Execute esta etapa somente depois que a nova API de Tickets estiver online.
-- Ela remove escrita direta do navegador e desativa as RPCs legadas.

alter table public.suporte_tickets enable row level security;
alter table public.suporte_ticket_mensagens enable row level security;

revoke all on table public.suporte_tickets from anon;
revoke all on table public.suporte_ticket_mensagens from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.suporte_tickets
  from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.suporte_ticket_mensagens
  from authenticated;

grant select on table public.suporte_tickets to authenticated;
grant select on table public.suporte_ticket_mensagens to authenticated;
grant all on table public.suporte_tickets to service_role;
grant all on table public.suporte_ticket_mensagens to service_role;

drop policy if exists "Permitir abertura publica de ticket de senha"
  on public.suporte_tickets;
drop policy if exists "mentorado ve proprios tickets"
  on public.suporte_tickets;
drop policy if exists "suporte pode gerenciar tickets"
  on public.suporte_tickets;
drop policy if exists "suporte ve todos tickets"
  on public.suporte_tickets;

create policy suporte_tickets_select_proprio
  on public.suporte_tickets
  for select
  to authenticated
  using ((select auth.uid()) = usuario_id);

create policy suporte_tickets_select_suporte
  on public.suporte_tickets
  for select
  to authenticated
  using ((select public.is_suporte()));

drop policy if exists "mentorado ve mensagens dos proprios tickets"
  on public.suporte_ticket_mensagens;
drop policy if exists "usuario pode ver mensagens do proprio ticket"
  on public.suporte_ticket_mensagens;
drop policy if exists "usuario pode criar mensagens no proprio ticket"
  on public.suporte_ticket_mensagens;
drop policy if exists "suporte pode criar mensagens de tickets"
  on public.suporte_ticket_mensagens;
drop policy if exists "suporte pode ver mensagens de tickets"
  on public.suporte_ticket_mensagens;

create policy suporte_ticket_mensagens_select_proprio
  on public.suporte_ticket_mensagens
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.suporte_tickets as ticket
      where ticket.id = suporte_ticket_mensagens.ticket_id
        and ticket.usuario_id = (select auth.uid())
    )
  );

create policy suporte_ticket_mensagens_select_suporte
  on public.suporte_ticket_mensagens
  for select
  to authenticated
  using ((select public.is_suporte()));

revoke all on function public.mentorado_criar_ticket(text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.mentorado_responder_ticket(uuid, text)
  from public, anon, authenticated;
revoke all on function public.suporte_atualizar_ticket_com_chat(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.mentorado_criar_ticket(text, text, text, text)
  to service_role;
grant execute on function public.mentorado_responder_ticket(uuid, text)
  to service_role;
grant execute on function public.suporte_atualizar_ticket_com_chat(uuid, text, text)
  to service_role;

comment on function public.mentorado_criar_ticket(text, text, text, text) is
  'RPC legada de Tickets. Execução do navegador removida em 2026-08-06.';
comment on function public.mentorado_responder_ticket(uuid, text) is
  'RPC legada de Tickets. Execução do navegador removida em 2026-08-06.';
comment on function public.suporte_atualizar_ticket_com_chat(uuid, text, text) is
  'RPC legada de Tickets. Execução do navegador removida em 2026-08-06.';
