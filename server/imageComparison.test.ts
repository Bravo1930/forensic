import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildComparisonSummary,
  type ComparisonResult,
} from "./imageComparison";

// ─── Mock invokeLLM ───────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            manipulationLikelihood: "alta",
            confidence: "alta",
            executiveSummary:
              "Se detectaron diferencias significativas que indican posible manipulación digital.",
            differences: [
              {
                location: "Esquina superior derecha",
                type: "modificacion",
                severity: "alta",
                description: "El texto en el encabezado fue alterado.",
                forensicInterpretation:
                  "El cambio en el texto sugiere edición posterior a la captura original.",
              },
              {
                location: "Área central",
                type: "adicion",
                severity: "critica",
                description:
                  "Se agregó un sello que no aparece en la imagen original.",
                forensicInterpretation:
                  "La adición de un sello oficial es una falsificación grave.",
              },
            ],
            metadataComparisons: [
              {
                field: "Software",
                imageA: "Camera FV-5",
                imageB: "Adobe Photoshop 2024",
                isDifferent: true,
                forensicNote:
                  "La imagen B fue editada con software de edición profesional.",
              },
              {
                field: "Fecha de captura",
                imageA: "2024-01-15 10:30:00",
                imageB: "2024-01-15 10:30:00",
                isDifferent: false,
                forensicNote: null,
              },
            ],
            areSameDocument: true,
            sameDocumentExplanation:
              "Ambas imágenes parecen ser del mismo documento, pero la imagen B ha sido modificada.",
            forensicFindings: [
              "La imagen B presenta artefactos de compresión inconsistentes con la captura original.",
              "El histograma de color muestra manipulación selectiva en zonas específicas.",
            ],
            legalImplications:
              "Las alteraciones detectadas podrían constituir falsificación de documento público.",
            recommendedActions: [
              "Solicitar análisis pericial adicional por experto certificado.",
              "Preservar ambas imágenes en cadena de custodia.",
              "Investigar el origen de la imagen B y quién tuvo acceso a ella.",
            ],
            methodology:
              "Análisis visual comparativo, examen de metadatos EXIF, evaluación de artefactos de compresión.",
            authenticityAssessment:
              "La imagen A parece auténtica. La imagen B presenta indicadores de manipulación digital.",
          }),
        },
      },
    ],
  }),
}));

// ─── Test data ────────────────────────────────────────────────────────────────

const mockComparisonResult: ComparisonResult = {
  manipulationLikelihood: "alta",
  confidence: "alta",
  executiveSummary: "Se detectaron diferencias significativas.",
  differences: [
    {
      location: "Esquina superior derecha",
      type: "modificacion",
      severity: "alta",
      description: "El texto fue alterado.",
      forensicInterpretation: "Edición posterior a la captura.",
    },
    {
      location: "Área central",
      type: "adicion",
      severity: "critica",
      description: "Se agregó un sello.",
      forensicInterpretation: "Falsificación de sello oficial.",
    },
  ],
  metadataComparisons: [
    {
      field: "Software",
      imageA: "Camera FV-5",
      imageB: "Adobe Photoshop 2024",
      isDifferent: true,
      forensicNote: "Editada con software profesional.",
    },
  ],
  areSameDocument: true,
  sameDocumentExplanation: "Mismo documento, imagen B modificada.",
  forensicFindings: ["Artefactos de compresión inconsistentes."],
  legalImplications: "Posible falsificación de documento.",
  recommendedActions: ["Análisis pericial adicional.", "Cadena de custodia."],
  methodology: "Análisis visual y metadatos.",
  authenticityAssessment: "Imagen A auténtica. Imagen B manipulada.",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("imageComparison module", () => {
  describe("buildComparisonSummary", () => {
    it("generates a complete text summary with all sections", () => {
      const summary = buildComparisonSummary(
        "foto_original.jpg",
        "foto_editada.jpg",
        mockComparisonResult
      );

      expect(summary).toContain("foto_original.jpg");
      expect(summary).toContain("foto_editada.jpg");
      expect(summary).toContain("ALTA");
      expect(summary).toContain("Se detectaron diferencias significativas");
    });

    it("includes differences count in summary", () => {
      const summary = buildComparisonSummary(
        "a.jpg",
        "b.jpg",
        mockComparisonResult
      );
      expect(summary).toContain("2");
    });

    it("includes legal implications", () => {
      const summary = buildComparisonSummary(
        "a.jpg",
        "b.jpg",
        mockComparisonResult
      );
      expect(summary).toContain("falsificación");
    });

    it("includes recommended actions", () => {
      const summary = buildComparisonSummary(
        "a.jpg",
        "b.jpg",
        mockComparisonResult
      );
      expect(summary).toContain("Análisis pericial adicional");
    });

    it("handles empty differences gracefully", () => {
      const result: ComparisonResult = {
        ...mockComparisonResult,
        manipulationLikelihood: "ninguna",
        differences: [],
        forensicFindings: [],
        recommendedActions: [],
      };
      const summary = buildComparisonSummary("a.jpg", "b.jpg", result);
      expect(summary).toContain("NINGUNA");
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(50);
    });

    it("marks critical severity differences prominently", () => {
      const summary = buildComparisonSummary(
        "a.jpg",
        "b.jpg",
        mockComparisonResult
      );
      // The critical difference should appear in the summary
      expect(summary).toContain("sello");
    });

    it("includes metadata differences", () => {
      const summary = buildComparisonSummary(
        "a.jpg",
        "b.jpg",
        mockComparisonResult
      );
      expect(summary).toContain("Software");
    });

    it("returns string with methodology section", () => {
      const summary = buildComparisonSummary(
        "a.jpg",
        "b.jpg",
        mockComparisonResult
      );
      expect(summary).toContain("metadatos");
    });
  });

  describe("ComparisonResult structure validation", () => {
    it("validates manipulation likelihood enum values", () => {
      const validValues = ["ninguna", "baja", "media", "alta", "critica"];
      expect(validValues).toContain(
        mockComparisonResult.manipulationLikelihood
      );
    });

    it("validates confidence enum values", () => {
      const validValues = ["alta", "media", "baja"];
      expect(validValues).toContain(mockComparisonResult.confidence);
    });

    it("validates difference severity enum values", () => {
      const validSeverities = ["critica", "alta", "media", "baja"];
      mockComparisonResult.differences.forEach(diff => {
        expect(validSeverities).toContain(diff.severity);
      });
    });

    it("validates difference type enum values", () => {
      const validTypes = [
        "adicion",
        "eliminacion",
        "modificacion",
        "reemplazo",
        "ajuste_color",
        "recorte",
        "otro",
      ];
      mockComparisonResult.differences.forEach(diff => {
        expect(validTypes).toContain(diff.type);
      });
    });

    it("has required string fields", () => {
      expect(typeof mockComparisonResult.executiveSummary).toBe("string");
      expect(typeof mockComparisonResult.legalImplications).toBe("string");
      expect(typeof mockComparisonResult.methodology).toBe("string");
      expect(typeof mockComparisonResult.authenticityAssessment).toBe("string");
      expect(typeof mockComparisonResult.sameDocumentExplanation).toBe(
        "string"
      );
    });

    it("has required array fields", () => {
      expect(Array.isArray(mockComparisonResult.differences)).toBe(true);
      expect(Array.isArray(mockComparisonResult.metadataComparisons)).toBe(
        true
      );
      expect(Array.isArray(mockComparisonResult.forensicFindings)).toBe(true);
      expect(Array.isArray(mockComparisonResult.recommendedActions)).toBe(true);
    });

    it("metadata comparison has required fields", () => {
      const meta = mockComparisonResult.metadataComparisons[0];
      expect(meta).toBeDefined();
      expect(typeof meta!.field).toBe("string");
      expect(typeof meta!.isDifferent).toBe("boolean");
    });
  });

  describe("summary with different likelihood levels", () => {
    const likelihoods: Array<ComparisonResult["manipulationLikelihood"]> = [
      "ninguna",
      "baja",
      "media",
      "alta",
      "critica",
    ];

    likelihoods.forEach(likelihood => {
      it(`generates summary for likelihood: ${likelihood}`, () => {
        const result: ComparisonResult = {
          ...mockComparisonResult,
          manipulationLikelihood: likelihood,
        };
        const summary = buildComparisonSummary("img1.png", "img2.png", result);
        expect(typeof summary).toBe("string");
        expect(summary.length).toBeGreaterThan(20);
        expect(summary.toUpperCase()).toContain(likelihood.toUpperCase());
      });
    });
  });
});
