"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface KeyFinding {
  title: string;
  description: string;
  severity: string;
  evidenceIds?: number[];
}

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
  significance: string;
}

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const analysisId = Number(id);

  const { data: analysis, isLoading } = trpc.analyses.getById.useQuery({
    id: analysisId,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "#8892A0" }}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (!analysis) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center" style={{ color: "#8892A0" }}>
          Análisis no encontrado
        </div>
      </DashboardLayout>
    );
  }

  const rawKeyFindings = analysis.keyFindings;
  const keyFindings: KeyFinding[] = Array.isArray(rawKeyFindings)
    ? rawKeyFindings
    : typeof rawKeyFindings === "string"
      ? JSON.parse(rawKeyFindings)
      : [];

  const timelineEvents: TimelineEvent[] = Array.isArray(analysis.timelineEvents)
    ? analysis.timelineEvents
    : typeof analysis.timelineEvents === "string"
      ? JSON.parse(analysis.timelineEvents)
      : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/analisis">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg cursor-pointer transition-colors"
              style={{ border: "1px solid #2A2E3A" }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor =
                  "rgba(232, 184, 109, 0.1)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <ArrowLeft className="h-4 w-4" style={{ color: "#8892A0" }} />
            </div>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: "#E8EDF2" }}>
                {analysis.title}
              </h1>
              <Badge
                variant={
                  analysis.status === "completado" ? "default" : "destructive"
                }
              >
                {analysis.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm" style={{ color: "#8892A0" }}>
              Tipo: {analysis.type}
            </p>
          </div>
        </div>

        {analysis.status === "error" && (
          <Card
            style={{
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
            }}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5" style={{ color: "#EF4444" }} />
              <p className="text-sm" style={{ color: "#EF4444" }}>
                El análisis encontró un error. Intenta ejecutarlo nuevamente.
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.executiveSummary && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Resumen Ejecutivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#8892A0" }}
              >
                {analysis.executiveSummary}
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.expertOpinion && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Dictamen Pericial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "#8892A0" }}
              >
                {analysis.expertOpinion}
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.prosecutionTheory && analysis.defenseTheory && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card
              style={{
                border: "1px solid rgba(232, 184, 109, 0.2)",
              }}
            >
              <CardHeader>
                <CardTitle style={{ color: "#E8B86D" }}>
                  Teoría de Acusación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#8892A0" }}
                >
                  {analysis.prosecutionTheory}
                </p>
              </CardContent>
            </Card>
            <Card
              style={{
                border: "1px solid rgba(232, 184, 109, 0.2)",
              }}
            >
              <CardHeader>
                <CardTitle style={{ color: "#E8B86D" }}>
                  Teoría de Defensa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#8892A0" }}
                >
                  {analysis.defenseTheory}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {keyFindings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle
                className="flex items-center gap-2"
                style={{ color: "#E8EDF2" }}
              >
                <AlertTriangle
                  className="h-4 w-4"
                  style={{ color: "#E8B86D" }}
                />{" "}
                Hallazgos Clave ({keyFindings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {keyFindings.map((finding, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: "rgba(232, 184, 109, 0.03)",
                      border: "1px solid #2A2E3A",
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor:
                            finding.severity === "alta"
                              ? "rgba(239, 68, 68, 0.1)"
                              : finding.severity === "media"
                                ? "rgba(232, 184, 109, 0.1)"
                                : "rgba(232, 184, 109, 0.05)",
                          color:
                            finding.severity === "alta"
                              ? "#EF4444"
                              : finding.severity === "media"
                                ? "#E8B86D"
                                : "#8892A0",
                          border:
                            finding.severity === "alta"
                              ? "1px solid rgba(239, 68, 68, 0.3)"
                              : finding.severity === "media"
                                ? "1px solid rgba(232, 184, 109, 0.3)"
                                : "1px solid #2A2E3A",
                        }}
                      >
                        {finding.severity}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#E8EDF2" }}
                      >
                        {finding.title}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#8892A0" }}>
                      {finding.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {timelineEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Línea de Tiempo ({timelineEvents.length} eventos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timelineEvents.map((event, i) => (
                  <div
                    key={i}
                    className="flex gap-4 rounded-lg p-4"
                    style={{
                      backgroundColor: "rgba(232, 184, 109, 0.03)",
                      border: "1px solid #2A2E3A",
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            event.significance === "alta"
                              ? "#EF4444"
                              : event.significance === "media"
                                ? "#E8B86D"
                                : "#8892A0",
                        }}
                      />
                      {i < timelineEvents.length - 1 && (
                        <div
                          className="mt-1 h-full w-px"
                          style={{ backgroundColor: "#2A2E3A" }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "#8892A0" }}>
                          {event.date}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {event.type}
                        </Badge>
                      </div>
                      <p
                        className="mt-1 text-sm font-medium"
                        style={{ color: "#E8EDF2" }}
                      >
                        {event.title}
                      </p>
                      {event.description && (
                        <p
                          className="mt-0.5 text-sm"
                          style={{ color: "#8892A0" }}
                        >
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.inconsistencies && (
          <Card>
            <CardHeader>
              <CardTitle
                className="flex items-center gap-2"
                style={{ color: "#E8EDF2" }}
              >
                <AlertTriangle
                  className="h-4 w-4"
                  style={{ color: "#E8B86D" }}
                />{" "}
                Inconsistencias Detectadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "#8892A0" }}
              >
                {typeof analysis.inconsistencies === "string"
                  ? analysis.inconsistencies
                  : JSON.stringify(analysis.inconsistencies)}
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.contradictionSummary && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Resumen de Contradicciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#8892A0" }}
              >
                {analysis.contradictionSummary}
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.factsTable && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Tabla de Hechos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "#8892A0" }}
              >
                {analysis.factsTable}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
