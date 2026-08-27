import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LearningContextPanel } from "@/components/LearningContextPanel";
import { EscalationPanel } from "@/components/EscalationPanel";
import { MemphisShapes, SkootlyHeader } from "@/components/SkootlyHeader";
import { SkootConversationPanel } from "@/components/SkootConversationPanel";
import { SkootPromptPanel } from "@/components/SkootPromptPanel";
import { PackExecutionPanel } from "@/components/PackExecutionPanel";
import { useMascot } from "@/contexts/MascotContext";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { EXPERIMENTS, type ExperimentVersion } from "@shared/experiments";
import { ArrowRight, Check, CheckCircle2, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Props = { version: ExperimentVersion };
type CheckinForm = {
  goal: string; currentState: string; blocker: string;
  availableTime: "15_minutes" | "30_minutes" | "60_minutes" | "90_plus_minutes";
  energyLevel: "low" | "steady" | "high";
  metricName: string; currentValue: string; targetValue: string; opportunities: string; constraints: string; optionalContext: string;
};
const timeOptions = [["15_minutes", "15 min"], ["30_minutes", "30 min"], ["60_minutes", "60 min"], ["90_plus_minutes", "90+ min"]] as const;
const energyOptions = [["low", "Low"], ["steady", "Steady"], ["high", "High"]] as const;
const outcomeOptions = [["made_progress", "Made progress"], ["completed_milestone", "Completed milestone"], ["received_reply", "Received reply"], ["booked_call", "Booked a call"], ["generated_revenue", "Generated revenue"], ["other", "Other"]] as const;

export default function ExperimentPage({ version }: Props) {
  const config = EXPERIMENTS[version];
  const { user, loading } = useAuth();
  const mascot = useMascot();
  const utils = trpc.useUtils();
  const queryInput = useMemo(() => ({ experimentVersion: version }), [version]);
  const workspace = trpc.skootly.workspace.useQuery(queryInput, { enabled: Boolean(user) });
  const journey = trpc.creatorPacks.myJourney.useQuery(undefined, { enabled: Boolean(user) });
  const packExecution = trpc.creatorPacks.myExecution.useQuery(undefined, { enabled: Boolean(user) });
  const track = trpc.skootly.track.useMutation();
  const onboardingTracked = useRef(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showContext, setShowContext] = useState(false);
  const [editing, setEditing] = useState(false);
  const [outcomeSkootId, setOutcomeSkootId] = useState<number | null>(null);
  const [form, setForm] = useState<CheckinForm>({ goal: "", currentState: "", blocker: "", availableTime: "30_minutes", energyLevel: "steady", metricName: "", currentValue: "", targetValue: "", opportunities: "", constraints: "", optionalContext: "" });

  const generate = trpc.skootly.generate.useMutation({
    onSuccess: async result => { await utils.skootly.workspace.invalidate(queryInput); await utils.skootly.history.invalidate(); setEditing(false); toast.success(result.mode === "clarification" ? "One quick answer will sharpen your route." : "Your next move is ready."); },
    onError: error => toast.error(error.message),
  });
  const answerDiagnostic = trpc.creatorPacks.answerDiagnostic.useMutation({
    onSuccess: async () => { await journey.refetch(); toast.success("Got it. I’m locating your next turn."); },
    onError: error => toast.error(error.message),
  });
  const setStatus = trpc.skootly.setStatus.useMutation({
    onSuccess: async (_, variables) => { await utils.skootly.workspace.invalidate(queryInput); await utils.skootly.history.invalidate(); if (variables.status === "completed") { mascot.celebrateCompletion(); window.setTimeout(() => setOutcomeSkootId(variables.skootId), 360); } else toast.success("Not today is noted. One clear move is still enough."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!user) return;
    const key = `skootly-signup-completed-${version}`;
    if (!localStorage.getItem(key)) { localStorage.setItem(key, "true"); track.mutate({ experimentVersion: version, eventName: "signup_completed" }); }
    if (!workspace.isLoading && !workspace.data && !onboardingTracked.current) { onboardingTracked.current = true; track.mutate({ experimentVersion: version, eventName: "onboarding_started" }); }
  }, [track, user, version, workspace.data, workspace.isLoading]);
  useEffect(() => { mascot.setThinking(generate.isPending || answerDiagnostic.isPending); return () => mascot.setThinking(false); }, [answerDiagnostic.isPending, generate.isPending, mascot]);

  const submit = (event: React.FormEvent) => { event.preventDefault(); generate.mutate({ experimentVersion: version, ...form, currentState: form.currentState || "Starting point is being mapped." }); };
  const generateFromPack = () => {
    if (!journey.data) return;
    const answers = journey.data.answers.map(item => `${item.questionText}: ${item.answer}`).join("; ");
    generate.mutate({ experimentVersion: version, goal: journey.data.destination, currentState: `Pack journey: milestone ${journey.data.currentMilestone} of ${journey.data.milestoneCount}. ${answers}`, blocker: "Identify the most useful next Pack action from the student’s current point.", availableTime: form.availableTime, energyLevel: form.energyLevel });
  };

  if (loading) return <div className="full-loader"><Loader2 className="size-6 animate-spin" /> Warming up Skootly…</div>;
  if (!user) return <div className={`experiment-intro experiment-intro--${config.accent}`}><SkootlyHeader /><MemphisShapes quiet /><main className="experiment-intro__content"><span className="mini-label">{config.eyebrow}</span><h1>{config.positioning}</h1><p>{config.promise}</p><Button size="lg" className="skoot-button skoot-button--black" onClick={async () => { await track.mutateAsync({ experimentVersion: version, eventName: "signup_started" }).catch(() => undefined); startLogin(); }}>Sign in to begin <ArrowRight className="size-5" /></Button><div className="intro-steps"><span>01 Find the outcome</span><span>02 Locate the bottleneck</span><span>03 Make the move</span></div></main></div>;
  if (workspace.error) return <div className="workspace-page"><SkootlyHeader compact /><main className="workspace-shell"><section className="clarification-card"><Sparkles className="size-8" /><span className="mini-label">WE HIT A SNAG</span><h1>Your workspace is temporarily unavailable.</h1><p>{workspace.error.message}</p><Button className="skoot-button skoot-button--black" onClick={() => workspace.refetch()}>Try again <ArrowRight className="size-4" /></Button></section></main></div>;

  const data = workspace.data;
  const packFirstRun = Boolean(!data && !editing && journey.data && !packExecution.data);
  return <div className="workspace-page"><SkootlyHeader compact /><main className="workspace-shell">
    {packExecution.data ? <PackExecutionPanel /> : workspace.isLoading ? <div className="workspace-loading"><Loader2 className="size-6 animate-spin" /><span>Finding the useful signal…</span></div> : packFirstRun && journey.data ? (
      <section className="pack-journey">
        <span className="mini-label">YOUR DESTINATION</span><h1>{journey.data.destination}</h1><p className="pack-journey__provenance">Powered by {journey.data.creatorName}’s {journey.data.packName} · Version {journey.data.versionNumber}</p>
        <div className="journey-progress"><span>Milestone {journey.data.currentMilestone} of {journey.data.milestoneCount}</span><div><i style={{ width: `${(journey.data.currentMilestone / journey.data.milestoneCount) * 100}%` }} /></div></div>
        {journey.data.nextQuestion ? <article className="journey-question"><span className="card-kicker">LET’S FIGURE OUT WHERE YOU ARE</span><h2>{journey.data.nextQuestion.text}</h2><p>I know where you’re headed. I just need one answer.</p><div className="journey-question__choices">{journey.data.nextQuestion.options.map(option => <Button key={option} disabled={answerDiagnostic.isPending} className="skoot-button skoot-button--black" onClick={() => answerDiagnostic.mutate({ questionKey: journey.data!.nextQuestion!.key, questionText: journey.data!.nextQuestion!.text, answer: option })}>{option}</Button>)}</div></article> : <article className="journey-question"><span className="card-kicker">POINT A FOUND</span><h2>Skootly has enough context to find your next turn.</h2><p>Your Pack provides the route. We’ll keep everything else out of the way.</p><Button className="skoot-button skoot-button--black" disabled={generate.isPending} onClick={generateFromPack}>{generate.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Find my next Skoot <ArrowRight className="size-4" /></Button></article>}
        <details className="secondary-tool"><summary>Add learning or business context</summary><LearningContextPanel /></details>
      </section>
    ) : (!data || editing) ? (
      <section className="checkin-layout"><aside className={`checkin-aside checkin-aside--${config.accent}`}><span className="mini-label">LET’S FIND YOUR NEXT MOVE</span><h1>{step === 1 ? "Start with one outcome." : step === 2 ? "Now name the constraint." : "Get one clear move."}</h1><p>Skootly only asks what it needs to make a responsible decision.</p><div className="aside-rule" /><small>Step {step} of 3 · Outcome → bottleneck → next move</small></aside><form className="checkin-form" onSubmit={submit}><div className="form-heading"><span>Step {step} of 3</span>{data ? <button type="button" onClick={() => setEditing(false)}>Cancel</button> : null}</div>
        {step === 1 ? <><FormField label="1. What outcome matters most right now?" required><Textarea value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} placeholder="For example: fill my challenge, close two sales calls, finish my lesson plan, or unblock a client." /></FormField><p className="guidance-copy">One outcome is enough.</p><Button type="button" className="skoot-button skoot-button--black w-full" disabled={!form.goal.trim()} onClick={() => setStep(2)}>Continue <ArrowRight className="size-4" /></Button></> : null}
        {step === 2 ? <><FormField label="2. What is getting in the way?" required><Textarea value={form.blocker} onChange={e => setForm({ ...form, blocker: e.target.value })} placeholder="Not enough leads, need to follow up, unclear offer, too many priorities, or need expert help…" /></FormField><FormField label="What has happened recently? (optional)"><Textarea value={form.currentState} onChange={e => setForm({ ...form, currentState: e.target.value })} placeholder="Share only what Skootly does not already know." /></FormField><div className="guided-actions"><Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button><Button type="button" className="skoot-button skoot-button--black" disabled={!form.blocker.trim()} onClick={() => setStep(3)}>Continue <ArrowRight className="size-4" /></Button></div></> : null}
        {step === 3 ? <><span className="mini-label">3. GET YOUR NEXT MOVE</span><h2 className="guided-final-heading">Give Skootly the minimum useful context.</h2><div className="form-grid"><ChoiceField label="Time available today" value={form.availableTime} options={timeOptions} onChange={value => setForm({ ...form, availableTime: value })} /><ChoiceField label="Energy level" value={form.energyLevel} options={energyOptions} onChange={value => setForm({ ...form, energyLevel: value })} /></div><button type="button" className="useful-context-toggle" onClick={() => setShowContext(!showContext)}>{showContext ? "Hide useful context" : "Add useful context"}</button>{showContext ? <><div className="metric-grid"><FormField label="Metric (optional)"><Input value={form.metricName} onChange={e => setForm({ ...form, metricName: e.target.value })} placeholder="Collected revenue" /></FormField><FormField label="Current"><Input value={form.currentValue} onChange={e => setForm({ ...form, currentValue: e.target.value })} placeholder="$11,200" /></FormField><FormField label="Target"><Input value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} placeholder="$30,000" /></FormField></div><FormField label="Opportunities already available"><Textarea value={form.opportunities} onChange={e => setForm({ ...form, opportunities: e.target.value })} placeholder="Warm leads, customers, audience, resources…" /></FormField><FormField label="Constraints or extra context"><Textarea value={form.constraints} onChange={e => setForm({ ...form, constraints: e.target.value })} placeholder="Deadlines, dependencies, decisions already made…" /></FormField><LearningContextPanel /></> : null}<div className="guided-actions"><Button type="button" variant="ghost" onClick={() => setStep(2)}>Back</Button><Button type="submit" disabled={generate.isPending} className="skoot-button skoot-button--black">{generate.isPending ? <Loader2 className="size-5 animate-spin" /> : null} Find my next Skoot <ArrowRight className="size-5" /></Button></div></> : null}
      </form></section>
    ) : data.mode === "clarification" ? <section className="clarification-card"><Sparkles className="size-8" /><span className="mini-label">ONE USEFUL QUESTION</span><h1>{data.clarificationQuestion}</h1><p>Skootly needs this answer to make a responsible decision instead of guessing.</p><Button className="skoot-button skoot-button--black" onClick={() => { setEditing(true); setStep(2); }}>Update context <ArrowRight className="size-4" /></Button></section> : (
      <section className="focus-view"><div className="focus-topline"><div><span className="mini-label">{journey.data ? "YOUR DESTINATION" : "WHAT MATTERS TODAY"}</span><h1>{journey.data ? journey.data.destination : <>One bottleneck.<br />One clear move.</>}</h1>{journey.data ? <p className="focus-destination-meta">Milestone {journey.data.currentMilestone} of {journey.data.milestoneCount} · Powered by {journey.data.creatorName}’s {journey.data.packName}</p> : null}</div><Button variant="outline" className="rounded-full border-2 border-black" onClick={() => { setEditing(true); setStep(1); }}><RotateCcw className="size-4" /> Update context</Button></div><div className="focus-grid"><article className="bottleneck-card"><span className="card-kicker">CURRENT BOTTLENECK</span><h2>{data.recommendation.bottleneck}</h2><p>{data.recommendation.rationale}</p><div className="goal-chip"><span>GOAL</span>{data.recommendation.goalSummary}</div></article><div className="skoot-stack"><span className="card-kicker">YOUR NEXT SKOOT</span>{data.skoots.map(skoot => <article id={skoot.position === 1 ? "current-skoot" : undefined} key={skoot.id} className={`skoot-card ${skoot.position === 2 ? "skoot-card--supporting" : ""} ${skoot.status !== "active" ? "skoot-card--done" : ""}`}><div className="skoot-position">0{skoot.position}</div><div className="skoot-copy"><div className="impact-pill">{skoot.estimatedImpact} impact</div><h3>{skoot.title}</h3><p>{skoot.reasoning}</p>{skoot.status === "active" ? <div className="skoot-actions"><Button onClick={() => setStatus.mutate({ skootId: skoot.id, status: "completed" })}><Check className="size-4" /> Done</Button><Button variant="ghost" onClick={() => document.getElementById("need-help")?.setAttribute("open", "true")}>Need help</Button><Button variant="ghost" onClick={() => setStatus.mutate({ skootId: skoot.id, status: "skipped" })}><X className="size-4" /> Not today</Button></div> : <div className="completed-label"><CheckCircle2 className="size-4" /> {skoot.status}</div>}</div></article>)}</div></div><article className="not-today-card"><div><span className="card-kicker">NOT TODAY</span><p>{data.recommendation.notTodayReason}</p></div><ul>{data.recommendation.notTodayItems.map(item => <li key={item}><X className="size-4" /> {item}</li>)}</ul></article>{data.learningCitations?.length ? <article className="learning-citation-card"><span className="card-kicker">COURSE CONTEXT CONSIDERED</span>{data.learningCitations.map(citation => <div key={citation.title}><strong>{citation.title}</strong>{citation.lessonUrl ? <a href={citation.lessonUrl} target="_blank" rel="noreferrer">Open authorized lesson <ArrowRight className="size-3" /></a> : null}</div>)}</article> : null}<details id="need-help" className="secondary-tool"><summary>Need help with this Skoot?</summary><EscalationPanel relatedSkootId={data.skoots.find(skoot => skoot.position === 1 && skoot.status === "active")?.id} /></details><details id="talk-it-through" className="secondary-tool"><summary>Want to talk it through?</summary><p className="secondary-tool__hint">Skoot already knows your active move. Use this space to get unstuck while you execute it.</p><SkootConversationPanel /></details><details className="secondary-tool"><summary>More ways to guide Skootly</summary><SkootPromptPanel /><LearningContextPanel /></details></section>
    )}
    {data?.mode === "recommendation" && data.packAttribution ? <article className="learning-citation-card pack-attribution-card"><span className="card-kicker">CREATOR PACK APPLIED</span><div><strong>{data.packAttribution.packName} · v{data.packAttribution.versionNumber}</strong><p>By {data.packAttribution.creatorName || "your creator"} · updated {new Date(data.packAttribution.updatedAt).toLocaleDateString()}</p>{data.packAttribution.appliedRule ? <small>Applied rule: {data.packAttribution.appliedRule}</small> : null}</div></article> : null}
  </main><OutcomeDialog skootId={outcomeSkootId} onClose={() => setOutcomeSkootId(null)} /></div>;
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="form-field"><Label>{label}{required ? <span> *</span> : null}</Label>{children}</div>; }
function ChoiceField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void }) { return <div className="form-field"><Label>{label}</Label><div className="choice-row">{options.map(([key, text]) => <button type="button" key={key} className={value === key ? "choice-pill choice-pill--active" : "choice-pill"} onClick={() => onChange(key)}>{text}</button>)}</div></div>; }
function OutcomeDialog({ skootId, onClose }: { skootId: number | null; onClose: () => void }) { const mascot = useMascot(); const utils = trpc.useUtils(); const [outcomeType, setOutcomeType] = useState<(typeof outcomeOptions)[number][0]>("made_progress"); const [revenueAmount, setRevenueAmount] = useState(""); const [notes, setNotes] = useState(""); const report = trpc.skootly.reportOutcome.useMutation({ onSuccess: async () => { await utils.skootly.history.invalidate(); mascot.respondToOutcome(outcomeType); toast.success("Outcome saved. This makes the next Skoot smarter."); onClose(); }, onError: error => toast.error(error.message) }); return <Dialog open={skootId !== null} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="outcome-dialog"><DialogHeader><DialogTitle>What happened?</DialogTitle><DialogDescription>The result matters more than checking a box.</DialogDescription></DialogHeader><div className="outcome-options">{outcomeOptions.map(([key, label]) => <button type="button" key={key} className={outcomeType === key ? "outcome-option outcome-option--active" : "outcome-option"} onClick={() => setOutcomeType(key)}>{label}</button>)}</div><FormField label="Revenue generated (optional)"><Input type="number" min="0" value={revenueAmount} onChange={e => setRevenueAmount(e.target.value)} placeholder="2500" /></FormField><FormField label="Notes (optional)"><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What changed?" /></FormField><Button className="skoot-button skoot-button--black w-full" disabled={report.isPending} onClick={() => skootId && report.mutate({ skootId, outcomeType, revenueAmount: revenueAmount ? Number(revenueAmount) : undefined, notes })}>{report.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save outcome</Button></DialogContent></Dialog>; }
