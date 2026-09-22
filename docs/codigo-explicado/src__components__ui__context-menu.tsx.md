# src/components/ui/context-menu.tsx

Tipo: Componente ou rota React em TypeScript.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `import * as React from "react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 2 | `import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 3 | `import { Check, ChevronRight, Circle } from "lucide-react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 4 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 5 | `import { cn } from "@/lib/utils";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 6 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 7 | `const ContextMenu = ContextMenuPrimitive.Root;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 8 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 9 | `const ContextMenuTrigger = ContextMenuPrimitive.Trigger;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 10 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 11 | `const ContextMenuGroup = ContextMenuPrimitive.Group;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 12 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 13 | `const ContextMenuPortal = ContextMenuPrimitive.Portal;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 14 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 15 | `const ContextMenuSub = ContextMenuPrimitive.Sub;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 16 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 17 | `const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 18 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 19 | `const ContextMenuSubTrigger = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 20 | `  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 21 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 22 | `    inset?: boolean;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 23 | `  }` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 24 | `>(({ className, inset, children, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 25 | `  <ContextMenuPrimitive.SubTrigger` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 26 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 27 | `    className={cn(` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 28 | `      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 29 | `      inset && "pl-8",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 30 | `      className,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 31 | `    )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 32 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 33 | `  >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 34 | `    {children}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 35 | `    <ChevronRight className="ml-auto h-4 w-4" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 36 | `  </ContextMenuPrimitive.SubTrigger>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 37 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 38 | `ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 39 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 40 | `const ContextMenuSubContent = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 41 | `  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 42 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 43 | `>(({ className, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 44 | `  <ContextMenuPrimitive.SubContent` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 45 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 46 | `    className={cn(` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 47 | `      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 48 | `      className,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 49 | `    )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 50 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 51 | `  />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 52 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 53 | `ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 54 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 55 | `const ContextMenuContent = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 56 | `  React.ElementRef<typeof ContextMenuPrimitive.Content>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 57 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 58 | `>(({ className, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 59 | `  <ContextMenuPrimitive.Portal>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 60 | `    <ContextMenuPrimitive.Content` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 61 | `      ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 62 | `      className={cn(` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 63 | `        "z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 64 | `        className,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 65 | `      )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 66 | `      {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 67 | `    />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 68 | `  </ContextMenuPrimitive.Portal>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 69 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 70 | `ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 71 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 72 | `const ContextMenuItem = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 73 | `  React.ElementRef<typeof ContextMenuPrimitive.Item>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 74 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 75 | `    inset?: boolean;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 76 | `  }` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 77 | `>(({ className, inset, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 78 | `  <ContextMenuPrimitive.Item` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 79 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 80 | `    className={cn(` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 81 | `      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 82 | `      inset && "pl-8",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 83 | `      className,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 84 | `    )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 85 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 86 | `  />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 87 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 88 | `ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 89 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 90 | `const ContextMenuCheckboxItem = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 91 | `  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 92 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 93 | `>(({ className, children, checked, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 94 | `  <ContextMenuPrimitive.CheckboxItem` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 95 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 96 | `    className={cn(` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 97 | `      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 98 | `      className,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 99 | `    )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 100 | `    checked={checked}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 101 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 102 | `  >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 103 | `    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 104 | `      <ContextMenuPrimitive.ItemIndicator>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 105 | `        <Check className="h-4 w-4" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 106 | `      </ContextMenuPrimitive.ItemIndicator>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 107 | `    </span>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 108 | `    {children}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 109 | `  </ContextMenuPrimitive.CheckboxItem>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 110 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 111 | `ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 112 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 113 | `const ContextMenuRadioItem = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 114 | `  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 115 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 116 | `>(({ className, children, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 117 | `  <ContextMenuPrimitive.RadioItem` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 118 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 119 | `    className={cn(` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 120 | `      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 121 | `      className,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 122 | `    )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 123 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 124 | `  >` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 125 | `    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 126 | `      <ContextMenuPrimitive.ItemIndicator>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 127 | `        <Circle className="h-4 w-4 fill-current" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 128 | `      </ContextMenuPrimitive.ItemIndicator>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 129 | `    </span>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 130 | `    {children}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 131 | `  </ContextMenuPrimitive.RadioItem>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 132 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 133 | `ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 134 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 135 | `const ContextMenuLabel = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 136 | `  React.ElementRef<typeof ContextMenuPrimitive.Label>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 137 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 138 | `    inset?: boolean;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 139 | `  }` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 140 | `>(({ className, inset, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 141 | `  <ContextMenuPrimitive.Label` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 142 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 143 | `    className={cn("px-2 py-1.5 text-sm font-semibold text-foreground", inset && "pl-8", className)}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 144 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 145 | `  />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 146 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 147 | `ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 148 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 149 | `const ContextMenuSeparator = React.forwardRef<` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 150 | `  React.ElementRef<typeof ContextMenuPrimitive.Separator>,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 151 | `  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 152 | `>(({ className, ...props }, ref) => (` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 153 | `  <ContextMenuPrimitive.Separator` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 154 | `    ref={ref}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 155 | `    className={cn("-mx-1 my-1 h-px bg-border", className)}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 156 | `    {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 157 | `  />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 158 | `));` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 159 | `ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 160 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 161 | `const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 162 | `  return (` | Devolve o resultado da funcao ou renderiza a interface do componente. |
| 163 | `    <span` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 164 | `      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 165 | `      {...props}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 166 | `    />` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 167 | `  );` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 168 | `};` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 169 | `ContextMenuShortcut.displayName = "ContextMenuShortcut";` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 170 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 171 | `export {` | Exporta valor, funcao, tipo ou componente para ser usado por outros arquivos. |
| 172 | `  ContextMenu,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 173 | `  ContextMenuTrigger,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 174 | `  ContextMenuContent,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 175 | `  ContextMenuItem,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 176 | `  ContextMenuCheckboxItem,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 177 | `  ContextMenuRadioItem,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 178 | `  ContextMenuLabel,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 179 | `  ContextMenuSeparator,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 180 | `  ContextMenuShortcut,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 181 | `  ContextMenuGroup,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 182 | `  ContextMenuPortal,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 183 | `  ContextMenuSub,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 184 | `  ContextMenuSubContent,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 185 | `  ContextMenuSubTrigger,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 186 | `  ContextMenuRadioGroup,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 187 | `};` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 188 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
