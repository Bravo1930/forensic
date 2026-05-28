import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface FileItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "video/mp4",
  "audio/mpeg",
  "audio/wav",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractTextFromFile(file: File): Promise<string> {
  if (
    file.type === "text/plain" ||
    file.type === "text/csv" ||
    file.type === "application/json"
  ) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).slice(0, 2000));
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });
  }
  return "";
}

interface EvidenceUploaderProps {
  caseId: number;
  onUploaded: () => void;
  onClose: () => void;
}

export default function EvidenceUploader({
  caseId,
  onUploaded,
  onClose,
}: EvidenceUploaderProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadEvidence = trpc.evidence.upload.useMutation();

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: El archivo supera el límite de 50MB`);
        return false;
      }
      return true;
    });
    setFiles(prev => [
      ...prev,
      ...valid.map(f => ({ file: f, status: "pending" as const, progress: 0 })),
    ]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadAll = async () => {
    const pending = files.filter(f => f.status === "pending");
    if (pending.length === 0) return;
    setIsUploading(true);

    let uploadedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status !== "pending") continue;

      setFiles(prev =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        const base64Data = await fileToBase64(item.file);
        setFiles(prev =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 40 } : f))
        );

        const extractedText = await extractTextFromFile(item.file);
        setFiles(prev =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 60 } : f))
        );

        await uploadEvidence.mutateAsync({
          caseId,
          filename: item.file.name,
          mimeType: item.file.type || "application/octet-stream",
          sizeBytes: item.file.size,
          base64Data,
          extractedText: extractedText || undefined,
        });

        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "done", progress: 100 } : f
          )
        );
        uploadedCount++;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al subir archivo";
        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "error", progress: 0, error: message }
              : f
          )
        );
        toast.error(`Error al subir ${item.file.name}: ${message}`);
      }
    }

    setIsUploading(false);
    if (uploadedCount > 0) {
      onUploaded();
    }
  };

  const pendingCount = files.filter(f => f.status === "pending").length;
  const doneCount = files.filter(f => f.status === "done").length;

  return (
    <Card className="bg-card border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Cargar Evidencia Digital</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Drop zone */}
        <div
          className={`drop-zone rounded-lg p-8 text-center cursor-pointer transition-all mb-4 ${isDragOver ? "drag-over" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.zip,.txt,.csv,.json,.xml,.mp4,.mp3,.wav"
            onChange={e => addFiles(Array.from(e.target.files ?? []))}
          />
          <Upload
            className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
          />
          <p className="text-sm font-medium mb-1">
            {isDragOver
              ? "Suelta los archivos aquí"
              : "Arrastra archivos o haz clic para seleccionar"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, imágenes, ZIP, logs, chats, audio, video · Máx. 50 MB por
            archivo
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {files.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 bg-background rounded-lg border border-border"
              >
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(item.file.size / 1024).toFixed(1)} KB
                  </p>
                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="h-1 mt-1" />
                  )}
                  {item.error && (
                    <p className="text-xs text-destructive mt-0.5">
                      {item.error}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {item.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:text-destructive"
                      onClick={() => removeFile(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {item.status === "uploading" && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  {item.status === "error" && (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {files.length > 0
              ? `${files.length} archivo${files.length !== 1 ? "s" : ""} · ${doneCount} subido${doneCount !== 1 ? "s" : ""}`
              : "Ningún archivo seleccionado"}
          </p>
          <div className="flex gap-2">
            {doneCount > 0 && doneCount === files.length && (
              <Button size="sm" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            )}
            {pendingCount > 0 && (
              <Button size="sm" onClick={uploadAll} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir {pendingCount} archivo{pendingCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
