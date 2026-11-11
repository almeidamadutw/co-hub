# Dados e integrações

## Entidades de referência
A aplicação utiliza conjuntos de registros para perfis, módulos/aulas, materiais, liberação de módulos, mentorados, atividades, simulados, tentativas, agenda, financeiro, biblioteca/pastas, tickets e logs. Tabelas e colunas exatas devem ser verificadas nas migrações e nas consultas antes de alterações.

Exemplos diretamente observados:
- `profiles` com campos como `role`, `status` e identificação;
- módulos com estado de liberação `aberto`, `fechado` e `agendado`;
- parcelas financeiras com `Pago`, `Pendente`, `Atrasado`, `Cancelado`;
- eventos de agenda com `Confirmada`, `Aguardando`, `Concluída`, `Cancelada`.

## Interfaces de API no repositório
- `app/api/admin/modulos/route.ts` e `admin/usuarios/route.ts`;
- `app/api/tickets/route.ts`;
- `app/api/biblioteca/route.ts` e `biblioteca/pastas/route.ts`;
- `app/api/simulados/mentorado/route.ts`;
- `app/api/cloudflare/stream/upload-url/route.ts`;
- `app/api/calendar/ics/route.ts`;
- `app/api/perfil/foto/route.ts`;
- `app/api/auth/` para recuperação e redefinição de senha.

## Integrações
Supabase é a fonte de identidade/persistência. Há caminhos para armazenamento de arquivo, vídeo e exportação de calendário ICS. Verificar em ambiente quais serviços externos estão configurados antes de afirmar que estão ativos.

## Segurança de dados
Manter autenticação na API, políticas de Row Level Security, bucket de foto privado e validação de permissões financeiras; conferir migrações em `supabase/migrations`. Nunca documentar senhas ou registros pessoais reais.
