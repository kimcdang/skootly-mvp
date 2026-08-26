import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MemphisShapes, SkootlyHeader } from "@/components/SkootlyHeader";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { EXPERIMENTS, type ExperimentVersion } from "@shared/experiments";
import { useMascot } from "@/contexts/MascotContext";
import { ArrowRight, Check, CheckCircle2, Clock3, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const timeOptions = [
  ["15_minutes", "15 min"], ["30_minutes", "30 min"], ["60_minutes", "60 min"], ["90_plus_minutes", "90+ min"],
] as const;
const energyOptions = [["low", "Low"], ["steady", "Steady"], ["high", "High"]] as const;
const outcomeOptions = [
  ["no_result_yet", "No result yet"], ["made_progress", "Made progress"], ["completed_milestone", "Completed milestone"], ["received_reply", "Received reply"], ["booked_call", "Booked a call"], ["generated_revenue", "Generated revenue"], ["retained_client", "Retained client"], ["other", "Other"],
] as const;

type Props = { version: ExperimentVersion };
type CheckinFormState = {
  goal: string;
  currentState: string;
  blocker: string;
  availableTime: "15_minutes" | "30_minutes" | "60_minutes" | "90_plus_minutes";
  energyLevel: "low" | "steady" | "high";
  metricName: string;
  currentValue: string;
  targetValue: string;
  opportunities: string;
  constraints: string;
  optionalContext: string;
};

export default function ExperimentPage({ version }: Props) {
  const config = EXPERIMENTS[version];
  const mascot = useMascot();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const queryInput = useMemo(() => ({ experimentVersion: version }), [version]);
  const workspace = trpc.skootly.workspace.useQuery(queryInput, { enabled: Boolean(user) });
  const track = trpc.skootly.track.useMutation();
  const onboardingTracked = useRef(false);
  const highLevelStatus = trpc.highLevel.status.useQuery(undefined, { enabled: Boolean(user) && version === "founder" });
  const [highLevelContext, setHighLevelContext] = useState("");
  const [editing, setEditing] = useState(false);
  const [outcomeSkootId, setOutcomeSkootId] = useState<number | null>(null);
  const [form, setForm] = useState<CheckinFormState>({
    goal: "", currentState: "", blocker: "", availableTime: "30_minutes",
    energyLevel: "steady", metricName: "", currentValue: "", targetValue: "",
    opportunities: "", constraints: "", optionalContext: "",
  });

  const generate = trpc.skootly.generate.useMutation({
    onSuccess: async result => {
      await utils.skootly.workspace.invalidate(queryInput);
      await utils.skootly.history.invalidate();
      setEditing(false);
      toast.success(result.mode === "clarification" ? "One quick question will sharpen the recommendation." : "Your next move is ready.");
    },
    onError: error => toast.error(error.message),
  });
  const setStatus = trpc.skootly.setStatus.useMutation({
    onSuccess: async (_, variables) => {
      await utils.skootly.workspace.invalidate(queryInput);
      await utils.skootly.history.invalidate();
      if (variables.status === "completed") {
        mascot.celebrateCompletion();
        window.setTimeout(() => setOutcomeSkootId(variables.skootId), 420);
      }
      else toast.success("Skipped. Skootly will remember the signal.");
    },
    onError: error => toast.error(error.message),
  });
  const pullHighLevel = trpc.highLevel.snapshot.useMutation({
    onSuccess: snapshot => {
      setHighLevelContext(snapshot.summary);
      toast.success("GoHighLevel context added to today’s check-in.");
    },
    onError: error => toast.error(error.message),
  });
  const startHighLevel = trpc.highLevel.start.useMutation({
    onSuccess: result => window.location.assign(result.installUrl),
    onError: error => toast.error(error.message),
  });
  const selectHighLevel = trpc.highLevel.select.useMutation({
    onSuccess: async () => {
      setHighLevelContext("");
      await utils.highLevel.status.invalidate();
      toast.success("GoHighLevel location selected.");
    },
    onError: error => toast.error(error.message),
  });
  const disconnectHighLevel = trpc.highLevel.disconnect.useMutation({
    onSuccess: async () => {
      setHighLevelContext("");
      await utils.highLevel.status.invalidate();
      toast.success("GoHighLevel account disconnected from your Skootly workspace.");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!user) return;
    const signupKey = `skootly-signup-completed-${version}`;
    if (!localStorage.getItem(signupKey)) {
      localStorage.setItem(signupKey, "true");
      track.mutate({ experimentVersion: version, eventName: "signup_completed" });
    }
    if (!workspace.isLoading && !workspace.data && !onboardingTracked.current) {
      onboardingTracked.current = true;
      track.mutate({ experimentVersion: version, eventName: "onboarding_started" });
    }
  }, [track, user, version, workspace.data, workspace.isLoading]);

  useEffect(() => {
    mascot.setThinking(generate.isPending);
    return () => mascot.setThinking(false);
  }, [generate.isPending, mascot]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    generate.mutate({ experimentVersion: version, ...form, highLevelContext: highLevelContext || undefined });
  };

  if (loading) return <div className="full-loader"><Loader2 className="size-6 animate-spin" /> Warming up Skootly…</div>;

  if (!user) {
    return (
      <div className={`experiment-intro experiment-intro--${config.accent}`}>
        <SkootlyHeader />
        <MemphisShapes quiet />
        <main className="experiment-intro__content">
          <span className="mini-label">{config.eyebrow}</span>
          <h1>{config.positioning}</h1>
          <p>{config.promise}</p>
          <Button size="lg" className="skoot-button skoot-button--black" onClick={async () => { await track.mutateAsync({ experimentVersion: version, eventName: "signup_started" }).catch(() => undefined); startLogin(); }}>
            Sign in to begin <ArrowRight className="size-5" />
          </Button>
          <div className="intro-steps"><span>01 Check in</span><span>02 Find the bottleneck</span><span>03 Make the move</span></div>
        </main>
      </div>
    );
  }

  if (workspace.error) {
    return <div className="workspace-page"><SkootlyHeader compact /><main className="workspace-shell"><section className="clarification-card"><Sparkles className="size-8" /><span className="mini-label">WE HIT A SNAG</span><h1>Your workspace is temporarily unavailable.</h1><p>{workspace.error.message}</p><Button className="skoot-button skoot-button--black" onClick={() => workspace.refetch()}>Try again <ArrowRight className="size-4" /></Button></section></main></div>;
  }

  const data = workspace.data;
  const selectedHighLevel = highLevelStatus.data?.connections.find(connection => connection.selected);
  const showForm = editing || !data;
  return (
    <div className="workspace-page">
      <SkootlyHeader compact />
      <main className="workspace-shell">
        {workspace.isLoading ? (
          <div className="workspace-loading"><Loader2 className="size-6 animate-spin" /><span>Finding the useful signal…</span></div>
        ) : showForm ? (
          <section className="checkin-layout">
            <aside className={`checkin-aside checkin-aside--${config.accent}`}>
              <span className="mini-label">TODAY'S CHECK-IN</span>
              <h1>What deserves your attention?</h1>
              <p>{config.promise}</p>
              <div className="aside-rule" />
              <small>{config.contextPrompt}</small>
            </aside>
            <form className="checkin-form" onSubmit={submit}>
              <div className="form-heading"><span>About 2 minutes</span>{data ? <button type="button" onClick={() => setEditing(false)}>Cancel</button> : null}</div>
              {config.demoContext ? <div className="fictional-demo"><div><span>FICTIONAL SAMPLE DATA</span><p>Load a clearly labeled sample account for a live demo. It does not represent a real customer or testimonial.</p></div><Button type="button" variant="outline" onClick={() => setForm({ ...form, ...config.demoContext! })}>Load sample</Button></div> : null}
              <FormField label={config.goalLabel} required><Textarea value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} placeholder="Make the outcome concrete…" /></FormField>
              <FormField label={config.stateLabel} required><Textarea value={form.currentState} onChange={e => setForm({ ...form, currentState: e.target.value })} placeholder="What has happened recently?" /></FormField>
              <FormField label={config.blockerLabel} required><Textarea value={form.blocker} onChange={e => setForm({ ...form, blocker: e.target.value })} placeholder="Name the friction, uncertainty, or constraint…" /></FormField>
              <div className="form-grid">
                <ChoiceField label="Time available today" value={form.availableTime} options={timeOptions} onChange={value => setForm({ ...form, availableTime: value })} />
                <ChoiceField label="Energy level" value={form.energyLevel} options={energyOptions} onChange={value => setForm({ ...form, energyLevel: value })} />
              </div>
              <div className="metric-grid">
                <FormField label="Metric (optional)"><Input value={form.metricName} onChange={e => setForm({ ...form, metricName: e.target.value })} placeholder="Collected revenue" /></FormField>
                <FormField label="Current"><Input value={form.currentValue} onChange={e => setForm({ ...form, currentValue: e.target.value })} placeholder="$11,200" /></FormField>
                <FormField label="Target"><Input value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} placeholder="$30,000" /></FormField>
              </div>
              <FormField label="Opportunities already available"><Textarea value={form.opportunities} onChange={e => setForm({ ...form, opportunities: e.target.value })} placeholder="Warm leads, customers, audience, resources…" /></FormField>
              {version === "founder" ? (
                <div className={`highlevel-card ${highLevelContext ? "highlevel-card--ready" : ""}`}>
                  <div>
                    <span className="card-kicker">GOHIGHLEVEL CONTEXT</span>
                    <strong>{highLevelContext ? "CRM context ready" : selectedHighLevel ? `Connected to ${selectedHighLevel.locationName || selectedHighLevel.locationId}` : highLevelStatus.data?.mode === "founder_test" ? "Founder test connection active" : highLevelStatus.data?.oauthConfigured ? "Connect your HighLevel account" : "HighLevel customer connections coming online"}</strong>
                    <p>{highLevelContext || (selectedHighLevel || highLevelStatus.data?.mode === "founder_test" ? "Skootly summarizes contacts, open opportunities, pipeline value, and stale deals without sending raw CRM records to the recommendation model." : highLevelStatus.data?.oauthConfigured ? "Authorize only your own HighLevel location. Every connection and CRM summary stays isolated to your signed-in Skootly workspace." : "The per-user OAuth foundation is installed. The HighLevel Marketplace client credentials and installation link still need to be configured before customers can connect.")}</p>
                    {highLevelStatus.data?.connections.length ? <div className="highlevel-locations">{highLevelStatus.data.connections.map(connection => <button type="button" key={connection.id} className={connection.selected ? "highlevel-location highlevel-location--selected" : "highlevel-location"} onClick={() => !connection.selected && selectHighLevel.mutate({ connectionId: connection.id })}>{connection.locationName || connection.locationId}{connection.selected ? " · selected" : ""}</button>)}</div> : null}
                  </div>
                  <div className="highlevel-actions">
                    {highLevelStatus.data?.configured ? <Button type="button" variant="outline" disabled={pullHighLevel.isPending} onClick={() => pullHighLevel.mutate()}>{pullHighLevel.isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} {highLevelContext ? "Refresh" : "Pull context"}</Button> : null}
                    {highLevelStatus.data?.oauthConfigured ? <Button type="button" variant="outline" disabled={startHighLevel.isPending} onClick={() => startHighLevel.mutate({ returnPath: "/founder" })}>{startHighLevel.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} {selectedHighLevel ? "Add location" : "Connect HighLevel"}</Button> : null}
                    {selectedHighLevel ? <Button type="button" variant="ghost" disabled={disconnectHighLevel.isPending} onClick={() => disconnectHighLevel.mutate({ connectionId: selectedHighLevel.id })}>Disconnect</Button> : null}
                  </div>
                </div>
              ) : null}
              <FormField label="Constraints or extra context"><Textarea value={form.constraints} onChange={e => setForm({ ...form, constraints: e.target.value })} placeholder="Deadlines, dependencies, decisions already made…" /></FormField>
              <Button disabled={generate.isPending} size="lg" className="skoot-button skoot-button--black w-full">
                {generate.isPending ? <><Loader2 className="size-5 animate-spin" /> Finding your next move…</> : <>Show me what matters <ArrowRight className="size-5" /></>}
              </Button>
            </form>
          </section>
        ) : data.mode === "clarification" ? (
          <section className="clarification-card">
            <Sparkles className="size-8" /><span className="mini-label">ONE USEFUL QUESTION</span>
            <h1>{data.clarificationQuestion}</h1>
            <p>Skootly needs this answer to make a responsible decision instead of guessing.</p>
            <Button className="skoot-button skoot-button--black" onClick={() => setEditing(true)}>Update context <ArrowRight className="size-4" /></Button>
          </section>
        ) : (
          <section className="focus-view">
            <div className="focus-topline"><div><span className="mini-label">WHAT MATTERS TODAY</span><h1>One bottleneck.<br />One clear move.</h1></div><Button variant="outline" className="rounded-full border-2 border-black" onClick={() => setEditing(true)}><RotateCcw className="size-4" /> Update context</Button></div>
            <div className="focus-grid">
              <article className="bottleneck-card">
                <span className="card-kicker">YOUR BOTTLENECK</span>
                <h2>{data.recommendation.bottleneck}</h2>
                <p>{data.recommendation.rationale}</p>
                <div className="goal-chip"><span>GOAL</span>{data.recommendation.goalSummary}</div>
              </article>
              <div className="skoot-stack">
                <span className="card-kicker">YOUR SKOOTS</span>
                {data.skoots.map(skoot => (
                  <article id={skoot.position === 1 ? "current-skoot" : undefined} key={skoot.id} className={`skoot-card ${skoot.status !== "active" ? "skoot-card--done" : ""}`}>
                    <div className="skoot-position">0{skoot.position}</div>
                    <div className="skoot-copy"><div className="impact-pill">{skoot.estimatedImpact} impact</div><h3>{skoot.title}</h3><p>{skoot.reasoning}</p>
                      {skoot.status === "active" ? <div className="skoot-actions"><Button onClick={() => setStatus.mutate({ skootId: skoot.id, status: "completed" })}><Check className="size-4" /> Done</Button><Button variant="ghost" onClick={() => setStatus.mutate({ skootId: skoot.id, status: "skipped" })}><X className="size-4" /> Skip</Button></div> : <div className="completed-label"><CheckCircle2 className="size-4" /> {skoot.status}</div>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <article className="not-today-card"><div><span className="card-kicker">NOT TODAY</span><p>{data.recommendation.notTodayReason}</p></div><ul>{data.recommendation.notTodayItems.map(item => <li key={item}><X className="size-4" /> {item}</li>)}</ul></article>
          </section>
        )}
      </main>
      <OutcomeDialog skootId={outcomeSkootId} nextTitle={data?.mode === "recommendation" ? data.skoots.find(skoot => skoot.status === "active" && skoot.id !== outcomeSkootId)?.title : undefined} onClose={() => setOutcomeSkootId(null)} />
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="form-field"><Label>{label}{required ? <span> *</span> : null}</Label>{children}</div>;
}

function ChoiceField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void }) {
  return <div className="form-field"><Label>{label}</Label><div className="choice-row">{options.map(([key, text]) => <button type="button" key={key} className={value === key ? "choice-pill choice-pill--active" : "choice-pill"} onClick={() => onChange(key)}>{text}</button>)}</div></div>;
}

function OutcomeDialog({ skootId, nextTitle, onClose }: { skootId: number | null; nextTitle?: string; onClose: () => void }) {
  const mascot = useMascot();
  const utils = trpc.useUtils();
  const [outcomeType, setOutcomeType] = useState<(typeof outcomeOptions)[number][0]>("made_progress");
  const [revenueAmount, setRevenueAmount] = useState("");
  const [notes, setNotes] = useState("");
  const report = trpc.skootly.reportOutcome.useMutation({ onSuccess: async () => { await utils.skootly.history.invalidate(); mascot.respondToOutcome(outcomeType, nextTitle); toast.success("Outcome saved. This makes the next Skoot smarter."); onClose(); }, onError: error => toast.error(error.message) });
  return <Dialog open={skootId !== null} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="outcome-dialog"><DialogHeader><DialogTitle>What happened?</DialogTitle><DialogDescription>The result matters more than checking a box.</DialogDescription></DialogHeader><div className="outcome-options">{outcomeOptions.map(([key, label]) => <button key={key} className={outcomeType === key ? "outcome-option outcome-option--active" : "outcome-option"} onClick={() => setOutcomeType(key)}>{label}</button>)}</div><FormField label="Revenue generated (optional)"><Input type="number" min="0" value={revenueAmount} onChange={e => setRevenueAmount(e.target.value)} placeholder="2500" /></FormField><FormField label="Notes (optional)"><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What changed?" /></FormField><Button className="skoot-button skoot-button--black w-full" disabled={report.isPending} onClick={() => skootId && report.mutate({ skootId, outcomeType, revenueAmount: revenueAmount ? Number(revenueAmount) : undefined, notes })}>{report.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save outcome</Button></DialogContent></Dialog>;
}
