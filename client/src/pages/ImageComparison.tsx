import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileSearch,
  GitCompare,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Scale,
  Shield,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DifferenceRegion {
  location: string;
  type: string;
  severity: "critica" | "alta" | "media" | "baja";
  description: string;
  forensicInterpretation: string;
}

interface MetadataComparison {
  field: string;
  imageA: string | null;
  imageB: string | null;
  isDifferent: boolean;
  forensicNote?: string | null;
}

interface ComparisonResult {
  manipulationLikelihood: "ninguna" | "baja" | "media" | "alta" | "critica";
  confidence: "alta" | "media" | "baja";
  executiveSummary: string;
  differences: DifferenceRegion[];
  metadataComparisons: MetadataComparison[];
  areSameDocument: boolean;
  sameDocumentExplanation: string;
  forensicFindings: string[];
  legalImplications: string;
  recommendedActions: string[];
  methodology: string;
  authenticityAssessment: string;
}

// ─── Severity / likelihood helpers ───────────────────────────────────────────

const severityConfig = {
  critica: {
    label: "Crítica",
    className: "bg-red-900/30 text-red-400 border-red-800/50",
  },
  alta: {
    label: "Alta",
    className: "bg-orange-900/30 text-orange-400 border-orange-800/50",
  },
  media: {
    label: "Media",
    className: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50",
  },
  baja: {
    label: "Baja",
    className: "bg-green-900/30 text-green-400 border-green-800/50",
  },
};

const likelihoodConfig = {
  ninguna: {
    label: "Ninguna",
    className: "text-green-400 border-green-800/50 bg-green-900/20",
    icon: CheckCircle2,
  },
  baja: {
    label: "Baja",
    className: "text-lime-400 border-lime-800/50 bg-lime-900/20",
    icon: Shield,
  },
  media: {
    label: "Media",
    className: "text-yellow-400 border-yellow-800/50 bg-yellow-900/20",
    icon: AlertTriangle,
  },
  alta: {
    label: "Alta",
    className: "text-orange-400 border-orange-800/50 bg-orange-900/20",
    icon: AlertTriangle,
  },
  critica: {
    label: "Crítica",
    className: "text-red-400 border-red-800/50 bg-red-900/20",
    icon: AlertTriangle,
  },
};

const differenceTypeLabels: Record<string, string> = {
  adicion: "Adición",
  eliminacion: "Eliminación",
  modificacion: "Modificación",
  reemplazo: "Reemplazo",
  ajuste_color: "Ajuste de color",
  recorte: "Recorte",
  otro: "Otro",
};

// ─── Image viewer with zoom ───────────────────────────────────────────────────

function ZoomableImage({
  src,
  alt,
  label,
  zoom,
  onZoomChange,
}: {
  src: string;
  alt: string;
  label: string;
  zoom: number;
  onZoomChange: (z: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Reset pan when zoom returns to 1
  useEffect(() => {
    if (zoom === 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      onZoomChange(Math.max(1, Math.min(4, zoom + delta)));
    },
    [zoom, onZoomChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Label bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border shrink-0">
        <span className="text-xs font-mono text-muted-foreground truncate max-w-[60%]">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onZoomChange(Math.max(1, zoom - 0.25))}
            disabled={zoom <= 1}
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
            disabled={zoom >= 4}
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              onZoomChange(1);
              setPan({ x: 0, y: 0 });
            }}
            disabled={zoom === 1}
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-black/40 relative"
        style={{
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-100 select-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
}

// ─── Comparison selector ──────────────────────────────────────────────────────

function ComparisonSelector({ caseId }: { caseId: number }) {
  const [, navigate] = useLocation();
  const { data: evidenceList = [], isLoading } =
    trpc.evidence.listByCase.useQuery({ caseId });
  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const startComparison = trpc.comparison.compare.useMutation({
    onSuccess: data => {
      toast.success("Comparación iniciada. Analizando con IA...");
      utils.comparison.listByCase.invalidate({ caseId });
      // Navigate to the comparison result
      navigate(`/cases/${caseId}/compare/${data.id}`);
    },
    onError: err => toast.error(err.message),
  });

  const images = evidenceList.filter(e =>
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
    ].includes((e.mimeType ?? "").toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        Cargando evidencia...
      </div>
    );
  }

  if (images.length < 2) {
    return (
      <div className="py-12 text-center">
        <FileSearch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          Se necesitan al menos 2 imágenes en el caso
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Actualmente hay {images.length} imagen
          {images.length !== 1 ? "es" : ""} disponible
          {images.length !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Image A selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Imagen A (original / referencia)
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() =>
                  setSelectedA(img.id === selectedA ? null : img.id)
                }
                disabled={img.id === selectedB}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                  selectedA === img.id
                    ? "border-primary bg-primary/10"
                    : img.id === selectedB
                      ? "border-border opacity-30 cursor-not-allowed"
                      : "border-border hover:border-primary/30 bg-background"
                }`}
              >
                <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-black/20">
                  <img
                    src={img.s3Url}
                    alt={img.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {img.originalName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(img.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                {selectedA === img.id && (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Image B selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Imagen B (para comparar)
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() =>
                  setSelectedB(img.id === selectedB ? null : img.id)
                }
                disabled={img.id === selectedA}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                  selectedB === img.id
                    ? "border-blue-600 bg-blue-900/10"
                    : img.id === selectedA
                      ? "border-border opacity-30 cursor-not-allowed"
                      : "border-border hover:border-blue-600/30 bg-background"
                }`}
              >
                <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-black/20">
                  <img
                    src={img.s3Url}
                    alt={img.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {img.originalName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(img.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                {selectedB === img.id && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!selectedA || !selectedB || startComparison.isPending}
        onClick={() => {
          if (selectedA && selectedB) {
            startComparison.mutate({
              caseId,
              evidenceAId: selectedA,
              evidenceBId: selectedB,
            });
          }
        }}
      >
        {startComparison.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Iniciando
            análisis...
          </>
        ) : (
          <>
            <GitCompare className="w-4 h-4 mr-2" /> Analizar diferencias con IA
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Comparison history list ──────────────────────────────────────────────────

function ComparisonHistory({ caseId }: { caseId: number }) {
  const [, navigate] = useLocation();
  const {
    data: comparisons = [],
    isLoading,
    refetch,
  } = trpc.comparison.listByCase.useQuery({ caseId });
  const utils = trpc.useUtils();

  const deleteComparison = trpc.comparison.delete.useMutation({
    onSuccess: () => {
      utils.comparison.listByCase.invalidate({ caseId });
      toast.success("Comparación eliminada");
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading)
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        Cargando...
      </div>
    );

  if (comparisons.length === 0) {
    return (
      <div className="py-8 text-center">
        <GitCompare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">
          No hay comparaciones previas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Actualizar
        </Button>
      </div>
      {comparisons.map(comp => {
        const lk =
          likelihoodConfig[
            comp.manipulationLikelihood as keyof typeof likelihoodConfig
          ];
        const LkIcon = lk?.icon ?? AlertTriangle;
        return (
          <div
            key={comp.id}
            className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors group cursor-pointer"
            onClick={() => navigate(`/cases/${caseId}/compare/${comp.id}`)}
          >
            <GitCompare className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium truncate">
                  {comp.evidenceA?.originalName ?? `Ev. ${comp.evidenceAId}`}
                  <span className="text-muted-foreground mx-1">vs</span>
                  {comp.evidenceB?.originalName ?? `Ev. ${comp.evidenceBId}`}
                </p>
                {comp.status === "completado" && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${lk?.className}`}
                  >
                    <LkIcon className="w-2.5 h-2.5 mr-1" />
                    {lk?.label}
                  </Badge>
                )}
                {comp.status === "procesando" && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 text-yellow-400 border-yellow-800/50"
                  >
                    <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />{" "}
                    Procesando
                  </Badge>
                )}
                {comp.status === "error" && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 text-red-400 border-red-800/50"
                  >
                    Error
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {comp.differenceCount} diferencia
                {comp.differenceCount !== 1 ? "s" : ""} ·{" "}
                {new Date(comp.createdAt).toLocaleDateString("es-MX")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
              onClick={e => {
                e.stopPropagation();
                if (confirm("¿Eliminar esta comparación?")) {
                  deleteComparison.mutate({ id: comp.id });
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Comparison result view ───────────────────────────────────────────────────

function ComparisonResultView({
  comparisonId,
  caseId,
}: {
  comparisonId: number;
  caseId: number;
}) {
  const [zoomA, setZoomA] = useState(1);
  const [zoomB, setZoomB] = useState(1);
  const [syncZoom, setSyncZoom] = useState(true);
  const [expandedDiff, setExpandedDiff] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const {
    data: comp,
    isLoading,
    refetch,
  } = trpc.comparison.getById.useQuery(
    { id: comparisonId },
    {
      refetchInterval: query =>
        query.state.data?.status === "procesando" ? 4000 : false,
    }
  );

  const handleZoomA = useCallback(
    (z: number) => {
      setZoomA(z);
      if (syncZoom) setZoomB(z);
    },
    [syncZoom]
  );

  const handleZoomB = useCallback(
    (z: number) => {
      setZoomB(z);
      if (syncZoom) setZoomA(z);
    },
    [syncZoom]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Comparación no encontrada
      </div>
    );
  }

  const result = comp.result as ComparisonResult | null;
  const lk =
    likelihoodConfig[
      comp.manipulationLikelihood as keyof typeof likelihoodConfig
    ];
  const LkIcon = lk?.icon ?? AlertTriangle;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      {comp.status === "procesando" && (
        <Card className="border-yellow-800/40 bg-yellow-900/10">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-yellow-400 font-medium">
                  Analizando imágenes con IA forense...
                </p>
                <p className="text-xs text-muted-foreground">
                  Esto puede tomar 30-60 segundos
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Actualizar
              </Button>
            </div>
            <Progress className="mt-2 h-1" value={undefined} />
          </CardContent>
        </Card>
      )}

      {comp.status === "error" && (
        <Card className="border-red-800/40 bg-red-900/10">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">
                Error en el análisis: {comp.errorMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side by side viewer */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="py-2 px-4 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Vista comparativa
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSyncZoom(!syncZoom)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${
                  syncZoom
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <GitCompare className="w-3 h-3" />
                Zoom sincronizado
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setZoomA(1);
                  setZoomB(1);
                }}
              >
                <Minimize2 className="w-3 h-3 mr-1" /> Restablecer
              </Button>
            </div>
          </div>
        </CardHeader>
        <div
          className="grid grid-cols-2 divide-x divide-border"
          style={{ height: "420px" }}
        >
          {comp.evidenceA ? (
            <ZoomableImage
              src={comp.evidenceA.s3Url}
              alt={comp.evidenceA.originalName}
              label={`A: ${comp.evidenceA.originalName}`}
              zoom={zoomA}
              onZoomChange={handleZoomA}
            />
          ) : (
            <div className="flex items-center justify-center text-muted-foreground text-sm">
              Imagen A no disponible
            </div>
          )}
          {comp.evidenceB ? (
            <ZoomableImage
              src={comp.evidenceB.s3Url}
              alt={comp.evidenceB.originalName}
              label={`B: ${comp.evidenceB.originalName}`}
              zoom={zoomB}
              onZoomChange={handleZoomB}
            />
          ) : (
            <div className="flex items-center justify-center text-muted-foreground text-sm">
              Imagen B no disponible
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/5 flex items-center gap-4 text-xs text-muted-foreground">
          <span>Rueda del ratón para zoom · Arrastrar para desplazar</span>
          {syncZoom && (
            <span className="text-primary">· Zoom sincronizado activo</span>
          )}
        </div>
      </Card>

      {/* Results */}
      {result && (
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-9">
            <TabsTrigger value="resumen" className="text-xs">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="diferencias" className="text-xs">
              Diferencias
              {result.differences.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/20 text-primary rounded-full px-1.5">
                  {result.differences.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="hallazgos" className="text-xs">
              Hallazgos
            </TabsTrigger>
            <TabsTrigger value="metadatos" className="text-xs">
              Metadatos
            </TabsTrigger>
            <TabsTrigger value="legal" className="text-xs">
              Legal
            </TabsTrigger>
          </TabsList>

          {/* Resumen tab */}
          <TabsContent value="resumen" className="mt-3 space-y-3">
            {/* Manipulation likelihood card */}
            <Card
              className={`border ${lk?.className.includes("border") ? "" : "border-border"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${lk?.className}`}>
                    <LkIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">
                        Probabilidad de manipulación
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${lk?.className}`}
                      >
                        {lk?.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground border-border"
                      >
                        Confianza: {result.confidence}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.executiveSummary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Same document */}
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">¿Mismo documento?</p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      result.areSameDocument
                        ? "text-green-400 border-green-800/50 bg-green-900/20"
                        : "text-orange-400 border-orange-800/50 bg-orange-900/20"
                    }`}
                  >
                    {result.areSameDocument ? "Sí" : "No"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.sameDocumentExplanation}
                </p>
              </CardContent>
            </Card>

            {/* Authenticity */}
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Evaluación de autenticidad
                </p>
                <p className="text-sm text-foreground">
                  {result.authenticityAssessment}
                </p>
              </CardContent>
            </Card>

            {/* Methodology */}
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Metodología
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.methodology}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diferencias tab */}
          <TabsContent value="diferencias" className="mt-3 space-y-2">
            {result.differences.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No se detectaron diferencias significativas
                </p>
              </div>
            ) : (
              result.differences.map((diff, i) => {
                const sc =
                  severityConfig[diff.severity as keyof typeof severityConfig];
                const isExpanded = expandedDiff === i;
                return (
                  <Card key={i} className="border-border overflow-hidden">
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedDiff(isExpanded ? null : i)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 shrink-0 mt-0.5 ${sc?.className}`}
                          >
                            {sc?.label}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {differenceTypeLabels[diff.type] ?? diff.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                · {diff.location}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {diff.description}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/10 p-3 space-y-2">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Descripción completa
                          </p>
                          <p className="text-xs text-foreground">
                            {diff.description}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Interpretación forense
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {diff.forensicInterpretation}
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Hallazgos tab */}
          <TabsContent value="hallazgos" className="mt-3 space-y-2">
            {result.forensicFindings.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No se registraron hallazgos forenses adicionales
              </div>
            ) : (
              <Card className="border-border">
                <CardContent className="p-4 space-y-2">
                  {result.forensicFindings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <p className="text-sm text-foreground">{f}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Metadatos tab */}
          <TabsContent value="metadatos" className="mt-3">
            {result.metadataComparisons.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No hay metadatos disponibles para comparar
              </div>
            ) : (
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          Campo
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          Imagen A
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          Imagen B
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.metadataComparisons.map((m, i) => (
                        <tr
                          key={i}
                          className={`border-b border-border/50 ${
                            m.isDifferent ? "bg-orange-900/5" : ""
                          }`}
                        >
                          <td className="p-3 font-mono text-muted-foreground">
                            {m.field}
                          </td>
                          <td className="p-3 text-foreground">
                            {m.imageA ?? (
                              <span className="text-muted-foreground/50">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-foreground">
                            {m.imageB ?? (
                              <span className="text-muted-foreground/50">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {m.isDifferent ? (
                              <div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 h-4 text-orange-400 border-orange-800/50 bg-orange-900/20"
                                >
                                  Diferente
                                </Badge>
                                {m.forensicNote && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {m.forensicNote}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 text-green-400 border-green-800/50 bg-green-900/20"
                              >
                                Igual
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Legal tab */}
          <TabsContent value="legal" className="mt-3 space-y-3">
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Implicaciones legales
                </p>
                <p className="text-sm text-foreground">
                  {result.legalImplications}
                </p>
              </CardContent>
            </Card>
            {result.recommendedActions.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Acciones recomendadas
                  </p>
                  <div className="space-y-2">
                    {result.recommendedActions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {i + 1}
                        </div>
                        <p className="text-sm text-foreground">{a}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImageComparison() {
  const { user, loading, isAuthenticated } = useAuth();
  const params = useParams<{ caseId: string; comparisonId?: string }>();
  const [, navigate] = useLocation();

  const caseId = parseInt(params.caseId ?? "0", 10);
  const comparisonId = params.comparisonId
    ? parseInt(params.comparisonId, 10)
    : null;

  const { data: caseData } = trpc.cases.getById.useQuery(
    { id: caseId },
    { enabled: !!caseId && !isNaN(caseId) }
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => navigate(`/cases/${caseId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al caso
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-lg font-bold truncate">
                Comparación Forense de Imágenes
              </h1>
            </div>
            {caseData && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Caso: {caseData.title}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {comparisonId ? (
          /* Show specific comparison result */
          <ComparisonResultView comparisonId={comparisonId} caseId={caseId} />
        ) : (
          /* Show selector + history */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-primary" />
                    Nueva comparación
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Selecciona dos imágenes del caso para detectar diferencias y
                    posibles alteraciones
                  </p>
                </CardHeader>
                <CardContent>
                  <ComparisonSelector caseId={caseId} />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Comparaciones previas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ComparisonHistory caseId={caseId} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
