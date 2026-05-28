import { ENV } from "./env";

const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

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
        ollamaMessages.push({ role: "user", content: text });
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log(`[Gemini] Using model: ${model}, contents: ${contents.length}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Gemini invoke failed: ${res.status} ${res.statusText} – ${errorText}`
    );
  }

  const result = await res.json();
  console.log(
    `[Gemini] Response received, length: ${result.candidates?.[0]?.content?.parts?.[0]?.text?.length ?? 0}`
  );
  return convertFromGeminiResponse(result, model);
}

// ─── Router ──────────────────────────────────────────────────────────────────

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const { messages, maxTokens, max_tokens, response_format, responseFormat } =
    params;

  if (ENV.geminiApiKey) {
    return invokeGemini(params);
  }

  const apiKey = resolveApiKey();
  const model = resolveModel();
  const isOllama = IS_DEV && ENV.forgeApiUrl === "";

  if (isOllama) {
    const ollamaMessages = convertToOllamaFormat(messages);

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

    const payload = {
      model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: maxTokens ?? max_tokens ?? 4096,
      },
    };

    console.log(
      `[Ollama] Using model: ${model}, messages: ${ollamaMessages.length}`
    );

    const response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama invoke failed: ${response.status} ${response.statusText} – ${errorText}`
      );
    }

    const result = await response.json();
    console.log(
      `[Ollama] Response received, length: ${result.message?.content?.length ?? 0}`
    );
    return convertFromOllamaResponse(result, model);
  }

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
