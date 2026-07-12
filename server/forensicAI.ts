import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import {
  buildImageForensicSummary,
  isImageMimeType,
  type ImageAnalysisResult,
} from "./imageAnalysis";
import { llmCache, metadataCache, hashContent } from "./_core/cache";
import { wrapData, PROMPT_SECURITY_REMINDER } from "./_core/promptSecurity";
import { ENV } from "./_core/env";

const PARALLEL_EVIDENCE_LIMIT = 10;
const CACHE_TTL_MS = 1800000;
const ANALYSIS_CACHE_TTL_MS = ENV.analysisCacheTtlMinutes * 60 * 1000;

// Max chars per evidence text to include in prompts (prevents token overflow)
const MAX_EXTRACTED_TEXT = 3000;
const MAX_METADATA_LEN = 1000;

export interface ForensicEvidence {
  id: number;
  originalName: string;
  evidenceType: string | null;
  mimeType: string | null;
  sizeBytes: number;
  metadata: Record<string, unknown> | null;
  extractedText?: string | null;
  description?: string | null;
  createdAt: Date;
}

export interface ForensicAnalysisResult {
  executiveSummary: string;
  expertOpinion: string;
  prosecutionTheory: string;
  defenseTheory: string;
  inconsistencies: string;
  suspiciousPatterns: string;
  keyFindings: string;
  timelineEvents: string;
  relationshipGraph: string;
  hasCriticalFindings: boolean;
}

function processEvidenceSummary(e: ForensicEvidence, i: number): string {
  const meta = e.metadata ?? {};
  const imageAnalysis = (meta as Record<string, unknown>)?.imageAnalysis as
    | ImageAnalysisResult
    | undefined;

  if (isImageMimeType(e.mimeType) && imageAnalysis) {
    const imageSummary = buildImageForensicSummary(
      e.originalName,
      imageAnalysis
    );
    return `[Evidencia ${i + 1}] ID:${e.id} | Nombre: ${e.originalName} | Tipo: imagen | MIME: ${e.mimeType} | Tamaño: ${(e.sizeBytes / 1024).toFixed(1)} KB | Fecha carga: ${e.createdAt.toISOString()}

${imageSummary}`;
  }

  const metaStr = JSON.stringify(meta, null, 2).slice(0, MAX_METADATA_LEN);
  const text = e.extractedText
    ? `\nContenido extraído:\n${e.extractedText.slice(0, MAX_EXTRACTED_TEXT)}`
    : "";
  return `[Evidencia ${i + 1}] ID:${e.id} | Nombre: ${e.originalName} | Tipo: ${e.evidenceType} | MIME: ${e.mimeType} | Tamaño: ${(e.sizeBytes / 1024).toFixed(1)} KB | Fecha carga: ${e.createdAt.toISOString()}
Metadatos: ${metaStr}${text}`;
}

function buildEvidenceSummary(evidenceList: ForensicEvidence[]): string {
  const limitedList = evidenceList.slice(0, PARALLEL_EVIDENCE_LIMIT);
  const results = limitedList.map((e, i) => processEvidenceSummary(e, i));
  return results.join("\n\n---\n\n");
}

export async function runForensicAnalysis(
  caseTitle: string,
  caseDescription: string | null,
  caseType: string,
  evidenceList: ForensicEvidence[],
  userName: string,
  forceFresh?: boolean
): Promise<ForensicAnalysisResult> {
  const evidenceSummary = buildEvidenceSummary(evidenceList);

  const systemPrompt = `Eres un perito forense digital experto con más de 20 años de experiencia en análisis de evidencia digital para procesos judiciales en Latinoamérica. Tu función es analizar evidencia digital y producir dictámenes periciales rigurosos, objetivos y técnicamente fundamentados que cumplan con los estándares de presentación judicial.

Debes:
1. Analizar cada pieza de evidencia con rigor técnico y científico
2. Identificar patrones, inconsistencias y anomalías
3. Construir una línea de tiempo cronológica de eventos
4. Formular teorías del caso tanto para acusación como para defensa
5. Identificar relaciones entre personas, eventos y archivos
6. Detectar posibles manipulaciones o alteraciones de evidencia
7. Producir hallazgos clasificados por severidad (alta/media/baja)

Tu análisis debe ser imparcial, basado en hechos verificables y expresado en lenguaje técnico-legal apropiado.

${PROMPT_SECURITY_REMINDER}`;

  const userPrompt = `Analiza el siguiente caso y su evidencia digital:

${wrapData("TÍTULO DEL CASO", caseTitle)}
${wrapData("TIPO DE CASO", caseType)}
${wrapData("DESCRIPCIÓN DEL CASO", caseDescription, 5000)}
${wrapData("PERITO SOLICITANTE", userName, 200)}
Total de evidencias: ${evidenceList.length}

${wrapData("EVIDENCIA DIGITAL", evidenceSummary, 30000)}

Produce un análisis forense completo en formato JSON con la siguiente estructura exacta:
{
  "executiveSummary": "Resumen ejecutivo del caso (2-3 párrafos)",
  "expertOpinion": "Dictamen pericial técnico completo con metodología, hallazgos y conclusiones",
  "prosecutionTheory": "Teoría del caso desde perspectiva acusatoria con evidencia de soporte",
  "defenseTheory": "Teoría del caso desde perspectiva defensiva con argumentos técnicos",
  "inconsistencies": "Inconsistencias detectadas en la evidencia digital",
  "suspiciousPatterns": "Patrones sospechosos, anomalías técnicas o posibles manipulaciones detectadas",
  "keyFindings": [
    {
      "title": "Título del hallazgo",
      "description": "Descripción técnica detallada",
      "severity": "alta|media|baja",
      "evidenceIds": [lista de IDs de evidencia relacionada]
    }
  ],
  "timelineEvents": [
    {
      "id": "evt_1",
      "date": "YYYY-MM-DDTHH:mm:ssZ",
      "title": "Título del evento",
      "description": "Descripción del evento",
      "type": "digital|comunicacion|acceso|modificacion|otro",
      "evidenceId": numero_opcional,
      "persons": ["nombres de personas involucradas"],
      "locations": ["ubicaciones relevantes"],
      "significance": "alta|media|baja"
    }
  ],
  "relationshipGraph": {
    "nodes": [
      {"id": "n1", "label": "Nombre", "type": "persona|archivo|evento|dispositivo|ubicacion"}
    ],
    "edges": [
      {"source": "n1", "target": "n2", "label": "tipo de relación", "weight": 1}
    ]
  },
  "hasCriticalFindings": true|false
}`;

  const cachePayload = systemPrompt + "|||" + userPrompt;
  const cacheKey = hashContent(cachePayload);
  if (!forceFresh) {
    const cached = llmCache.get(cacheKey) as ForensicAnalysisResult | null;
    if (cached) {
      console.log(
        `[Cache] Forensic analysis HIT (key=${cacheKey.slice(0, 8)}…)`
      );
      return cached;
    }
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "forensic_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            executiveSummary: { type: "string" },
            expertOpinion: { type: "string" },
            prosecutionTheory: { type: "string" },
            defenseTheory: { type: "string" },
            inconsistencies: { type: "string" },
            suspiciousPatterns: { type: "string" },
            keyFindings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["alta", "media", "baja"] },
                  evidenceIds: { type: "array", items: { type: "number" } },
                },
                required: ["title", "description", "severity", "evidenceIds"],
              },
            },
            timelineEvents: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  date: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" },
                  evidenceId: { type: "number" },
                  persons: { type: "array", items: { type: "string" } },
                  locations: { type: "array", items: { type: "string" } },
                  significance: {
                    type: "string",
                    enum: ["alta", "media", "baja"],
                  },
                },
                required: [
                  "id",
                  "date",
                  "title",
                  "description",
                  "type",
                  "significance",
                ],
              },
            },
            relationshipGraph: {
              type: "object",
              properties: {
                nodes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      type: { type: "string" },
                    },
                    required: ["id", "label", "type"],
                  },
                },
                edges: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      source: { type: "string" },
                      target: { type: "string" },
                      label: { type: "string" },
                      weight: { type: "number" },
                    },
                    required: ["source", "target", "label"],
                  },
                },
              },
              required: ["nodes", "edges"],
            },
            hasCriticalFindings: { type: "boolean" },
          },
          required: [
            "executiveSummary",
            "expertOpinion",
            "prosecutionTheory",
            "defenseTheory",
            "inconsistencies",
            "suspiciousPatterns",
            "keyFindings",
            "timelineEvents",
            "relationshipGraph",
            "hasCriticalFindings",
          ],
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new Error("No se recibió respuesta del modelo de IA");

  const result: ForensicAnalysisResult = JSON.parse(content);

  console.log(
    `[Cache] Forensic analysis MISS stored (key=${cacheKey.slice(0, 8)}…)`
  );
  llmCache.set(cacheKey, result, ANALYSIS_CACHE_TTL_MS);

  // Send critical alert if needed
  if (result.hasCriticalFindings) {
    try {
      const keyFindingsParsed =
        typeof result.keyFindings === "string"
          ? JSON.parse(result.keyFindings)
          : result.keyFindings;
      await notifyOwner({
        title: `🚨 Hallazgos Críticos Detectados - Caso: ${caseTitle}`,
        content: `El perito ${userName} completó un análisis forense del caso "${caseTitle}" y se detectaron hallazgos críticos.\n\n${(Array.isArray(
          keyFindingsParsed
        )
          ? keyFindingsParsed
          : []
        )
          .filter((f: any) => f.severity === "alta")
          .map((f: any) => `• ${f.title}: ${f.description}`)
          .join("\n")}\n\nSe recomienda revisión inmediata.`,
      });
    } catch (e) {
      console.warn("[Notification] Failed to send critical alert:", e);
    }
  }

  return result;
}

export async function extractFileMetadata(
  filename: string,
  mimeType: string,
  fileContent?: string
): Promise<Record<string, unknown>> {
  const cacheKey = `metadata:${hashContent(`${filename}:${mimeType}:${fileContent?.slice(0, 500) ?? ""}`)}`;
  const cached = metadataCache.get(cacheKey);
  if (cached) return cached;

  const prompt = `Analiza los siguientes datos de un archivo de evidencia digital y extrae todos los metadatos relevantes para un análisis forense legal.

${wrapData("ARCHIVO", filename)}
${wrapData("TIPO MIME", mimeType)}
${wrapData("CONTENIDO EXTRAÍDO", fileContent?.slice(0, 2000), 2500)}

Extrae y devuelve en JSON los metadatos relevantes como: fechas, autores, dispositivos, ubicaciones, versiones de software, hashes, IPs, usuarios, etc. según el tipo de archivo.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en análisis forense digital. Extrae metadatos relevantes de archivos de evidencia y devuelve JSON estructurado.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "file_metadata",
          strict: false,
          schema: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    });
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (!content) return {};
    const result = JSON.parse(content);
    metadataCache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch {
    return {};
  }
}

export interface ContradictionAnalysisResult {
  contradictionSummary: string;
  factsTable: string;
  weakPoints: string;
  timelineOfEvents: string;
  keyFindings: string;
  hasCriticalContradictions: boolean;
}

function buildDocumentsSummary(evidenceList: ForensicEvidence[]): string {
  return evidenceList
    .map((e, i) => {
      const text = e.extractedText
        ? `\n\n=== CONTENIDO DEL DOCUMENTO (evidencia ${i + 1}: ${e.originalName}) ===\n${e.extractedText.slice(0, 5000)}`
        : "";
      return `[Evidencia ${i + 1}] ${e.originalName} (${e.evidenceType ?? "documento"})${text}`;
    })
    .join("\n\n---\n\n");
}

export async function runContradictionAnalysis(
  caseTitle: string,
  caseDescription: string | null,
  caseType: string,
  evidenceList: ForensicEvidence[],
  userName: string,
  forceFresh?: boolean
): Promise<ContradictionAnalysisResult> {
  const documentsSummary = buildDocumentsSummary(evidenceList);

  const systemPrompt = `Eres un analista forense documental especializado en el sistema jurídico mexicano. Tu función es analizar documentos legales (demandas, contestaciones, declaraciones, contratos, expedientos) para detectar contradicciones, inconsistencies temporales, y puntos débiles en las argumentaciones de las partes.

Debes:
1. **Detectar contradicciones**: Identifica declaraciones contradictorias entre diferentes documentos o actores
2. **Verificar fechas**: Verifica consistencia temporal entre documentos relacionados
3. **Extraer hechos**: Resume hechos relevantes en tablas estructuradas por fuente documental
4. **Comparar versiones**: Cómo cada parte describe los mismos eventos
5. **Identificar puntos débiles**: Puntos donde la argumentación es débil o contradictoria

PROHIBIDO: Inventar fechas o hechos no presentes en los documentos
OBLIGATORIO: Citar siempre el documento y ubicación exacta
OBLIGATORIO: Distinguir entre hechos probados y alegaciones sin sustento

${PROMPT_SECURITY_REMINDER}`;

  const userPrompt = `Analiza los siguientes documentos del caso para detectar contradicciones en las declaraciones:

${wrapData("TÍTULO DEL CASO", caseTitle)}
${wrapData("TIPO DE CASO", caseType)}
${wrapData("DESCRIPCIÓN DEL CASO", caseDescription, 5000)}
${wrapData("PERITO SOLICITANTE", userName, 200)}

${wrapData("DOCUMENTOS A ANALIZAR", documentsSummary, 30000)}

Produzca un análisis completo en formato JSON con la siguiente estructura exacta:

{
  "contradictionSummary": "Resumen ejecutivo de las contradicciones detectadas (2-3 párrafos) focusing en las contradictions más importantes",
  "factsTable": "Tabla de hechos relevantes en formato texto-separated, con columnas: Hecho | Parte que lo Alega | Evidencia Documental | Consistencia (alta/media/baja)",
  "weakPoints": "Lista de puntos débiles identificados en las argumentaciones, cada uno con referencia al documento específico",
  "timelineOfEvents": "Línea temporal de eventos mencionados en los documentos, detectando inconsistencies de fechas",
  "keyFindings": [
    {
      "title": "Título del hallazgo",
      "description": "Descripción detallada de la contradicción o inconsistencia",
      "severity": "alta|media|baja",
      "documentRefs": ["referencia al documento y página"]
    }
  ],
  "hasCriticalContradictions": true|false
}`;

  const cachePayload = systemPrompt + "|||" + userPrompt;
  const cacheKey = hashContent(cachePayload);
  if (!forceFresh) {
    const cached = llmCache.get(cacheKey) as ContradictionAnalysisResult | null;
    if (cached) {
      console.log(
        `[Cache] Contradiction analysis HIT (key=${cacheKey.slice(0, 8)}…)`
      );
      return cached;
    }
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "contradiction_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            contradictionSummary: { type: "string" },
            factsTable: { type: "string" },
            weakPoints: { type: "string" },
            timelineOfEvents: { type: "string" },
            keyFindings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["alta", "media", "baja"] },
                  documentRefs: { type: "array", items: { type: "string" } },
                },
                required: ["title", "description", "severity", "documentRefs"],
              },
              hasCriticalContradictions: { type: "boolean" },
            },
            required: [
              "contradictionSummary",
              "factsTable",
              "weakPoints",
              "timelineOfEvents",
              "keyFindings",
              "hasCriticalContradictions",
            ],
          },
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new Error("No se recibió respuesta del modelo de IA");

  const result: ContradictionAnalysisResult = JSON.parse(content);

  console.log(
    `[Cache] Contradiction analysis MISS stored (key=${cacheKey.slice(0, 8)}…)`
  );
  llmCache.set(cacheKey, result, ANALYSIS_CACHE_TTL_MS);

  if (result.hasCriticalContradictions) {
    try {
      const keyFindingsParsed =
        typeof result.keyFindings === "string"
          ? JSON.parse(result.keyFindings)
          : result.keyFindings;
      const criticalFindings = Array.isArray(keyFindingsParsed)
        ? keyFindingsParsed.filter((f: any) => f.severity === "alta")
        : [];
      await notifyOwner({
        title: `🚨 Contradicciones Críticas Detectadas - Caso: ${caseTitle}`,
        content: `El análisis de contradicciones del caso "${caseTitle}" detectó inconsistencies críticas.\n\n${criticalFindings
          .map((f: any) => `• ${f.title}: ${f.description}`)
          .join("\n")}\n\nSe recomienda revisión inmediata del expediente.`,
      });
    } catch (e) {
      console.warn("[Notification] Failed to send critical alert:", e);
    }
  }

  return result;
}
