# Funcionalidades por perfil

## Mentor (rotas `app/mentor/`)
| Tela | Função principal |
| --- | --- |
| `dashboard` | indicadores de mentorados, agenda, parcelas e módulos |
| `mentorados` e `mentorados/[id]` | lista, ficha e acompanhamento individual |
| `agenda` | compromissos da mentoria |
| `modulos` | gestão de módulos, aulas, materiais e disponibilização |
| `simulados` | listagem e edição de simulados |
| `biblioteca` | organização e acesso a arquivos |
| `financeiro` | consulta financeira condicionada ao acesso |
| `relatorios` | visualização de relatórios do mentor |
| `conta` | dados do perfil |

## Mentorado (rotas `app/mentorado/`)
Dashboard, Agenda, Módulos, Praticar, Progresso, Biblioteca, Financeiro, Suporte e Conta. O conteúdo apresentado deve respeitar liberação e vínculo do usuário.

## Suporte (rotas `app/suporte/`)
Visão geral, Usuários, Mentores, Mentorados, Tickets, Logs, Biblioteca, Financeiro, Reset de senha, Conta e consultas de mentor.

## Particularidades implementadas
- Vídeos e materiais associados às aulas; atividades práticas podem ter respostas.
- Módulos com liberação `aberto`, `fechado` ou `agendado`.
- Simulados/tentativas e atividades possuem estados e restrições de acesso.
- Biblioteca com pastas e política de autoria/acesso.
- Perfis e tickets com ações administrativas auditáveis.

**Observação:** tela existente significa interface codificada, não certificação de que todos os dados estejam corretamente preenchidos em produção.
