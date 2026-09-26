export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

/**
 * Shown wherever AI-generated analysis is presented, including generated
 * reports. The local vision model can produce false findings (benchmarked):
 * its output is a first pass, never a conclusion on its own.
 */
export const AI_REVIEW_DISCLAIMER =
  "Análisis asistido por IA — requiere revisión de un perito humano";
export const AI_REVIEW_DISCLAIMER_DETAIL =
  "Los hallazgos generados por inteligencia artificial pueden contener errores u omisiones y no constituyen por sí mismos una conclusión pericial. Deben ser verificados por un perito antes de utilizarse en un procedimiento.";
