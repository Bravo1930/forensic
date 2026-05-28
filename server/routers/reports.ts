import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createReport,
  getAnalysisById,
  getCaseById,
  getEvidenceByCase,
  getReportsByCase,
  updateReport,
} from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildPdfHtml(
  caseData: {
    title: string;
    caseNumber?: string | null;
    clientName?: string | null;
    court?: string | null;
    caseType: string;
  },
  analysis: {
    title: string;
    executiveSummary?: string | null;
    expertOpinion?: string | null;
    prosecutionTheory?: string | null;
    defenseTheory?: string | null;
    inconsistencies?: string | null;
    suspiciousPatterns?: string | null;
    keyFindings?: unknown;
    timelineEvents?: unknown;
    createdAt: Date;
  },
  evidenceList: Array<{
    originalName: string;
    evidenceType: string;
    sizeBytes: number;
    createdAt: Date;
  }>,
  userName: string
): string {
  const keyFindings =
    (analysis.keyFindings as Array<{
      title: string;
      description: string;
      severity: string;
    }>) ?? [];
  const timelineEvents =
    (analysis.timelineEvents as Array<{
      date: string;
      title: string;
      description: string;
      significance: string;
    }>) ?? [];

  const findingsHtml = keyFindings
    .map(
      f => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${escapeHtml(f.title)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(f.description)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;color:${f.severity === "alta" ? "#c0392b" : f.severity === "media" ? "#e67e22" : "#27ae60"};font-weight:bold;">${escapeHtml(f.severity.toUpperCase())}</td>
    </tr>`
    )
    .join("");

  const timelineHtml = timelineEvents
    .slice(0, 20)
    .map(
      e => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;white-space:nowrap;">${formatDate(e.date)}</td>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${escapeHtml(e.title)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(e.description)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${escapeHtml(e.significance.toUpperCase())}</td>
    </tr>`
    )
    .join("");

  const evidenceHtml = evidenceList
    .map(
      e => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(e.originalName)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${escapeHtml(e.evidenceType)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${(e.sizeBytes / 1024).toFixed(1)} KB</td>
      <td style="padding:8px;border:1px solid #ddd;">${formatDate(e.createdAt)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Dictamen Pericial - ${escapeHtml(caseData.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #1a1a1a; background: white; }
  .page { max-width: 800px; margin: 0 auto; padding: 60px 80px; }
  .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo-area h1 { font-size: 18pt; font-weight: bold; color: #1a1a1a; letter-spacing: 2px; }
  .logo-area p { font-size: 9pt; color: #555; margin-top: 4px; }
  .doc-info { text-align: right; font-size: 9pt; color: #555; }
  .doc-info strong { color: #1a1a1a; }
  .red-bar { height: 4px; background: #c0392b; margin: 15px 0; }
  .doc-title { text-align: center; margin: 30px 0; }
  .doc-title h2 { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; }
  .doc-title h3 { font-size: 13pt; color: #555; margin-top: 8px; }
  .case-box { border: 2px solid #1a1a1a; padding: 20px; margin: 30px 0; }
  .case-box h4 { font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 10px; }
  .case-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .case-field { font-size: 11pt; }
  .case-field strong { display: block; font-size: 9pt; color: #555; text-transform: uppercase; }
  .section { margin: 30px 0; }
  .section-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #c0392b; padding-bottom: 6px; margin-bottom: 15px; color: #1a1a1a; }
  .section-content { font-size: 11pt; line-height: 1.8; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
  th { background: #1a1a1a; color: white; padding: 10px 8px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; }
  .footer { margin-top: 60px; border-top: 2px solid #1a1a1a; padding-top: 20px; }
  .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .signature-box { text-align: center; }
  .signature-line { border-top: 1px solid #1a1a1a; padding-top: 8px; margin-top: 50px; font-size: 10pt; }
  .watermark { color: #e8e8e8; font-size: 9pt; text-align: center; margin-top: 20px; }
  .page-break { page-break-before: always; }
  @media print { .page { padding: 40px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-top">
      <div class="logo-area">
        <h1>FORENSIC LEGAL ANALYZER</h1>
        <p>Plataforma de Análisis Forense Digital</p>
      </div>
      <div class="doc-info">
        <div><strong>Fecha:</strong> ${formatDate(new Date())}</div>
        <div><strong>Expediente:</strong> ${escapeHtml(caseData.caseNumber ?? "Sin número")}</div>
        <div><strong>Perito:</strong> ${escapeHtml(userName)}</div>
        <div><strong>Ref. Análisis:</strong> #${escapeHtml(analysis.title.slice(0, 20))}</div>
      </div>
    </div>
    <div class="red-bar"></div>
  </div>

  <div class="doc-title">
    <h2>Dictamen Pericial en Informática Forense</h2>
    <h3>${escapeHtml(analysis.title)}</h3>
  </div>

  <div class="case-box">
    <h4>Datos del Caso</h4>
    <div class="case-grid">
      <div class="case-field"><strong>Caso</strong>${escapeHtml(caseData.title)}</div>
      <div class="case-field"><strong>Tipo</strong>${escapeHtml(caseData.caseType.toUpperCase())}</div>
      <div class="case-field"><strong>Cliente</strong>${escapeHtml(caseData.clientName ?? "N/A")}</div>
      <div class="case-field"><strong>Tribunal</strong>${escapeHtml(caseData.court ?? "N/A")}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">I. Resumen Ejecutivo</div>
    <div class="section-content">${escapeHtml(analysis.executiveSummary ?? "").replace(/\n/g, "<br>")}</div>
  </div>

  <div class="section">
    <div class="section-title">II. Dictamen Pericial</div>
    <div class="section-content">${escapeHtml(analysis.expertOpinion ?? "").replace(/\n/g, "<br>")}</div>
  </div>

  ${
    keyFindings.length > 0
      ? `
  <div class="section">
    <div class="section-title">III. Hallazgos Clave</div>
    <table>
      <thead><tr><th>Hallazgo</th><th>Descripción</th><th>Severidad</th></tr></thead>
      <tbody>${findingsHtml}</tbody>
    </table>
  </div>`
      : ""
  }

  <div class="page-break"></div>

  <div class="section">
    <div class="section-title">IV. Teoría del Caso — Acusación</div>
    <div class="section-content">${escapeHtml(analysis.prosecutionTheory ?? "").replace(/\n/g, "<br>")}</div>
  </div>

  <div class="section">
    <div class="section-title">V. Teoría del Caso — Defensa</div>
    <div class="section-content">${escapeHtml(analysis.defenseTheory ?? "").replace(/\n/g, "<br>")}</div>
  </div>

  <div class="section">
    <div class="section-title">VI. Inconsistencias Detectadas</div>
    <div class="section-content">${escapeHtml(analysis.inconsistencies ?? "").replace(/\n/g, "<br>")}</div>
  </div>

  <div class="section">
    <div class="section-title">VII. Patrones Sospechosos</div>
    <div class="section-content">${escapeHtml(analysis.suspiciousPatterns ?? "").replace(/\n/g, "<br>")}</div>
  </div>

  ${
    timelineEvents.length > 0
      ? `
  <div class="section">
    <div class="section-title">VIII. Línea de Tiempo de Eventos</div>
    <table>
      <thead><tr><th>Fecha</th><th>Evento</th><th>Descripción</th><th>Relevancia</th></tr></thead>
      <tbody>${timelineHtml}</tbody>
    </table>
  </div>`
      : ""
  }

  <div class="section">
    <div class="section-title">IX. Inventario de Evidencia Analizada</div>
    <table>
      <thead><tr><th>Archivo</th><th>Tipo</th><th>Tamaño</th><th>Fecha Carga</th></tr></thead>
      <tbody>${evidenceHtml}</tbody>
    </table>
  </div>

  <div class="footer">
    <p style="font-size:10pt;text-align:justify;color:#555;">
      El presente dictamen ha sido elaborado mediante análisis automatizado asistido por inteligencia artificial sobre la evidencia digital aportada. Los hallazgos y conclusiones reflejan el análisis técnico de los archivos digitales proporcionados. Este documento tiene carácter pericial y puede ser presentado como prueba en procedimientos judiciales, sujeto a ratificación por perito certificado.
    </p>
    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line">
          <strong>${escapeHtml(userName)}</strong><br>
          Perito Solicitante<br>
          Fecha: ${formatDate(new Date())}
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <strong>Forensic Legal Analyzer</strong><br>
          Sistema de Análisis Forense Digital<br>
          Ref: FLA-${Date.now().toString(36).toUpperCase()}
        </div>
      </div>
    </div>
    <div class="watermark">Documento generado por Forensic Legal Analyzer — Confidencial — ${new Date().toISOString()}</div>
  </div>
</div>
</body>
</html>`;
}

function buildContradictionPdfHtml(
  caseData: {
    title: string;
    caseNumber?: string | null;
    clientName?: string | null;
    court?: string | null;
    caseType: string;
  },
  analysis: {
    title: string;
    contradictionSummary?: string | null;
    factsTable?: string | null;
    weakPoints?: string | null;
    keyFindings?: unknown;
    timelineEvents?: string | null;
    createdAt: Date;
  },
  evidenceList: Array<{
    originalName: string;
    evidenceType: string;
    sizeBytes: number;
    createdAt: Date;
  }>,
  userName: string
): string {
  const keyFindings =
    (analysis.keyFindings as Array<{
      title: string;
      description: string;
      severity: string;
      documentRefs: string[];
    }>) ?? [];

  const criticalFindings = keyFindings.filter(f => f.severity === "alta");
  const mediumFindings = keyFindings.filter(f => f.severity === "media");

  const findingsHtml = keyFindings
    .map(
      f => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${escapeHtml(f.title)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(f.description)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;color:${f.severity === "alta" ? "#c0392b" : f.severity === "media" ? "#e67e22" : "#27ae60"};font-weight:bold;">${escapeHtml(f.severity.toUpperCase())}</td>
    </tr>`
    )
    .join("");

  const docRefsHtml =
    keyFindings
      .flatMap(f => f.documentRefs.map(ref => `<li>${escapeHtml(ref)}</li>`))
      .join("") || "<li>Sin referencias específicas</li>";

  const factsRows = analysis.factsTable
    ? analysis.factsTable
        .split("\n")
        .map(
          row =>
            `<tr><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(row).replace(/\|/g, '</td><td style="padding:6px;border:1px solid #ddd;">')}</td></tr>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Análisis de Contradicciones - ${escapeHtml(caseData.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #1a1a1a; background: white; }
  .page { max-width: 800px; margin: 0 auto; padding: 60px 80px; }
  .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo-area h1 { font-size: 18pt; font-weight: bold; color: #1a1a1a; letter-spacing: 2px; }
  .logo-area p { font-size: 9pt; color: #555; margin-top: 4px; }
  .doc-info { text-align: right; font-size: 9pt; color: #555; }
  .doc-info strong { color: #1a1a1a; }
  .red-bar { height: 4px; background: #c0392b; margin: 15px 0; }
  .doc-title { text-align: center; margin: 30px 0; }
  .doc-title h2 { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; }
  .doc-title h3 { font-size: 13pt; color: #555; margin-top: 8px; }
  .case-box { border: 2px solid #1a1a1a; padding: 20px; margin: 30px 0; }
  .case-box h4 { font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 10px; }
  .case-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .case-field { font-size: 11pt; }
  .case-field strong { display: block; font-size: 9pt; color: #555; text-transform: uppercase; }
  .section { margin: 30px 0; }
  .section-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #c0392b; padding-bottom: 6px; margin-bottom: 15px; color: #1a1a1a; }
  .section-content { font-size: 11pt; line-height: 1.8; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
  th { background: #1a1a1a; color: white; padding: 10px 8px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; }
  .critical-box { border: 2px solid #c0392b; background: #fef2f2; padding: 15px; margin: 20px 0; }
  .critical-box h4 { color: #c0392b; font-size: 11pt; text-transform: uppercase; }
  .page-break { page-break-before: always; }
  .footer { margin-top: 60px; border-top: 2px solid #1a1a1a; padding-top: 20px; }
  .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .signature-box { text-align: center; }
  .signature-line { border-top: 1px solid #1a1a1a; padding-top: 8px; margin-top: 50px; font-size: 10pt; }
  .watermark { color: #e8e8e8; font-size: 9pt; text-align: center; margin-top: 20px; }
  @media print { .page { padding: 40px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-top">
      <div class="logo-area">
        <h1>FORENSIC LEGAL ANALYZER</h1>
        <p>Plataforma de Análisis Forense Digital</p>
      </div>
      <div class="doc-info">
        <div><strong>Fecha:</strong> ${formatDate(new Date())}</div>
        <div><strong>Expediente:</strong> ${escapeHtml(caseData.caseNumber ?? "Sin número")}</div>
        <div><strong>Perito:</strong> ${escapeHtml(userName)}</div>
        <div><strong>Ref. Análisis:</strong> #${escapeHtml(analysis.title.slice(0, 20))}</div>
      </div>
    </div>
    <div class="red-bar"></div>
  </div>

  <div class="doc-title">
    <h2>Análisis de Contradicciones en Declaraciones</h2>
    <h3>${escapeHtml(analysis.title)}</h3>
  </div>

  <div class="case-box">
    <h4>Datos del Caso</h4>
    <div class="case-grid">
      <div class="case-field"><strong>Caso</strong>${escapeHtml(caseData.title)}</div>
      <div class="case-field"><strong>Tipo</strong>${escapeHtml(caseData.caseType.toUpperCase())}</div>
      <div class="case-field"><strong>Cliente</strong>${escapeHtml(caseData.clientName ?? "N/A")}</div>
      <div class="case-field"><strong>Tribunal</strong>${escapeHtml(caseData.court ?? "N/A")}</div>
    </div>
  </div>

  ${
    criticalFindings.length > 0
      ? `
  <div class="critical-box">
    <h4>⚠️ Contradicciones Críticas Detectadas (${criticalFindings.length})</h4>
    <ul style="margin-top:10px;padding-left:20px;">
      ${criticalFindings.map(f => `<li style="margin:5px 0;"><strong>${escapeHtml(f.title)}:</strong> ${escapeHtml(f.description)}</li>`).join("")}
    </ul>
  </div>`
      : ""
  }

  <div class="section">
    <div class="section-title">I. Resumen Ejecutivo de Contradicciones</div>
    <div class="section-content">${escapeHtml(analysis.contradictionSummary ?? "").replace(/\n/g, "<br>")}</div>
  </div>

  <div class="section">
    <div class="section-title">II. Tabla de Hechos Relevantes</div>
    <table>
      <thead><tr><th>Hecho</th><th>Parte que lo Alega</th><th>Evidencia</th><th>Consistencia</th></tr></thead>
      <tbody>${factsRows || "<tr><td colspan='4' style='padding:10px;text-align:center;'>No disponible</td></tr>"}</tbody>
    </table>
  </div>

  ${
    keyFindings.length > 0
      ? `
  <div class="section">
    <div class="section-title">III. Hallazgos de Contradicciones</div>
    <table>
      <thead><tr><th>Hallazgo</th><th>Descripción</th><th>Severidad</th></tr></thead>
      <tbody>${findingsHtml}</tbody>
    </table>
  </div>`
      : ""
  }

  <div class="page-break"></div>

  ${
    analysis.timelineEvents
      ? `
  <div class="section">
    <div class="section-title">IV. Línea de Tiempo de Eventos</div>
    <div class="section-content">${escapeHtml(analysis.timelineEvents).replace(/\n/g, "<br>")}</div>
  </div>`
      : ""
  }

  ${
    analysis.weakPoints
      ? `
  <div class="section">
    <div class="section-title">V. Puntos Débiles Identificados</div>
    <div class="section-content">${escapeHtml(analysis.weakPoints).replace(/\n/g, "<br>")}</div>
  </div>`
      : ""
  }

  <div class="section">
    <div class="section-title">VI. Referencias Documentales</div>
    <ul style="font-size:10pt;margin-left:20px;">
      ${docRefsHtml}
    </ul>
  </div>

  <div class="section">
    <div class="section-title">VII. Documentos Analizados</div>
    <table>
      <thead><tr><th>Archivo</th><th>Tipo</th><th>Tamaño</th><th>Fecha</th></tr></thead>
      <tbody>
        ${evidenceList
          .map(
            e => `
        <tr>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(e.originalName)}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:center;">${escapeHtml(e.evidenceType)}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:right;">${(e.sizeBytes / 1024).toFixed(1)} KB</td>
          <td style="padding:6px;border:1px solid #ddd;">${formatDate(e.createdAt)}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p style="font-size:10pt;text-align:justify;color:#555;">
      El presente análisis de contradicciones ha sido elaborado mediante análisis automatizado asistido por inteligencia artificial sobre la documentación legal proporcionada. Los hallazgos reflejan el análisis técnico de los documentos aportados al expediente. Este documento tiene carácter pericial y puede ser presentado como prueba en procedimientos judiciales, sujeto a ratificación por perito certificado.
    </p>
    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line">
          <strong>${escapeHtml(userName)}</strong><br>
          Perito Analista<br>
          Fecha: ${formatDate(new Date())}
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <strong>Forensic Legal Analyzer</strong><br>
          Sistema de Análisis Forense Digital<br>
          Ref: FLA-CN-${Date.now().toString(36).toUpperCase()}
        </div>
      </div>
    </div>
    <div class="watermark">Documento generado por Forensic Legal Analyzer — Confidencial — ${new Date().toISOString()}</div>
  </div>
</div>
</body>
</html>`;
}

export const reportsRouter = router({
  listByCase: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getReportsByCase(input.caseId, ctx.user.id);
    }),

  generate: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        analysisId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });

      const analysis = await getAnalysisById(input.analysisId, ctx.user.id);
      if (!analysis)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Análisis no encontrado",
        });
      if (analysis.status !== "completado") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El análisis aún no está completado",
        });
      }

      const evidenceList = await getEvidenceByCase(input.caseId, ctx.user.id);

      const isContradictionAnalysis = analysis.type === "contradicciones";
      const title = isContradictionAnalysis
        ? `Análisis de Contradicciones - ${escapeHtml(caseData?.title ?? "Caso")} - ${new Date().toLocaleDateString("es-MX")}`
        : `Dictamen Pericial - ${escapeHtml(caseData?.title ?? "Caso")} - ${new Date().toLocaleDateString("es-MX")}`;
      const reportRecord = await createReport({
        caseId: input.caseId,
        analysisId: input.analysisId,
        userId: ctx.user.id,
        title,
      });

      // Generate HTML content based on analysis type
      const htmlContent = isContradictionAnalysis
        ? buildContradictionPdfHtml(
            caseData,
            analysis as any,
            evidenceList as any,
            ctx.user.name ?? ctx.user.email ?? "Perito"
          )
        : buildPdfHtml(
            caseData,
            analysis as any,
            evidenceList as any,
            ctx.user.name ?? ctx.user.email ?? "Perito"
          );

      // Store HTML as the report (clients render it as PDF)
      const s3Key = `reports/${ctx.user.id}/${input.caseId}/report-${randomSuffix()}.html`;
      const { url } = await storagePut(
        s3Key,
        Buffer.from(htmlContent, "utf-8"),
        "text/html"
      );

      const reportId =
        typeof reportRecord === "number" ? reportRecord : reportRecord;
      await updateReport(reportId, ctx.user.id, {
        s3Key,
        s3Url: url ?? "",
        status: "listo",
      });

      return { id: reportId, url: url ?? "", title: title ?? "Reporte" };
    }),
});
