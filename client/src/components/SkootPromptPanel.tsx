import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, BotMessageSquare, ExternalLink, Loader2, PackagePlus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PackForm = {
  title: string;
  triggers: string;
  goal: string;
  groupName: string;
  groupUrl: string;
  settingsUrl: string;
  settingsLabel: string;
  actionTitle: string;
  rationale: string;
  width: string;
  height: string;
  formats: string;
};

const defaultPack: PackForm = {
  title: "5-Day Challenge Skoot Pack",
  triggers: "run the 5 day challenge, run the skoot package, start my challenge",
  goal: "Launch a clear, credible 5-Day Challenge group that gives new members one compelling reason to join.",
  groupName: "",
  groupUrl: "",
  settingsUrl: "",
  settingsLabel: "Open Group Settings → General",
  actionTitle: "Create the 1084 × 576 cover banner for your 5-Day Challenge.",
  rationale: "The group needs a clear promise before you build the lesson sequence or invite members.",
  width: "1084",
  height: "576",
  formats: "PNG, JPG",
};

type PromptResult =
  | { mode: "clarification"; question: string }
  | {
      mode: "action";
      packId: number;
      packTitle: string;
      goal: string;
      primaryAction: string;
      whyNow: string;
      actionType: "asset_preparation" | "platform_setup" | "homework" | "engagement";
      asset: { deliverable: string; dimensions: { width: number; height: number; unit: "px" } | null; formatHints: string[] } | null;
      destination: { label: string; url: string; mode: "read_only_link" | "requires_confirmation" } | null;
      sourceCitations: Array<{ title: string; sourceId: number }>;
      confirmationRequired: boolean;
    };

export function SkootPromptPanel() {
  const utils = trpc.useUtils();
  const packs = trpc.packs.list.useQuery();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<PromptResult | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [form, setForm] = useState<PackForm>(defaultPack);
  const resolve = trpc.packs.resolvePrompt.useQuery({ prompt }, { enabled: false, retry: false });
  const create = trpc.packs.create.useMutation({
    onSuccess: async () => {
      await utils.packs.list.invalidate();
      setSetupOpen(false);
      toast.success("Your private Skoot Pack is ready.");
    },
    onError: error => toast.error(error.message),
  });

  async function runPrompt() {
    if (!prompt.trim()) return toast.error("Tell Skoot what you want to run.");
    const response = await resolve.refetch();
    if (response.data) setResult(response.data as PromptResult);
  }
  function savePack(event: React.FormEvent) {
    event.preventDefault();
    create.mutate({
      title: form.title,
      triggerPhrases: form.triggers.split(",").map(item => item.trim()).filter(Boolean),
      goal: form.goal,
      group: form.groupName && form.groupUrl ? {
        platform: "skool",
        name: form.groupName,
        groupUrl: form.groupUrl,
        settingsUrl: form.settingsUrl || "",
        settingsLabel: form.settingsLabel || undefined,
      } : undefined,
      steps: [{
        actionType: "asset_preparation",
        actionTitle: form.actionTitle,
        rationale: form.rationale,
        assetDeliverable: "Group cover banner",
        assetWidth: Number(form.width),
        assetHeight: Number(form.height),
        assetFormatHints: form.formats.split(",").map(item => item.trim()).filter(Boolean),
        requiresConfirmation: true,
      }],
    });
  }

  return (
    <section className="skoot-prompt-panel">
      <div className="skoot-prompt-panel__heading"><div className="skoot-prompt-panel__icon"><BotMessageSquare className="size-5" /></div><div><span className="card-kicker">TALK TO SKOOT</span><h2>What are you trying to make move?</h2><p>Skoot turns your prompt and your private Skoot Packs into one grounded next move.</p></div></div>
      <div className="skoot-prompt-panel__composer"><Textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder='Try: “Run the 5-Day Challenge Skoot Pack for my group.”' /><Button type="button" className="skoot-button skoot-button--black" disabled={resolve.isFetching} onClick={runPrompt}>{resolve.isFetching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Ask Skoot</Button></div>
      {!packs.isLoading && !packs.data?.length ? <div className="skoot-prompt-panel__empty"><p>Start with a private Skoot Pack. You decide the group link, settings destination, assets, and sequence—Skootly never inspects your community.</p><Button type="button" variant="outline" onClick={() => setSetupOpen(true)}><PackagePlus className="size-4" /> Set up a 5-Day Challenge Pack</Button></div> : null}
      {packs.data?.length ? <button type="button" className="skoot-prompt-panel__setup" onClick={() => setSetupOpen(true)}><PackagePlus className="size-4" /> Add or tailor a Skoot Pack</button> : null}
      {result?.mode === "clarification" ? <div className="skoot-prompt-result skoot-prompt-result--question"><span className="card-kicker">ONE USEFUL QUESTION</span><strong>{result.question}</strong></div> : null}
      {result?.mode === "action" ? <article className="skoot-prompt-result"><div className="skoot-prompt-result__top"><div><span className="card-kicker">YOUR NEXT MOVE</span><h3>{result.primaryAction}</h3><p>{result.whyNow}</p></div><span className="prompt-pack-chip">{result.packTitle}</span></div>{result.asset ? <div className="prompt-asset-spec"><strong>{result.asset.deliverable}</strong>{result.asset.dimensions ? <span>{result.asset.dimensions.width} × {result.asset.dimensions.height} {result.asset.dimensions.unit}</span> : null}{result.asset.formatHints.length ? <small>{result.asset.formatHints.join(" · ")}</small> : null}</div> : null}{result.destination ? <div className="prompt-destination"><div><strong>{result.destination.label}</strong><small>Opening this private settings page is your choice. Skootly will not upload or change anything for you.</small></div><Button type="button" variant="outline" onClick={() => window.open(result.destination!.url, "_blank", "noopener,noreferrer")}><ExternalLink className="size-4" /> Open approved link</Button></div> : <div className="prompt-destination"><small>Add your group’s approved settings link to this pack when you are ready. Skootly will not guess it.</small></div>}<footer>Grounded in: {result.sourceCitations.map(source => source.title).join(", ")}</footer></article> : null}

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}><DialogContent className="pack-setup-dialog"><DialogHeader><DialogTitle>Set up a private Skoot Pack</DialogTitle><DialogDescription>Add only the group and settings links you are authorized to use. Skootly uses them as your approved destinations; it does not discover or change anything automatically.</DialogDescription></DialogHeader><form className="pack-setup-form" onSubmit={savePack}><label><span>Pack name *</span><Input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label><label><span>Prompt phrases *</span><Input required value={form.triggers} onChange={event => setForm({ ...form, triggers: event.target.value })} /></label><label><span>Goal *</span><Textarea required value={form.goal} onChange={event => setForm({ ...form, goal: event.target.value })} /></label><div className="pack-setup-grid"><label><span>Group name</span><Input value={form.groupName} onChange={event => setForm({ ...form, groupName: event.target.value })} placeholder="My 5-Day Challenge" /></label><label><span>Group URL</span><Input type="url" value={form.groupUrl} onChange={event => setForm({ ...form, groupUrl: event.target.value })} placeholder="https://www.skool.com/my-group" /></label></div><label><span>Approved settings/about URL</span><Input type="url" value={form.settingsUrl} onChange={event => setForm({ ...form, settingsUrl: event.target.value })} placeholder="Paste your group’s approved settings link" /></label><label><span>Settings link label</span><Input value={form.settingsLabel} onChange={event => setForm({ ...form, settingsLabel: event.target.value })} /></label><label><span>First action *</span><Textarea required value={form.actionTitle} onChange={event => setForm({ ...form, actionTitle: event.target.value })} /></label><label><span>Why now *</span><Textarea required value={form.rationale} onChange={event => setForm({ ...form, rationale: event.target.value })} /></label><div className="pack-setup-grid"><label><span>Banner width</span><Input required type="number" min="1" value={form.width} onChange={event => setForm({ ...form, width: event.target.value })} /></label><label><span>Banner height</span><Input required type="number" min="1" value={form.height} onChange={event => setForm({ ...form, height: event.target.value })} /></label></div><label><span>Format hints</span><Input value={form.formats} onChange={event => setForm({ ...form, formats: event.target.value })} /></label><Button disabled={create.isPending} className="skoot-button skoot-button--black w-full">{create.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />} Save private Skoot Pack</Button></form></DialogContent></Dialog>
    </section>
  );
}
