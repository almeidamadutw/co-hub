# CEO Club | Plataforma de mentoria

Plataforma interna da mentoria CEO Club para mentores, mentorados, financeiro e suporte. Este repositório (**`co-hub`**) é diferente do site de apresentação `site-ceo-hub`.

## Documentação viva
Índice oficial: **[docs/README.md](docs/README.md)**. Contém arquitetura, módulos, jornadas por perfil, banco/integrações, regras, testes e pendências, revisados a partir do código em 2026-11-11. Mudanças devem atualizar o código e os documentos no mesmo commit.

## Módulos identificados
- **Mentor:** dashboard, mentorados, agenda, módulos e aulas, simulados, biblioteca, financeiro e relatórios.
- **Mentorado:** dashboard, agenda, módulos, praticar, progresso, biblioteca, financeiro e suporte.
- **Suporte:** visão geral, gestão de usuários, mentorados/mentores, tickets, logs, biblioteca, financeiro e recuperação de acesso.
- **Financeiro:** acesso de perfil previsto nas políticas; conferir permissões concretas por tela e banco.

## Stack
Next.js 16 / React 19 / TypeScript, Supabase (Auth, Postgres, Storage, RLS), componentes da aplicação, rotas de API e integração de vídeo. Migrações: `supabase/migrations/`.

```bash
npm install
npm run dev
npm run lint
npm run build
```

Jamais publicar tokens, senhas ou dados identificáveis de mentorados nos arquivos do repositório.
