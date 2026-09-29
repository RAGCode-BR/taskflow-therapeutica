import { Building2, ChevronDown, ExternalLink, LayoutGrid, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const externalSystems = [
  {
    name: "Sistema Indústria",
    description: "Gestão da indústria",
    url: "https://sistema-industria-therapeutica.ragcodebr.workers.dev/",
    icon: Building2,
  },
  {
    name: "Sistema Estoque",
    description: "Controle de estoque",
    url: "https://ragcodebr.github.io/estoque-therapeutica/index.html",
    icon: Package,
  },
] as const;

export function ExternalSystemsMenu({ mobile = false }: { mobile?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={mobile ? "icon" : "default"}
          className={mobile ? "h-9 w-9" : "h-9 gap-2 rounded-full px-3 text-sm"}
          title="Acessar outros sistemas"
          aria-label="Acessar outros sistemas"
        >
          <LayoutGrid className={mobile ? "h-5 w-5" : "h-4 w-4"} />
          {!mobile && (
            <>
              <span>Sistemas</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <span className="block text-sm">Sistemas Therapeutica</span>
          <span className="block text-xs font-normal text-muted-foreground">
            Selecione o sistema que deseja acessar
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {externalSystems.map((system) => {
          const Icon = system.icon;
          return (
            <DropdownMenuItem key={system.url} asChild className="cursor-pointer p-0">
              <a
                href={system.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 px-3 py-2.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{system.name}</span>
                  <span className="block text-xs text-muted-foreground">{system.description}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
