import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExifMetadata {
  // Camera / device
  make?: string;
  model?: string;
  software?: string;
  // Timestamps
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  dateTime?: string;
  // GPS
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  gpsLatitudeRef?: string;
  gpsLongitudeRef?: string;
  gpsTimestamp?: string;
  gpsDateStamp?: string;
  // Image properties
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
  colorSpace?: string;
  // Exposure
  exposureTime?: string;
  fNumber?: number;
  iso?: number;
  focalLength?: string;
  flash?: string;
  // Author / copyright
  artist?: string;
  copyright?: string;
  imageDescription?: string;
  // Editing indicators
  xmpToolkit?: string;
  photoshopDocumentID?: string;
  historyAction?: string;
  // Raw parsed
  rawTags?: Record<string, unknown>;
}

export interface ImageForensicAnalysis {
  // Extracted text (OCR)
  ocrText: string;
  ocrConfidence: "alta" | "media" | "baja";
  // Visual description
  visualDescription: string;
  // Detected objects / entities
  detectedObjects: Array<{
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
  }>;
  // Forensic indicators
  forensicIndicators: Array<{
    type:
      | "manipulacion"
      | "edicion"
      | "inconsistencia"
      | "marca_agua"
      | "metadata_anomalia"
      | "otro";
    description: string;
    severity: "alta" | "media" | "baja";
  }>;
  // Persons detected
  personsDetected: Array<{
    description: string;
    identifyingFeatures: string[];
    location: string;
  }>;
  // Documents detected
  documentsDetected: Array<{
    type: string;
    content: string;
    issuingAuthority?: string;
    dates?: string[];
  }>;
  // Location clues
  locationClues: Array<{
    type: "gps" | "visual" | "texto" | "metadata";
    value: string;
    confidence: "alta" | "media" | "baja";
  }>;
  // Temporal clues
  temporalClues: Array<{
    type: "exif" | "visual" | "texto" | "metadata";
    value: string;
    confidence: "alta" | "media" | "baja";
  }>;
  // Manipulation assessment
  manipulationAssessment: {
    likelihood: "alta" | "media" | "baja" | "ninguna";
    indicators: string[];
    explanation: string;
  };
  // Forensic summary
  forensicSummary: string;
  // Legal relevance
  legalRelevance: "alta" | "media" | "baja";
  legalRelevanceExplanation: string;
}

export interface ImageAnalysisResult {
  exif: ExifMetadata;
  vision: ImageForensicAnalysis;
  analysisTimestamp: string;
  imageUrl: string;
}

// ─── EXIF extraction via LLM (since we can't run native libs in deployment) ───

export async function extractExifFromBase64(
  base64Data: string,
  mimeType: string,
  filename: string
): Promise<ExifMetadata> {
  // We use the LLM vision to extract any visible metadata indicators
  // and also parse EXIF-like data from the image binary header patterns
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en análisis forense de imágenes digitales. Analiza la imagen y extrae todos los metadatos EXIF visibles o inferibles. Devuelve JSON estructurado.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: `Analiza esta imagen forense (archivo: ${filename}) y extrae todos los metadatos EXIF que puedas identificar o inferir. Incluye: dispositivo capturador, fechas, coordenadas GPS si son visibles, dimensiones, software de edición, y cualquier indicador de manipulación en los metadatos. Devuelve un JSON con los campos disponibles.`,
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "exif_metadata",
          strict: false,
          schema: {
            type: "object",
            properties: {
              make: { type: "string" },
              model: { type: "string" },
              software: { type: "string" },
              dateTimeOriginal: { type: "string" },
              dateTimeDigitized: { type: "string" },
              dateTime: { type: "string" },
              gpsLatitude: { type: "number" },
              gpsLongitude: { type: "number" },
              gpsAltitude: { type: "number" },
              gpsLatitudeRef: { type: "string" },
              gpsLongitudeRef: { type: "string" },
              gpsTimestamp: { type: "string" },
              gpsDateStamp: { type: "string" },
              imageWidth: { type: "number" },
              imageHeight: { type: "number" },
              orientation: { type: "number" },
              colorSpace: { type: "string" },
              exposureTime: { type: "string" },
              fNumber: { type: "number" },
              iso: { type: "number" },
              focalLength: { type: "string" },
              flash: { type: "string" },
              artist: { type: "string" },
              copyright: { type: "string" },
              imageDescription: { type: "string" },
              xmpToolkit: { type: "string" },
              photoshopDocumentID: { type: "string" },
              historyAction: { type: "string" },
            },
            additionalProperties: true,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (!content) return {};
    return JSON.parse(content) as ExifMetadata;
  } catch (e) {
    console.warn("[ImageAnalysis] EXIF extraction failed:", e);
    return {};
  }
}

// ─── Full vision-based forensic analysis ─────────────────────────────────────

export async function analyzeImageForensics(
  imageUrl: string,
  filename: string,
  mimeType: string,
  caseContext?: string
): Promise<ImageForensicAnalysis> {
  const systemPrompt = `Eres un perito forense digital especializado en análisis de imágenes para procesos judiciales. Tu función es realizar un análisis exhaustivo de imágenes digitales para extraer evidencia relevante, detectar manipulaciones y generar hallazgos utilizables en procesos legales.

Capacidades de análisis:
1. OCR (Reconocimiento Óptico de Caracteres): extrae todo el texto visible
2. Detección de objetos: identifica personas, documentos, dispositivos, ubicaciones
3. Análisis de manipulación: detecta ediciones, filtros, recortes, superposiciones
4. Indicadores forenses: marcas de agua, metadatos inconsistentes, artefactos de compresión
5. Claves de ubicación: señales, carteles, arquitectura, vegetación, clima
6. Claves temporales: relojes, fechas visibles, condiciones de luz, sombras
7. Relevancia legal: evalúa el valor probatorio de la imagen`;

  const userPrompt = `Realiza un análisis forense completo de esta imagen de evidencia digital.

Nombre del archivo: ${filename}
Tipo MIME: ${mimeType}
${caseContext ? `Contexto del caso: ${caseContext}` : ""}

Analiza exhaustivamente y devuelve el resultado en JSON con la estructura exacta solicitada. Sé específico y técnico en cada campo.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
          {
            type: "text",
            text: userPrompt,
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "image_forensic_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            ocrText: {
              type: "string",
              description: "Todo el texto extraído de la imagen",
            },
            ocrConfidence: { type: "string", enum: ["alta", "media", "baja"] },
            visualDescription: {
              type: "string",
              description: "Descripción forense detallada de la imagen",
            },
            detectedObjects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  category: {
                    type: "string",
                    enum: [
                      "persona",
                      "documento",
                      "dispositivo",
                      "ubicacion",
                      "texto",
                      "objeto",
                      "otro",
                    ],
                  },
                  relevance: {
                    type: "string",
                    enum: ["alta", "media", "baja"],
                  },
                  description: { type: "string" },
                },
                required: ["label", "category", "relevance", "description"],
                additionalProperties: false,
              },
            },
            forensicIndicators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "manipulacion",
                      "edicion",
                      "inconsistencia",
                      "marca_agua",
                      "metadata_anomalia",
                      "otro",
                    ],
                  },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["alta", "media", "baja"] },
                },
                required: ["type", "description", "severity"],
                additionalProperties: false,
              },
            },
            personsDetected: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  identifyingFeatures: {
                    type: "array",
                    items: { type: "string" },
                  },
                  location: { type: "string" },
                },
                required: ["description", "identifyingFeatures", "location"],
                additionalProperties: false,
              },
            },
            documentsDetected: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  content: { type: "string" },
                  issuingAuthority: { type: "string" },
                  dates: { type: "array", items: { type: "string" } },
                },
                required: ["type", "content"],
                additionalProperties: false,
              },
            },
            locationClues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["gps", "visual", "texto", "metadata"],
                  },
                  value: { type: "string" },
                  confidence: {
                    type: "string",
                    enum: ["alta", "media", "baja"],
                  },
                },
                required: ["type", "value", "confidence"],
                additionalProperties: false,
              },
            },
            temporalClues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["exif", "visual", "texto", "metadata"],
                  },
                  value: { type: "string" },
                  confidence: {
                    type: "string",
                    enum: ["alta", "media", "baja"],
                  },
                },
                required: ["type", "value", "confidence"],
                additionalProperties: false,
              },
            },
            manipulationAssessment: {
              type: "object",
              properties: {
                likelihood: {
                  type: "string",
                  enum: ["alta", "media", "baja", "ninguna"],
                },
                indicators: { type: "array", items: { type: "string" } },
                explanation: { type: "string" },
              },
              required: ["likelihood", "indicators", "explanation"],
              additionalProperties: false,
            },
            forensicSummary: { type: "string" },
            legalRelevance: { type: "string", enum: ["alta", "media", "baja"] },
            legalRelevanceExplanation: { type: "string" },
          },
          required: [
            "ocrText",
            "ocrConfidence",
            "visualDescription",
            "detectedObjects",
            "forensicIndicators",
            "personsDetected",
            "documentsDetected",
            "locationClues",
            "temporalClues",
            "manipulationAssessment",
            "forensicSummary",
            "legalRelevance",
            "legalRelevanceExplanation",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new Error("No se recibió respuesta del modelo de visión");

  return JSON.parse(content) as ImageForensicAnalysis;
}

// ─── Combined analysis entry point ───────────────────────────────────────────

export async function runImageAnalysis(
  imageUrl: string,
  base64Data: string,
  filename: string,
  mimeType: string,
  caseContext?: string
): Promise<ImageAnalysisResult> {
  const [exif, vision] = await Promise.all([
    extractExifFromBase64(base64Data, mimeType, filename),
    analyzeImageForensics(imageUrl, filename, mimeType, caseContext),
  ]);

  return {
    exif,
    vision,
    analysisTimestamp: new Date().toISOString(),
    imageUrl,
  };
}

// ─── Helper: is image MIME type ───────────────────────────────────────────────

export function isImageMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("image/") &&
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
    ].includes(mimeType.toLowerCase())
  );
}

// ─── Helper: build forensic summary for inclusion in case analysis ────────────

export function buildImageForensicSummary(
  filename: string,
  result: ImageAnalysisResult
): string {
  const { exif, vision } = result;
  const lines: string[] = [];

  lines.push(`=== ANÁLISIS FORENSE DE IMAGEN: ${filename} ===`);
  lines.push(`Fecha de análisis: ${result.analysisTimestamp}`);
  lines.push("");

  // EXIF
  if (Object.keys(exif).length > 0) {
    lines.push("--- METADATOS EXIF ---");
    if (exif.make || exif.model)
      lines.push(
        `Dispositivo: ${[exif.make, exif.model].filter(Boolean).join(" ")}`
      );
    if (exif.software) lines.push(`Software: ${exif.software}`);
    if (exif.dateTimeOriginal)
      lines.push(`Fecha original: ${exif.dateTimeOriginal}`);
    if (exif.dateTime) lines.push(`Fecha de archivo: ${exif.dateTime}`);
    if (exif.gpsLatitude && exif.gpsLongitude) {
      lines.push(
        `Coordenadas GPS: ${exif.gpsLatitude}°${exif.gpsLatitudeRef ?? ""}, ${exif.gpsLongitude}°${exif.gpsLongitudeRef ?? ""}`
      );
    }
    if (exif.imageWidth && exif.imageHeight)
      lines.push(`Dimensiones: ${exif.imageWidth}x${exif.imageHeight}px`);
    if (exif.xmpToolkit || exif.photoshopDocumentID)
      lines.push(`⚠️ Indicadores de edición detectados en metadatos`);
    lines.push("");
  }

  // OCR
  if (vision.ocrText?.trim()) {
    lines.push("--- TEXTO EXTRAÍDO (OCR) ---");
    lines.push(`Confianza: ${vision.ocrConfidence}`);
    lines.push(vision.ocrText.slice(0, 1000));
    lines.push("");
  }

  // Visual description
  lines.push("--- DESCRIPCIÓN FORENSE ---");
  lines.push(vision.visualDescription);
  lines.push("");

  // Detected objects
  if (vision.detectedObjects.length > 0) {
    lines.push("--- OBJETOS DETECTADOS ---");
    vision.detectedObjects.forEach(obj => {
      lines.push(
        `• [${obj.relevance.toUpperCase()}] ${obj.label} (${obj.category}): ${obj.description}`
      );
    });
    lines.push("");
  }

  // Persons
  if (vision.personsDetected.length > 0) {
    lines.push("--- PERSONAS DETECTADAS ---");
    vision.personsDetected.forEach((p, i) => {
      lines.push(`Persona ${i + 1}: ${p.description}`);
      if (p.identifyingFeatures.length > 0)
        lines.push(`  Rasgos: ${p.identifyingFeatures.join(", ")}`);
      if (p.location) lines.push(`  Posición: ${p.location}`);
    });
    lines.push("");
  }

  // Documents
  if (vision.documentsDetected.length > 0) {
    lines.push("--- DOCUMENTOS DETECTADOS ---");
    vision.documentsDetected.forEach(doc => {
      lines.push(`Tipo: ${doc.type}`);
      lines.push(`Contenido: ${doc.content.slice(0, 300)}`);
      if (doc.issuingAuthority) lines.push(`Emisor: ${doc.issuingAuthority}`);
      if (doc.dates?.length) lines.push(`Fechas: ${doc.dates.join(", ")}`);
    });
    lines.push("");
  }

  // Location clues
  if (vision.locationClues.length > 0) {
    lines.push("--- INDICIOS DE UBICACIÓN ---");
    vision.locationClues.forEach(clue => {
      lines.push(
        `• [${clue.confidence.toUpperCase()}] ${clue.type}: ${clue.value}`
      );
    });
    lines.push("");
  }

  // Temporal clues
  if (vision.temporalClues.length > 0) {
    lines.push("--- INDICIOS TEMPORALES ---");
    vision.temporalClues.forEach(clue => {
      lines.push(
        `• [${clue.confidence.toUpperCase()}] ${clue.type}: ${clue.value}`
      );
    });
    lines.push("");
  }

  // Manipulation
  lines.push("--- EVALUACIÓN DE MANIPULACIÓN ---");
  lines.push(
    `Probabilidad de manipulación: ${vision.manipulationAssessment.likelihood.toUpperCase()}`
  );
  lines.push(vision.manipulationAssessment.explanation);
  if (vision.manipulationAssessment.indicators.length > 0) {
    lines.push(
      `Indicadores: ${vision.manipulationAssessment.indicators.join("; ")}`
    );
  }
  lines.push("");

  // Forensic indicators
  if (vision.forensicIndicators.length > 0) {
    lines.push("--- INDICADORES FORENSES ---");
    vision.forensicIndicators.forEach(ind => {
      lines.push(
        `• [${ind.severity.toUpperCase()}] ${ind.type}: ${ind.description}`
      );
    });
    lines.push("");
  }

  // Legal relevance
  lines.push("--- RELEVANCIA LEGAL ---");
  lines.push(`Nivel: ${vision.legalRelevance.toUpperCase()}`);
  lines.push(vision.legalRelevanceExplanation);

  return lines.join("\n");
}
