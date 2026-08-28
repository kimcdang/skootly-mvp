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
import FreightToFreedom from "./pages/FreightToFreedom";
import CreatorPacks from "./pages/CreatorPacks";
import AuthPage from "./pages/AuthPage";
import AccountSecurity from "./pages/AccountSecurity";
import PackEnrollment from "./pages/PackEnrollment";
import ConnectedAi from "./pages/ConnectedAi";
import CreatorInviteEnrollment from "./pages/CreatorInviteEnrollment";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/login" component={AuthPage} /><Route path="/account" component={AccountSecurity} /><Route path="/connect-ai" component={ConnectedAi} /><Route path="/join/:token" component={PackEnrollment} /><Route path="/creator/join/:token" component={CreatorInviteEnrollment} /><Route path="/founder">{() => <ExperimentPage version="founder" />}</Route><Route path="/freight-to-freedom" component={FreightToFreedom} /><Route path="/creator" component={CreatorPacks} /><Route path="/coach">{() => <ExperimentPage version="coach" />}</Route><Route path="/client-success">{() => <ExperimentPage version="client_success" />}</Route><Route path="/history" component={History} /><Route path="/lab" component={Lab} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><MascotProvider><Toaster position="top-center" /><Router /></MascotProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
