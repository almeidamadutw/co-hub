# Pendências e pontos de validação

| Tema | Estado da documentação | Ação |
| --- | --- | --- |
| Inventário integral de tabelas e políticas RLS | Parcial, migrações disponíveis | Gerar catálogo de dados e permissões por tabela antes de mudanças sensíveis |
| Homologação de cada rota por perfil | Não executada nesta revisão | Validar com contas de teste no ambiente |
| Fluxo real de upload Cloudflare Stream | Código de integração presente | Confirmar credenciais, permissões, quotas e tratamento de erros |
| Sincronização calendário ICS | Endpoint presente | Verificar disponibilidade, links e limites |
| Coerência de módulos publicados com planejamento pedagógico | A validar | Comparar banco, interface e conteúdos aprovados |
| Histórico de mudanças anteriores à padronização | Parcial no Git | Não reconstruir versões fictícias; registrar novas mudanças daqui para frente |
| Atendimento financeiro e rotinas | Rotas presentes | Conferir políticas/estados com a equipe responsável |

**Não confundir lacuna de auditoria com erro comprovado no produto.** Atualizar o status com evidência de teste, código ou configuração.

## Identidade visual

Entrada implementada em `/login`, com ajuste de velocidade da coroa e controles de acesso revisados. A extensão da identidade aos painéis internos está implementada em branch para revisão, ainda sem homologação visual final.

## Acesso por código

Pedido, emissão, ativação e troca de senha implementados. Falta homologar o fluxo completo com uma conta dedicada no ambiente publicado.


## Atualização de identidade interna, 2026-11-18
O menu compartilhado e o tema navy/prata foram implementados na branch `design/ceo-interior-elegante-20261118` para avaliação. **Pendências:** lint e QA visual por perfil (build de preview Vercel aprovado), conferência da responsividade em produção de preview e troca da coroa vetorial pela logo oficial prata com transparência quando enviada.
