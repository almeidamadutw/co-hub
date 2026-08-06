-- Execute somente depois que a API revisada de recuperação estiver online.
-- A rotina antiga zerava histórico e era executável diretamente pelo navegador.

revoke all on function public.suporte_liberar_reset_senha(uuid)
  from public, anon, authenticated;
grant execute on function public.suporte_liberar_reset_senha(uuid)
  to service_role;

comment on function public.suporte_liberar_reset_senha(uuid) is
  'RPC legada. Execução do navegador removida após a publicação da API revisada de recuperação.';
