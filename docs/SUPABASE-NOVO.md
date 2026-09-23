# Banco Supabase da Therapeutica

Este repositorio usa um projeto Supabase exclusivo da **Therapeutica**, totalmente
separado do Task Flow principal e do projeto Lovable/original.

> **Regra obrigatoria:** migrations, Edge Functions, secrets, configuracoes de
> Auth, buckets e qualquer operacao de banco deste repositorio devem ser aplicados
> somente no projeto Supabase `csubegotswfskibzscch`. Nunca use o projeto Supabase
> do Task Flow principal como destino de comandos, testes ou deploys desta copia.

## Configuracao

1. Use somente o projeto Supabase da Therapeutica, com ref `csubegotswfskibzscch`.
2. Configure `Project URL` e `anon public key` no ambiente local ou de deploy.
3. Confirme novamente o project ref antes de aplicar migrations ou publicar Edge Functions.
4. Rode as migrations de `supabase/migrations` somente no banco da Therapeutica.
5. Configure o build com:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_ANON_PUBLIC_KEY
```

## Projeto atual da Therapeutica

- Project ref: `csubegotswfskibzscch`
- Project URL: `https://csubegotswfskibzscch.supabase.co`
- Configuracao local: `.env.local`
- Configuracao da CLI: `supabase/config.toml`

Antes de executar qualquer comando da CLI, migration ou deploy de Edge Function,
confirme que o project ref exibido e exatamente `csubegotswfskibzscch`.

## Por que as chaves publicas entram no build?

O cliente Supabase executado no navegador precisa da URL do projeto e da chave
publica. O Vite substitui as variaveis `VITE_*` durante o build do Cloudflare
Workers e no build estatico alternativo do GitHub Pages. A
`service_role` e os demais secrets nunca podem usar o prefixo `VITE_`.

## O que nao copiar

- Nao copie dados do Supabase antigo.
- Nao use `service_role` no frontend.
- Nao aplique as migrations deste repositorio no Task Flow principal.
- Nao publique as Edge Functions deste repositorio no Task Flow principal.
- Nao reutilize secrets, tokens, URLs OAuth, buckets ou credenciais da instancia principal.
- Nao use a URL ou as chaves do banco do Task Flow principal neste repositorio.
- Nao misture migrations novas no projeto Lovable/original.

## Cadastro somente por convite

Depois de aplicar a migration `20260803113000_invite_only_auth.sql`, cadastros
diretos sao recusados pelo banco. Para concluir a configuracao do convite:

1. Publique a funcao `admin-user-access` no Supabase.
2. Cadastre `https://seu-dominio.com/auth?invite=1` em **Auth > URL Configuration > Redirect URLs**.
3. Crie o secret da Edge Function `INVITE_REDIRECT_URL` com essa mesma URL.
4. Em **Auth > Email Templates**, mantenha habilitado o template de convite e
   ajuste a validade do token de convite para 24 ou 48 horas, conforme a politica desejada.

O administrador passa a usar **Usuarios > Novo usuario > Enviar convite**. O
Supabase envia um link individual ao e-mail indicado e, ao abri-lo, a pessoa
define a propria senha. O token e de uso unico e fica vinculado ao destinatario.
