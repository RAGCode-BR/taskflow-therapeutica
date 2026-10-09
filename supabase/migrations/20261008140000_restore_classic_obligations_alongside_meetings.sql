-- Restaura Obrigações como módulo separado sem substituir o fluxo de Reuniões.
-- O campo obligations.meeting_mode define qual módulo administra cada rotina.

-- Quem já possuía acesso ao módulo chamado "Obrigações" (que até agora era a
-- tela de Reuniões) mantém acesso às duas páginas após a separação.
UPDATE public.user_permissions access
SET permissions = array_append(access.permissions, 'meetings'), updated_at = now()
WHERE 'obligations' = ANY(access.permissions)
  AND NOT ('meetings' = ANY(access.permissions));

UPDATE public.workspace_memberships membership
SET permissions = array_append(membership.permissions, 'meetings'), updated_at = now()
WHERE 'obligations' = ANY(membership.permissions)
  AND NOT ('meetings' = ANY(membership.permissions));

-- Este TaskFlow não trabalha com clientes. Obrigações clássicas ficam ligadas
-- apenas ao ambiente e ao responsável, inclusive para registros antigos.
UPDATE public.obligations
SET client_id = NULL
WHERE NOT meeting_mode
  AND client_id IS NOT NULL;

ALTER TABLE public.obligations
  DROP CONSTRAINT IF EXISTS obligations_classic_without_client;
ALTER TABLE public.obligations
  ADD CONSTRAINT obligations_classic_without_client
  CHECK (meeting_mode OR client_id IS NULL);

-- A tabela principal contém os dois tipos de rotina. A permissão exigida para
-- alteração depende do tipo do próprio registro.
DROP POLICY IF EXISTS obligations_manage ON public.obligations;
CREATE POLICY obligations_manage ON public.obligations
  FOR ALL TO authenticated
  USING (
    public.has_workspace_access(workspace_id)
    AND public.has_page_permission(
      CASE WHEN meeting_mode THEN 'meetings' ELSE 'obligations' END
    )
  )
  WITH CHECK (
    public.has_workspace_access(workspace_id)
    AND public.has_page_permission(
      CASE WHEN meeting_mode THEN 'meetings' ELSE 'obligations' END
    )
  );

DROP POLICY IF EXISTS obligation_occurrences_manage ON public.obligation_occurrences;
CREATE POLICY obligation_occurrences_manage ON public.obligation_occurrences
  FOR ALL TO authenticated
  USING (
    public.has_workspace_access(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.obligations obligation
      WHERE obligation.id = obligation_id
        AND public.has_page_permission(
          CASE WHEN obligation.meeting_mode THEN 'meetings' ELSE 'obligations' END
        )
    )
  )
  WITH CHECK (
    public.has_workspace_access(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.obligations obligation
      WHERE obligation.id = obligation_id
        AND public.has_page_permission(
          CASE WHEN obligation.meeting_mode THEN 'meetings' ELSE 'obligations' END
        )
    )
  );

-- Departamentos, participantes e pautas pertencem exclusivamente a Reuniões.
DROP POLICY IF EXISTS obligation_departments_manage ON public.obligation_departments;
CREATE POLICY obligation_departments_manage ON public.obligation_departments
  FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id) AND public.has_page_permission('meetings'))
  WITH CHECK (public.has_workspace_access(workspace_id) AND public.has_page_permission('meetings'));

DROP POLICY IF EXISTS obligation_department_members_manage ON public.obligation_department_members;
CREATE POLICY obligation_department_members_manage ON public.obligation_department_members
  FOR ALL TO authenticated
  USING (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1 FROM public.obligation_departments department
      WHERE department.id = department_id
        AND public.has_workspace_access(department.workspace_id)
    )
  )
  WITH CHECK (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1 FROM public.obligation_departments department
      WHERE department.id = department_id
        AND public.has_workspace_access(department.workspace_id)
    )
  );

DROP POLICY IF EXISTS obligation_participants_manage ON public.obligation_participants;
CREATE POLICY obligation_participants_manage ON public.obligation_participants
  FOR ALL TO authenticated
  USING (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1 FROM public.obligations obligation
      WHERE obligation.id = obligation_id
        AND obligation.meeting_mode
        AND public.has_workspace_access(obligation.workspace_id)
    )
  )
  WITH CHECK (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1 FROM public.obligations obligation
      WHERE obligation.id = obligation_id
        AND obligation.meeting_mode
        AND public.has_workspace_access(obligation.workspace_id)
    )
  );

DROP POLICY IF EXISTS obligation_task_templates_manage ON public.obligation_task_templates;
CREATE POLICY obligation_task_templates_manage ON public.obligation_task_templates
  FOR ALL TO authenticated
  USING (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1 FROM public.obligations obligation
      WHERE obligation.id = obligation_id
        AND obligation.meeting_mode
        AND public.has_workspace_access(obligation.workspace_id)
    )
  )
  WITH CHECK (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1 FROM public.obligations obligation
      WHERE obligation.id = obligation_id
        AND obligation.meeting_mode
        AND public.has_workspace_access(obligation.workspace_id)
    )
  );

DROP POLICY IF EXISTS obligation_agenda_items_manage ON public.obligation_agenda_items;
CREATE POLICY obligation_agenda_items_manage ON public.obligation_agenda_items
  FOR ALL TO authenticated
  USING (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1
      FROM public.obligation_occurrences occurrence
      JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
      WHERE occurrence.id = occurrence_id
        AND obligation.meeting_mode
        AND public.has_workspace_access(occurrence.workspace_id)
    )
  )
  WITH CHECK (
    public.has_page_permission('meetings')
    AND EXISTS (
      SELECT 1
      FROM public.obligation_occurrences occurrence
      JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
      WHERE occurrence.id = occurrence_id
        AND obligation.meeting_mode
        AND public.has_workspace_access(occurrence.workspace_id)
    )
  );

NOTIFY pgrst, 'reload schema';
