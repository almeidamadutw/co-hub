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

## Entrada da plataforma

A tela de acesso reúne a marca do CEO Club, a coroa prateada e o formulário de login. Em celulares, a coroa é estática e dá lugar aos campos quando você abre o formulário. A preferência por movimento reduzido também desativa a animação em telas maiores.


## Identidade e navegação interna (proposta de atualização 2026-11-18)

- Menu lateral compartilhado em `components/CeoSidebarFrame.tsx` para mentor, mentorado, financeiro e suporte, com a mesma linguagem azul-marinho/prata do login, ícones leves e indicação da rota ativa.
- A coroa vetorial sem fundo substitui a antiga imagem JPEG na navegação. **É um símbolo provisório**, que poderá ser substituído pela logo oficial prateada transparente quando o arquivo for fornecido.
- No desktop, a barra lateral é fixa com navegação rolável; no celular, o botão **Menu** abre um painel com fechamento explícito e camada escurecida.
- O rodapé identifica a conta e oferece **Sair da plataforma**. Os links originais de cada perfil, inclusive o acesso adicional de suporte para a mentora, foram preservados.
- Os layouts de `/mentor`, `/mentorado` e `/suporte` ativam as novas superfícies, fundos e cabeçalhos usando a classe `ceo-workspace`. `/login` continua independente. Não há alteração de autorização, APIs ou tabelas.


## Layout da área interna, revisão 2026-11-18

- A tela de `mentor/modulos` adota hero executivo navy/prata, tipografia editorial, ações de criação e cinco indicadores compactos (módulos, ativos, aulas, aulas com vídeo, materiais). As métricas de módulos completos e sem aulas aparecem em uma faixa discreta, sem duplicação de cartões.
- Busca, filtros e cartões dos módulos mantêm comportamentos, estados e dados existentes; recebem componentes visuais menores e bordas metálicas discretas.
- `ceo-workspace` uniformiza fundos, cartões e campos das páginas autenticadas, sem se aplicar à entrada pública e sem mudar dados/API.
