import { useAuth } from "@/_core/hooks/useAuth";
import { SkootlyHeader } from "@/components/SkootlyHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMascot } from "@/contexts/MascotContext";
import { trpc } from "@/lib/trpc";
import { EXPERIMENTS, type ExperimentVersion } from "@shared/experiments";
import {
  ArrowUpRight,
  Bell,
  Check,
  CircleDollarSign,
  Copy,
  Loader2,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const versions: ExperimentVersion[] = ["founder", "coach", "client_success"];

type FeedbackFormState = {
  experimentVersion: ExperimentVersion;
  participantName: string;
  perceivedPurpose: string;
  wouldUse: "definitely" | "maybe" | "no";
  wouldPay: "yes" | "maybe" | "no";
  suggestedMonthlyPrice: string;
  mostInterestingFeature: string;
  confusion: string;
  notes: string;
};

export default function Lab() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const mascot = useMascot();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const metrics = trpc.lab.metrics.useQuery(undefined, { enabled: user?.role === "admin" });
  const [form, setForm] = useState<FeedbackFormState>({
    experimentVersion: "founder",
    participantName: "",
    perceivedPurpose: "",
    wouldUse: "maybe",
    wouldPay: "maybe",
    suggestedMonthlyPrice: "",
    mostInterestingFeature: "",
    confusion: "",
    notes: "",
  });
  const save = trpc.lab.saveFeedback.useMutation({
    onSuccess: async () => {
      await utils.lab.metrics.invalidate();
      toast.success("Validation feedback saved.");
      setForm({
        ...form,
        participantName: "",
        perceivedPurpose: "",
        suggestedMonthlyPrice: "",
        mostInterestingFeature: "",
        confusion: "",
        notes: "",
      });
    },
    onError: error => toast.error(error.message),
  });

  if (loading) {
    return <div className="full-loader"><Loader2 className="size-6 animate-spin" /> Opening the lab…</div>;
  }
  if (!user || user.role !== "admin") {
    return <div className="workspace-page"><SkootlyHeader compact /><main className="lab-locked"><h1>Founder lab only.</h1><p>This area contains private validation notes and positioning results.</p></main></div>;
  }

  return (
    <div className="workspace-page">
      <SkootlyHeader compact />
      <main className="lab-shell">
        {metrics.error ? <div className="empty-history"><Target className="size-8" /><h2>Validation totals are temporarily unavailable.</h2><p>{metrics.error.message}</p><Button variant="outline" onClick={() => metrics.refetch()}>Try again</Button></div> : null}
        <div className="lab-heading">
          <div><span className="mini-label">FOUNDER VALIDATION LAB</span><h1>Which version has pull?</h1></div>
          <p>Run the same decision engine through three points of view. Capture what people understood before adding more product.</p>
        </div>

        <div className="lab-grid">
          {versions.map(version => {
            const item = EXPERIMENTS[version];
            const metric = metrics.data?.find(row => row.experimentVersion === version);
            return (
              <article className={`lab-card lab-card--${item.accent}`} key={version}>
                <span>{item.eyebrow}</span>
                <h2>{item.positioning}</h2>
                <div className="lab-stats">
                  <div><strong>{metric?.demos ?? 0}</strong><small>Demos</small></div>
                  <div><strong>{metric?.definitelyWouldUse ?? 0}</strong><small>Would use</small></div>
                  <div><strong>{metric?.wouldPay ?? 0}</strong><small>Would pay</small></div>
                  <div><strong>${Math.round(metric?.averageSuggestedPrice ?? 0)}</strong><small>Avg. price</small></div>
                </div>
                <div className="lab-actions">
                  <Button onClick={() => setLocation(item.route)}>Open demo <ArrowUpRight className="size-4" /></Button>
                  <Button variant="outline" onClick={() => { localStorage.removeItem(`skootly-draft-${version}`); toast.success("Local demo draft reset."); }}><RotateCcw className="size-4" /> Reset</Button>
                  <Button variant="ghost" aria-label="Copy demo URL" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${item.route}`).then(() => toast.success("Demo URL copied."))}><Copy className="size-4" /></Button>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mascot-demo-panel">
          <div className="mascot-demo-copy">
            <span className="mini-label">60-SECOND MASCOT DEMO</span>
            <h2>Make the execution coach feel alive.</h2>
            <p>Trigger each moment instantly during a customer interview. These controls change presentation state only; they do not fabricate customer activity or write demo outcomes to the database.</p>
          </div>
          <div className="mascot-demo-actions">
            <Button onClick={() => mascot.showDemo("new_skoot")}><Sparkles className="size-4" /> New Skoot</Button>
            <Button onClick={() => mascot.showDemo("reminder")}><Bell className="size-4" /> Reminder</Button>
            <Button onClick={() => mascot.showDemo("completion")}><PartyPopper className="size-4" /> Completion</Button>
            <Button onClick={() => mascot.showDemo("revenue")}><CircleDollarSign className="size-4" /> Revenue result</Button>
            <Button onClick={() => mascot.showDemo("new_bottleneck")}><Target className="size-4" /> Next bottleneck</Button>
            <Button variant="outline" onClick={() => { mascot.resetMascot(); toast.success("Mascot state reset."); }}><RotateCcw className="size-4" /> Reset mascot</Button>
          </div>
        </section>

        <section className="feedback-panel">
          <div><span className="mini-label">CAPTURE THE SIGNAL</span><h2>Record a demo conversation.</h2><p>Write down what they think Skootly does before explaining it. Confusion is useful evidence.</p></div>
          <form onSubmit={event => { event.preventDefault(); save.mutate({ ...form, suggestedMonthlyPrice: form.suggestedMonthlyPrice ? Number(form.suggestedMonthlyPrice) : undefined }); }}>
            <div className="feedback-two"><Field label="Name"><Input required value={form.participantName} onChange={e => setForm({ ...form, participantName: e.target.value })} /></Field><Field label="Version"><select value={form.experimentVersion} onChange={e => setForm({ ...form, experimentVersion: e.target.value as ExperimentVersion })}>{versions.map(version => <option value={version} key={version}>{version.replace("_", " ")}</option>)}</select></Field></div>
            <Field label="What do they think Skootly does?"><Textarea required value={form.perceivedPurpose} onChange={e => setForm({ ...form, perceivedPurpose: e.target.value })} /></Field>
            <div className="feedback-two"><Choice label="Would they use it?" value={form.wouldUse} options={["definitely", "maybe", "no"] as const} onChange={wouldUse => setForm({ ...form, wouldUse })} /><Choice label="Would they pay?" value={form.wouldPay} options={["yes", "maybe", "no"] as const} onChange={wouldPay => setForm({ ...form, wouldPay })} /></div>
            <Field label="What would they pay monthly?"><Input type="number" min="0" value={form.suggestedMonthlyPrice} onChange={e => setForm({ ...form, suggestedMonthlyPrice: e.target.value })} /></Field>
            <Field label="Most interesting feature"><Input value={form.mostInterestingFeature} onChange={e => setForm({ ...form, mostInterestingFeature: e.target.value })} /></Field>
            <Field label="What confused them?"><Textarea value={form.confusion} onChange={e => setForm({ ...form, confusion: e.target.value })} /></Field>
            <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            <Button disabled={save.isPending} className="skoot-button skoot-button--black w-full">{save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save feedback</Button>
          </form>
        </section>

        <section className="shipping-guide">
          <div><span className="mini-label">SHIP TOGETHER</span><h2>Code, Aaron, and skootly.com.</h2></div>
          <div className="shipping-grid">
            <article><strong>01 · Shared GitHub</strong><p>Keep one private repository as the source of truth. Invite Aaron as a collaborator, use feature branches, and review pull requests before merging to main.</p></article>
            <article><strong>02 · Build with Manus</strong><p>Ask me to create or change features here, then push checkpoints to the shared repository. Aaron can continue prototyping in Lovable without making that a second production codebase.</p></article>
            <article><strong>03 · Namecheap DNS</strong><p>After the production host is chosen, connect the exact A/CNAME records shown by that host. Preserve existing MX and email records. DNS changes should happen only after a stable production build exists.</p></article>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="form-field"><Label>{label}</Label>{children}</div>;
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return <div className="form-field"><Label>{label}</Label><div className="choice-row">{options.map(option => <button type="button" key={option} className={value === option ? "choice-pill choice-pill--active" : "choice-pill"} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}
