# Forensic Legal Analyzer - TODO

## Fase 1: Base de datos y diseño global

- [x] Esquema DB: tablas cases, evidence, analyses, subscriptions, reports, users
- [x] Migraciones SQL aplicadas (TiDB compatible)
- [x] Tema dark mode negro+rojo en index.css (OKLCH)
- [x] Fuentes profesionales (Inter + JetBrains Mono) en index.html

## Fase 2: Backend (tRPC routers)

- [x] Router: cases (CRUD + archivar)
- [x] Router: evidence (upload S3, metadatos, listar)
- [x] Router: analyses (crear análisis IA, obtener resultados, listAll)
- [x] Router: subscriptions (planes, límites, verificar cuota, adminStats)
- [x] Router: reports (generar HTML/PDF, listar)
- [x] Helpers DB en server/db.ts (todas las entidades)
- [x] Módulo forensicAI.ts con LLM integrado

## Fase 3: Landing page y layout

- [x] Landing page profesional con hero, features, pricing, seguridad
- [x] DashboardLayout con sidebar negro+rojo y resize
- [x] Rutas en App.tsx (todas las páginas)
- [x] Página de login/auth (DashboardLayout maneja auth)

## Fase 4: Gestión de casos y evidencia

- [x] Página: lista de casos con filtros y búsqueda
- [x] Página: detalle de caso con tabs (evidencia, análisis, reportes)
- [x] Componente: drag-and-drop para carga de archivos (EvidenceUploader)
- [x] Upload a S3 con progress bar
- [x] Extracción automática de metadatos
- [x] Panel de evidencia clave en Dashboard

## Fase 5: Análisis con IA

- [x] Módulo LLM: dictamen pericial
- [x] Módulo LLM: línea de tiempo de eventos
- [x] Módulo LLM: teoría del caso (acusación/defensa)
- [x] Módulo LLM: resumen ejecutivo
- [x] Módulo LLM: detección de inconsistencias y patrones sospechosos
- [x] Página AnalysisDetail con resultados estructurados en tabs
- [x] Alertas automáticas al propietario en hallazgos críticos

## Fase 6: Visualizaciones

- [x] Timeline interactivo con filtros y navegación (TimelineView)
- [x] Mapa de relaciones SVG (RelationshipGraph)
- [x] Dashboard con métricas y hallazgos principales

## Fase 7: Exportación PDF

- [x] Generador de reportes HTML con formato legal profesional
- [x] Plantilla con encabezado, numeración, firma pericial, cadena de custodia
- [x] Descarga desde el frontend (URL S3)
- [x] Página de reportes con lista de todos los reportes

## Fase 8: Sistema SaaS

- [x] Tabla subscriptions con planes (free/premium/enterprise)
- [x] Límites de análisis mensuales por plan
- [x] Página de pricing/upgrade (Subscription.tsx)
- [x] Panel de administración con estadísticas del sistema (Admin.tsx)
- [x] Roles: user / admin

## Fase 9: Pruebas y calidad

- [x] Tests Vitest para routers principales (12 tests pasando)
- [x] TypeScript sin errores (pnpm check limpio)
- [x] Ajustes de UI/UX y responsive
- [x] Checkpoint final

## Fase 10: Análisis de imágenes con visión por computadora

- [x] Módulo imageAnalysis.ts: análisis LLM visión (descripción forense, texto OCR, objetos detectados)
- [x] Extracción de metadatos EXIF de imágenes (fecha, GPS, cámara, software)
- [x] Detección de manipulación/edición de imágenes (análisis forense visual)
- [x] Router tRPC: evidence.analyzeImage (análisis bajo demanda de imágenes)
- [x] Integración en forensicAI.ts: incluir análisis de imágenes en el análisis de caso
- [x] Componente ImageAnalysisPanel: previsualización + resultados de análisis visual
- [x] Indicador visual en EvidenceUploader para imágenes con análisis disponible
- [x] Tests Vitest para el módulo de análisis de imágenes

## Fase 11: Comparación forense lado a lado de imágenes

- [x] Backend: procedimiento tRPC comparison.compare con análisis diferencial IA
- [x] Módulo imageComparison.ts: análisis LLM de diferencias entre dos imágenes
- [x] Tabla image_comparisons en base de datos para persistir resultados
- [x] Página ImageComparison.tsx: panel lado a lado con zoom sincronizado e independiente
- [x] Selector de imágenes del caso para elegir las dos a comparar
- [x] Panel de resultados: Resumen, Diferencias, Hallazgos, Metadatos, Legal (5 tabs)
- [x] Rutas /casos/:caseId/compare y /casos/:caseId/compare/:comparisonId integradas
- [x] Tests Vitest para el módulo de comparación de imágenes (20 tests, 61 total)

## Fase 12: Integración de pagos con Stripe

- [x] Configurar Stripe con webdev_add_feature
- [x] Credenciales Stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLISHABLE_KEY) — inyectadas automáticamente
- [x] Productos y precios en Stripe (Premium mensual/anual, Empresarial mensual/anual) — creación dinámica en sandbox
- [x] Tabla stripe_customers y columnas stripeCustomerId, stripeSubscriptionId en subscriptions
- [x] Router tRPC: stripe.createCheckoutSession
- [x] Router tRPC: stripe.createPortalSession
- [x] Router tRPC: stripe.getStatus + stripe.getPlans
- [x] Webhook handler Express: /api/stripe/webhook (checkout.session.completed, subscription.updated/deleted, invoice.paid)
- [x] Activación automática de plan al completar pago
- [x] Cancelación/downgrade automático al cancelar suscripción
- [x] Página de suscripción actualizada con botones de pago reales
- [x] Página de éxito /pago/exito con estado de suscripción actualizado
- [x] Página de cancelación /pago/cancelado
- [x] Indicador de plan activo en el sidebar del dashboard
- [x] 24 tests Vitest para Stripe (85 total, todos pasando)
