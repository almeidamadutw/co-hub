-- Solicitar atendimento nunca emite uma credencial. O bloqueio do perfil
-- serializa pedidos simultâneos e evita duplicar chamados abertos.
create or replace function public.solicitar_codigo_ao_suporte(p_email text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  perfil public.profiles%rowtype;
begin
  select * into perfil from public.profiles
    where lower(email) = lower(p_email) and excluido_em is null
      and lower(coalesce(status, 'ativo')) = 'ativo' for update;
  if not found then return; end if;
  if exists (select 1 from public.suporte_tickets where usuario_id = perfil.id
      and categoria in ('alteracao_senha','Alteração de senha')
      and status in ('aberto','em_analise','respondido')) then return; end if;
  insert into public.suporte_tickets
    (usuario_id,nome_usuario,email_usuario,tipo_usuario,role_usuario,categoria,
     assunto,mensagem,status,prioridade,origem,criado_em,atualizado_em,created_at,updated_at)
    values (perfil.id,perfil.nome,perfil.email,perfil.role,perfil.role,'alteracao_senha',
      'Pedido de código de acesso','Confirme a identidade da pessoa e entregue o código pelo canal de atendimento.',
      'aberto','alta','sistema',now(),now(),now(),now());
  update public.profiles set ultima_solicitacao_senha = now(),
    total_solicitacoes_senha = coalesce(total_solicitacoes_senha,0) + 1 where id = perfil.id;
end;
$$;

create or replace function public.concluir_troca_por_codigo(p_perfil uuid, p_pedido uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if not public.recuperacao_senha_concluir(p_perfil,p_pedido) then return false; end if;
  update public.profiles set primeira_senha_alterada = true, precisa_trocar_senha = false where id = p_perfil;
  return true;
end;
$$;

revoke all on function public.solicitar_codigo_ao_suporte(text), public.concluir_troca_por_codigo(uuid,uuid) from public, anon, authenticated;
grant execute on function public.solicitar_codigo_ao_suporte(text), public.concluir_troca_por_codigo(uuid,uuid) to service_role;

alter table private.recuperacao_senha_solicitacoes add column if not exists assinatura_codigo text;

create or replace function public.registrar_codigo_suporte(p_pedido uuid, p_assinatura text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update private.recuperacao_senha_solicitacoes set assinatura_codigo = p_assinatura
    where id = p_pedido and origem = 'suporte' and estado = 'reservado';
  return found;
end;
$$;

create or replace function public.pedido_do_codigo(p_perfil uuid,p_assinatura text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from private.recuperacao_senha_solicitacoes
    where profile_id = p_perfil and origem = 'suporte' and estado = 'enviado'
      and assinatura_codigo = p_assinatura and enviado_em >= now() - interval '2 hours'
    order by enviado_em desc limit 1;
$$;
revoke all on function public.registrar_codigo_suporte(uuid,text), public.pedido_do_codigo(uuid,text) from public, anon, authenticated;
grant execute on function public.registrar_codigo_suporte(uuid,text), public.pedido_do_codigo(uuid,text) to service_role;
