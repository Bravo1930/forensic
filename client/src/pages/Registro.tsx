import { useLocation, useNavigation } from "wouter";
import { Badge } from "@//components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { z } from "zod";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("El correo no es válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().optional(),
});

export default function Register() {
  const [, navigate] = useLocation();
  const navigateMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Cuenta creada exitosamente");
      window.location.href = "/dashboard";
    },
    onError: err => {
      setError(friendlyError(err.message));
    },
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const friendlyError = (message: string): string => {
    try {
      const issues = JSON.parse(message) as Array<{ path?: unknown[] }>;
      if (Array.isArray(issues)) {
        if (issues.some(i => i.path?.[0] === "email"))
          return "El correo no es válido. Verifica que termine en un dominio válido (ej. @gmail.com), sin caracteres extra.";
        if (issues.some(i => i.path?.[0] === "password"))
          return "La contraseña debe tener al menos 6 caracteres";
        return "Los datos enviados no son válidos. Revisa el formulario.";
      }
    } catch {
      // Not JSON — a plain server message, show as-is
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Todos los campos son requeridos");
      return;
    }

    try {
      registerSchema.parse({ email, password, name });
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map(i => i.message).join(" ")
          : "Datos inválidos"
      );
      return;
    }

    navigateMutation.mutate({ email: email.trim(), password, name: name || undefined });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-md mx-auto">
        <Card className="bg-card border-border p-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 mb-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            })


            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={navigateMutation.isPending}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={navigateMutation.isPending}
                  autoComplete="new-password"
                />
              </div>

              {name && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={navigateMutation.isPending}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={navigateMutation.isPending}>
                {navigateMutation.isPending ? "Procesando..." : "Crear cuenta"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                ¿Ya tienes cuenta? <a href="/login" className="text-primary hover:text-primary-500">Inicia sesión</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}