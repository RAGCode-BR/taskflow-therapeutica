# Therapeutica — Task Flow

Sistema interno da Therapeutica para gestão de tarefas, clientes, conversas,
obrigações recorrentes, agenda, documentos e acompanhamento operacional.

Esta é uma instância independente, construída com React, TanStack Start e
Supabase. Ela não compartilha banco, credenciais ou deploy com o Task Flow
principal da LA Business.

> [!CAUTION]
> O único projeto Supabase autorizado para este repositório é
> `csubegotswfskibzscch` (`taskflow-therapeutica`). Nunca execute migrations,
> publique Edge Functions, configure secrets ou faça testes deste código no
> Supabase do Task Flow principal ou no projeto Lovable/original.

## Funcionalidades

- Dashboard operacional e indicadores de produtividade.
- Tarefas em Kanban, lista e calendário.
- Subtarefas, responsáveis, colaboradores, tags, prazos e prioridades.
- Conversas por tarefa, menções, anexos, recibos de leitura e realtime.
- Cadastro de clientes, departamentos, funcionários, notas, acessos e arquivos.
- Arquivamento das operações de clientes inativos e lixeira com restauração.
- Obrigações recorrentes com materialização automática em tarefas.
- Mural interno com anexos, reações e notificações.
- Agenda com integração ao Google Calendar e Google Meet.
- Importação de atas e geração de relatórios com Gemini.
- Solicitações internas e portal do cliente.
- Portal financeiro com documentos de cobrança.
- Insights de Instagram por cliente.
- Operação offline parcial com IndexedDB, fila de sincronização e conflitos.
- Gestão de usuários por convite.

## Identidade visual

A interface utiliza a paleta oficial da Therapeutica:

| Uso                         | Cor       |
| --------------------------- | --------- |
| Verde oliva — principal     | `#5D6E3E` |
| Coral — destaque e foco     | `#EC643F` |
| Dourado — avisos e gráficos | `#F5B751` |
| Grafite — texto secundário  | `#626161` |
| Fundo claro                 | `#FAF8F3` |

Os temas claro e escuro são definidos em `src/styles.css`. A marca utilizada
pela aplicação está em `src/assets/therapeutica-logo.png`.

## Stack

- React 19 e TypeScript.
- TanStack Router e TanStack Start.
- Vite 7 e Nitro com alvos para Cloudflare Workers e Vercel.
- TanStack Query.
- Tailwind CSS 4 e componentes Radix UI/shadcn.
- Supabase Postgres, Auth, Storage, Realtime e Row Level Security.
- Supabase Edge Functions em Deno.
- TipTap para conteúdo rico.
- Gemini para atas e relatórios.
- Vite PWA e IndexedDB para suporte offline.
- Vitest e ESLint.

## Requisitos

- Node.js 22 ou superior.
- npm.
- Acesso autorizado ao projeto Supabase da Therapeutica para operações de
  infraestrutura.

## Instalação local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

O Vite normalmente inicia a aplicação em `http://localhost:8080`. Se a porta
estiver ocupada, ele selecionará a próxima disponível.

## Variáveis de ambiente

Use `.env.example` como referência. Nunca versione `.env.local` ou credenciais
reais.

### Públicas

Estas variáveis são incorporadas ao frontend pelo Vite:

```env
VITE_SUPABASE_URL=https://csubegotswfskibzscch.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ENABLE_GOOGLE_AUTH=
```

A chave pública do Supabase pode ser utilizada no navegador porque o acesso aos
dados deve ser controlado pelas políticas RLS. Nenhum secret pode receber o
prefixo `VITE_`.

### Servidor

```env
SUPABASE_URL=https://csubegotswfskibzscch.supabase.co
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_SHARED_CALENDAR_ID=
TASKFLOW_APP_URL=
INVITE_REDIRECT_URL=
META_APP_ID=
META_APP_SECRET=
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY`, tokens OAuth e demais secrets são exclusivos do
servidor. Eles nunca podem ser importados por componentes do navegador.

## Comandos

| Comando                             | Finalidade                                           |
| ----------------------------------- | ---------------------------------------------------- |
| `npm run dev`                       | Inicia o ambiente local.                             |
| `npm run build`                     | Gera o build de produção para Vercel.                |
| `npm run build:cloudflare`          | Gera o Worker SSR e seus assets em `.output`.        |
| `npm run preview:cloudflare`        | Executa o build no runtime local do Cloudflare.      |
| `npm run deploy:cloudflare:dry-run` | Valida o pacote Cloudflare sem publicar.             |
| `npm run deploy:cloudflare`         | Publica no Cloudflare Workers.                       |
| `npm run preview`                   | Executa uma prévia do build padrão.                  |
| `npm test`                          | Executa os testes com Vitest.                        |
| `npx tsc --noEmit`                  | Valida os tipos TypeScript.                          |
| `npm run lint`                      | Executa ESLint e Prettier em modo de validação.      |
| `npm run format`                    | Formata o projeto com Prettier.                      |
| `npm run build:pages`               | Gera o build estático alternativo para GitHub Pages. |
| `npm run docs:codigo`               | Atualiza a documentação gerada do código.            |

O build usa até 4 GB de heap devido ao volume atual de módulos.

## Arquitetura

```text
src/
├── components/              Componentes de negócio e interface
│   └── ui/                  Componentes base Radix/shadcn
├── hooks/                   Sessão, queries, realtime e regras de domínio
├── integrations/supabase/  Clientes Supabase, autenticação e tipos
├── lib/                     Regras reutilizáveis e funções de servidor
└── routes/                  Rotas e telas do TanStack Router

supabase/
├── functions/               Edge Functions em Deno
└── migrations/              Evolução incremental do banco e das políticas RLS
```

O cliente web acessa o Supabase com a chave pública e a sessão do usuário. As
políticas RLS são a fronteira definitiva de autorização. Operações que exigem
`service_role` devem existir apenas em funções confiáveis do servidor e validar
explicitamente a identidade e as permissões do solicitante.

## Ambiente único da Therapeutica

O banco mantém `workspace_id` como fronteira de autorização, mas esta instância
possui um único workspace visível:

- Nome: `Therapeutica`.
- Slug interno legado: `consultoria`.
- Seletor de ambientes oculto.

Ainda existem estruturas históricas de suporte a múltiplos ambientes no código
e nas migrations. Elas não autorizam o uso do banco principal e não devem ser
reativadas sem uma revisão de segurança.

## Banco de dados

- Project ref: `csubegotswfskibzscch`.
- Nome no Supabase: `taskflow-therapeutica`.
- Configuração da CLI: `supabase/config.toml`.
- Histórico do schema: `supabase/migrations`.
- Schema de referência: `supabase/remote-schema.sql`.

Antes de qualquer comando de banco:

1. Confira se o destino é `csubegotswfskibzscch`.
2. Confirme que não há URL ou chave do Task Flow principal no ambiente.
3. Revise migrations destrutivas antes da aplicação.
4. Faça backup quando o banco já possuir dados reais.

Não use `db reset`, exclusões em massa ou migrations destrutivas em produção sem
uma revisão específica do impacto.

## Autenticação e usuários

O cadastro público está desativado. Novos acessos são criados por convite na
tela de usuários, por meio da Edge Function `admin-user-access`.

Papéis existentes:

- `admin`: administração e acesso integral ao sistema.
- `collaborator`: acesso conforme as permissões concedidas.
- `client`: acesso restrito aos módulos e dados do cliente vinculado.

Depois do deploy, configure no Supabase Auth:

- Site URL pública.
- Redirect URL pública terminando em `/auth?invite=1`.
- Secret `INVITE_REDIRECT_URL` com a mesma URL.

## Edge Functions

As funções atuais incluem:

- `admin-user-access`.
- `agenda-events`.
- `google-calendar-oauth`.
- `google-calendar-sync`.
- `google-meet-minutes-sync`.
- `instagram-oauth-callback`.
- `instagram-insights-sync`.

As funções configuradas com `verify_jwt = false` realizam sua própria validação
de bearer token, estado OAuth ou `CRON_SECRET`. Essa configuração não significa
acesso público irrestrito.

## Storage

Buckets utilizados pela aplicação:

- `task-attachments`.
- `mural-attachments`.
- `invoice-documents`.
- `profile-avatars`.
- `service-request-attachments`.

Arquivos privados devem ser acessados por sessão autorizada ou URL assinada. As
políticas dos buckets devem ser implantadas junto com as migrations.

## Offline e PWA

Dados previamente acessados são armazenados no IndexedDB por usuário. Alterações
compatíveis podem entrar em uma fila local e ser sincronizadas após a reconexão.
Conflitos de tarefas são detectados por campo.

Agenda Google, integrações externas e dados financeiros permanecem online. O
logout confirmado remove os dados offline da conta naquele navegador.

## Testes e qualidade

Antes de entregar uma alteração, execute:

```bash
npx tsc --noEmit
npm test
npm run build
```

O repositório possui testes unitários para regras de tarefas, calendário,
conversas, sanitização, anexos, Instagram e sincronização offline. Fluxos de
interface e políticas RLS ainda devem receber maior cobertura de integração.

## Deploy

O sistema está preparado para Cloudflare Workers com renderização SSR, funções
de servidor e assets/PWA no mesmo deploy:

```bash
npm run deploy:cloudflare:dry-run
npm run deploy:cloudflare
```

As instruções completas de variáveis, secrets, CI e domínio estão em
[`docs/DEPLOY-CLOUDFLARE.md`](docs/DEPLOY-CLOUDFLARE.md).

O fluxo Vercel continua disponível separadamente:

```bash
npm run build
```

O build Cloudflare fica em `.output`; o resultado Vercel segue seu Build Output
em `.vercel/output`. Configure na plataforma escolhida todas as variáveis
públicas e secrets necessários antes de publicar.

Após o primeiro domínio público:

1. Atualize `TASKFLOW_APP_URL` e `INVITE_REDIRECT_URL`.
2. Atualize os redirects do Supabase Auth.
3. Atualize os redirects OAuth do Google e da Meta.
4. Confirme a publicação das Edge Functions.
5. Valide convites, Storage, cron e integrações no ambiente da Therapeutica.

## Documentação complementar

- [Configuração da Therapeutica](THERAPEUTICA-SETUP.md)
- [Arquitetura detalhada](docs/ARQUITETURA.md)
- [Supabase da Therapeutica](docs/SUPABASE-NOVO.md)
- [Deploy no Cloudflare Workers](docs/DEPLOY-CLOUDFLARE.md)
- [Convenções das rotas](src/routes/README.md)
- [Guia de estudo](docs/GUIA-DE-ESTUDO.md)
- [Ideias futuras](IDEIAS_FUTURAS.md)

## Regra de isolamento

Toda evolução deste projeto deve acontecer neste repositório e no Supabase
`csubegotswfskibzscch`. O Task Flow principal e o projeto Lovable/original são
somente referências históricas e nunca devem ser usados como ambiente de teste,
destino de migrations ou destino de deploy desta aplicação.
