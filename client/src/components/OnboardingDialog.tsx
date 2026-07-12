import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, FolderOpen, Brain, FileText, Scale } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "fla-onboarding-dismissed";

const steps = [
  { icon: FolderOpen, label: "Crea un caso forense", done: false },
  { icon: Scale, label: "Carga evidencia digital", done: false },
  { icon: Brain, label: "Ejecuta análisis IA", done: false },
  { icon: FileText, label: "Genera dictamen pericial", done: false },
];

export default function OnboardingDialog({
  hasCases,
  onNavigate,
}: {
  hasCases: boolean;
  onNavigate: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed && !hasCases) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [hasCases]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
            <Scale className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>Bienvenido a ForensicLegal</DialogTitle>
          <DialogDescription>
            Plataforma de análisis forense con inteligencia artificial. Sigue
            estos pasos para comenzar:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm">{s.label}</span>
              {i === 0 && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss}>
            Explorar después
          </Button>
          <Button
            onClick={() => {
              dismiss();
              onNavigate("/casos/nuevo");
            }}
          >
            Crear mi primer caso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
