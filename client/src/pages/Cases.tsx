import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Archive,
  Calendar,
  ChevronRight,
  FolderOpen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { List } from "react-window";

const ROW_HEIGHT = 88;

const caseTypeLabels: Record<string, string> = {
  civil: "Civil",
  penal: "Penal",
  laboral: "Laboral",
  familiar: "Familiar",
  mercantil: "Mercantil",
  administrativo: "Administrativo",
  otro: "Otro",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  activo: {
    label: "Activo",
    className: "border-green-800/50 text-green-400 bg-green-900/20",
  },
  archivado: {
    label: "Archivado",
    className: "border-gray-700 text-gray-400 bg-gray-800/20",
  },
  cerrado: {
    label: "Cerrado",
    className: "border-blue-800/50 text-blue-400 bg-blue-900/20",
  },
  en_revision: {
    label: "En revisión",
    className: "border-yellow-800/50 text-yellow-400 bg-yellow-900/20",
  },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  alta: {
    label: "Alta",
    className: "border-red-800/50 text-red-400 bg-red-900/20",
  },
  media: {
    label: "Media",
    className: "border-yellow-800/50 text-yellow-400 bg-yellow-900/20",
  },
  baja: {
    label: "Baja",
    className: "border-green-800/50 text-green-400 bg-green-900/20",
  },
};

function CreateCaseDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    caseNumber: "",
    description: "",
    clientName: "",
    opposingParty: "",
    court: "",
    jurisdiction: "",
    caseType: "civil" as const,
    priority: "media" as const,
  });

  const [isCreating, setIsCreating] = useState(false);

  const createCase = {
    mutate: async (data: any) => {
      try {
        setIsCreating(true);

        const response = await fetch("/api/cases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "No se pudo crear el caso");
        }

        setOpen(false);
        setForm({
          title: "",
          caseNumber: "",
          description: "",
          clientName: "",
          opposingParty: "",
          court: "",
          jurisdiction: "",
          caseType: "civil" as const,
          priority: "media" as const,
        });

        toast.success("Caso creado exitosamente");
        onCreated();
      } catch (error) {
        console.error("Error creando caso:", error);
        toast.error(
          error instanceof Error ? error.message : "Error al crear el caso"
        );
      } finally {
        setIsCreating(false);
      }
    },
    isPending: isCreating,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo caso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>Crear nuevo caso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Título del caso *
              </Label>
              <Input
                placeholder="Ej: Caso García vs. Empresa XYZ"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Número de expediente
              </Label>
              <Input
                placeholder="Ej: 2024/001"
                value={form.caseNumber}
                onChange={e => setForm({ ...form, caseNumber: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Tipo de caso
              </Label>
              <Select
                value={form.caseType}
                onValueChange={v =>
                  setForm({ ...form, caseType: v as typeof form.caseType })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(caseTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Prioridad
              </Label>
              <Select
                value={form.priority}
                onValueChange={v =>
                  setForm({ ...form, priority: v as typeof form.priority })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Descripción
              </Label>
              <Textarea
                placeholder="Descripción del caso, hechos relevantes..."
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createCase.mutate(form)}
              disabled={!form.title || createCase.isPending}
            >
              {createCase.isPending ? "Creando..." : "Crear caso"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CaseRowProps {
  cases: any[];
  navigate: (path: string) => void;
  archiveCase: { mutate: (data: any) => void; isPending: boolean };
  deleteCase: { mutate: (id: number) => void; isPending: boolean };
  statusConfig: Record<string, { label: string; className: string }>;
  priorityConfig: Record<string, { label: string; className: string }>;
  caseTypeLabels: Record<string, string>;
}

function CaseRow({
  index,
  style,
  cases,
  navigate,
  archiveCase,
  deleteCase,
  statusConfig,
  priorityConfig,
  caseTypeLabels,
}: {
  index: number;
  style: React.CSSProperties;
} & CaseRowProps) {
  const c = cases[index];

  return (
    <div style={style}>
      <Card
        className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer"
        onClick={() => navigate(`/casos/${c.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{c.title}</h3>
                {c.caseNumber && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    #{c.caseNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span>{caseTypeLabels[c.caseType]}</span>
                {c.clientName && <span>· {c.clientName}</span>}
                {c.court && <span>· {c.court}</span>}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(c.updatedAt).toLocaleDateString("es-MX")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0 h-5 ${statusConfig[c.status]?.className}`}
              >
                {statusConfig[c.status]?.label}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0 h-5 ${priorityConfig[c.priority]?.className}`}
              >
                {priorityConfig[c.priority]?.label}
              </Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {c.status === "activo" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:text-yellow-400"
                    onClick={e => {
                      e.stopPropagation();
                      archiveCase.mutate({
                        id: c.id,
                        status: "archivado" as const,
                      });
                    }}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:text-destructive"
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm("¿Eliminar este caso y toda su evidencia?")) {
                      deleteCase.mutate(c.id);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Cases() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  const { data: cases = [], isLoading } = trpc.cases.list.useQuery();

  const deleteCaseMutation = trpc.cases.delete.useMutation({
    onSuccess: () => {
      toast.success("Caso eliminado");
    },
  });

  const deleteCase = {
    mutate: (id: number) => deleteCaseMutation.mutate({ id }),
    isPending: deleteCaseMutation.isPending,
  };

  const archiveCaseMutation = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("Caso archivado");
    },
  });

  const archiveCase = {
    mutate: (data: { id: number; status: "archivado" }) =>
      archiveCaseMutation.mutate(data),
    isPending: archiveCaseMutation.isPending,
  };

  const filtered = cases.filter(c => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.caseNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.clientName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { height } = entries[0].contentRect;
      if (height > 0) setListHeight(height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemData = {
    cases: filtered,
    navigate,
    archiveCase,
    deleteCase,
    statusConfig,
    priorityConfig,
    caseTypeLabels,
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full gap-6">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Casos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {cases.length} caso{cases.length !== 1 ? "s" : ""} registrado
              {cases.length !== 1 ? "s" : ""}
            </p>
          </div>
          <CreateCaseDialog onCreated={() => {}} />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap shrink-0">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, expediente o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="archivado">Archivados</SelectItem>
              <SelectItem value="cerrado">Cerrados</SelectItem>
              <SelectItem value="en_revision">En revisión</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Virtualized list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Cargando casos...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "todos"
                  ? "No se encontraron casos con esos filtros"
                  : "No hay casos registrados"}
              </p>
              {!search && statusFilter === "todos" && (
                <CreateCaseDialog onCreated={() => {}} />
              )}
            </CardContent>
          </Card>
        ) : (
          <div ref={listRef} className="flex-1 min-h-0">
            <List<CaseRowProps>
              style={{ height: listHeight, width: "100%" }}
              rowCount={filtered.length}
              rowHeight={ROW_HEIGHT}
              rowProps={itemData}
              rowComponent={CaseRow}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
