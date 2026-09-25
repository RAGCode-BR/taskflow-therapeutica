# Pendências — Therapeutica Task Flow

Lista viva do que ainda precisa ser corrigido ou decidido. Atualizada em 25/09/2026.
Itens concluídos saem da lista; o histórico fica no Git.

## 1. Bloqueia o próximo deploy

- [ ] **Apagar os 19 arquivos órfãos da remoção de clientes.** Sem isso o build falha
  (erros de tipo em `portal.entregas.tsx` e `portal.financeiro.tsx`). Arquivos: rotas
  `clients*.tsx`, `client-report.$clientId.tsx`, `portal.entregas.tsx`,
  `portal.financeiro.tsx`, `notes.tsx`; componentes `ClientFilesManager`, `ClientNotesSheet`,
  `ClientFilesSheet`, `InlineTaskEditor`; libs `use-instagram-insights`, `instagram-insights`
  (+ teste), `client-report.functions`, `sync-task-attachment-to-client`,
  `admin-users.functions`.
- [ ] Depois de apagar: remover `useClients`, `useRelatedClients` e `useArchivedClientTasks`
  de `src/hooks/use-data.ts`, regenerar `routeTree.gen.ts` e rodar `npm run build`.
- [ ] **Commit e deploy do frontend** (Cloudflare). Nada do trabalho de 24–25/09 foi
  commitado: correções do offline, mural (vencidos), seletor de departamento, pautas padrão,
  remoção de clientes.

## 2. Segurança (da análise de 24/09)

- [ ] **Crítica — permissões só no frontend.** No banco, qualquer membro do ambiente lê e
  altera tudo (policies `FOR ALL` só checam `has_workspace_access`). Exigir no RLS o papel
  admin/colaborador e a permissão da página. Contas antigas do papel "client" continuam
  membros do ambiente: revisar e desativar/converter.
- [ ] **Crítica — senhas de sistemas de clientes em texto claro** (`client_system_accesses`),
  legíveis por qualquer membro via API. Com clientes removidos da interface: avaliar apagar ou
  mover para Vault.
- [ ] Bucket `task-attachments` (e `service-request-attachments`) legível por qualquer usuário
  logado, inclusive anexos de conversas das quais ele não participa.
- [ ] Token do Instagram/Meta legível via API (`client_social_accounts.access_token`). Com
  clientes removidos: revogar acesso à coluna ou apagar os tokens; despublicar as Edge
  Functions `instagram-*`.
- [ ] `auth-middleware.ts` libera acesso sem login se faltar variável de ambiente
  (fail-open). Confirmar variáveis no Cloudflare e fazer falhar fechado.
- [ ] `createTasksFromAta` usa a service role sem checar papel/permissão.
- [ ] XSS na exportação PDF do Kanban (cores sem escape em `innerHTML`).
- [ ] OAuth Google/Meta: `state` preso ao usuário e não ao navegador (CSRF), sem PKCE.
- [ ] `complete-password-change` troca a senha sem exigir a flag `must_change_password`.
- [ ] Cache offline (IndexedDB) guarda conversas e dados sensíveis sem criptografia por 7 dias.
- [ ] Agendas pessoais do Google importadas inteiras e visíveis para a equipe (confirmar se é
  intencional).
- [ ] Baixa: CORS `*` nas Edge Functions; `CRON_SECRET` comparado sem tempo constante; senha
  mínima 6 × 8 caracteres; pasta `supabase/.temp/` versionada no Git.

## 3. Banco de dados

- [ ] `src/integrations/supabase/types.ts` desatualizado (faltam 20+ tabelas; enum de papéis
  errado) e `supabase/remote-schema.sql` vazio. Regenerar os dois.
- [ ] Funções de RLS `VOLATILE` (`has_workspace_access`, `current_workspace_id`) rodam por
  linha; marcar como `STABLE`.
- [ ] Índices faltando: `tasks.client_id`, `tasks.created_by`, `subtasks.assignee_id`,
  `task_history.task_id`, `notifications(user_id, is_read)`, `comments.author_id`, FKs de
  `service_requests`.
- [ ] Resíduos do multi-workspace (colunas, triggers, "espelho", permissões duplicadas em
  `user_permissions` e `workspace_memberships`).
- [ ] Obrigações: `meeting_mode DEFAULT true` fez dois triggers disputarem a mesma ocorrência
  (reunião pode concluir com pautas pendentes); `CURRENT_DATE` em UTC nas partes antigas; sem
  feriados; datas perdidas se o cron falhar; confirmar se o job `taskflow-obligations-daily`
  existe; materialização em loop (lenta).
- [ ] **`pg_cron` não está instalado no projeto.** Não existe job diário: as reuniões e
  tarefas do dia só são geradas quando alguém abre a tela de Obrigações (que chama
  `materialize_obligations`). Se ninguém abrir, as tarefas do dia não aparecem. Avaliar
  habilitar `pg_cron` e agendar a geração diária.
- [ ] Trigger que apaga anexos ao concluir tarefa faz `DELETE` direto em `storage.objects`
  (pode ser bloqueado pelo Supabase). Confirmar.
- [ ] Clientes (dados mantidos de propósito): decidir no futuro se apaga tabelas/colunas de
  clientes e os triggers `prevent_inactive_client_*` e `archive_inactive_client_operations`.

## 4. Offline

- [ ] Controle de versão (detecção de conflito) existe só para tarefas. Subtarefas,
  comentários, notas e mural: a última gravação vence.
- [ ] Fora das tarefas, as telas só vão para a fila quando o navegador se declara offline;
  com Wi-Fi sem internet mostram erro.

## 5. Frontend e qualidade

- [ ] Kanban: N+1 (cada card faz as próprias consultas) e um canal realtime por card.
- [ ] `useTasks` sem paginação e sem filtro de arquivadas no servidor.
- [ ] Arquivos gigantes a dividir: `TaskCard.tsx`, `TaskDialog.tsx`, `obligations.tsx`,
  `reports.tsx`, `tasks.kanban.tsx`, `mural.tsx`, `TaskConversationPanel.tsx`.
- [ ] Código morto: integração Lovable (inclusive `@lovable.dev/vite-tanstack-config` no
  build), 22 componentes `ui` sem uso, GitHub Pages, `deno.lock`, `bunfig.toml`,
  `teste-gemini.js`, logos antigos da LA Business, restos de multi-workspace.
- [ ] `npm run lint` no projeto inteiro trava (RangeError no formatador); provavelmente falta
  ignorar `.output/`, `.wrangler/` e `docs/`.
- [ ] Acessibilidade: ~60 botões só com ícone sem `aria-label`; 25 `confirm()` nativos.
- [ ] Seis famílias do Google Fonts carregadas em todas as páginas (só o mural usa).

## 6. Decisões de produto

- [ ] **Rotinas diárias dos departamentos (criadas em 25/09):** todas estão com o Arthuro
  como responsável e rodam de segunda a sexta. Ajustar:
  - responsáveis reais (Haila, Valorise e Daniel ainda não têm usuário no sistema);
  - tarefas que não são diárias e hoje se repetem todo dia: "ATÉ 25 DE CADA MÊS" e
    "Baixa das notas de funcionários (CONVÊNIOS)" (Financeiro), "PLANILHA DE FLUXO DE CAIXA
    SEMANAL" (Gestão Adm-Financeira), "ROTINA MENSAL: NF de devolução…" (Faturamento), e
    itens de RH/DP como Avaliação de desempenho, PDI, Plano de Cargos, Fechar folha.
    Podem virar obrigações próprias (semanal/mensal).

- [ ] PDF da ata usa o timbrado da LA Business (`src/assets/Timbrado LA.pdf`).
- [ ] A importação de ata perdeu "Salvar nas anotações do cliente". Definir outro lugar para
  guardar atas, se necessário.
