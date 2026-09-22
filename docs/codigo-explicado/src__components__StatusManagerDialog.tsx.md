# src/components/StatusManagerDialog.tsx

Tipo: Componente ou rota React em TypeScript.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `import { useState } from "react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 2 | `import { useQueryClient } from "@tanstack/react-query";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 3 | `import { toast } from "sonner";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 4 | `import { Plus, Trash2, Save, Zap, CheckCircle2, GripVertical } from "lucide-react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 5 | `import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 6 | `import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 7 | `import { CSS } from "@dnd-kit/utilities";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 8 | `import { supabase } from "@/integrations/supabase/client";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 9 | `import { useAuth } from "@/hooks/use-auth";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 10 | `import { useTaskStatuses, type TaskStatus } from "@/hooks/use-data";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 11 | `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 12 | `import { Button } from "@/components/ui/button";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 13 | `import { Input } from "@/components/ui/input";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 14 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 15 | `interface Props {` | Declara um contrato de tipos TypeScript para deixar os dados mais seguros e previsiveis. |
| 16 | `  open: boolean;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 17 | `  onOpenChange: (o: boolean) => void;` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 18 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 19 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 20 | `const PALETTE = [` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 21 | `  "#64748b", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 22 | `  "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#06b6d4",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 23 | `];` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 24 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 25 | `export function StatusManagerDialog({ open, onOpenChange }: Props) {` | Exporta valor, funcao, tipo ou componente para ser usado por outros arquivos. |
| 26 | `  const qc = useQueryClient();` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 27 | `  const { user, isAdmin } = useAuth();` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 28 | `  const { data: statuses = [] } = useTaskStatuses();` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 29 | `  const [name, setName] = useState("");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 30 | `  const [color, setColor] = useState(PALETTE[1]);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 31 | `  const [isActive, setIsActive] = useState(false);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 32 | `  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 33 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 34 | `  const create = async () => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 35 | `    if (!name.trim() || !user) return;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 36 | `    const { error } = await supabase.from("task_statuses").insert({` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 37 | `      name: name.trim(),` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 38 | `      color,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 39 | `      is_active: isActive,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 40 | `      is_completed: false,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 41 | `      position: statuses.length,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 42 | `      created_by: user.id,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 43 | `    });` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 44 | `    if (error) return toast.error(error.message);` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 45 | `    setName("");` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 46 | `    setIsActive(false);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 47 | `    qc.invalidateQueries({ queryKey: ["task_statuses"] });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 48 | `    toast.success("Status criado");` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 49 | `  };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 50 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 51 | `  const update = async (s: TaskStatus, patch: Partial<TaskStatus>) => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 52 | `    const { error } = await supabase.from("task_statuses").update(patch).eq("id", s.id);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 53 | `    if (error) return toast.error(error.message);` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 54 | `    qc.invalidateQueries({ queryKey: ["task_statuses"] });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 55 | `    qc.invalidateQueries({ queryKey: ["tasks"] });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 56 | `  };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 57 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 58 | `  const remove = async (s: TaskStatus) => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 59 | `    if (!confirm(\`Excluir status "${s.name}"?\`)) return;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 60 | `    const { error } = await supabase.from("task_statuses").delete().eq("id", s.id);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 61 | `    if (error) return toast.error(error.message);` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 62 | `    qc.invalidateQueries({ queryKey: ["task_statuses"] });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 63 | `    qc.invalidateQueries({ queryKey: ["tasks"] });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 64 | `    toast.success("Status excluído");` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 65 | `  };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 66 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 67 | `  const onDragEnd = async (e: DragEndEvent) => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 68 | `    const { active, over } = e;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 69 | `    if (!over || active.id === over.id) return;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 70 | `    const oldIndex = statuses.findIndex((s) => s.id === active.id);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 71 | `    const newIndex = statuses.findIndex((s) => s.id === over.id);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 72 | `    if (oldIndex < 0 || newIndex < 0) return;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 73 | `    const reordered = arrayMove(statuses, oldIndex, newIndex);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 74 | `    qc.setQueryData(["task_statuses"], reordered.map((s, i) => ({ ...s, position: i })));` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 75 | `    await Promise.all(` | Espera uma operacao assincrona terminar, como chamada ao Supabase ou processamento externo. |
| 76 | `      reordered.map((s, i) =>` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 77 | `        supabase.from("task_statuses").update({ position: i }).eq("id", s.id),` | Interage com o cliente Supabase para autenticar ou acessar o banco. |
| 78 | `      ),` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 79 | `    );` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 80 | `    qc.invalidateQueries({ queryKey: ["task_statuses"] });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 81 | `  };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 82 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 83 | `  return (` | Devolve o resultado da funcao ou renderiza a interface do componente. |
| 84 | `    <Dialog open={open} onOpenChange={onOpenChange}>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 85 | `      <DialogContent className="max-w-lg">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 86 | `        <DialogHeader>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 87 | `          <DialogTitle>Gerenciar status</DialogTitle>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 88 | `          <DialogDescription>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 89 | `            Crie status com cor própria. Marque <b>Em execução</b> para destacar o card no kanban.` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 90 | `          </DialogDescription>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 91 | `        </DialogHeader>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 92 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 93 | `        <div className="space-y-3">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 94 | `          {!isAdmin && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 95 | `            <p className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 96 | `              Apenas administradores podem criar, editar, reordenar ou excluir status. Estes status são globais.` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 97 | `            </p>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 98 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 99 | `          {isAdmin && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 100 | `            <div className="rounded-md border p-3">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 101 | `              <div className="mb-2 text-xs font-medium text-muted-foreground">Novo status</div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 102 | `              <div className="flex gap-2">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 103 | `                <Input` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 104 | `                  value={name}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 105 | `                  onChange={(e) => setName(e.target.value)}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 106 | `                  placeholder="Ex: Aguardando aprovação"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 107 | `                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 108 | `                />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 109 | `                <Button size="sm" onClick={create} disabled={!name.trim()}>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 110 | `                  <Plus className="mr-1 h-3.5 w-3.5" />Criar` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 111 | `                </Button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 112 | `              </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 113 | `              <div className="mt-2 flex flex-wrap gap-1.5">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 114 | `                {PALETTE.map((c) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 115 | `                  <button` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 116 | `                    key={c}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 117 | `                    type="button"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 118 | `                    onClick={() => setColor(c)}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 119 | `                    className={\`h-6 w-6 rounded-full border-2 transition ${` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 120 | `                      color === c ? "border-foreground scale-110" : "border-transparent"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 121 | `                    }\`}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 122 | `                    style={{ background: c }}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 123 | `                  />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 124 | `                ))}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 125 | `              </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 126 | `              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 127 | `                <input` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 128 | `                  type="checkbox"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 129 | `                  checked={isActive}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 130 | `                  onChange={(e) => setIsActive(e.target.checked)}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 131 | `                  className="h-3.5 w-3.5"` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 132 | `                />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 133 | `                <Zap className="h-3.5 w-3.5 text-amber-500" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 134 | `                Em execução (destaca o card no kanban)` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 135 | `              </label>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 136 | `            </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 137 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 138 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 139 | `          {isAdmin && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 140 | `            <p className="text-[11px] text-muted-foreground">Arraste pelo ícone <GripVertical className="inline h-3 w-3 -mt-0.5" /> para reordenar.</p>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 141 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 142 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 143 | `          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isAdmin ? onDragEnd : () => {}}>` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 144 | `            <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 145 | `              <div className="max-h-96 space-y-2 overflow-y-auto">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 146 | `                {statuses.length === 0 && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 147 | `                  <p className="py-4 text-center text-xs text-muted-foreground">Nenhum status ainda</p>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 148 | `                )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 149 | `                {statuses.map((s) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 150 | `                  <StatusRow key={s.id} status={s} onUpdate={update} onDelete={remove} canManage={isAdmin} />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 151 | `                ))}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 152 | `              </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 153 | `            </SortableContext>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 154 | `          </DndContext>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 155 | `        </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 156 | `      </DialogContent>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 157 | `    </Dialog>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 158 | `  );` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 159 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 160 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 161 | `function StatusRow({` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 162 | `  status, onUpdate, onDelete, canManage,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 163 | `}: { status: TaskStatus; onUpdate: (s: TaskStatus, p: Partial<TaskStatus>) => void; onDelete: (s: TaskStatus) => void; canManage: boolean }) {` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 164 | `  const [name, setName] = useState(status.name);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 165 | `  const [color, setColor] = useState(status.color);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 166 | `  const dirty = name !== status.name || color !== status.color;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 167 | `  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id, disabled: !canManage });` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 168 | `  const style = {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 169 | `    transform: CSS.Transform.toString(transform),` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 170 | `    transition,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 171 | `    opacity: isDragging ? 0.5 : 1,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 172 | `  };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 173 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 174 | `  return (` | Devolve o resultado da funcao ou renderiza a interface do componente. |
| 175 | `    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border p-2 bg-background">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 176 | `      {canManage && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 177 | `        <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 178 | `          <GripVertical className="h-4 w-4" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 179 | `        </button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 180 | `      )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 181 | `      <input` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 182 | `        type="color"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 183 | `        value={color}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 184 | `        onChange={(e) => canManage && setColor(e.target.value)}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 185 | `        disabled={!canManage}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 186 | `        className="h-7 w-9 cursor-pointer rounded border bg-transparent disabled:cursor-not-allowed disabled:opacity-60"` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 187 | `      />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 188 | `      <Input` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 189 | `        value={name}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 190 | `        onChange={(e) => canManage && setName(e.target.value)}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 191 | `        disabled={!canManage}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 192 | `        className="h-8 flex-1 text-sm"` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 193 | `      />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 194 | `      <span` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 195 | `        className="rounded px-2 py-0.5 text-[11px] font-semibold"` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 196 | `        style={{ background: color, color: "#fff" }}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 197 | `      >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 198 | `        {name || "status"}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 199 | `      </span>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 200 | `      <span` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 201 | `        title={status.is_active ? "Em execução (destaque ativo)" : "Não em execução"}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 202 | `        className={\`flex h-7 w-7 items-center justify-center rounded ${status.is_active ? "bg-amber-500/15 text-amber-600" : "text-muted-foreground"} ${canManage ? "cursor-pointer hover:bg-muted" : ""}\`}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 203 | `        onClick={() => canManage && onUpdate(status, { is_active: !status.is_active })}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 204 | `      >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 205 | `        <Zap className="h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 206 | `      </span>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 207 | `      <span` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 208 | `        title={status.is_completed ? "Status de conclusão" : "Não é conclusão"}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 209 | `        className={\`flex h-7 w-7 items-center justify-center rounded ${status.is_completed ? "bg-emerald-500/15 text-emerald-600" : "text-muted-foreground"} ${canManage ? "cursor-pointer hover:bg-muted" : ""}\`}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 210 | `        onClick={() => canManage && onUpdate(status, { is_completed: !status.is_completed })}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 211 | `      >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 212 | `        <CheckCircle2 className="h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 213 | `      </span>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 214 | `      {canManage && dirty && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 215 | `        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate(status, { name, color })}>` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 216 | `          <Save className="h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 217 | `        </Button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 218 | `      )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 219 | `      {canManage && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 220 | `        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(status)}>` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 221 | `          <Trash2 className="h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 222 | `        </Button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 223 | `      )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 224 | `    </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 225 | `  );` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 226 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 227 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
