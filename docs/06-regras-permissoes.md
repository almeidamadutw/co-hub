# Regras de negócio e permissões

## Identidade e perfis
Perfis identificados: `mentor`, `mentorado`, `financeiro`, `suporte`. A gestão de usuários distingue estados como ativo, pendente, inativo, bloqueado, cancelado e suspenso. Acesso depende de estado e permissão, não apenas do nome da rota.

## Ensino
- Liberação de módulo: `aberto`, `fechado` ou `agendado`.
- Restringir módulos e simulados de mentorados ao conteúdo autorizado, conforme migrações de julho/agosto de 2026.
- Atividades e tentativas devem estar vinculadas ao mentorado correto; não permitir leitura cruzada.
- Controles de acesso de vídeos e materiais precisam ser revisados junto das APIs.

## Financeiro
- Estados identificados na interface: Pago, Pendente, Atrasado, Cancelado.
- Perfis financeiros e operações de ajuste têm políticas específicas no banco; não supor que mentorados possam modificar valores.

## Suporte e auditoria
- Edição completa de usuários é restringida em migrações de suporte.
- Reset de senha deve utilizar canais autorizados, com logs e controles de segurança.
- Biblioteca e fotos de perfil possuem políticas de autoria e armazenamento privado.

**Regra de arquitetura:** a permissão final deve ser validada no backend e por RLS, não apenas por condicionais no React.
