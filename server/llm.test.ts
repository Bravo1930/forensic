import { afterEach, describe, expect, it, vi } from "vitest";

const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const SCHEMA = {
  type: "object",
  properties: { ocrText: { type: "string" } },
  required: ["ocrText"],
  additionalProperties: false,
};

/** Import llm.ts fresh with the given env (ENV is read at module load). */
async function loadLlm(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("./_core/llm");
}

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.unstubAllGlobals();
});

function captureFetch(reply: unknown) {
  const calls: Array<{ url: string; body: any }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify(reply), { status: 200 });
    })
  );
  return calls;
}

describe("invokeLLM → Ollama", () => {
  it("sends images, the real JSON schema, think=false and a large context", async () => {
    const { invokeLLM } = await loadLlm({
      NODE_ENV: "production",
      OLLAMA_URL: "http://ollama.railway.internal:11434",
      OLLAMA_MODEL: "qwen3.5:4b",
      GEMINI_API_KEY: undefined,
    });
    const calls = captureFetch({ message: { role: "assistant", content: '{"ocrText":"x"}' } });

    await invokeLLM({
      messages: [
        { role: "system", content: "Eres un perito." },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/png;base64,${PNG_B64}` } },
            { type: "text", text: "Analiza la imagen" },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "t", strict: true, schema: SCHEMA },
      },
    });

    expect(calls).toHaveLength(1);
    const { url, body } = calls[0];
    expect(url).toBe("http://ollama.railway.internal:11434/api/chat");
    expect(body.model).toBe("qwen3.5:4b");
    expect(body.think).toBe(false);
    expect(body.format).toEqual(SCHEMA);
    expect(body.options.num_ctx).toBeGreaterThanOrEqual(16384);

    const user = body.messages.find((m: any) => m.role === "user");
    expect(user.images).toEqual([PNG_B64]);
    expect(user.content).toBe("Analiza la imagen");
  });

  it("tells the model today's date so past dates aren't flagged as future", async () => {
    const { invokeLLM } = await loadLlm({
      NODE_ENV: "production",
      OLLAMA_URL: "http://ollama:11434",
      GEMINI_API_KEY: undefined,
    });
    const calls = captureFetch({ message: { role: "assistant", content: "ok" } });
    await invokeLLM({
      messages: [
        { role: "system", content: "Eres un perito." },
        { role: "user", content: "hola" },
      ],
    });
    const system = calls[0].body.messages.find((m: any) => m.role === "system");
    const today = new Date().toISOString().slice(0, 10);
    expect(system.content).toContain("Eres un perito.");
    expect(system.content).toContain(`Fecha actual: ${today}`);
  });

  it("does not assume localhost in production and fails clearly with no provider", async () => {
    const { invokeLLM } = await loadLlm({
      NODE_ENV: "production",
      OLLAMA_URL: undefined,
      GEMINI_API_KEY: undefined,
      BUILT_IN_FORGE_API_URL: undefined,
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      invokeLLM({ messages: [{ role: "user", content: "hola" }] })
    ).rejects.toThrow(/No hay proveedor de IA configurado/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses remote image URLs instead of sending an image-less request", async () => {
    const { invokeLLM } = await loadLlm({
      NODE_ENV: "production",
      OLLAMA_URL: "http://ollama:11434",
      GEMINI_API_KEY: undefined,
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      invokeLLM({
        messages: [
          {
            role: "user",
            content: [{ type: "image_url", image_url: { url: "/api/evidence/1/file" } }],
          },
        ],
      })
    ).rejects.toThrow(/base64 data URLs/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("withCurrentDate", () => {
  it("adds a system message when there is none, without mutating input", async () => {
    const { withCurrentDate } = await loadLlm({});
    const input = [{ role: "user" as const, content: "hola" }];
    const out = withCurrentDate(input, new Date("2026-09-25T12:00:00Z"));
    expect(out[0]).toEqual({
      role: "system",
      content: expect.stringContaining("Fecha actual: 2026-09-25"),
    });
    expect(out[1]).toBe(input[0]);
    expect(input).toHaveLength(1);
  });
});
