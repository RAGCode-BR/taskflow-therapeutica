# Deploy no Cloudflare Workers

Este projeto gera uma aplicação SSR para **Cloudflare Workers**, com os assets
do frontend e da PWA publicados junto ao Worker. O deploy Cloudflare é separado
do build Vercel já existente.

O repositório usa npm e `package-lock.json` como fonte única das dependências.
Não adicione outro lockfile, pois o Cloudflare seleciona automaticamente o
gerenciador de pacotes a partir desse arquivo.

## Pré-requisitos

- Node.js 22 ou superior.
- Uma conta Cloudflare com Workers habilitado.
- Acesso apenas ao Supabase da Therapeutica, project ref
  `csubegotswfskibzscch`.

Instale as dependências e autentique o Wrangler:

```bash
npm ci
npx wrangler login
```

## Variáveis públicas de build

As variáveis com prefixo `VITE_` são incorporadas ao JavaScript do navegador
durante o build. Configure-as no ambiente que executará `npm run
build:cloudflare`:

```env
VITE_SUPABASE_URL=https://csubegotswfskibzscch.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_ENABLE_GOOGLE_AUTH=false
```

Elas não devem conter dados sigilosos. Em Workers Builds, cadastre-as em
**Settings > Build > Variables and secrets**.

## Variáveis e secrets de runtime

Cadastre valores não sigilosos como variáveis do Worker. Para secrets, use o
painel do Cloudflare ou `wrangler secret put`. Exemplo:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
npx wrangler secret put META_APP_SECRET
npx wrangler secret put CRON_SECRET
```

As demais variáveis de servidor estão descritas em `.env.example`. Não grave
valores reais em `wrangler.jsonc`, `.dev.vars`, `.env` ou arquivos versionados.
Para desenvolvimento local do Worker, copie somente os valores necessários
para `.dev.vars`, que já está ignorado pelo Git.

## Validar e publicar

O dry-run compila todo o sistema e valida o pacote do Worker sem publicar:

```bash
npm run deploy:cloudflare:dry-run
```

Para testar localmente no runtime do Cloudflare:

```bash
npm run preview:cloudflare
```

Para publicar, depois de cadastrar todas as variáveis e revisar a conta ativa:

```bash
npx wrangler whoami
npm run deploy:cloudflare
```

O build é gerado em `.output/`. O Nitro cria
`.output/server/wrangler.json` com o entrypoint e o diretório de assets corretos;
os scripts usam explicitamente esse arquivo gerado.

## Configuração de CI / Workers Builds

- Versão do Node: `22` ou superior.
- Comando de build: `npm run build:cloudflare`.
- Comando de deploy: `npx wrangler deploy --config .output/server/wrangler.json`.
- Diretório raiz: raiz deste repositório.

## Depois do primeiro deploy

1. Configure o domínio personalizado no Worker.
2. Defina `TASKFLOW_APP_URL` e `INVITE_REDIRECT_URL` com o domínio final.
3. Adicione o domínio e `/auth?invite=1` às URLs permitidas do Supabase Auth.
4. Atualize os redirects OAuth do Google e da Meta.
5. Valide login, convite, upload, Gemini, PWA e integrações externas.

Nada neste processo executa migrations ou publica Edge Functions. Qualquer
operação de banco deve continuar apontando exclusivamente para
`csubegotswfskibzscch`, conforme `docs/SUPABASE-NOVO.md`.
