# Arquitetura técnica

## Tecnologias
- Next.js 16 App Router, React 19, TypeScript.
- Supabase: autenticação, PostgreSQL, políticas RLS e armazenamento.
- Rotas de API Next.js para serviços internos e operações protegidas.
- Componentes React em `components/`; utilitários e autenticação em `utils/`.
- Integração de vídeo por componente `CloudflareVideoEmbed` e endpoint de URL de upload (não equivale a disponibilidade irrestrita da API).

## Estrutura
```text
app/
  mentor/         # painel e gestão da mentoria
  mentorado/      # área de estudo e progresso
  suporte/        # administração e tickets
  api/            # backend de módulos, usuários, tickets, biblioteca etc.
  login/          # autenticação
  esqueci-senha/  # recuperação
  redefinir-senha/
components/       # layout, controles, vídeo, biblioteca, fichas
utils/            # autenticação, estado, queries, validações
supabase/migrations/ # versão do banco e das políticas
docs/             # contratos e guias
```

## Princípios
- Verificar autorização no servidor e no banco; ocultar botão não substitui RLS.
- Migração de banco deve entrar no mesmo commit da alteração de contrato de dados.
- Separar conteúdo de aprendizagem, dados financeiros e tickets por permissões.
- A estrutura das rotas é estável no código; publicação e habilitação de conteúdo dependem de dados da instância.
