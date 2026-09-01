import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarCheck, Loader2, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function EscalationPanel({ relatedSkootId }: { relatedSkootId?: number }) {
  const utils = trpc.useUtils();
  const mine = trpc.escalations.mine.useQuery();
  const [note, setNote] = useState("");
  const [strategyNeeded, setStrategyNeeded] = useState(false);
  const [result, setResult] = useState<{ mode: "self_serve" | "escalation"; message?: string; bookingUrl?: string | null; escalationId?: number; escalationType?: string; routingReason?: string } | null>(null);
  const request = trpc.escalations.request.useMutation({
    onSuccess: async value => { setResult(value); await utils.escalations.mine.invalidate(); if (value.mode === "self_serve") toast.message(value.message); else toast.success("Your private breakdown route is ready."); },
    onError: error => toast.error(error.message),
  });
  const markBooked = trpc.escalations.markBooked.useMutation({ onSuccess: () => { utils.escalations.mine.invalidate(); toast.success("Marked as booked. Your helper now has the context they need."); }, onError: error => toast.error(error.message) });
  return <div className="escalation-panel">
    <div className="escalation-panel__intro"><div><span className="card-kicker">NEED HELP?</span><h3>Get the right level of support.</h3><p>Skootly checks your Pack first, then a CSM, then your main coach. Your private context stays private.</p></div><ShieldCheck className="size-7" /></div>
    <Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="What is still unclear or blocking you? (optional)" />
    <label className="escalation-checkbox"><input type="checkbox" checked={strategyNeeded} onChange={event => setStrategyNeeded(event.target.checked)} /> I need strategy or diagnosis—not just accountability.</label>
    <Button className="skoot-button skoot-button--black" disabled={request.isPending} onClick={() => request.mutate({ relatedSkootId, explicitlyRequestsHuman: true, strategyNeeded, studentNote: note || undefined })}>{request.isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageCircleQuestion className="size-4" />} Request a private breakdown</Button>
    {result?.mode === "self_serve" ? <p className="escalation-panel__message">{result.message}</p> : null}
    {result?.mode === "escalation" ? <div className="escalation-ready"><strong>Routed to your {result.escalationType === "csm" ? "CSM" : "coach"}.</strong><p>{result.routingReason}</p>{result.bookingUrl ? <div className="escalation-ready__actions"><a className="inline-link" href={result.bookingUrl} target="_blank" rel="noreferrer"><CalendarCheck className="size-4" /> Open private booking link</a>{result.escalationId ? <Button size="sm" variant="outline" onClick={() => markBooked.mutate({ escalationId: result.escalationId! })}>I booked it</Button> : null}</div> : <p className="escalation-panel__message">Your request is private and has been shared with the appropriate helper. They will follow up through the channel your creator uses.</p>}</div> : null}
    {mine.data?.filter(item => item.escalation.status !== "completed").length ? <div className="escalation-history"><span className="card-kicker">YOUR PRIVATE REQUESTS</span>{mine.data.filter(item => item.escalation.status !== "completed").slice(0, 2).map(item => <p key={item.escalation.id}><b>{item.helperName || (item.escalation.escalationType === "csm" ? "CSM support" : "Coach support")}</b> · {item.escalation.status.replace(/_/g, " ")}</p>)}</div> : null}
  </div>;
}
