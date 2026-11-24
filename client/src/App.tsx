import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { Spinner } from "@/components/ui/spinner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Cases = lazy(() => import("./pages/Cases"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const Analyses = lazy(() => import("./pages/Analyses"));
const AnalysisDetail = lazy(() => import("./pages/AnalysisDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Admin = lazy(() => import("./pages/Admin"));
const ImageComparison = lazy(() => import("./pages/ImageComparison"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const Evidence = lazy(() => import("./pages/Evidence"));
const Register = lazy(() => import("./pages/Registro"));

function LoadingFallback() {
  // A lazy chunk fetch has no timeout: on a stalled network the fallback
  // would sit on "Cargando..." forever. After 15s, say so and offer a
  // reload instead of leaving a dead loading indicator mounted.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-8 w-8 text-foreground" />
        {slow ? (
          <>
            <p className="text-sm text-muted-foreground">
              La página está tardando en cargar…
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 cursor-pointer"
            >
              Recargar
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        )}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/casos" component={Cases} />
        <Route path="/casos/:id" component={CaseDetail} />
        <Route path="/casos/:caseId/compare" component={ImageComparison} />
        <Route
          path="/casos/:caseId/compare/:comparisonId"
          component={ImageComparison}
        />
        <Route path="/analisis" component={Analyses} />
        <Route path="/analisis/:id" component={AnalysisDetail} />
        <Route path="/evidencia" component={Evidence} />
        <Route path="/reportes" component={Reports} />
        <Route path="/suscripcion" component={Subscription} />
        <Route path="/registro" component={Register} />
        <Route path="/admin" component={Admin} />
        <Route path="/pago/exito" component={PaymentSuccess} />
        <Route path="/pago/cancelado" component={PaymentCancelled} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
