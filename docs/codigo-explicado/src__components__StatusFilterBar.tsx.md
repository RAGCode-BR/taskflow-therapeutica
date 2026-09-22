# src/components/StatusFilterBar.tsx

Tipo: Componente ou rota React em TypeScript.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `import { Button } from "@/components/ui/button";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 2 | `import { useTaskStatuses } from "@/hooks/use-data";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 3 | `import { Circle, Zap, CheckCircle2 } from "lucide-react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 4 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 5 | `interface Props {` | Declara um contrato de tipos TypeScript para deixar os dados mais seguros e previsiveis. |
| 6 | `  value: string[];` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 7 | `  onChange: (statusIds: string[]) => void;` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 8 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 9 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 10 | `export function StatusFilterBar({ value, onChange }: Props) {` | Exporta valor, funcao, tipo ou componente para ser usado por outros arquivos. |
| 11 | `  const { data: statuses = [] } = useTaskStatuses();` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 12 | `  const toggle = (id: string) => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 13 | `    if (value.includes(id)) onChange(value.filter((v) => v !== id));` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 14 | `    else onChange([...value, id]);` | Define o caminho alternativo da condicao anterior. |
| 15 | `  };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 16 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 17 | `  return (` | Devolve o resultado da funcao ou renderiza a interface do componente. |
| 18 | `    <div className="flex flex-wrap gap-2">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 19 | `      <Button` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 20 | `        key="all"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 21 | `        size="sm"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 22 | `        variant={value.length === 0 ? "default" : "outline"}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 23 | `        onClick={() => onChange([])}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 24 | `        className="h-8"` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 25 | `      >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 26 | `        <Circle className="mr-1.5 h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 27 | `        Todos status` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 28 | `      </Button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 29 | `      {statuses.map((s) => {` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 30 | `        const active = value.includes(s.id);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 31 | `        return (` | Devolve o resultado da funcao ou renderiza a interface do componente. |
| 32 | `          <Button` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 33 | `            key={s.id}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 34 | `            size="sm"` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 35 | `            variant={active ? "default" : "outline"}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 36 | `            onClick={() => toggle(s.id)}` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 37 | `            className="h-8"` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 38 | `            style={` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 39 | `              active` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 40 | `                ? { background: s.color, borderColor: s.color, color: "#fff" }` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 41 | `                : { borderColor: s.color, color: s.color }` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 42 | `            }` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 43 | `          >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 44 | `            {s.is_active ? (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 45 | `              <Zap className="mr-1.5 h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 46 | `            ) : s.is_completed ? (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 47 | `              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 48 | `            ) : (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 49 | `              <Circle className="mr-1.5 h-3.5 w-3.5" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 50 | `            )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 51 | `            {s.name}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 52 | `          </Button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 53 | `        );` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 54 | `      })}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 55 | `    </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 56 | `  );` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 57 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 58 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
