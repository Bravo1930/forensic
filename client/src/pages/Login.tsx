import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Shield } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";

type Mode = "login" | "register";

const EMAIL_ERROR_MSG =
  "El correo no es válido. Verifica que termine en un dominio válido (ej. @gmail.com), sin caracteres extra.";

// Same validator the server uses, so the form rejects exactly what the API would.
const emailSchema = z.string().email();

// tRPC surfaces Zod input errors as a JSON array of issues in err.message;
// turn those into a readable message instead of showing raw JSON.
function friendlyError(message: string): string {
  try {
    const issues = JSON.parse(message) as Array<{ path?: unknown[] }>;
    if (Array.isArray(issues)) {
      if (issues.some(i => i.path?.[0] === "email")) return EMAIL_ERROR_MSG;
      if (issues.some(i => i.path?.[0] === "password"))
        return "La contraseña debe tener al menos 6 caracteres";
      return "Los datos enviados no son válidos. Revisa el formulario.";
    }
  } catch {
    // Not JSON — a plain server message, show as-is
  }
  return message;
}

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: err => {
      setError(friendlyError(err.message));
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: err => {
      setError(friendlyError(err.message));
    },
  });

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Todos los campos son requeridos");
      return;
    }

    if (!emailSchema.safeParse(email.trim()).success) {
      setError(EMAIL_ERROR_MSG);
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (mode === "login") {
      loginMutation.mutate({ email: email.trim(), password });
    } else {
      registerMutation.mutate({
        email: email.trim(),
        password,
        name: name || undefined,
      });
    }
  };

  // Clear error when user starts typing in any field
  const clearErrorOnInput = () => {
    setError("");
  };

  const toggleMode = () => {
    setMode(m => (m === "login" ? "register" : "login"));
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <Card className="w-full max-w-md border-border/80 card-glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Ingresa tu email y contraseña para acceder"
              : "Regístrate para comenzar a usar Forensic Legal Analyzer"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={clearErrorOnInput}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder={
                  mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"
                }
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={clearErrorOnInput}
                disabled={isLoading}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {isForgotPassword && (
              <div className="mt-4">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={clearErrorOnInput}
                  disabled={isLoading}
                  autoComplete="email"
                />
                <Button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="mt-2 w-full justify-end"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  onClick={() => {
                    // TODO: Implement password reset flow
                    setError("Función en desarrollo - pronto podrás restablecer tu contraseña por email");
                    setIsForgotPassword(false);
                  }}
                  disabled={isLoading}
                  className="mt-2 w-full"
                >
                  {isLoading ? "Enviando..." : "Enviar enlace"}
                </Button>
              </div>
            )}

            <Button
                type="submit"
                aria-label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
                className="w-full" disabled={isLoading}
              >
                {isLoading
                  ? "Procesando..."
                  : mode === "login"
                    ? "Iniciar sesión"
                    : "Crear cuenta"}
              </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              {mode === "login"
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
            <span className="ml-2 text-xs text-muted-foreground/60">
              <a href="/registro" className="text-primary hover:text-primary-500">
                Regístrate por separado
              </a>
            </span>
            <span className="ml-2 text-xs text-muted-foreground/60">
              <a
                href="#"
                onClick={() => setIsForgotPassword(true)}
                className="underline text-primary hover:text-primary-500"
                aria-label="Recuperar contraseña por email"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
