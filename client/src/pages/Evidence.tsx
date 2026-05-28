import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";

export default function Evidence() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="rounded-full bg-muted p-6">
          <FileSearch className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Gestión de Evidencia</h2>
          <p className="text-muted-foreground max-w-md">
            La evidencia se gestiona dentro de cada caso. Selecciona un caso
            para cargar, ver y analizar evidencia.
          </p>
        </div>
        <Button onClick={() => setLocation("/casos")}>Ir a Casos</Button>
      </div>
    </div>
  );
}
