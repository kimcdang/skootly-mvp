import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { MascotProvider } from "./contexts/MascotContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ExperimentPage from "./pages/ExperimentPage";
import History from "./pages/History";
import Home from "./pages/Home";
import Lab from "./pages/Lab";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/founder">{() => <ExperimentPage version="founder" />}</Route><Route path="/coach">{() => <ExperimentPage version="coach" />}</Route><Route path="/client-success">{() => <ExperimentPage version="client_success" />}</Route><Route path="/history" component={History} /><Route path="/lab" component={Lab} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><MascotProvider><Toaster position="top-center" /><Router /></MascotProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
