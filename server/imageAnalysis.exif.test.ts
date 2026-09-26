import { describe, expect, it, vi } from "vitest";

// EXIF must come from the file, never from the model.
const invokeLLM = vi.fn();
vi.mock("./_core/llm", () => ({ invokeLLM: (...a: unknown[]) => invokeLLM(...a) }));

const { extractExifFromBase64 } = await import("./imageAnalysis");

/** Minimal JPEG whose only metadata is an EXIF IFD0 with Make + Software. */
function jpegWithExif(make: string, software: string): Buffer {
  const entries = [
    { tag: 0x010f, value: make },
    { tag: 0x0131, value: software },
  ];
  const ifdStart = 8;
  const ifdSize = 2 + entries.length * 12 + 4;
  let dataOffset = ifdStart + ifdSize;
  const head = Buffer.alloc(ifdStart + ifdSize);
  head.write("II", 0, "ascii");
  head.writeUInt16LE(42, 2);
  head.writeUInt32LE(ifdStart, 4);
  head.writeUInt16LE(entries.length, ifdStart);
  const data: Buffer[] = [];
  entries.forEach((e, i) => {
    const bytes = Buffer.from(`${e.value}\0`, "ascii");
    const at = ifdStart + 2 + i * 12;
    head.writeUInt16LE(e.tag, at);
    head.writeUInt16LE(2, at + 2); // ASCII
    head.writeUInt32LE(bytes.length, at + 4);
    head.writeUInt32LE(dataOffset, at + 8);
    dataOffset += bytes.length;
    data.push(bytes);
  });
  const tiff = Buffer.concat([head, ...data]);
  const app1Body = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const app1Len = Buffer.alloc(2);
  app1Len.writeUInt16BE(app1Body.length + 2);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
    app1Len,
    app1Body,
    Buffer.from([0xff, 0xd9]),
  ]);
}

describe("extractExifFromBase64", () => {
  it("reads real EXIF fields from the file bytes", async () => {
    const jpg = jpegWithExif("TestCam", "Adobe Photoshop 25.0");
    const exif = await extractExifFromBase64(
      jpg.toString("base64"),
      "image/jpeg",
      "foto.jpg"
    );
    expect(exif.make).toBe("TestCam");
    expect(exif.software).toBe("Adobe Photoshop 25.0");
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("reports only what the file contains (no invented device/dates)", async () => {
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    // A bare PNG has only its header dimensions — nothing else may appear
    expect(await extractExifFromBase64(png, "image/png", "x.png")).toEqual({
      imageWidth: 1,
      imageHeight: 1,
    });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("does not throw on corrupt data", async () => {
    const exif = await extractExifFromBase64(
      Buffer.from("not an image").toString("base64"),
      "image/jpeg",
      "roto.jpg"
    );
    expect(exif).toEqual({});
  });
});
