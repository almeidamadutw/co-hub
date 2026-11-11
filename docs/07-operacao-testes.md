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
