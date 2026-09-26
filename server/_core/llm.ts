import { ENV } from "./env";

const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
const OLLAMA_URL = ENV.ollamaUrl;
const OLLAMA_MODEL = ENV.ollamaModel;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export function extractMessageContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (c): c is TextContent =>
          typeof c === "object" &&
          c !== null &&
          "type" in c &&
          c.type === "text"
      )
      .map(c => c.text)
      .join("");
  }
  if (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    content.type === "text"
  ) {
    return (content as TextContent).text;
  }
  return "";
}

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const resolveApiUrl = () => {
  if (IS_DEV && ENV.forgeApiUrl === "") {
    return `${OLLAMA_URL}/api/chat`;
  }
  return ENV.forgeApiUrl
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";
};

const resolveApiKey = () => {
  if (IS_DEV && ENV.forgeApiKey === "") {
    return "dev";
  }
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return ENV.forgeApiKey;
};

const resolveModel = () => {
  if (IS_DEV && ENV.forgeApiUrl === "") {
    return OLLAMA_MODEL;
  }
  return "gemini-2.5-flash";
};

function dataUrlToBase64(url: string): string {
  const match = /^data:[^;,]+;base64,([\s\S]*)$/.exec(url);
  if (!match) {
    // Evidence is always passed inline; a remote URL would be unreachable
    // (and must not be fetched) from the private model server.
    throw new Error("Ollama requires images as base64 data URLs");
  }
  return match[1];
}

/**
 * Tell the model today's date. Without it, models judge dates against their
 * training cutoff and flag real past dates as "fecha futura".
 */
export function withCurrentDate(
  messages: Message[],
  now: Date = new Date()
): Message[] {
  const today = now.toISOString().slice(0, 10);
  const note =
    `Fecha actual: ${today}. Úsala como referencia temporal: ` +
    `una fecha igual o anterior a ${today} NO es una fecha futura.`;
  const i = messages.findIndex(m => m.role === "system");
  if (i >= 0 && typeof messages[i].content === "string") {
    const copy = [...messages];
    copy[i] = { ...messages[i], content: `${messages[i].content}\n\n${note}` };
    return copy;
  }
  return [{ role: "system", content: note }, ...messages];
}

const convertToOllamaFormat = (messages: Message[]) => {
  const ollamaMessages: Array<{
    role: string;
    content: string;
    images?: string[];
  }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      ollamaMessages.push({ role: "system", content: String(msg.content) });
    } else if (msg.role === "user") {
      const content = msg.content;
      if (typeof content === "string") {
        ollamaMessages.push({ role: "user", content });
      } else if (Array.isArray(content)) {
        const textParts = content.filter(
          c => typeof c === "string" || (c as any).type === "text"
        );
        const text = textParts
          .map(c => (typeof c === "string" ? c : (c as any).text))
          .join("\n");
        // Ollama takes images as raw base64 in `images`, not as content parts.
        // Without this the model never sees the evidence and invents findings.
        const images = content
          .filter(c => typeof c !== "string" && (c as any).type === "image_url")
          .map(c => dataUrlToBase64((c as ImageContent).image_url.url));
        ollamaMessages.push(
          images.length
            ? { role: "user", content: text, images }
            : { role: "user", content: text }
        );
      }
    } else if (msg.role === "assistant") {
      ollamaMessages.push({ role: "assistant", content: String(msg.content) });
    }
  }

  return ollamaMessages;
};

const convertFromOllamaResponse = (
  response: any,
  model: string
): InvokeResult => {
  const content = response.message?.content ?? "";

  return {
    id: `ollama-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: response.done ? "stop" : null,
      },
    ],
    usage: {
      prompt_tokens: response.prompt_eval_count ?? 0,
      completion_tokens: response.eval_count ?? 0,
      total_tokens:
        (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
    },
  };
};

// ─── Gemini ──────────────────────────────────────────────────────────────────

function convertToGeminiFormat(messages: Message[]): {
  systemInstruction: { parts: { text: string }[] } | null;
  contents: { role: string; parts: { text: string }[] }[];
} {
  let systemInstruction: { parts: { text: string }[] } | null = null;
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of messages) {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : extractMessageContent(msg.content);

    if (msg.role === "system") {
      systemInstruction = { parts: [{ text }] };
    } else if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text }] });
    } else if (msg.role === "assistant") {
      contents.push({ role: "model", parts: [{ text }] });
    }
  }

  return { systemInstruction, contents };
}

function convertFromGeminiResponse(response: any, model: string): InvokeResult {
  const candidate = response.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text ?? "";
  const finishReason: string | null = candidate?.finishReason ?? null;

  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason:
          finishReason === "STOP"
            ? "stop"
            : (finishReason?.toLowerCase() ?? null),
      },
    ],
    usage: {
      prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

async function invokeGemini(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = GEMINI_MODEL;
  const { messages, maxTokens, max_tokens, response_format, responseFormat } =
    params;

  const { systemInstruction, contents } = convertToGeminiFormat(messages);

  const generationConfig: Record<string, unknown> = {
    temperature: 0.3,
    maxOutputTokens: maxTokens ?? max_tokens ?? 32768,
  };

  const rf = response_format ?? responseFormat;
  if (rf && (rf.type === "json_object" || rf.type === "json_schema")) {
    generationConfig.responseMimeType = "application/json";
    if (rf.type === "json_schema" && rf.json_schema?.schema) {
      generationConfig.responseSchema = rf.json_schema.schema;
    }
  }

  const payload: Record<string, unknown> = { contents, generationConfig };
  if (systemInstruction) payload.systemInstruction = systemInstruction;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Gemini invoke failed: ${res.status} ${res.statusText} – ${errorText}`
    );
  }

  const result = await res.json();
  return convertFromGeminiResponse(result, model);
}

// ─── Router ────────────────────────────────────────────────────────────────

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const { maxTokens, max_tokens, response_format, responseFormat } = params;
  const messages = withCurrentDate(params.messages);
  params = { ...params, messages };

  if (!ENV.ollamaUrl && !ENV.geminiApiKey && !ENV.forgeApiUrl) {
    throw new Error(
      "No hay proveedor de IA configurado (OLLAMA_URL, GEMINI_API_KEY o BUILT_IN_FORGE_API_URL)"
    );
  }

  // Priority: Ollama (if configured) → Gemini (if key set) → Forge/OpenAI-compatible
  if (ENV.ollamaUrl && !ENV.geminiApiKey) {
    const ollamaMessages = convertToOllamaFormat(messages);
    const debugTag = `ollama-${Date.now()}`;

    console.log(`[Ollama] === ${debugTag} ===`);
    console.log(`[Ollama] Model: ${OLLAMA_MODEL}`);
    console.log(`[Ollama] URL: ${ENV.ollamaUrl}/api/chat`);
    console.log(`[Ollama] Messages: ${ollamaMessages.length}`);
    console.log(
      `[Ollama] Total prompt chars: ${ollamaMessages.reduce((s, m) => s + m.content.length, 0)}`
    );
    console.log(
      `[Ollama] Response format: ${JSON.stringify(response_format ?? responseFormat)}`
    );

    const rf = response_format ?? responseFormat;
    if (rf) {
      let formatInstruction =
        "\n\nIMPORTANTE: Debes responder ÚNICAMENTE con JSON puro y válido. ";
      if (rf.type === "json_schema") {
        formatInstruction +=
          "Sigue EXACTAMENTE la estructura del esquema especificado. No incluyas markdown, bloques de código ni texto adicional alrededor del JSON.";
      } else if (rf.type === "json_object") {
        formatInstruction +=
          "No incluyas markdown, bloques de código ni texto adicional alrededor del JSON.";
      }
      for (let i = ollamaMessages.length - 1; i >= 0; i--) {
        if (ollamaMessages[i].role === "system") {
          ollamaMessages[i].content += formatInstruction;
          break;
        }
      }
    }

    const payload: Record<string, unknown> = {
      model: OLLAMA_MODEL,
      messages: ollamaMessages,
      stream: false,
      // Reasoning traces add minutes on CPU and aren't used; the answer is
      // constrained by the schema below instead.
      think: false,
      options: {
        temperature: 0.3,
        num_predict: maxTokens ?? max_tokens ?? 8192,
        // Two images + the forensic prompt are ~3k tokens and the answer up
        // to ~2k; Ollama's default window would silently truncate that.
        num_ctx: ENV.ollamaNumCtx,
      },
    };

    if (rf) {
      // Structured outputs: pass the real JSON schema so small models are
      // forced into it, not just told about it in the prompt.
      payload.format =
        rf.type === "json_schema" && rf.json_schema?.schema
          ? rf.json_schema.schema
          : "json";
    }

    console.log(`[Ollama] Payload keys: ${Object.keys(payload).join(", ")}`);

    const controller = new AbortController();
    const OLLAMA_TIMEOUT_MS = 600_000; // 10 minutes
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    try {
      const response = await fetch(`${ENV.ollamaUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      console.log(
        `[Ollama] HTTP status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Ollama] HTTP error body: ${errorText.slice(0, 2000)}`);
        throw new Error(
          `Ollama invoke failed: ${response.status} ${response.statusText} – ${errorText}`
        );
      }

      const result = await response.json();
      const contentLen = result.message?.content?.length ?? 0;
      console.log(`[Ollama] Response received, content length: ${contentLen}`);

      if (contentLen === 0) {
        console.error(
          `[Ollama] Empty response from model. Full result: ${JSON.stringify(result).slice(0, 1000)}`
        );
        throw new Error(
          `Ollama devolvió una respuesta vacía para el modelo "${OLLAMA_MODEL}"`
        );
      }

      const first200 = result.message.content.slice(0, 200);
      console.log(`[Ollama] Content preview: ${JSON.stringify(first200)}`);

      return convertFromOllamaResponse(result, OLLAMA_MODEL);
    } catch (error: unknown) {
      console.error(`[Ollama] Error (${debugTag}):`, error);

      if (
        typeof error === "object" &&
        error !== null &&
        (error as any).name === "AbortError"
      ) {
        console.error(
          `[Ollama] TIMEOUT after ${OLLAMA_TIMEOUT_MS / 1000}s — model "${OLLAMA_MODEL}" did not respond in time`
        );
        throw new Error(
          `Ollama timed out after ${OLLAMA_TIMEOUT_MS / 1000} segundos — ` +
            `el modelo "${OLLAMA_MODEL}" está tardando demasiado. ` +
            `Verifica que Ollama esté corriendo con: ollama list`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      console.log(`[Ollama] === end ${debugTag} ===`);
    }
  }

  if (ENV.geminiApiKey) {
    return invokeGemini(params);
  }

  const apiKey = resolveApiKey();
  const model = resolveModel();

  const payload: Record<string, unknown> = {
    model,
    messages: messages.map(normalizeMessage),
  };

  payload.max_tokens = maxTokens ?? max_tokens ?? 32768;
  payload.thinking = { budget_tokens: 128 };

  const rf = response_format ?? responseFormat;
  if (rf) {
    payload.response_format = rf;
  }

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}