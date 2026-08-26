import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BookOpen, Check, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ImportForm = {
  title: string;
  communityName: string;
  lessonUrl: string;
  sourceDate: string;
  transcript: string;
  homework: string;
  consentConfirmed: boolean;
};

const emptyForm: ImportForm = {
  title: "",
  communityName: "",
  lessonUrl: "",
  sourceDate: "",
  transcript: "",
  homework: "",
  consentConfirmed: false,
};

export function LearningContextPanel() {
  const utils = trpc.useUtils();
  const sources = trpc.learning.list.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ImportForm>(emptyForm);
  const importSource = trpc.learning.import.useMutation({
    onSuccess: async () => {
      await utils.learning.list.invalidate();
      setForm(emptyForm);
      setOpen(false);
      toast.success("Lesson context added to your private Skootly workspace.");
    },
    onError: error => toast.error(error.message),
  });
  const setEnabled = trpc.learning.setEnabled.useMutation({
    onSuccess: () => utils.learning.list.invalidate(),
    onError: error => toast.error(error.message),
  });
  const setHomeworkStatus = trpc.learning.setHomeworkStatus.useMutation({
    onSuccess: () => utils.learning.list.invalidate(),
    onError: error => toast.error(error.message),
  });
  const deleteSource = trpc.learning.delete.useMutation({
    onSuccess: () => {
      utils.learning.list.invalidate();
      toast.success("Lesson context permanently deleted.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    importSource.mutate({
      provider: "skool_manual",
      title: form.title,
      communityName: form.communityName || undefined,
      lessonUrl: form.lessonUrl || undefined,
      sourceDate: form.sourceDate || undefined,
      transcript: form.transcript || undefined,
      homework: form.homework || undefined,
      consentConfirmed: form.consentConfirmed as true,
    });
  };

  return (
    <section className="learning-context-card">
      <div className="learning-context-card__intro">
        <div className="learning-context-card__icon"><BookOpen className="size-5" /></div>
        <div>
          <span className="card-kicker">COURSE CONTEXT</span>
          <h3>Bring the lesson with you.</h3>
          <p>Paste only transcripts, captions, or homework you are authorized to use. Skootly keeps it private and can use active sources to sharpen your next move.</p>
        </div>
        <Button type="button" variant="outline" className="learning-context-card__add" onClick={() => setOpen(true)}><Plus className="size-4" /> Add lesson</Button>
      </div>

      {sources.isLoading ? <div className="learning-context-card__empty"><Loader2 className="size-4 animate-spin" /> Loading your learning context…</div> : null}
      {sources.error ? <div className="learning-context-card__empty">Lesson context is unavailable right now. <button type="button" onClick={() => sources.refetch()}>Try again</button></div> : null}
      {!sources.isLoading && !sources.error && !sources.data?.length ? <div className="learning-context-card__empty">No lessons imported yet. Add one lesson at a time—no scraping, no account connection needed.</div> : null}
      {sources.data?.length ? <div className="learning-source-list">
        {sources.data.map(source => <article className={`learning-source ${source.enabled ? "" : "learning-source--disabled"}`} key={source.id}>
          <div className="learning-source__top">
            <div><strong>{source.title}</strong><small>{source.communityName || "Manual learning import"}{source.sourceDate ? ` · ${new Date(source.sourceDate).toISOString().slice(0, 10)}` : ""}</small></div>
            <div className="learning-source__actions">
              <button type="button" className={source.enabled ? "source-toggle source-toggle--on" : "source-toggle"} onClick={() => setEnabled.mutate({ sourceId: source.id, enabled: !source.enabled })}>{source.enabled ? "Using" : "Paused"}</button>
              {source.lessonUrl ? <a href={source.lessonUrl} target="_blank" rel="noreferrer" aria-label={`Open ${source.title} in Skool`}><ExternalLink className="size-4" /></a> : null}
              <button type="button" aria-label={`Delete ${source.title}`} className="source-delete" onClick={() => { if (window.confirm(`Permanently delete “${source.title}” and its homework progress?`)) deleteSource.mutate({ sourceId: source.id, confirmPermanentDeletion: true }); }}><Trash2 className="size-4" /></button>
            </div>
          </div>
          {source.concepts?.length ? <div className="learning-concepts"><span>VERBATIM LESSON SIGNALS</span>{source.concepts.map((concept: string) => <p key={concept}>{concept}</p>)}</div> : null}
          {source.homeworkItems.length ? <div className="learning-homework-list">{source.homeworkItems.map(item => <button type="button" key={item.id} className={item.status === "completed" ? "learning-homework learning-homework--done" : "learning-homework"} onClick={() => setHomeworkStatus.mutate({ homeworkId: item.id, status: item.status === "completed" ? "pending" : "completed" })}><Check className="size-4" /> {item.title}</button>)}</div> : null}
        </article>)}
      </div> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="learning-import-dialog">
          <DialogHeader><DialogTitle>Add an authorized lesson</DialogTitle><DialogDescription>Paste material you are allowed to reuse. Skootly does not connect to, scrape, or post on Skool.</DialogDescription></DialogHeader>
          <form className="learning-import-form" onSubmit={submit}>
            <label><span>Lesson title *</span><Input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Warm outreach that gets replies" /></label>
            <label><span>Community or course</span><Input value={form.communityName} onChange={event => setForm({ ...form, communityName: event.target.value })} placeholder="e.g. Founder Growth Lab" /></label>
            <label><span>Original lesson link (optional)</span><Input type="url" value={form.lessonUrl} onChange={event => setForm({ ...form, lessonUrl: event.target.value })} placeholder="https://www.skool.com/..." /></label>
            <label><span>Lesson date (optional)</span><Input type="date" value={form.sourceDate} onChange={event => setForm({ ...form, sourceDate: event.target.value })} /></label>
            <label><span>Transcript or captions</span><Textarea value={form.transcript} onChange={event => setForm({ ...form, transcript: event.target.value })} placeholder="Paste the transcript or your notes here…" /></label>
            <label><span>Homework or action prompts</span><Textarea value={form.homework} onChange={event => setForm({ ...form, homework: event.target.value })} placeholder="One action per line works best." /></label>
            <label className="learning-consent"><input type="checkbox" checked={form.consentConfirmed} onChange={event => setForm({ ...form, consentConfirmed: event.target.checked })} required /> <span>I have permission to add this material to my private Skootly workspace.</span></label>
            <Button disabled={importSource.isPending} className="skoot-button skoot-button--black w-full">{importSource.isPending ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />} Add private context</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
