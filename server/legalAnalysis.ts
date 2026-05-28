import { invokeLLM, extractMessageContent } from "./_core/llm";

export interface LegalEntity {
  type:
    | "ley"
    | "articulo"
    | "fraccion"
    | "inciso"
    | "contrato"
    | "clausula"
    | "jurisprudencia"
    | "sentencia"
    | "expediente"
    | "tribunal"
    | "juez"
    | "parte"
    | "plazo";
  value: string;
  reference?: string;
  context: string;
  startIndex: number;
  endIndex: number;
}

export interface ExtractedLegalReference {
  type:
    | "ley_federal"
    | "ley_estatal"
    | "reglamento"
    | "codigo"
    | "tratado"
    | "constitucion";
  nombre: string;
  numero?: string;
  fecha?: string;
  contexto: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category:
    | "demanda"
    | "contestacion"
    | "audiencia"
    | "sentencia"
    | "recurso"
    | "notificacion"
    | "vencimiento"
    | "otro";
  actors: string[];
  legalBasis?: string;
  deadline?: string;
  urgency?: "critica" | "alta" | "media" | "baja";
}

export interface LegalArgument {
  id: string;
  type: "hecho" | "derecho" | "prueba" | "excepcion" | "defensa" | "peticion";
  title: string;
  description: string;
  strength: "fuerte" | "media" | "debil";
  supportingEvidence?: string[];
  legalBasis?: string;
}

export interface PrecedentMatch {
  tipo: "jurisprudencia" | "tesis" | "sentencia" | " criterios";
  tribunal: string;
  materia: string;
  fecha: string;
  referencia: string;
  relevancia: "alta" | "media" | "baja";
  resumen: string;
  aplicabilidad: string;
  diferencias?: string;
}

export interface ContractClause {
  id: string;
  numero: string;
  titulo: string;
  contenido: string;
  categoria:
    | "obligacion"
    | "penalidad"
    | "terminacion"
    | "garantia"
    | "confidencialidad"
    | "indemnizacion"
    | "jurisdiccion"
    | "otro";
  riesgo: "alto" | "medio" | "bajo";
  interpretacion: string;
  recomendaciones: string[];
}

export interface DeepLegalAnalysis {
  entities: LegalEntity[];
  references: ExtractedLegalReference[];
  timeline: TimelineEvent[];
  arguments: LegalArgument[];
  precedents: PrecedentMatch[];
  clauses: ContractClause[];
  summary: string;
  keyLegalIssues: string[];
  riskAssessment: {
    level: "alto" | "medio" | "bajo";
    factors: string[];
    recommendations: string[];
  };
  proceduralStatus: {
    etapa: string;
    estado: string;
    siguientesTerminos: string[];
  };
}

const LEGAL_ENTITY_PROMPT = `Eres un experto en análisis jurídico mexicano. Tu tarea es extraer entidades legales del texto proporcionado.

Identifica y clasifica:
- LEYES: Artículos de leyes (CFF, CNPP, LFT, etc.) mencionados
- ARTÍCULOS: Artículos específicos de leyes
- FRACCIONES: Fracciones de artículos
- INCISOS: Incisos de fracciones
- CONTRATOS: Referencias a contratos o acuerdos
- CLÁUSULAS: Cláusulas específicas de documentos
- JURISPRUDENCIA: Referencias a jurisprudencia o tesis
- SENTENCIAS: Referencias a sentencias
- EXPEDIENTES: Números de expediente
- TRIBUNALES: Nombres de tribunales o juzgadores
- JUEZ: Nombres de jueces o magistrados
- PARTES: Nombres de las partes en conflicto
- PLAZOS: Menciones de plazos o términos legales

Devuelve JSON con estructura exacta.`;

const TIMELINE_PROMPT = `Analiza el siguiente documento legal y construye una línea temporal de eventos procesales.

Identifica:
- PRESENTACIONES: demandas, impugnaciones, recursos
- NOTIFICACIONES: requerimientos, acuerdos, notificaciones
- AUDIENCIAS: comparecencias, audiencias, vista
- VENCIMIENTOS: plazos legales, términos perentorios
- RESOLUCIONES: sentencias, laudos, ejecutorias
- TRÁMITES: pruebas, diligencia, recursos

Para cada evento indica:
- Fecha exacta o aproximada
- Título del evento
- Descripción
- Actores involucrados
- Base legal (si aplica)
- Nivel de urgencia (si es plazo perentorio)`;

const ARGUMENT_PROMPT = `Analiza el documento legal y extrae los argumentos jurídicos fundamentales.

Identifica:
- HECHOS: alegaciones de hechos
- ARGUMENTOS DE DERECHO: fundamentos jurídicos
- PRUEBAS: medios de prueba ofrecidos o valorados
- EXCEPCIONES: excepciones opuestas
- DEFENSAS: defensas planteadas
- PETICIONES: solicitudes específicas

Evalúa la fuerza de cada argumento (fuerte/media/débil) y su base legal.`;

const PRECEDENT_PROMPT = `Busca en el texto referencias a jurisprudencia, tesis, criterios o precedentes judiciales.

Para cada referencia identificada:
- Tipo de precedente (jurisprudencia/tesis/sentencia/criterio)
- Tribunal que la emitió
- Materia (laboral, civil, penal, etc.)
- Fecha
- Referencia completa
- Relevancia para el caso actual
- Posible aplicabilidad o diferencias`;

export async function extractLegalEntities(
  text: string
): Promise<LegalEntity[]> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: LEGAL_ENTITY_PROMPT },
      {
        role: "user",
        content: `Extrae todas las entidades legales del siguiente texto:\n\n${text.slice(0, 8000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "legal_entities",
        strict: false,
        schema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "ley",
                      "articulo",
                      "fraccion",
                      "inciso",
                      "contrato",
                      "clausula",
                      "jurisprudencia",
                      "sentencia",
                      "expediente",
                      "tribunal",
                      "juez",
                      "parte",
                      "plazo",
                    ],
                  },
                  value: { type: "string" },
                  reference: { type: "string" },
                  context: { type: "string" },
                  startIndex: { type: "number" },
                  endIndex: { type: "number" },
                },
                required: [
                  "type",
                  "value",
                  "context",
                  "startIndex",
                  "endIndex",
                ],
              },
            },
          },
          required: ["entities"],
        },
      },
    },
  });

  const content = extractMessageContent(response.choices[0]?.message?.content);
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.entities || [];
  } catch {
    return [];
  }
}

export async function extractLegalReferences(
  text: string
): Promise<ExtractedLegalReference[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un experto en derecho mexicano. Extrae referencias normativas del texto.",
      },
      {
        role: "user",
        content: `Identifica todas las referencias a leyes, códigos, reglamentos, tratados o disposiciones normativas:\n\n${text.slice(0, 8000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "legal_references",
        strict: false,
        schema: {
          type: "object",
          properties: {
            references: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "ley_federal",
                      "ley_estatal",
                      "reglamento",
                      "codigo",
                      "tratado",
                      "constitucion",
                    ],
                  },
                  nombre: { type: "string" },
                  numero: { type: "string" },
                  fecha: { type: "string" },
                  contexto: { type: "string" },
                },
                required: ["type", "nombre", "contexto"],
              },
            },
          },
        },
      },
    },
  });

  const content = extractMessageContent(response.choices[0]?.message?.content);
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.references || [];
  } catch {
    return [];
  }
}

export async function buildLegalTimeline(
  text: string,
  caseType: string
): Promise<TimelineEvent[]> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: TIMELINE_PROMPT },
      {
        role: "user",
        content: `Analiza el documento y construye la línea temporal de eventos procesales para un caso de tipo: ${caseType}\n\nDocumento:\n${text.slice(0, 10000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "legal_timeline",
        strict: false,
        schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  date: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  category: {
                    type: "string",
                    enum: [
                      "demanda",
                      "contestacion",
                      "audiencia",
                      "sentencia",
                      "recurso",
                      "notificacion",
                      "vencimiento",
                      "otro",
                    ],
                  },
                  actors: { type: "array", items: { type: "string" } },
                  legalBasis: { type: "string" },
                  deadline: { type: "string" },
                  urgency: {
                    type: "string",
                    enum: ["critica", "alta", "media", "baja"],
                  },
                },
                required: [
                  "id",
                  "date",
                  "title",
                  "description",
                  "category",
                  "actors",
                ],
              },
            },
          },
        },
      },
    },
  });

  const content = extractMessageContent(response.choices[0]?.message?.content);
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.events || [];
  } catch {
    return [];
  }
}

export async function extractLegalArguments(
  text: string
): Promise<LegalArgument[]> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: ARGUMENT_PROMPT },
      {
        role: "user",
        content: `Extrae los argumentos jurídicos del siguiente documento:\n\n${text.slice(0, 8000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "legal_arguments",
        strict: false,
        schema: {
          type: "object",
          properties: {
            arguments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: {
                    type: "string",
                    enum: [
                      "hecho",
                      "derecho",
                      "prueba",
                      "excepcion",
                      "defensa",
                      "peticion",
                    ],
                  },
                  title: { type: "string" },
                  description: { type: "string" },
                  strength: {
                    type: "string",
                    enum: ["fuerte", "media", "debil"],
                  },
                  supportingEvidence: {
                    type: "array",
                    items: { type: "string" },
                  },
                  legalBasis: { type: "string" },
                },
                required: ["id", "type", "title", "description", "strength"],
              },
            },
          },
        },
      },
    },
  });

  const content = extractMessageContent(response.choices[0]?.message?.content);
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.arguments || [];
  } catch {
    return [];
  }
}

export async function findPrecedents(
  text: string,
  caseType: string
): Promise<PrecedentMatch[]> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: PRECEDENT_PROMPT },
      {
        role: "user",
        content: `Busca jurisprudencia y precedentes relevantes para un caso de tipo: ${caseType}\n\nDocumento:\n${text.slice(0, 6000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "precedents",
        strict: false,
        schema: {
          type: "object",
          properties: {
            precedents: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tipo: {
                    type: "string",
                    enum: ["jurisprudencia", "tesis", "sentencia", "criterio"],
                  },
                  tribunal: { type: "string" },
                  materia: { type: "string" },
                  fecha: { type: "string" },
                  referencia: { type: "string" },
                  relevancia: {
                    type: "string",
                    enum: ["alta", "media", "baja"],
                  },
                  resumen: { type: "string" },
                  aplicabilidad: { type: "string" },
                  diferencias: { type: "string" },
                },
                required: [
                  "tipo",
                  "tribunal",
                  "materia",
                  "referencia",
                  "relevancia",
                  "resumen",
                  "aplicabilidad",
                ],
              },
            },
          },
        },
      },
    },
  });

  const content = extractMessageContent(response.choices[0]?.message?.content);
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.precedents || [];
  } catch {
    return [];
  }
}

export async function analyzeContractClauses(
  text: string
): Promise<ContractClause[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un experto en análisis de contratos. Analiza cláusulas contractuales e identifica riesgos, obligaciones y recomendaciones.",
      },
      {
        role: "user",
        content: `Analiza las siguientes cláusulas contractuales:\n\n${text.slice(0, 8000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "contract_clauses",
        strict: false,
        schema: {
          type: "object",
          properties: {
            clauses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  numero: { type: "string" },
                  titulo: { type: "string" },
                  contenido: { type: "string" },
                  categoria: {
                    type: "string",
                    enum: [
                      "obligacion",
                      "penalidad",
                      "terminacion",
                      "garantia",
                      "confidencialidad",
                      "indemnizacion",
                      "jurisdiccion",
                      "otro",
                    ],
                  },
                  riesgo: { type: "string", enum: ["alto", "medio", "bajo"] },
                  interpretacion: { type: "string" },
                  recomendaciones: { type: "array", items: { type: "string" } },
                },
                required: [
                  "id",
                  "numero",
                  "titulo",
                  "contenido",
                  "categoria",
                  "riesgo",
                  "interpretacion",
                  "recomendaciones",
                ],
              },
            },
          },
        },
      },
    },
  });

  const content = extractMessageContent(response.choices[0]?.message?.content);
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.clauses || [];
  } catch {
    return [];
  }
}

export async function performDeepLegalAnalysis(
  text: string,
  caseType: string
): Promise<DeepLegalAnalysis> {
  const [entities, references, timeline, arguments_, precedents, clauses] =
    await Promise.all([
      extractLegalEntities(text),
      extractLegalReferences(text),
      buildLegalTimeline(text, caseType),
      extractLegalArguments(text),
      findPrecedents(text, caseType),
      caseType === "civil" ||
      caseType === "mercantil" ||
      caseType.includes("contrato")
        ? analyzeContractClauses(text)
        : Promise.resolve([]),
    ]);

  const riskFactors: string[] = [];
  let riskLevel: "alto" | "medio" | "bajo" = "bajo";

  if (clauses.some(c => c.riesgo === "alto")) {
    riskLevel = "alto";
    riskFactors.push("Cláusulas de alto riesgo detectadas");
  }

  if (precedents.length > 3) {
    riskFactors.push("Múltiples precedentes relevantes encontrados");
  }

  if (timeline.filter(e => e.urgency === "critica").length > 0) {
    riskLevel = "alto";
    riskFactors.push("Vencimientos críticos identificados");
  }

  if (riskFactors.length === 0 && clauses.some(c => c.riesgo === "medio")) {
    riskLevel = "medio";
  }

  const keyIssues = Array.from(new Set(arguments_.map(a => a.type)));
  const etapaActual =
    timeline.length > 0 ? timeline[timeline.length - 1].category : "inicio";
  const siguientesTerminos = timeline
    .filter(e => e.urgency && e.urgency !== "baja")
    .map(e => `${e.title} - ${e.date}`);

  return {
    entities,
    references,
    timeline,
    arguments: arguments_,
    precedents,
    clauses,
    summary: `Análisis completado: ${entities.length} entidades legales, ${timeline.length} eventos, ${arguments_.length} argumentos, ${precedents.length} precedentes encontrados.`,
    keyLegalIssues: keyIssues,
    riskAssessment: {
      level: riskLevel,
      factors: riskFactors,
      recommendations:
        riskLevel === "alto"
          ? [
              "Revisar cláusulas de alto riesgo inmediatamente",
              "Verificar plazos de vencimiento",
              "Consultar precedente relevante",
            ]
          : riskLevel === "medio"
            ? ["Monitorear fechas límite", "Documentar argumentos sólidos"]
            : ["Continuar con estrategia planificada"],
    },
    proceduralStatus: {
      etapa: etapaActual,
      estado: timeline.length > 0 ? "activo" : "inicio",
      siguientesTerminos,
    },
  };
}
