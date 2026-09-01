import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark, MemphisShapes } from "@/components/SkootlyHeader";
import { GuidedPackBuilder, type GuidedPackDraft } from "@/components/GuidedPackBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toUsableGuidedPackDraft } from "@/lib/packDraft";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, FileText, Loader2, Sparkles, Upload, UsersRound } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import "./auth.css";

type TemplateKind = "five_day_challenge" | "client_implementation";

const templateDetails: Record<TemplateKind, { title: string; body: string }> = {
  five_day_challenge: { title: "5-Day Challenge", body: "A compact cohort path with daily visible wins and a clear finish line." },
  client_implementation: { title: "Client Implementation", body: "A focused, coach-led path for completing one meaningful business or client outcome." },
};

async function textFromMethodFile(file: File): Promise<string> {
  if (file.size > 2_000_000) throw new Error("Choose a file smaller than 2 MB for the first Pack draft.");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return (await file.text()).replace(/\s+/g, " ").trim().slice(0, 12000);
  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = workerModule.default;
  const document = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 12); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
    if (pages.join(" ").length > 12000) break;
  }
  return pages.join(" ").replace(/\s+/g, " ").trim().slice(0, 12000);
}

export default function CoachOnboarding() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const onboarding = trpc.creatorPacks.onboarding.useQuery(undefined, { enabled: Boolean(user) });
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [offer, setOffer] = useState("");
  const [audience, setAudience] = useState("");
  const [templateKind, setTemplateKind] = useState<TemplateKind>("five_day_challenge");
  const [methodNotes, setMethodNotes] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [notesConfirmed, setNotesConfirmed] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<GuidedPackDraft | null>(null);

  useEffect(() => {
    if (!loading && !user) setLocation("/login?next=/onboarding");
  }, [loading, setLocation, user]);

  useEffect(() => {
    const profile = onboarding.data;
    if (!profile) return;
    setDisplayName(current => current || profile.displayName || user?.name || "");
    setAvatarUrl(current => current || profile.avatarUrl || "");
    setOffer(current => current || profile.offer || "");
    setAudience(current => current || profile.audience || "");
    setTemplateKind(profile.templateKind || "five_day_challenge");
    setMethodNotes(current => current || profile.methodNotes || "");
    setSourceFileName(current => current || profile.sourceFileName || "");
  }, [onboarding.data, user?.name]);

  const selectRole = trpc.creatorPacks.selectOnboardingRole.useMutation({ onSuccess: async result => { await utils.creatorPacks.onboarding.invalidate(); if (result?.selectedRole === "student") setLocation("/founder"); } });
  const saveProfile = trpc.creatorPacks.saveOnboardingProfile.useMutation({ onSuccess: () => utils.creatorPacks.onboarding.invalidate() });
  const saveMethod = trpc.creatorPacks.saveOnboardingMethod.useMutation();
  const shapeDraft = trpc.creatorPacks.shapeDraft.useMutation();
  const starterDraft = trpc.creatorPacks.starterDraft.useQuery({ templateKind });
  const complete = trpc.creatorPacks.completeOnboarding.useMutation({ onSuccess: async () => { await utils.creatorPacks.onboarding.invalidate(); setLocation("/creator"); } });
  const restart = trpc.creatorPacks.restartOnboarding.useMutation({ onSuccess: async () => { await utils.creatorPacks.onboarding.invalidate(); } });

  const stage = onboarding.data?.stage;
  const busy = selectRole.isPending || saveProfile.isPending || saveMethod.isPending || shapeDraft.isPending || complete.isPending || restart.isPending;
  const profileReady = displayName.trim().length >= 2 && offer.trim().length >= 5 && audience.trim().length >= 2;
  const methodSourceKind = sourceFileName ? "file" : methodNotes ? "notes" : "template";
  const status = useMemo(() => stage === "profile" ? 1 : stage === "method" ? 2 : reviewDraft ? 3 : stage === "launch" ? 4 : 0, [reviewDraft, stage]);

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    saveProfile.mutate({ displayName, avatarUrl, offer, audience, templateKind });
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError("");
    try {
      const extracted = await textFromMethodFile(file);
      if (extracted.length < 50) throw new Error("That file did not contain enough readable text. Paste a short outline instead.");
      setMethodNotes(extracted);
      setSourceFileName(file.name);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Skootly could not read that file.");
      setSourceFileName("");
    }
  };

  const startWithTemplate = async () => {
    if (!starterDraft.data) return;
    const safeSummary = `Template starter for ${offer.trim()}. Audience: ${audience.trim()}. The coach will edit this Pack before approval.`;
    await saveMethod.mutateAsync({ methodNotes: safeSummary, methodSourceKind: "template" });
    setReviewDraft({ ...starterDraft.data, destination: offer.trim(), audience: audience.trim() });
  };

  const shapeFromMethod = () => {
    if (!notesConfirmed || methodNotes.trim().length < 50) return;
    setFileError("");
    const notes = methodNotes.trim().slice(0, 6000);
    shapeDraft.mutate({ templateKind, notes, confirmedNoPrivateData: true }, {
      onSuccess: response => {
        const draft = toUsableGuidedPackDraft(response, { templateKind, destination: offer.trim(), audience: audience.trim() });
        if (!draft) {
          setFileError("Skootly did not receive a usable Pack draft. Please try again, or start with the template.");
          return;
        }
        saveMethod.mutate({ methodNotes: notes, methodSourceKind, sourceFileName: sourceFileName || undefined }, {
          onSuccess: () => setReviewDraft(draft),
          onError: () => setFileError("Your draft is ready, but Skootly could not save the source notes. Please try once more before continuing."),
        });
      },
      onError: () => setFileError("Skootly could not shape that draft just now. Please try again, or start with the template."),
    });
  };

  if (loading || onboarding.isLoading) return <main className="auth-loading"><Loader2 className="size-6 animate-spin" /> Preparing your Coach setup…</main>;
  if (!user) return null;
  if (stage === "complete" && onboarding.data?.selectedRole === "student") return <main className="auth-page"><MemphisShapes quiet /><section className="auth-shell auth-shell--signed-in"><BrandMark /><span className="auth-kicker">YOUR PRIVATE WORKSPACE IS READY</span><h1>Start with your next move.</h1><p>You can return here later if you decide to build a Coach Pack. For now, Skootly will keep your personal execution path focused.</p><Button size="lg" onClick={() => setLocation("/founder")}><BookOpenCheck className="size-4" /> Go to Today</Button></section></main>;
  if (stage === "launch" || stage === "complete") return <main className="auth-page"><MemphisShapes quiet /><section className="auth-shell auth-shell--signed-in"><BrandMark /><span className="auth-kicker">YOUR FIRST PACK IS READY</span><h1>Now invite the first student.</h1><p>Your Pack is versioned, private by default, and ready for the existing secure enrollment-link flow.</p><div className="auth-actions"><Button size="lg" onClick={() => setLocation("/creator")}><UsersRound className="size-4" /> Open my Creator launch</Button><Button variant="outline" disabled={busy} onClick={() => restart.mutate()}>Replay Coach setup safely</Button></div><p className="mt-4 text-xs text-stone-600">Replay keeps your existing Packs, student invitations, progress, and outcomes intact.</p></section></main>;

  return <main className="auth-page"><MemphisShapes quiet /><section className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12"><div className="rounded-[2rem] border-[3px] border-black bg-[#fff9ed] p-5 shadow-[8px_8px_0_#111] sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><BrandMark /><p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-stone-500">COACH SETUP · {status || 1} OF 4</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Turn your method into a guided student path.</h1><p className="mt-2 max-w-2xl text-stone-600">You do not need to build a course dashboard. Give Skootly the outcome and rough method; you stay in control of every Pack version.</p></div><Button variant="outline" onClick={() => setLocation("/creator")}>I’ll finish later</Button></div><div className="mt-6 grid grid-cols-4 gap-2" aria-label="Coach onboarding progress">{["Role", "Method", "Review", "Launch"].map((label, index) => <div key={label} className={`rounded-full border-2 border-black px-2 py-2 text-center text-xs font-black ${index < status ? "bg-[#a9e8d3]" : "bg-white text-stone-500"}`}>{label}</div>)}</div>
  {!onboarding.data ? <section className="mt-8 grid gap-4 md:grid-cols-2"><button className="rounded-3xl border-[3px] border-black bg-[#ffe36a] p-6 text-left shadow-[5px_5px_0_#111] transition active:scale-[.98]" onClick={() => selectRole.mutate({ selectedRole: "coach" })}><Sparkles className="size-7" /><h2 className="mt-4 text-2xl font-black">I’m a Coach or Creator</h2><p className="mt-2 text-sm">Turn what you teach into an approved Pack and invite students into a focused next-step experience.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-black">Set up my first Pack <ArrowRight className="size-4" /></span></button><button className="rounded-3xl border-[3px] border-black bg-[#e5dcff] p-6 text-left shadow-[5px_5px_0_#111] transition active:scale-[.98]" onClick={() => selectRole.mutate({ selectedRole: "student" })}><BookOpenCheck className="size-7" /><h2 className="mt-4 text-2xl font-black">I’m joining as a Student</h2><p className="mt-2 text-sm">Use this if you are here for your own focused work or are about to join a coach’s Pack.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-black">Go to my next move <ArrowRight className="size-4" /></span></button></section> : null}
  {stage === "profile" ? <form className="mt-8 space-y-5" onSubmit={submitProfile}><div><p className="card-kicker">1 · TELL US ABOUT YOUR COACHING</p><h2 className="text-2xl font-black">What should your first Pack help people do?</h2><p className="mt-1 text-sm text-stone-600">Keep this simple. This is enough for Skootly to give you the right starting shape.</p></div><div className="grid gap-4 md:grid-cols-2"><Label>Coach or business name<Input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Your name or brand" required /></Label><Label>Public logo or avatar URL (optional)<Input type="url" value={avatarUrl} onChange={event => setAvatarUrl(event.target.value)} placeholder="https://…" /></Label><Label className="md:col-span-2">What outcome do you help people achieve?<Textarea value={offer} onChange={event => setOffer(event.target.value)} placeholder="For example: launch a focused 5-day challenge that turns interest into conversations." required /></Label><Label className="md:col-span-2">Who is this first Pack for?<Textarea value={audience} onChange={event => setAudience(event.target.value)} placeholder="For example: coaches who have a proven offer but need a simple launch path." required /></Label></div><div><p className="mb-2 text-sm font-black">Choose your starting shape</p><div className="grid gap-3 sm:grid-cols-2">{(Object.keys(templateDetails) as TemplateKind[]).map(kind => <button type="button" key={kind} onClick={() => setTemplateKind(kind)} className={`rounded-2xl border-2 border-black p-4 text-left ${templateKind === kind ? "bg-[#a9e8d3] shadow-[4px_4px_0_#111]" : "bg-white"}`}><b>{templateDetails[kind].title}</b><span className="mt-1 block text-sm text-stone-600">{templateDetails[kind].body}</span></button>)}</div></div>{saveProfile.error ? <p className="auth-error">{saveProfile.error.message}</p> : null}<Button type="submit" size="lg" disabled={!profileReady || busy}>Continue to my method <ArrowRight className="size-4" /></Button></form> : null}
  {stage === "method" && !reviewDraft ? <section className="mt-8 space-y-5"><div><p className="card-kicker">2 · BRING YOUR METHOD IN</p><h2 className="text-2xl font-black">Give us the rough version. We’ll help shape the path.</h2><p className="mt-1 text-sm text-stone-600">Paste your outline, add a worksheet/SOP, or start from the template. Only share method material you own—never client names, credentials, private transcripts, or personal results.</p></div><Textarea className="min-h-44 bg-white" value={methodNotes} onChange={event => { setMethodNotes(event.target.value); setSourceFileName(""); }} placeholder="What do you teach first, second, and third? What does success look like? What should a student not worry about yet?" maxLength={12000} /><div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-bold"><Upload className="size-4" /> Add a PDF, text file, worksheet, or SOP<input className="sr-only" type="file" accept=".txt,.md,.csv,.pdf,text/plain,text/markdown,text/csv,application/pdf" onChange={chooseFile} /></label>{sourceFileName ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800"><FileText className="size-4" /> {sourceFileName} read locally</span> : null}</div>{fileError ? <p className="auth-error">{fileError}</p> : null}<label className="flex cursor-pointer items-start gap-2 rounded-xl border-2 border-black bg-[#fff2bd] p-3 text-sm"><input className="mt-1 size-4 accent-black" type="checkbox" checked={notesConfirmed} onChange={event => setNotesConfirmed(event.target.checked)} /> <span><b>I confirm this is my own non-sensitive coaching material.</b><br /><span className="text-xs text-stone-600">Skootly will use the submitted text only to create an editable Pack draft. It will not publish or change a student’s Pack automatically.</span></span></label><div className="flex flex-wrap gap-3"><Button size="lg" disabled={methodNotes.trim().length < 50 || !notesConfirmed || busy} onClick={shapeFromMethod}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Shape my first Pack</Button><Button variant="outline" disabled={starterDraft.isLoading || busy} onClick={startWithTemplate}>I’ll start with the template</Button><Button variant="ghost" onClick={() => selectRole.mutate({ selectedRole: "coach" })}><ArrowLeft className="size-4" /> Back</Button></div>{shapeDraft.error || saveMethod.error ? <p className="auth-error">{shapeDraft.error?.message || saveMethod.error?.message}</p> : null}</section> : null}
  {reviewDraft ? <section className="mt-8"><div className="mb-4 rounded-2xl border-2 border-black bg-[#e0f6e9] p-4"><p className="card-kicker">3 · REVIEW BEFORE ANY STUDENT SEES IT</p><h2 className="text-xl font-black">This is your editable first Pack—not an automatic publish.</h2><p className="mt-1 text-sm text-stone-600">Check the outcome, order, one current action, and Not Today boundaries. Open the student preview before you approve.</p></div><GuidedPackBuilder initialDraft={reviewDraft} onPublished={async packId => { await complete.mutateAsync({ packId }); }} /></section> : null}
  </div></section></main>;
}
