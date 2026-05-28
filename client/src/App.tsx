import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Analyses from "./pages/Analyses";
import AnalysisDetail from "./pages/AnalysisDetail";
import Reports from "./pages/Reports";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import ImageComparison from "./pages/ImageComparison";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import Evidence from "./pages/Evidence";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
      <Route path="/admin" component={Admin} />
      <Route path="/pago/exito" component={PaymentSuccess} />
      <Route path="/pago/cancelado" component={PaymentCancelled} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
