# src/components/ui/toggle.tsx

Tipo: Componente ou rota React em TypeScript.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `import * as React from "react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 2 | `import * as TogglePrimitive from "@radix-ui/react-toggle";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 3 | `import { cva, type VariantProps } from "class-variance-authority";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 4 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 5 | `import { cn } from "@/lib/utils";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 6 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 7 | `const toggleVariants = cva(` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 8 | `  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 9 | `  {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 10 | `    variants: {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 11 | `      variant: {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 12 | `        default: "bg-transparent",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 13 | `        outline:` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 14 | `          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 15 | `      },` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 16 | `      size: {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 17 | `        default: "h-9 px-2 min-w-9",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 18 | `        sm: "h-8 px-1.5 min-w-8",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 19 | `        lg: "h-10 px-2.5 min-w-10",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 20 | `      },` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 21 | `    },` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 22 | `    defaultVariants: {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 23 | `      variant: "default",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 24 | `      size: "default",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 25 | `    },` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 26 | `  },` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 27 | `);` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 28 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 29 | `const Toggle = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 30 | `  React.ElementRef<typeof TogglePrimitive.Root>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 31 | `  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 32 | `>(({ className, variant, size, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 33 | `  <TogglePrimitive.Root` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 34 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 35 | `    className={cn(toggleVariants({ variant, size, className }))}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 36 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 37 | `  />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 38 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 39 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 40 | `Toggle.displayName = TogglePrimitive.Root.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 41 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 42 | `export { Toggle, toggleVariants };` | Exporta valor, funcao, tipo ou componente para ser usado por outros arquivos. |
| 43 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
