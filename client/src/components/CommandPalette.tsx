import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FolderOpen,
  Brain,
  FileSearch,
  BarChart3,
  CreditCard,
  Plus,
  Shield,
} from "lucide-react";

const commands = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    route: "/dashboard",
    shortcut: "Ctrl+1",
  },
  { icon: FolderOpen, label: "Casos", route: "/casos", shortcut: "Ctrl+2" },
  {
    icon: Brain,
    label: "Análisis Forenses",
    route: "/analisis",
    shortcut: "Ctrl+3",
  },
  {
    icon: FileSearch,
    label: "Evidencia",
    route: "/evidencia",
    shortcut: "Ctrl+4",
  },
  {
    icon: BarChart3,
    label: "Reportes",
    route: "/reportes",
    shortcut: "Ctrl+5",
  },
  {
    icon: CreditCard,
    label: "Suscripción",
    route: "/suscripcion",
    shortcut: "Ctrl+6",
  },
  { icon: Plus, label: "Nuevo Caso", route: "/casos/nuevo" },
  { icon: Shield, label: "Panel Admin", route: "/admin", admin: true },
];

export default function CommandPalette({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
      const num = parseInt(e.key);
      if (e.ctrlKey && num >= 1 && num <= 6) {
        e.preventDefault();
        const cmd = commands[num - 1];
        if (cmd) navigate(cmd.route);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  const items = commands.filter(c => !c.admin || isAdmin);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Navegación rápida">
      <CommandInput placeholder="Buscar página o acción..." />
      <CommandList>
        <CommandEmpty>Sin resultados</CommandEmpty>
        <CommandGroup heading="Navegación">
          {items.map(cmd => (
            <CommandItem
              key={cmd.route}
              onSelect={() => {
                setOpen(false);
                navigate(cmd.route);
              }}
            >
              <cmd.icon className="w-4 h-4" />
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <span className="ml-auto text-[10px] text-muted-foreground tracking-wider">
                  {cmd.shortcut}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
