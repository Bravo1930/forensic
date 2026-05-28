import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DifferenceRegion {
  /** Descriptive location in the image (e.g. "esquina superior derecha", "centro") */
  location: string;
  /** Type of detected difference */
  type:
    | "adicion"
    | "eliminacion"
    | "modificacion"
    | "reemplazo"
    | "ajuste_color"
    | "recorte"
    | "otro";
  /** Severity of the alteration */
  severity: "critica" | "alta" | "media" | "baja";
  /** Detailed description of what changed */
  description: string;
  /** Forensic interpretation of the change */
  forensicInterpretation: string;
}

export interface MetadataComparison {
  field: string;
  imageA: string | null;
  imageB: string | null;
  isDifferent: boolean;
  forensicNote?: string;
}

export interface ComparisonResult {
  /** Overall manipulation probability */
  manipulationLikelihood: "ninguna" | "baja" | "media" | "alta" | "critica";
  /** Confidence in the analysis */
  confidence: "alta" | "media" | "baja";
  /** Executive summary of the comparison */
  executiveSummary: string;
  /** List of detected difference regions */
  differences: DifferenceRegion[];
  /** Metadata comparison between the two images */
  metadataComparisons: MetadataComparison[];
  /** Whether the images appear to be versions of the same document */
  areSameDocument: boolean;
  /** Explanation of the same-document determination */
  sameDocumentExplanation: string;
  /** Specific forensic findings */
  forensicFindings: string[];
  /** Legal implications of the detected alterations */
  legalImplications: string;
  /** Recommended actions for the legal team */
  recommendedActions: string[];
  /** Technical details about the comparison methodology */
  methodology: string;
  /** Overall authenticity assessment */
  authenticityAssessment: string;
}

export interface ImageComparisonInput {
  imageAUrl: string;
  imageAFilename: string;
  imageAMimeType: string;
  imageBUrl: string;
  imageBFilename: string;
  imageBMimeType: string;
  /** Optional context about the case */
  caseContext?: string;
  /** Optional EXIF data for image A */
  imageAExif?: Record<string, unknown>;
  /** Optional EXIF data for image B */
  imageBExif?: Record<string, unknown>;
  /** Optional previous analysis for image A */
  imageAAnalysis?: Record<string, unknown>;
  /** Optional previous analysis for image B */
  imageBAnalysis?: Record<string, unknown>;
}

// ─── Core comparison function ─────────────────────────────────────────────────

export async function compareImagesForensically(
  input: ImageComparisonInput
): Promise<ComparisonResult> {
  const {
    imageAUrl,
    imageAFilename,
    imageBUrl,
    imageBFilename,
    caseContext,
    imageAExif,
    imageBExif,
    imageAAnalysis,
    imageBAnalysis,
  } = input;

  // Build metadata comparison context
  const metaContextA = buildMetaContext(
    "Imagen A",
    imageAFilename,
    imageAExif,
    imageAAnalysis
  );
  const metaContextB = buildMetaContext(
    "Imagen B",
    imageBFilename,
    imageBExif,
    imageBAnalysis
  );

  const systemPrompt = `Eres un perito forense digital especializado en análisis comparativo de imágenes para procesos judiciales.
Tu tarea es comparar dos imágenes y detectar diferencias, alteraciones o manipulaciones con precisión forense.
Debes proporcionar un análisis técnico riguroso, objetivo y útil para presentación judicial.
Responde SIEMPRE en español y en formato JSON válido.`;

  const userPrompt = `Analiza forense y comparativamente estas dos imágenes de evidencia digital.${
    caseContext ? `\n\nCONTEXTO DEL CASO: ${caseContext}` : ""
  }

IMAGEN A: ${imageAFilename}
${metaContextA}

IMAGEN B: ${imageBFilename}
${metaContextB}

Realiza un análisis comparativo exhaustivo y devuelve un JSON con esta estructura EXACTA:
{
  "manipulationLikelihood": "ninguna|baja|media|alta|critica",
  "confidence": "alta|media|baja",
  "executiveSummary": "Resumen ejecutivo de 2-3 oraciones sobre las diferencias encontradas",
  "differences": [
    {
      "location": "descripción de la ubicación en la imagen",
      "type": "adicion|eliminacion|modificacion|reemplazo|ajuste_color|recorte|otro",
      "severity": "critica|alta|media|baja",
      "description": "descripción detallada de la diferencia",
      "forensicInterpretation": "interpretación forense de por qué esto es relevante"
    }
  ],
  "metadataComparisons": [
    {
      "field": "nombre del campo",
      "imageA": "valor en imagen A o null",
      "imageB": "valor en imagen B o null",
      "isDifferent": true/false,
      "forensicNote": "nota forense opcional sobre la diferencia"
    }
  ],
  "areSameDocument": true/false,
  "sameDocumentExplanation": "explicación de si son el mismo documento o versiones del mismo",
  "forensicFindings": ["hallazgo 1", "hallazgo 2"],
  "legalImplications": "implicaciones legales de las alteraciones detectadas",
  "recommendedActions": ["acción recomendada 1", "acción recomendada 2"],
  "methodology": "descripción breve de la metodología de análisis utilizada",
  "authenticityAssessment": "evaluación general de autenticidad de ambas imágenes"
}

INSTRUCCIONES:
- Compara visualmente cada región de las imágenes con detalle
- Identifica texto, objetos, personas, firmas, sellos, fechas que difieran
- Evalúa cambios de color, brillo, contraste que puedan indicar edición
- Detecta elementos añadidos, eliminados o modificados
- Considera si los metadatos disponibles son consistentes con el contenido visual
- Sé específico sobre ubicaciones usando términos como "esquina superior izquierda", "centro", "margen derecho", etc.
- Si las imágenes son idénticas, indica "ninguna" manipulación con explicación clara`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: { url: imageAUrl, detail: "high" },
          },
          {
            type: "image_url",
            image_url: { url: imageBUrl, detail: "high" },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "image_comparison_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            manipulationLikelihood: {
              type: "string",
              enum: ["ninguna", "baja", "media", "alta", "critica"],
            },
            confidence: { type: "string", enum: ["alta", "media", "baja"] },
            executiveSummary: { type: "string" },
            differences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  location: { type: "string" },
                  type: {
                    type: "string",
                    enum: [
                      "adicion",
                      "eliminacion",
                      "modificacion",
                      "reemplazo",
                      "ajuste_color",
                      "recorte",
                      "otro",
                    ],
                  },
                  severity: {
                    type: "string",
                    enum: ["critica", "alta", "media", "baja"],
                  },
                  description: { type: "string" },
                  forensicInterpretation: { type: "string" },
                },
                required: [
                  "location",
                  "type",
                  "severity",
                  "description",
                  "forensicInterpretation",
                ],
                additionalProperties: false,
              },
            },
            metadataComparisons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  imageA: { type: ["string", "null"] },
                  imageB: { type: ["string", "null"] },
                  isDifferent: { type: "boolean" },
                  forensicNote: { type: ["string", "null"] },
                },
                required: [
                  "field",
                  "imageA",
                  "imageB",
                  "isDifferent",
                  "forensicNote",
                ],
                additionalProperties: false,
              },
            },
            areSameDocument: { type: "boolean" },
            sameDocumentExplanation: { type: "string" },
            forensicFindings: { type: "array", items: { type: "string" } },
            legalImplications: { type: "string" },
            recommendedActions: { type: "array", items: { type: "string" } },
            methodology: { type: "string" },
            authenticityAssessment: { type: "string" },
          },
          required: [
            "manipulationLikelihood",
            "confidence",
            "executiveSummary",
            "differences",
            "metadataComparisons",
            "areSameDocument",
            "sameDocumentExplanation",
            "forensicFindings",
            "legalImplications",
            "recommendedActions",
            "methodology",
            "authenticityAssessment",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content)
    throw new Error("No se recibió respuesta del análisis comparativo");

  const parsed: ComparisonResult =
    typeof content === "string" ? JSON.parse(content) : content;

  return parsed;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMetaContext(
  label: string,
  filename: string,
  exif?: Record<string, unknown>,
  analysis?: Record<string, unknown>
): string {
  const lines: string[] = [];

  if (exif && Object.keys(exif).length > 0) {
    lines.push(`Metadatos EXIF de ${label}:`);
    if (exif.make || exif.model)
      lines.push(
        `  Dispositivo: ${exif.make ?? ""} ${exif.model ?? ""}`.trim()
      );
    if (exif.software) lines.push(`  Software: ${exif.software}`);
    if (exif.dateTimeOriginal)
      lines.push(`  Fecha original: ${exif.dateTimeOriginal}`);
    if (exif.dateTime) lines.push(`  Fecha modificación: ${exif.dateTime}`);
    if (exif.gpsLatitude && exif.gpsLongitude) {
      lines.push(`  GPS: ${exif.gpsLatitude}, ${exif.gpsLongitude}`);
    }
    if (exif.imageWidth && exif.imageHeight) {
      lines.push(`  Dimensiones: ${exif.imageWidth}x${exif.imageHeight}px`);
    }
    if (exif.xmpToolkit || exif.photoshopDocumentID) {
      lines.push(
        `  ⚠️ Software de edición detectado: ${exif.xmpToolkit ?? exif.photoshopDocumentID}`
      );
    }
  }

  if (analysis && typeof analysis === "object") {
    const a = analysis as Record<string, unknown>;
    if (a.ocrText && typeof a.ocrText === "string" && a.ocrText.length > 0) {
      const preview = a.ocrText.substring(0, 200);
      lines.push(
        `Texto OCR de ${label} (primeros 200 chars): "${preview}${a.ocrText.length > 200 ? "..." : ""}"`
      );
    }
    if (a.legalRelevance)
      lines.push(`Relevancia legal previa: ${a.legalRelevance}`);
  }

  return lines.length > 0
    ? lines.join("\n")
    : `Sin metadatos adicionales para ${filename}`;
}

// ─── Summary builder for forensic reports ────────────────────────────────────

export function buildComparisonSummary(
  filenameA: string,
  filenameB: string,
  result: ComparisonResult
): string {
  const lines: string[] = [
    `=== ANÁLISIS COMPARATIVO FORENSE ===`,
    `Imagen A: ${filenameA}`,
    `Imagen B: ${filenameB}`,
    ``,
    `--- RESUMEN EJECUTIVO ---`,
    result.executiveSummary,
    ``,
    `--- EVALUACIÓN GENERAL ---`,
    `Probabilidad de manipulación: ${result.manipulationLikelihood.toUpperCase()}`,
    `Confianza del análisis: ${result.confidence.toUpperCase()}`,
    `¿Mismo documento?: ${result.areSameDocument ? "SÍ" : "NO"}`,
    result.sameDocumentExplanation,
    ``,
    `--- AUTENTICIDAD ---`,
    result.authenticityAssessment,
  ];

  if (result.differences.length > 0) {
    lines.push(
      ``,
      `--- DIFERENCIAS DETECTADAS (${result.differences.length}) ---`
    );
    result.differences.forEach((d, i) => {
      lines.push(
        ``,
        `[${i + 1}] ${d.type.toUpperCase()} · Severidad: ${d.severity.toUpperCase()}`,
        `Ubicación: ${d.location}`,
        `Descripción: ${d.description}`,
        `Interpretación forense: ${d.forensicInterpretation}`
      );
    });
  } else {
    lines.push(
      ``,
      `--- DIFERENCIAS ---`,
      `No se detectaron diferencias significativas entre las imágenes.`
    );
  }

  if (result.forensicFindings.length > 0) {
    lines.push(``, `--- HALLAZGOS FORENSES ---`);
    result.forensicFindings.forEach(f => lines.push(`• ${f}`));
  }

  if (result.metadataComparisons.filter(m => m.isDifferent).length > 0) {
    lines.push(``, `--- DIFERENCIAS EN METADATOS ---`);
    result.metadataComparisons
      .filter(m => m.isDifferent)
      .forEach(m => {
        lines.push(
          `• ${m.field}: A="${m.imageA ?? "N/A"}" vs B="${m.imageB ?? "N/A"}"`
        );
        if (m.forensicNote) lines.push(`  Nota: ${m.forensicNote}`);
      });
  }

  lines.push(
    ``,
    `--- IMPLICACIONES LEGALES ---`,
    result.legalImplications,
    ``,
    `--- ACCIONES RECOMENDADAS ---`
  );
  result.recommendedActions.forEach(a => lines.push(`• ${a}`));

  lines.push(``, `--- METODOLOGÍA ---`, result.methodology);

  return lines.join("\n");
}

// ─── Severity color helpers (for UI) ─────────────────────────────────────────

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critica: "#ef4444",
    alta: "#f97316",
    media: "#eab308",
    baja: "#22c55e",
  };
  return map[severity] ?? "#6b7280";
}

export function getManipulationColor(likelihood: string): string {
  const map: Record<string, string> = {
    ninguna: "#22c55e",
    baja: "#84cc16",
    media: "#eab308",
    alta: "#f97316",
    critica: "#ef4444",
  };
  return map[likelihood] ?? "#6b7280";
}
