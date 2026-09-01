import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { nextMascotPanelState } from "@/lib/mascotState";
import { experimentFromPath, type ExperimentVersion } from "@shared/experiments";
import { ArrowRight, ChevronDown, Grip, Sparkles, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";

const MASCOT_ASSET = "/manus-storage/skootly-mascot_373b2c83.png";
const MINIMIZED_KEY = "skootly-mascot-minimized";
const LAST_VISIT_KEY = "skootly-mascot-last-visit";
const LAST_REMINDER_KEY = "skootly-mascot-last-reminder";

export type MascotNotificationType =
  | "new_skoot"
  | "reminder"
  | "completion"
  | "outcome_request"
  | "milestone_complete"
  | "new_bottleneck"
  | "daily_ready";

export type MascotNotification = {
  id: string;
  notification_type: MascotNotificationType;
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
  read: boolean;
  created_at: number;
  dismissed_at: number | null;
};

type MascotContextValue = {
  setThinking: (thinking: boolean) => void;
  celebrateCompletion: () => void;
  respondToOutcome: (outcomeType: string, nextTitle?: string) => void;
  showDemo: (type: "new_skoot" | "reminder" | "completion" | "revenue" | "new_bottleneck") => void;
  resetMascot: () => void;
};

const MascotContext = createContext<MascotContextValue | null>(null);

export function useMascot() {
  const value = useContext(MascotContext);
  if (!value) throw new Error("useMascot must be used inside MascotProvider");
  return value;
}

export function createMascotNotification(
  notification_type: MascotNotificationType,
  title: string,
  message: string,
  action_label?: string,
  action_url?: string,
): MascotNotification {
  return {
    id: `${Date.now()}-${notification_type}`,
    notification_type,
    title,
    message,
    action_label,
    action_url,
    read: false,
    created_at: Date.now(),
    dismissed_at: null,
  };
}

const notification = createMascotNotification;

export function shouldScheduleIdleReminder(input: {
  now: number;
  lastReminder: number;
  hasActiveSkoot: boolean;
  userPresent: boolean;
}) {
  return (
    input.userPresent &&
    input.hasActiveSkoot &&
    input.now - input.lastReminder >= 20 * 60 * 60 * 1000
  );
}

export function MascotProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const routeVersion = experimentFromPath(location);
  const version = (routeVersion ?? "founder") as ExperimentVersion;
  const queryInput = useMemo(() => ({ experimentVersion: version }), [version]);
  const workspace = trpc.skootly.workspace.useQuery(queryInput, {
    enabled: Boolean(user) && location !== "/",
    staleTime: 20_000,
  });
  const [minimized, setMinimized] = useState(() => localStorage.getItem(MINIMIZED_KEY) === "true");
  const [panelOpen, setPanelOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [notice, setNotice] = useState<MascotNotification | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  const recommendation = workspace.data?.mode === "recommendation" ? workspace.data : null;
  const activeSkoots = recommendation?.skoots.filter(skoot => skoot.status === "active") ?? [];
  const nextSkoot = activeSkoots[0] ?? null;

  const showNotice = useCallback((value: MascotNotification) => {
    setNotice(value);
    setPanelOpen(false);
    setMinimized(false);
    localStorage.setItem(MINIMIZED_KEY, "false");
  }, []);

  const celebrateCompletion = useCallback(() => {
    setCelebrating(true);
    showNotice(
      notification(
        "outcome_request",
        "Skoot complete.",
        "What happened? Log the result while it is fresh.",
        "Log outcome",
      ),
    );
    window.setTimeout(() => setCelebrating(false), 700);
  }, [showNotice]);

  const respondToOutcome = useCallback(
    (outcomeType: string, nextTitle?: string) => {
      const message =
        outcomeType === "generated_revenue"
          ? "That moved the needle."
          : outcomeType === "completed_milestone"
            ? "Milestone cleared. Finding your next bottleneck…"
            : outcomeType === "no_result_yet"
              ? "Logged. We’ll use that to choose better next time."
              : "Good. Keep moving.";
      showNotice(
        notification(
          outcomeType === "completed_milestone" ? "milestone_complete" : "completion",
          message,
          nextTitle ? `Next up: ${nextTitle}` : "Your result is saved for the next recommendation.",
          nextTitle ? "View Skoot" : undefined,
          nextTitle ? EXPERIMENT_PATHS[version] : undefined,
        ),
      );
    },
    [showNotice, version],
  );

  const showDemo = useCallback(
    (type: "new_skoot" | "reminder" | "completion" | "revenue" | "new_bottleneck") => {
      const examples = {
        new_skoot: notification("new_skoot", "You’ve got 2 Skoots today.", "Your highest-leverage move is ready.", "View Skoot", EXPERIMENT_PATHS[version]),
        reminder: notification("reminder", "Still working on your first Skoot?", "You only need to finish one thing right now.", "View Skoot", EXPERIMENT_PATHS[version]),
        completion: notification("outcome_request", "Skoot complete.", "What happened?", "Log outcome"),
        revenue: notification("completion", "That moved the needle.", "$2,500 in revenue logged. Your next Skoot is ready.", "View Skoot", EXPERIMENT_PATHS[version]),
        new_bottleneck: notification("new_bottleneck", "Next bottleneck found.", "Contact 3 previous customers.", "View Skoot", EXPERIMENT_PATHS[version]),
      } as const;
      if (type === "completion" || type === "revenue") {
        setCelebrating(true);
        window.setTimeout(() => setCelebrating(false), 700);
      }
      showNotice(examples[type]);
    },
    [showNotice, version],
  );

  const resetMascot = useCallback(() => {
    setNotice(null);
    setPanelOpen(false);
    setThinking(false);
    setCelebrating(false);
    setMinimized(false);
    setDrag({ x: 0, y: 0 });
    localStorage.removeItem(MINIMIZED_KEY);
    localStorage.removeItem(LAST_REMINDER_KEY);
    localStorage.removeItem(LAST_VISIT_KEY);
  }, []);

  useEffect(() => {
    const lastReminder = Number(localStorage.getItem(LAST_REMINDER_KEY) ?? 0);
    if (!shouldScheduleIdleReminder({
      now: Date.now(),
      lastReminder,
      hasActiveSkoot: Boolean(nextSkoot),
      userPresent: Boolean(user),
    })) return;
    const timer = window.setTimeout(() => {
      showNotice(
        notification(
          "reminder",
          "Still working on your Skoot?",
          "You only need to finish one thing right now.",
          "View Skoot",
          EXPERIMENT_PATHS[version],
        ),
      );
      localStorage.setItem(LAST_REMINDER_KEY, String(Date.now()));
    }, 25 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [nextSkoot, showNotice, user, version]);

  useEffect(() => {
    if (!user || workspace.isLoading || !workspace.data) return;
    const lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY) ?? 0);
    const isReturnVisit = lastVisit > 0 && Date.now() - lastVisit > 6 * 60 * 60 * 1000;
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    if (isReturnVisit && activeSkoots.length > 0 && !notice) {
      showNotice(
        notification(
          "daily_ready",
          "Welcome back.",
          `You still have ${activeSkoots.length === 1 ? "one move" : `${activeSkoots.length} moves`} left.`,
          "View Skoot",
          EXPERIMENT_PATHS[version],
        ),
      );
    }
  }, [activeSkoots.length, notice, showNotice, user, version, workspace.data, workspace.isLoading]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragStart.current || window.innerWidth < 768) return;
      setDrag({
        x: dragStart.current.x + event.clientX - dragStart.current.pointerX,
        y: dragStart.current.y + event.clientY - dragStart.current.pointerY,
      });
    };
    const stop = () => { dragStart.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, []);

  const contextValue = useMemo(
    () => ({ setThinking, celebrateCompletion, respondToOutcome, showDemo, resetMascot }),
    [celebrateCompletion, resetMascot, respondToOutcome, showDemo],
  );

  const hideOnRoute = !user || location === "/";

  return (
    <MascotContext.Provider value={contextValue}>
      {children}
      {!hideOnRoute ? (
        <aside
          className={`mascot-dock ${minimized ? "mascot-dock--minimized" : ""} ${thinking ? "mascot-dock--thinking" : ""} ${celebrating ? "mascot-dock--celebrating" : ""}`}
          style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0)` }}
          aria-label="Skootly execution coach"
        >
          {!minimized && notice && !notice.dismissed_at ? (
            <div className="mascot-notice" role="status">
              <button className="mascot-notice__close" aria-label="Dismiss notification" onClick={() => setNotice({ ...notice, read: true, dismissed_at: Date.now() })}><X className="size-4" /></button>
              <span>{notice.title}</span>
              <p>{notice.message}</p>
              {notice.action_label ? <button onClick={() => { if (notice.action_url) setLocation(notice.action_url); setPanelOpen(true); setNotice({ ...notice, read: true }); }}>{notice.action_label} <ArrowRight className="size-3.5" /></button> : null}
            </div>
          ) : null}

          {!minimized && panelOpen ? (
            <div className="mascot-panel">
              <div className="mascot-panel__top"><span>Your next move</span><button aria-label="Close mascot panel" onClick={() => setPanelOpen(false)}><X className="size-4" /></button></div>
              {thinking ? <><strong>Finding your next move…</strong><p>I’m looking for the useful constraint, not more ideas.</p></> : workspace.data?.mode === "clarification" ? <><strong>I need one answer before I can choose your next move.</strong><Button onClick={() => setLocation(EXPERIMENT_PATHS[version])}>Answer question</Button></> : nextSkoot ? <><strong>{nextSkoot.title}</strong><p>{recommendation?.recommendation.rationale}</p><Button onClick={() => { setLocation(EXPERIMENT_PATHS[version]); setPanelOpen(false); window.setTimeout(() => document.getElementById("current-skoot")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120); }}>View Skoot <ArrowRight className="size-4" /></Button></> : <><strong>You’re clear for today.</strong><p>Update Skootly when the goal or context changes.</p><Button onClick={() => setLocation(EXPERIMENT_PATHS[version])}>Update Skootly</Button></>}
            </div>
          ) : null}

          <div className="mascot-anchor">
            {!minimized ? <button className="mascot-drag" aria-label="Drag mascot" onPointerDown={event => { dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, x: drag.x, y: drag.y }; }}><Grip className="size-4" /></button> : null}
            <button type="button" className="mascot-character" aria-label={panelOpen ? "Close Skootly coach" : "Open Skootly coach"} onClick={() => { const next = nextMascotPanelState(minimized, panelOpen); setMinimized(next.minimized); setPanelOpen(next.panelOpen); localStorage.setItem(MINIMIZED_KEY, String(next.minimized)); if (notice) setNotice({ ...notice, read: true }); }}>
              <img src={MASCOT_ASSET} alt="Skootly mascot" />
              {thinking ? <span className="mascot-thinking"><Sparkles className="size-4" /></span> : null}
              {notice && !notice.read ? <span className="mascot-unread" /> : null}
            </button>
            {!minimized ? <button className="mascot-minimize" aria-label="Minimize mascot" onClick={() => { setMinimized(true); setPanelOpen(false); setNotice(null); localStorage.setItem(MINIMIZED_KEY, "true"); }}><ChevronDown className="size-4" /></button> : null}
          </div>
        </aside>
      ) : null}
    </MascotContext.Provider>
  );
}

const EXPERIMENT_PATHS: Record<ExperimentVersion, string> = {
  founder: "/founder",
  coach: "/coach",
  client_success: "/client-success",
};
