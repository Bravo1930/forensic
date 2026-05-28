import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isImageMimeType,
  buildImageForensicSummary,
  type ImageAnalysisResult,
} from "./imageAnalysis";

// ─── Mock LLM to avoid real API calls ────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            ocrText: "CONTRATO DE COMPRAVENTA\nFecha: 15 de enero de 2024",
            ocrConfidence: "alta",
            visualDescription:
              "Documento oficial con texto impreso en español.",
            detectedObjects: [
              {
                label: "Documento legal",
                category: "documento",
                relevance: "alta",
                description: "Contrato de compraventa con firmas",
              },
            ],
            forensicIndicators: [],
            personsDetected: [],
            documentsDetected: [
              {
                type: "Contrato de compraventa",
                content: "CONTRATO DE COMPRAVENTA\nFecha: 15 de enero de 2024",
                issuingAuthority: "Notaría Pública",
                dates: ["15 de enero de 2024"],
              },
            ],
            locationClues: [],
            temporalClues: [
              {
                type: "texto",
                value: "15 de enero de 2024",
                confidence: "alta",
              },
            ],
            manipulationAssessment: {
              likelihood: "ninguna",
              indicators: [],
              explanation:
                "No se detectaron indicadores de manipulación digital.",
            },
            forensicSummary: "Documento legal auténtico con fecha verificable.",
            legalRelevance: "alta",
            legalRelevanceExplanation: "Contrato con valor probatorio directo.",
          }),
        },
      },
    ],
  }),
}));

// ─── isImageMimeType ──────────────────────────────────────────────────────────

describe("isImageMimeType", () => {
  it("returns true for JPEG images", () => {
    expect(isImageMimeType("image/jpeg")).toBe(true);
    expect(isImageMimeType("image/jpg")).toBe(true);
  });

  it("returns true for PNG images", () => {
    expect(isImageMimeType("image/png")).toBe(true);
  });

  it("returns true for WebP images", () => {
    expect(isImageMimeType("image/webp")).toBe(true);
  });

  it("returns true for GIF images", () => {
    expect(isImageMimeType("image/gif")).toBe(true);
  });

  it("returns true for BMP images", () => {
    expect(isImageMimeType("image/bmp")).toBe(true);
  });

  it("returns true for TIFF images", () => {
    expect(isImageMimeType("image/tiff")).toBe(true);
  });

  it("returns false for PDF files", () => {
    expect(isImageMimeType("application/pdf")).toBe(false);
  });

  it("returns false for ZIP files", () => {
    expect(isImageMimeType("application/zip")).toBe(false);
  });

  it("returns false for text files", () => {
    expect(isImageMimeType("text/plain")).toBe(false);
  });

  it("returns false for video files", () => {
    expect(isImageMimeType("video/mp4")).toBe(false);
  });

  it("returns false for unsupported image types like SVG", () => {
    expect(isImageMimeType("image/svg+xml")).toBe(false);
  });
});

// ─── buildImageForensicSummary ────────────────────────────────────────────────

describe("buildImageForensicSummary", () => {
  const mockResult: ImageAnalysisResult = {
    exif: {
      make: "Apple",
      model: "iPhone 14",
      software: "16.0",
      dateTimeOriginal: "2024-01-15T10:30:00",
      gpsLatitude: 19.4326,
      gpsLongitude: -99.1332,
      gpsLatitudeRef: "N",
      gpsLongitudeRef: "W",
      imageWidth: 4032,
      imageHeight: 3024,
    },
    vision: {
      ocrText: "CONTRATO DE COMPRAVENTA\nFecha: 15 de enero de 2024",
      ocrConfidence: "alta",
      visualDescription: "Documento oficial con texto impreso en español.",
      detectedObjects: [
        {
          label: "Documento legal",
          category: "documento",
          relevance: "alta",
          description: "Contrato de compraventa con firmas",
        },
      ],
      forensicIndicators: [
        {
          type: "edicion",
          description: "Posible edición de texto detectada",
          severity: "media",
        },
      ],
      personsDetected: [
        {
          description: "Persona adulta masculina",
          identifyingFeatures: ["cabello oscuro", "traje formal"],
          location: "centro de la imagen",
        },
      ],
      documentsDetected: [
        {
          type: "Contrato",
          content: "CONTRATO DE COMPRAVENTA",
          issuingAuthority: "Notaría Pública",
          dates: ["15 de enero de 2024"],
        },
      ],
      locationClues: [
        {
          type: "gps",
          value: "Ciudad de México, México",
          confidence: "alta",
        },
      ],
      temporalClues: [
        {
          type: "texto",
          value: "15 de enero de 2024",
          confidence: "alta",
        },
      ],
      manipulationAssessment: {
        likelihood: "media",
        indicators: ["Artefactos de compresión irregulares"],
        explanation: "Se detectaron indicadores menores de posible edición.",
      },
      forensicSummary:
        "Imagen con documento legal. Posibles indicadores de edición.",
      legalRelevance: "alta",
      legalRelevanceExplanation: "Contrato con valor probatorio directo.",
    },
    analysisTimestamp: "2024-01-15T12:00:00.000Z",
    imageUrl: "https://example.com/evidence/doc.jpg",
  };

  it("includes the filename in the summary", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("contrato.jpg");
  });

  it("includes EXIF device information", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("Apple");
    expect(summary).toContain("iPhone 14");
  });

  it("includes GPS coordinates when available", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("19.4326");
    expect(summary).toContain("-99.1332");
  });

  it("includes OCR text when available", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("CONTRATO DE COMPRAVENTA");
  });

  it("includes manipulation assessment", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("MEDIA");
    expect(summary).toContain("manipulaci\u00f3n");
  });

  it("includes forensic indicators", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("edicion");
  });

  it("includes legal relevance", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("ALTA");
    expect(summary).toContain("RELEVANCIA LEGAL");
  });

  it("includes detected persons", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("Persona 1");
  });

  it("includes detected documents", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("Notaría Pública");
  });

  it("includes location clues", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("Ciudad de México");
  });

  it("includes temporal clues", () => {
    const summary = buildImageForensicSummary("contrato.jpg", mockResult);
    expect(summary).toContain("15 de enero de 2024");
  });

  it("returns a non-empty string", () => {
    const summary = buildImageForensicSummary("test.png", mockResult);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(100);
  });

  it("handles empty EXIF gracefully", () => {
    const resultNoExif: ImageAnalysisResult = { ...mockResult, exif: {} };
    const summary = buildImageForensicSummary("test.png", resultNoExif);
    expect(summary).toContain("test.png");
    expect(summary).not.toContain("EXIF");
  });

  it("handles empty OCR text gracefully", () => {
    const resultNoOcr: ImageAnalysisResult = {
      ...mockResult,
      vision: { ...mockResult.vision, ocrText: "" },
    };
    const summary = buildImageForensicSummary("test.png", resultNoOcr);
    expect(summary).not.toContain("OCR");
  });

  it("warns about editing software in EXIF", () => {
    const resultWithEditing: ImageAnalysisResult = {
      ...mockResult,
      exif: {
        ...mockResult.exif,
        xmpToolkit: "Adobe XMP Core 5.6",
        photoshopDocumentID: "xmp.did:abc123",
      },
    };
    const summary = buildImageForensicSummary("edited.jpg", resultWithEditing);
    expect(summary).toContain("edici\u00f3n");
  });
});

// ─── analyzeImageForensics (integration with mocked LLM) ─────────────────────

describe("analyzeImageForensics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls LLM with image_url content type", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const { analyzeImageForensics } = await import("./imageAnalysis");

    await analyzeImageForensics(
      "https://example.com/image.jpg",
      "evidence.jpg",
      "image/jpeg"
    );

    expect(invokeLLM).toHaveBeenCalledTimes(1);
    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );
    expect(Array.isArray(userMessage.content)).toBe(true);
    const imageContent = userMessage.content.find(
      (c: { type: string }) => c.type === "image_url"
    );
    expect(imageContent).toBeDefined();
    expect(imageContent.image_url.url).toBe("https://example.com/image.jpg");
  });

  it("returns structured forensic analysis", async () => {
    const { analyzeImageForensics } = await import("./imageAnalysis");

    const result = await analyzeImageForensics(
      "https://example.com/image.jpg",
      "evidence.jpg",
      "image/jpeg"
    );

    expect(result).toHaveProperty("ocrText");
    expect(result).toHaveProperty("ocrConfidence");
    expect(result).toHaveProperty("visualDescription");
    expect(result).toHaveProperty("detectedObjects");
    expect(result).toHaveProperty("forensicIndicators");
    expect(result).toHaveProperty("manipulationAssessment");
    expect(result).toHaveProperty("legalRelevance");
  });

  it("includes case context in the prompt when provided", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const { analyzeImageForensics } = await import("./imageAnalysis");

    await analyzeImageForensics(
      "https://example.com/image.jpg",
      "evidence.jpg",
      "image/jpeg",
      "Caso de fraude inmobiliario"
    );

    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );
    const textContent = userMessage.content.find(
      (c: { type: string }) => c.type === "text"
    );
    expect(textContent.text).toContain("Caso de fraude inmobiliario");
  });
});
