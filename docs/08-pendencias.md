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


## Refinamento da área interna, 2026-11-18
- Implementado na branch de trabalho: hero e KPI mais compactos na tela de Módulos; ajuste das superfícies globais e campos dos painéis.
- A validar em preview: responsividade, leitura de títulos longos, modais existentes e consistência com os dashboards de mentorado e suporte.
- A logo oficial transparente ainda requer um arquivo de imagem acessível no repositório ou no chat para substituição segura; não substituir a marca por recorte de print.


## Etapa visual completa e códigos de acesso, 2026-11-18
- Implementado em branch de revisão: classes de design system em todos os painéis e Biblioteca; nova central de emissão e cópia de códigos dentro de **Suporte → Usuários**.
- Pendente: homologação visual em dispositivos reais, verificação das áreas que possuam layouts próprios e testes funcionais autenticados da emissão, expiração, cópia e consumo de OTP.
- A marca prateada oficial foi enviada em PNG com fundo preto; a substituição do símbolo provisório ainda depende de disponibilizar uma versão transparente incorporável ao repositório, preservando o traço oficial.
