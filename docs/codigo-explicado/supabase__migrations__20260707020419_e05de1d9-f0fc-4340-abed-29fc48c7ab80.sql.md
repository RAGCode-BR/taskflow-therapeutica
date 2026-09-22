# supabase/migrations/20260707020419_e05de1d9-f0fc-4340-abed-29fc48c7ab80.sql

Tipo: Migration SQL do Supabase.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;` | Altera uma tabela existente, normalmente adicionando campos, chaves ou politicas. |
| 2 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 3 | `UPDATE public.subtasks SET completed_at = now() WHERE done = true AND completed_at IS NULL;` | Atualiza registros existentes no banco. |
| 4 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 5 | `CREATE OR REPLACE FUNCTION public.sync_subtask_completed_at()` | Define uma funcao no banco para reutilizar logica SQL. |
| 6 | `RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 7 | `BEGIN` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 8 | `  IF NEW.done AND (TG_OP = 'INSERT' OR OLD.done IS DISTINCT FROM NEW.done) THEN` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 9 | `    NEW.completed_at := COALESCE(NEW.completed_at, now());` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 10 | `  ELSIF NOT NEW.done THEN` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 11 | `    NEW.completed_at := NULL;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 12 | `  END IF;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 13 | `  RETURN NEW;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 14 | `END; $$;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 15 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 16 | `DROP TRIGGER IF EXISTS trg_sync_subtask_completed_at ON public.subtasks;` | Remove objeto antigo para permitir recriacao ou limpeza controlada. |
| 17 | `CREATE TRIGGER trg_sync_subtask_completed_at` | Cria gatilho que executa uma funcao automaticamente em eventos da tabela. |
| 18 | `BEFORE INSERT OR UPDATE ON public.subtasks` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 19 | `FOR EACH ROW EXECUTE FUNCTION public.sync_subtask_completed_at();` | Executa parte da mudanca estrutural ou de seguranca do banco. |
