# Pendências — Therapeutica Task Flow

Lista viva do que ainda precisa ser corrigido ou decidido. Atualizada em 25/09/2026.
Itens concluídos saem da lista; o histórico fica no Git.

## 1. Bloqueia o próximo deploy

- [ ] **Deploy do frontend** (Cloudflare) a partir da branch `feat/meeting-agenda-results`
  (ou depois de juntá-la à `main`). O banco já está no modelo novo de reuniões; a versão no ar
  ainda é a antiga.

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
- [ ] Limpeza futura do modelo antigo de pautas-tarefa: coluna `tasks.obligation_template_id`,
  índice `tasks_obligation_template_occurrence_idx` e função `create_obligation_template_tasks`.
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
- [ ] `useTasks`, subtarefas e colaboradores agora buscam todas as linhas em páginas de 1000
  (antes vinham cortadas em 1000). Ainda falta filtrar arquivadas no servidor e carregar sob demanda.
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

- [ ] **Obrigações — pontos deixados para depois:** a aba Calendário e a edição de tarefas em
  lote saíram da tela nova; participantes são definidos por rotina (não por reunião avulsa); o
  aviso de "2 dias antes" conta dias corridos (reunião de segunda avisa no sábado).
- [ ] **Reuniões dos departamentos (criadas em 25/09):** estão com o Arthuro como responsável.
  Trocar pelos responsáveis reais e cadastrar os membros de cada departamento quando Haila,
  Valorise, Daniel e Fabiana tiverem usuário. Todos os itens das pautas padrão (inclusive
  Comercial, Design e CQ) estão como "Toda reunião" de propósito: os usuários vão configurar a
  periodicidade depois.

- [ ] PDF da ata usa o timbrado da LA Business (`src/assets/Timbrado LA.pdf`).
- [ ] A importação de ata perdeu "Salvar nas anotações do cliente". Definir outro lugar para
  guardar atas, se necessário.
