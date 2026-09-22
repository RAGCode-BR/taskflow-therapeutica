-- Corrige textos salvos como UTF-8 interpretado incorretamente como Windows-1252
-- (por exemplo: "ConcluÃ­das" passa a ser "Concluídas").
CREATE OR REPLACE FUNCTION public.fix_ptbr_mojibake(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL
    OR (position(chr(195) IN value) = 0
      AND position(chr(194) IN value) = 0
      AND position(chr(226) IN value) = 0) THEN
    RETURN value;
  END IF;

  RETURN convert_from(convert_to(value, 'WIN1252'), 'UTF8');
EXCEPTION
  WHEN character_not_in_repertoire OR untranslatable_character THEN
    -- Mantém textos que já são válidos e apenas contenham esses caracteres.
    RETURN value;
END;
$$;

UPDATE public.kanban_columns SET name = public.fix_ptbr_mojibake(name);
UPDATE public.task_statuses SET name = public.fix_ptbr_mojibake(name);
UPDATE public.task_tags SET name = public.fix_ptbr_mojibake(name);
UPDATE public.tasks SET
  title = public.fix_ptbr_mojibake(title),
  description = public.fix_ptbr_mojibake(description);
UPDATE public.subtasks SET
  title = public.fix_ptbr_mojibake(title),
  notes = public.fix_ptbr_mojibake(notes);
UPDATE public.comments SET
  title = public.fix_ptbr_mojibake(title),
  body = public.fix_ptbr_mojibake(body);
UPDATE public.notifications SET
  title = public.fix_ptbr_mojibake(title),
  body = public.fix_ptbr_mojibake(body);
UPDATE public.profiles SET full_name = public.fix_ptbr_mojibake(full_name);
UPDATE public.clients SET
  name = public.fix_ptbr_mojibake(name),
  description = public.fix_ptbr_mojibake(description),
  legal_name = public.fix_ptbr_mojibake(legal_name),
  trade_name = public.fix_ptbr_mojibake(trade_name),
  address = public.fix_ptbr_mojibake(address),
  responsible = public.fix_ptbr_mojibake(responsible);
UPDATE public.client_notes SET
  title = public.fix_ptbr_mojibake(title),
  content = public.fix_ptbr_mojibake(content);
UPDATE public.client_departments SET
  name = public.fix_ptbr_mojibake(name),
  description = public.fix_ptbr_mojibake(description);
UPDATE public.client_department_employees SET
  full_name = public.fix_ptbr_mojibake(full_name),
  role = public.fix_ptbr_mojibake(role),
  activities = public.fix_ptbr_mojibake(activities);
