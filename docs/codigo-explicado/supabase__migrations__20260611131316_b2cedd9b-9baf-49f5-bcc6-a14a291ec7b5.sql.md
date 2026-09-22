# supabase/migrations/20260611131316_b2cedd9b-9baf-49f5-bcc6-a14a291ec7b5.sql

Tipo: Migration SQL do Supabase.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 2 | `ALTER TABLE public.client_notes ` | Altera uma tabela existente, normalmente adicionando campos, chaves ou politicas. |
| 3 | `  ADD COLUMN IF NOT EXISTS note_date date NOT NULL DEFAULT (now()::date),` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 4 | `  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,` | Define relacionamento entre tabelas por chave estrangeira. |
| 5 | `  ADD COLUMN IF NOT EXISTS content_html text;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 6 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 7 | `CREATE INDEX IF NOT EXISTS idx_client_notes_task_id ON public.client_notes(task_id);` | Cria indice para acelerar consultas frequentes. |
| 8 | `CREATE INDEX IF NOT EXISTS idx_client_notes_note_date ON public.client_notes(note_date);` | Cria indice para acelerar consultas frequentes. |
| 9 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
