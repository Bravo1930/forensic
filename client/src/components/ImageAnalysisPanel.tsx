import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Brain,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Scan,
  Shield,
  User,
  XCircle,
  ZoomIn,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AiDisclaimer } from "@/components/AiDisclaimer";

// ─── Types (mirrored from server) ─────────────────────────────────────────────

interface DetectedObject {
  label: string;
  category:
    | "persona"
    | "documento"
    | "dispositivo"
    | "ubicacion"
    | "texto"
    | "objeto"
    | "otro";
  relevance: "alta" | "media" | "baja";
  description: string;
}

interface ForensicIndicator {
  type:
    | "manipulacion"
    | "edicion"
    | "inconsistencia"
    | "marca_agua"
    | "metadata_anomalia"
    | "otro";
  description: string;
  severity: "alta" | "media" | "baja";
}

interface LocationClue {
  type: "gps" | "visual" | "texto" | "metadata";
  value: string;
  confidence: "alta" | "media" | "baja";
}

interface TemporalClue {
  type: "exif" | "visual" | "texto" | "metadata";
  value: string;
  confidence: "alta" | "media" | "baja";
}

interface PersonDetected {
  description: string;
  identifyingFeatures: string[];
  location: string;
}

interface DocumentDetected {
  type: string;
  content: string;
  issuingAuthority?: string;
  dates?: string[];
}

interface ManipulationAssessment {
  likelihood: "alta" | "media" | "baja" | "ninguna";
  indicators: string[];
  explanation: string;
}

interface ImageForensicAnalysis {
  ocrText: string;
  ocrConfidence: "alta" | "media" | "baja";
  visualDescription: string;
  detectedObjects: DetectedObject[];
  forensicIndicators: ForensicIndicator[];
  personsDetected: PersonDetected[];
  documentsDetected: DocumentDetected[];
  locationClues: LocationClue[];
  temporalClues: TemporalClue[];
  manipulationAssessment: ManipulationAssessment;
  forensicSummary: string;
  legalRelevance: "alta" | "media" | "baja";
  legalRelevanceExplanation: string;
}

interface ExifMetadata {
  make?: string;
  model?: string;
  software?: string;
  dateTimeOriginal?: string;
  dateTime?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsLatitudeRef?: string;
  gpsLongitudeRef?: string;
  imageWidth?: number;
  imageHeight?: number;
  iso?: number;
  fNumber?: number;
  exposureTime?: string;
  focalLength?: string;
  flash?: string;
  artist?: string;
  copyright?: string;
  xmpToolkit?: string;
  photoshopDocumentID?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(severity: "alta" | "media" | "baja" | "ninguna") {
  switch (severity) {
    case "alta":
      return "severity-alta";
    case "media":
      return "severity-media";
    case "baja":
      return "severity-baja";
    case "ninguna":
      return "bg-muted/50 text-muted-foreground border border-border";
  }
}

function relevanceIcon(relevance: "alta" | "media" | "baja") {
  switch (relevance) {
    case "alta":
      return <AlertTriangle className="w-3 h-3 text-primary" />;
    case "media":
      return <Eye className="w-3 h-3 text-yellow-400" />;
    case "baja":
      return <CheckCircle2 className="w-3 h-3 text-green-400" />;
  }
}

function categoryIcon(category: DetectedObject["category"]) {
  switch (category) {
    case "persona":
      return <User className="w-3.5 h-3.5" />;
    case "documento":
      return <FileText className="w-3.5 h-3.5" />;
    case "dispositivo":
      return <Camera className="w-3.5 h-3.5" />;
    case "ubicacion":
      return <MapPin className="w-3.5 h-3.5" />;
    default:
      return <Eye className="w-3.5 h-3.5" />;
  }
}

function manipulationBadge(likelihood: ManipulationAssessment["likelihood"]) {
  switch (likelihood) {
    case "alta":
      return (
        <Badge className="bg-red-900/30 text-red-400 border-red-800/50">
          <XCircle className="w-3 h-3 mr-1" />
          Manipulación probable
        </Badge>
      );
    case "media":
      return (
        <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-800/50">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Posible manipulación
        </Badge>
      );
    case "baja":
      return (
        <Badge className="bg-blue-900/30 text-blue-400 border-blue-800/50">
          <Eye className="w-3 h-3 mr-1" />
          Indicios menores
        </Badge>
      );
    case "ninguna":
      return (
        <Badge className="bg-green-900/30 text-green-400 border-green-800/50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Sin manipulación detectada
        </Badge>
      );
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ImageAnalysisPanelProps {
  evidenceId: number;
  caseId: number;
  filename: string;
  s3Url: string;
  mimeType: string;
  /** Optional case context to improve analysis accuracy */
  caseContext?: string;
}

export default function ImageAnalysisPanel({
  evidenceId,
  filename,
  s3Url,
  caseContext,
}: ImageAnalysisPanelProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.evidence.getImageAnalysis.useQuery(
    { evidenceId },
    { retry: false }
  );

  const analyzeMutation = trpc.evidence.analyzeImage.useMutation({
    onSuccess: () => {
      toast.success("Análisis de imagen completado");
      utils.evidence.getImageAnalysis.invalidate({ evidenceId });
    },
    onError: err => {
      toast.error(`Error en el análisis: ${err.message}`);
    },
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({ evidenceId, caseContext });
  };

  const vision = data?.imageAnalysis
    ? (data.imageAnalysis as { vision?: ImageForensicAnalysis })?.vision
    : null;
  const exif = data?.exif as ExifMetadata | null;
  const hasAnalysis = data?.hasAnalysis && !!vision;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Image preview */}
      <div className="relative group">
        <div
          className={`relative overflow-hidden rounded-lg border border-border bg-black/50 cursor-pointer transition-all ${isZoomed ? "fixed inset-4 z-50 bg-black/95 flex items-center justify-center" : "max-h-80"}`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={s3Url}
            alt={filename}
            className={`w-full object-contain transition-all ${isZoomed ? "max-h-full" : "max-h-80"}`}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 rounded p-1.5">
              <ZoomIn className="w-4 h-4 text-white" />
            </div>
          </div>
          {isZoomed && (
            <div className="absolute top-4 right-4 bg-black/60 rounded px-3 py-1.5 text-white text-sm">
              Clic para cerrar
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          {filename}
        </p>
      </div>

      {/* Analysis trigger */}
      {!hasAnalysis ? (
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <Brain className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Análisis Forense Visual</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ejecuta el análisis con IA para extraer texto (OCR), metadatos
              EXIF, detectar objetos, personas, documentos y evaluar posibles
              manipulaciones.
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando imagen...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4 mr-2" />
                  Iniciar análisis forense
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={severityColor(vision!.legalRelevance)}>
                Relevancia legal: {vision!.legalRelevance}
              </Badge>
              {manipulationBadge(vision!.manipulationAssessment.likelihood)}
              {vision!.ocrText?.trim() && (
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Texto extraído
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="text-muted-foreground hover:text-foreground"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="ml-1.5 text-xs">Re-analizar</span>
            </Button>
          </div>

          <AiDisclaimer />

          {/* Analysis tabs */}
          <Tabs defaultValue="resumen" className="w-full">
            <TabsList className="w-full bg-muted/30 border border-border h-9">
              <TabsTrigger value="resumen" className="flex-1 text-xs">
                Resumen
              </TabsTrigger>
              <TabsTrigger value="ocr" className="flex-1 text-xs">
                OCR
              </TabsTrigger>
              <TabsTrigger value="objetos" className="flex-1 text-xs">
                Objetos
              </TabsTrigger>
              <TabsTrigger value="forense" className="flex-1 text-xs">
                Forense
              </TabsTrigger>
              <TabsTrigger value="exif" className="flex-1 text-xs">
                EXIF
              </TabsTrigger>
            </TabsList>

            {/* ── Resumen ── */}
            <TabsContent value="resumen" className="mt-3 space-y-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Descripción Forense
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {vision!.visualDescription}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Relevancia Legal
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {vision!.legalRelevanceExplanation}
                  </p>
                </CardContent>
              </Card>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    label: "Objetos",
                    value: vision!.detectedObjects.length,
                    icon: Eye,
                  },
                  {
                    label: "Personas",
                    value: vision!.personsDetected.length,
                    icon: User,
                  },
                  {
                    label: "Documentos",
                    value: vision!.documentsDetected.length,
                    icon: FileText,
                  },
                  {
                    label: "Indicadores",
                    value: vision!.forensicIndicators.length,
                    icon: AlertTriangle,
                  },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="bg-muted/30 border border-border rounded-lg p-3 text-center"
                  >
                    <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="text-lg font-bold">{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Location & temporal clues */}
              {(vision!.locationClues.length > 0 ||
                vision!.temporalClues.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {vision!.locationClues.length > 0 && (
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                          <MapPin className="w-3.5 h-3.5" />
                          Indicios de Ubicación
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2">
                        {vision!.locationClues.map((clue, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border shrink-0 mt-0.5"
                            >
                              {clue.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {clue.value}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {vision!.temporalClues.length > 0 && (
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                          <Clock className="w-3.5 h-3.5" />
                          Indicios Temporales
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2">
                        {vision!.temporalClues.map((clue, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border shrink-0 mt-0.5"
                            >
                              {clue.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {clue.value}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── OCR ── */}
            <TabsContent value="ocr" className="mt-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Texto Extraído (OCR)
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-border"
                    >
                      Confianza: {vision!.ocrConfidence}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {vision!.ocrText?.trim() ? (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-4 border border-border max-h-64 overflow-y-auto leading-relaxed">
                      {vision!.ocrText}
                    </pre>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        No se detectó texto legible en la imagen
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents detected */}
              {vision!.documentsDetected.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    Documentos Identificados
                  </h4>
                  {vision!.documentsDetected.map((doc, i) => (
                    <Card key={i} className="bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">
                            {doc.type}
                          </span>
                          {doc.issuingAuthority && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border ml-auto"
                            >
                              {doc.issuingAuthority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {doc.content}
                        </p>
                        {doc.dates && doc.dates.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {doc.dates.map((d, j) => (
                              <Badge
                                key={j}
                                variant="outline"
                                className="text-[10px] border-border"
                              >
                                <Clock className="w-2.5 h-2.5 mr-1" />
                                {d}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Objetos ── */}
            <TabsContent value="objetos" className="mt-3 space-y-3">
              {/* Persons */}
              {vision!.personsDetected.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    Personas Detectadas ({vision!.personsDetected.length})
                  </h4>
                  <div className="space-y-2">
                    {vision!.personsDetected.map((person, i) => (
                      <Card key={i} className="bg-card border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium mb-1">
                                Persona {i + 1}
                              </p>
                              <p className="text-xs text-muted-foreground mb-2">
                                {person.description}
                              </p>
                              {person.identifyingFeatures.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {person.identifyingFeatures.map((f, j) => (
                                    <Badge
                                      key={j}
                                      variant="outline"
                                      className="text-[10px] border-border"
                                    >
                                      {f}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {person.location && (
                                <p className="text-[10px] text-muted-foreground mt-1.5">
                                  <MapPin className="w-2.5 h-2.5 inline mr-1" />
                                  {person.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Other objects */}
              {vision!.detectedObjects.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    Objetos y Elementos ({vision!.detectedObjects.length})
                  </h4>
                  <div className="space-y-2">
                    {vision!.detectedObjects.map((obj, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {categoryIcon(obj.category)}
                          {relevanceIcon(obj.relevance)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium">
                              {obj.label}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border"
                            >
                              {obj.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {obj.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {vision!.detectedObjects.length === 0 &&
                vision!.personsDetected.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      No se detectaron objetos o personas relevantes
                    </p>
                  </div>
                )}
            </TabsContent>

            {/* ── Forense ── */}
            <TabsContent value="forense" className="mt-3 space-y-3">
              {/* Manipulation assessment */}
              <Card
                className={`border ${
                  vision!.manipulationAssessment.likelihood === "alta"
                    ? "border-red-800/50 bg-red-900/10"
                    : vision!.manipulationAssessment.likelihood === "media"
                      ? "border-yellow-800/50 bg-yellow-900/10"
                      : "border-border bg-card"
                }`}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Evaluación de Manipulación
                    </div>
                    {manipulationBadge(
                      vision!.manipulationAssessment.likelihood
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {vision!.manipulationAssessment.explanation}
                  </p>
                  {vision!.manipulationAssessment.indicators.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Indicadores detectados:
                      </p>
                      <ul className="space-y-1">
                        {vision!.manipulationAssessment.indicators.map(
                          (ind, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                              {ind}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Forensic indicators */}
              {vision!.forensicIndicators.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    Indicadores Forenses ({vision!.forensicIndicators.length})
                  </h4>
                  <div className="space-y-2">
                    {vision!.forensicIndicators.map((ind, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border text-sm ${severityColor(ind.severity)}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className={`text-[10px] ${severityColor(ind.severity)}`}
                          >
                            {ind.severity}
                          </Badge>
                          <span className="font-medium text-xs capitalize">
                            {ind.type.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs opacity-90">{ind.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {vision!.forensicIndicators.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-60" />
                  <p className="text-sm">
                    No se detectaron indicadores forenses de alerta
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ── EXIF ── */}
            <TabsContent value="exif" className="mt-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    Metadatos EXIF
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {exif && Object.keys(exif).length > 0 ? (
                    <div className="space-y-1">
                      {[
                        {
                          key: "Dispositivo",
                          value: [exif.make, exif.model]
                            .filter(Boolean)
                            .join(" "),
                        },
                        { key: "Software", value: exif.software },
                        { key: "Fecha original", value: exif.dateTimeOriginal },
                        { key: "Fecha de archivo", value: exif.dateTime },
                        {
                          key: "Coordenadas GPS",
                          value:
                            exif.gpsLatitude && exif.gpsLongitude
                              ? `${exif.gpsLatitude}°${exif.gpsLatitudeRef ?? ""}, ${exif.gpsLongitude}°${exif.gpsLongitudeRef ?? ""}`
                              : undefined,
                        },
                        {
                          key: "Dimensiones",
                          value:
                            exif.imageWidth && exif.imageHeight
                              ? `${exif.imageWidth} × ${exif.imageHeight} px`
                              : undefined,
                        },
                        { key: "ISO", value: exif.iso?.toString() },
                        {
                          key: "Apertura",
                          value: exif.fNumber ? `f/${exif.fNumber}` : undefined,
                        },
                        { key: "Exposición", value: exif.exposureTime },
                        { key: "Focal", value: exif.focalLength },
                        { key: "Flash", value: exif.flash },
                        { key: "Autor", value: exif.artist },
                        { key: "Copyright", value: exif.copyright },
                        { key: "⚠️ XMP Toolkit", value: exif.xmpToolkit },
                        {
                          key: "⚠️ Photoshop ID",
                          value: exif.photoshopDocumentID,
                        },
                      ]
                        .filter(row => row.value)
                        .map(row => (
                          <div
                            key={row.key}
                            className={`flex items-start justify-between py-2 border-b border-border last:border-0 gap-4 ${row.key.startsWith("⚠️") ? "text-yellow-400" : ""}`}
                          >
                            <span className="text-xs font-medium shrink-0">
                              {row.key}
                            </span>
                            <span className="text-xs text-muted-foreground text-right break-all">
                              {row.value}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        No se encontraron metadatos EXIF
                      </p>
                      <p className="text-xs mt-1">
                        La imagen puede no contener metadatos o fueron
                        eliminados
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Editing warning */}
              {(exif?.xmpToolkit || exif?.photoshopDocumentID) && (
                <Card className="mt-3 border-yellow-800/50 bg-yellow-900/10">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400 mb-1">
                        Indicadores de edición detectados
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Los metadatos contienen referencias a software de
                        edición de imágenes. Esto puede indicar que la imagen
                        fue procesada o modificada después de su captura
                        original.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <Separator className="bg-border" />

          {/* Forensic summary */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Resumen Forense Completo
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 rounded-lg p-4 border border-border">
              {vision!.forensicSummary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
