# Pendências — Therapeutica Task Flow

Lista viva do que ainda precisa ser corrigido ou decidido. Atualizada em 05/10/2026.
Itens concluídos saem da lista; o histórico fica no Git.

## 1. Bloqueia o próximo deploy

Nada no momento. O deploy é automático a cada push na `main` (GitHub Actions → Cloudflare).

## 2. Segurança (análise de 24/09, revisada em 05/10)

Corrigido em 05/10 (`20261005150000_enforce_permissions_in_database.sql`, sonda como
colaborador comum): apagar ou mandar para a lixeira tarefas de outras pessoas, alterar colunas
do Kanban, alterar reuniões sem a permissão "Reuniões", ler anexos de conversas alheias;
acesso sem login quando falta configuração no servidor; criação de tarefas pela ata sem checar
permissão. Já estavam bloqueados: virar admin, alterar permissões/perfis alheios, ler
comentários alheios, criar avisos para outros. Senhas e tokens de clientes: tabelas vazias.
Também em 05/10 (`20261005170000`): editar tarefa só envolvidos e admins (Kanban não arrasta
card alheio; janela da tarefa fica somente leitura). Decidido manter: quem tem a permissão
"Reuniões" pode excluir reuniões e departamentos; Gabriel e Reinan continuam admins.
Também em 05/10 (`20261005190000`): colaborador só **lê** as tarefas de que participa ou que
criou (inclusive subtarefas, colaboradores, etiquetas, histórico e anexos) e só as reuniões
em que é participante, responsável ou criador. Dashboard do colaborador conta só as dele.

- [ ] Bucket `service-request-attachments` legível por qualquer usuário logado.
- [ ] Excluir um departamento apaga só as reuniões que quem exclui consegue ver; as demais
  ficam sem departamento. Na prática quem exclui é admin (vê todas).
- [ ] Usuários novos são criados com a cópia de permissões do ambiente vazia
  (`admin-user-access` só grava `user_permissions`). Corrigido na tela (usa o cadastro quando
  a cópia está vazia) e nos dados em 05/10; falta a Edge Function gravar as duas listas.
- [ ] Tabelas de clientes com segredos (`client_system_accesses`, `client_social_accounts`)
  estão vazias; apagar as tabelas e as Edge Functions `instagram-*` na limpeza de clientes.
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
- [ ] Ao concluir tarefa, o trigger apaga os anexos de conversa removendo a linha de
  `storage.objects` (liberado com `storage.allow_delete_query`). O arquivo físico pode ficar
  órfão no bucket; o ideal é apagar pela Storage API (Edge Function). Até 30/09 esse trigger
  impedia concluir qualquer tarefa.
- [ ] Tarefas automáticas da pauta: itens incluídos na reunião depois da criação só ganham
  tarefa na próxima rotina (abrir Reuniões ou 7h).
- [ ] Tarefas automáticas não geram avisos (criação nem conclusão pela reunião). Se a
  equipe sentir falta, avaliar um resumo único por reunião em vez de um aviso por tarefa.
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
