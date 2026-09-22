# Therapeutica - Task Flow

Instancia independente do TaskFlow preparada para o projeto Supabase
`csubegotswfskibzscch`.

## Isolamento

- Nao possui historico Git do sistema de origem.
- Nao inclui `.env.local`, credenciais, usuarios, clientes, tarefas ou arquivos.
- Usa um unico workspace interno chamado `Therapeutica`; o seletor de ambiente
  permanece oculto.
- O deploy da aplicacao nao foi criado. O codigo esta preparado para uma futura
  implantacao independente.

## Configuracao local

1. Execute `npm ci`.
2. Copie `.env.example` para `.env.local`.
3. Preencha somente as chaves do projeto Supabase da Therapeutica.
4. Execute `npm run dev`.

O build de producao usa 4 GB de heap por causa do volume atual de modulos:

```bash
npm run build
```

## Administrador inicial

O convite de `arthurogrupoahouse@gmail.com` foi criado no Supabase novo com
papel de administrador e todas as permissoes. Enquanto nao houver dominio
publico, o convite redireciona para `http://localhost:8080/auth?invite=1`.

Depois da implantacao, configure no Supabase Auth a URL publica e atualize
`INVITE_REDIRECT_URL` nos segredos da Edge Function.

## Segredos de integracoes

Google, Gemini e Meta/Instagram devem receber credenciais proprias da
Therapeutica. Nao reutilize tokens, calendarios, URLs OAuth ou segredos da
instancia original.
