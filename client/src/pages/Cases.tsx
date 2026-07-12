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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Archive,
  Calendar,
  ChevronRight,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP, Flip);

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

export default function Cases() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const casesRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<any>(null);

  const {
    data: cases = [],
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.cases.list.useQuery();

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    flipRef.current = Flip.getState(".case-card");
    setSearch(e.target.value);
  };

  const handleStatusChange = (value: string) => {
    flipRef.current = Flip.getState(".case-card");
    setStatusFilter(value);
  };

  useLayoutEffect(() => {
    if (!flipRef.current) return;
    Flip.from(flipRef.current, {
      duration: 0.5,
      ease: "power2.inOut",
    });
    flipRef.current = null;
  }, [filtered]);

  useGSAP(
    () => {
      if (isLoading) return;
      gsap.from(".case-card", {
        y: 20,
        autoAlpha: 0,
        duration: 0.4,
        stagger: { amount: 0.3, from: "start" },
        ease: "power2.out",
        clearProps: "transform",
      });
    },
    { dependencies: [isLoading], scope: casesRef }
  );

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
              onChange={handleSearchChange}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
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

        {/* Case list */}
        {isLoading ? (
          <div className="flex-1 min-h-0 space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
              >
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="w-16 h-5 rounded-full" />
                  <Skeleton className="w-12 h-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <Card className="bg-card border-destructive/30">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-destructive font-medium mb-1">
                Error al cargar casos
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {error?.message}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
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
          <div
            ref={casesRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-2"
          >
            {filtered.map(c => (
              <div key={c.id} className="case-card">
                <Card
                  className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer will-change-transform"
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
                        <div className="flex items-center gap-1">
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:text-destructive"
                                onClick={e => e.stopPropagation()}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              onClick={e => e.stopPropagation()}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Eliminar caso
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Eliminar este caso y toda su evidencia? Esta
                                  acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => deleteCase.mutate(c.id)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
