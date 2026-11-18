# Operação, testes e deploy

## Execução local
```bash
npm install
npm run dev
npm run lint
npm run build
```
O projeto usa Next.js; configure as variáveis de ambiente necessárias ao Supabase e provedores externos **fora do repositório**. Não adivinhar valores de URL/keys.

## Banco
1. Verificar migrações pendentes em `supabase/migrations/`.
2. Aplicar no ambiente correto seguindo procedimento de backup, revisão e controle de mudança.
3. Conferir RLS por perfil, especialmente biblioteca, módulos, simulados, financeiro e suporte.
4. Não rodar scripts que criem/corrijam usuários reais sem revisão.

## Testes de aceite manuais
- Mentor, mentorado, financeiro e suporte acessam somente suas rotas.
- Mentor cria conteúdo e libera um módulo em ambiente de testes.
- Mentorado visualiza apenas aulas permitidas e registra atividade.
- Simulados, biblioteca e upload verificam permissões e formatos.
- Tickets, reset de senha e logs funcionam com trilha de auditoria.
- Financeiro mantém separação de acesso e estados coerentes.
- Testar dispositivos móveis, estado de carregamento e falhas de rede.

## Publicação
Confirmar build, migrações, variáveis e estado do deploy no provedor real. Não afirmar sucesso de produção por este documento; **a mudança atual é somente documental**.


## Revisão visual interna 2026-11-18
- Arquivos alterados: três sidebars, componente compartilhado, três layouts de perfil e `app/globals.css`.
- Verificação estática feita sobre os componentes e rotas existentes antes da mudança: menus, destinos, logout e consulta de inscrição de mentorado foram mantidos. Escopo do tema isolado pela classe `ceo-workspace`.
- **Executado:** build de produção na prévia Vercel, com compilação Next.js 16 e verificação TypeScript concluídas (deployment `dpl_FtWdiPAeehcLwnzTATwpu9fL9dEx`, estado READY). **Ainda pendente:** `npm run lint` e os testes reais em Chromium (1366×768, 390×844) com contas de teste dos perfis, incluindo menu móvel, foco por teclado e barras de rolagem. O ambiente de edição via conector GitHub não fornece uma instalação local do projeto para esses comandos.
- A aprovação em código não equivale à publicação no domínio nem à homologação do usuário final.


## Homologação do refinamento interno, 2026-11-18 (segunda etapa)
- Arquivos alterados: `app/mentor/modulos/page.tsx`, `app/globals.css` e documentação funcional.
- Verificação estática feita: eventos de `Nova aula`, `Novo módulo`, busca, filtros, reordenação, edição e liberação preservados; indicadores continuam derivados de `resumo`, sem inclusão de dados simulados.
- Pendências de homologação: lint, build, revisão visual nas resoluções 390px e 1440px, navegação autenticada em cada perfil, contraste/foco por teclado e teste do menu lateral.
- O redesign desta etapa não altera tabelas, migrações ou permissões do Supabase.


## Revisão do design system e do fluxo de códigos em Usuários
- Aplicação visual por marcadores nas páginas existentes de todos os perfis (mentor, mentorado, financeiro via área financeira, suporte) e na Biblioteca compartilhada. O login público e as chamadas Supabase permanecem independentes.
- A emissão de código reutiliza a API `/api/auth/recuperar-senha/suporte`, autorizada no servidor para suporte, com uso único e expiração controlados pelo fluxo atual; sem migração ou credencial nova. O código não é persistido no frontend além do estado temporário da janela. Cópia só por interação explícita.
- Verificar: criação de usuário ativo, emissão para perfil já ativo, bloqueio de emissão em conta não ativa, expiração e consumo do código, permissão de suporte, login sem domínio .com.br, estado de erros, fechamento e cópia do modal.
- Executar build Next.js/TypeScript no preview Vercel e testar a navegação autenticada de todos os perfis em telas móveis e desktop antes de considerar homologado. Não afirmar que telas/dados de produção foram validados apenas pela compilação.
