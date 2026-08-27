import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BookOpenCheck, CalendarDays, Loader2, Plus, Send, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function CreatorSupportPanel() {
  const utils = trpc.useUtils();
  const profiles = trpc.escalations.supportProfiles.useQuery();
  const queue = trpc.escalations.creatorQueue.useQuery();
  const notifications = trpc.escalations.notifications.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile] = useState({ displayName: "", bookingUrl: "", assigneeEmail: "", routingLevel: "coach" as "coach" | "csm" });
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [packLearning, setPackLearning] = useState("");
  const selected = useMemo(() => queue.data?.find(item => item.escalation.id === selectedId) ?? null, [queue.data, selectedId]);
  const brief = trpc.escalations.brief.useQuery({ escalationId: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const saveProfile = trpc.escalations.saveSupportProfile.useMutation({
    onSuccess: () => { utils.escalations.supportProfiles.invalidate(); setProfile({ displayName: "", bookingUrl: "", assigneeEmail: "", routingLevel: "coach" }); toast.success("Support route saved."); },
    onError: error => toast.error(error.message),
  });
  const finish = trpc.escalations.complete.useMutation({ onSuccess: () => { utils.escalations.creatorQueue.invalidate(); toast.success("Breakdown marked complete."); }, onError: error => toast.error(error.message) });
  const addNote = trpc.escalations.addBreakdownNote.useMutation({ onSuccess: async result => { setNotes(""); setNextAction(""); setPackLearning(""); await utils.creatorPacks.listProposals.invalidate(); toast.success(result.proposalId ? "Private notes saved. Pack learning is waiting in Review before publishing." : "Private notes saved."); }, onError: error => toast.error(error.message) });
  const content = trpc.escalations.contentSuggestions.useQuery(undefined, { enabled: false });
  const updateNotification = trpc.escalations.updateNotification.useMutation({ onSuccess: () => utils.escalations.notifications.invalidate(), onError: error => toast.error(error.message) });
  const activeQueue = queue.data?.filter(item => item.escalation.status !== "completed") ?? [];
  useEffect(() => {
    const requestedId = Number(new URLSearchParams(window.location.search).get("escalation"));
    if (requestedId > 0 && queue.data?.some(item => item.escalation.id === requestedId)) setSelectedId(requestedId);
  }, [queue.data]);

  return (
    <section className="creator-support">
      <div className="creator-support__heading">
        <div><span className="card-kicker">SMART ESCALATION</span><h2>Support the right student without becoming the bottleneck.</h2><p>Private requests arrive with a short breakdown brief. Pack updates remain reviewable.</p></div>
        <UsersRound className="size-9" />
      </div>
      {notifications.data?.length ? <div className="grid gap-2 rounded-2xl border-2 border-black bg-[#fff7da] p-3 shadow-[4px_4px_0_#ffe36e]" aria-label="Private support notifications">{notifications.data.slice(0, 3).map(item => <div className="flex items-start justify-between gap-3 border-b border-black/20 pb-2 last:border-0 last:pb-0" key={item.id}><a className="grid gap-1 text-sm no-underline" href={item.deepLink}><b>{item.title}</b><span className="text-xs text-[#655d61]">{item.body}</span></a><Button className="shrink-0" size="sm" variant="ghost" onClick={() => updateNotification.mutate({ notificationId: item.id, action: "dismiss" })}>Dismiss</Button></div>)}</div> : null}
      <div className="creator-support__profiles">
        <div><h3>Support routes</h3><p>Add a CSM or your own booking link. Assigning an existing Skootly user gives only that helper access to routed private requests.</p>{profiles.data?.map(item => <p className="support-profile" key={item.id}><b>{item.displayName}</b> · {item.routingLevel}{item.userId ? " · private queue assigned" : " · creator-managed"}{item.bookingUrl ? " · booking link ready" : " · request-only"}</p>)}</div>
        <div className="support-profile-form"><Label>Name<Input value={profile.displayName} onChange={event => setProfile({ ...profile, displayName: event.target.value })} placeholder="Kim or Client Success" /></Label><Label>Skootly account email (optional)<Input type="email" value={profile.assigneeEmail} onChange={event => setProfile({ ...profile, assigneeEmail: event.target.value })} placeholder="csm@example.com" /></Label><Label>Private booking URL (optional)<Input value={profile.bookingUrl} onChange={event => setProfile({ ...profile, bookingUrl: event.target.value })} placeholder="https://…" /></Label><div><Button type="button" variant={profile.routingLevel === "csm" ? "default" : "outline"} onClick={() => setProfile({ ...profile, routingLevel: "csm" })}>CSM</Button><Button type="button" className="ml-2" variant={profile.routingLevel === "coach" ? "default" : "outline"} onClick={() => setProfile({ ...profile, routingLevel: "coach" })}>Coach</Button></div><Button disabled={!profile.displayName || saveProfile.isPending} onClick={() => saveProfile.mutate({ ...profile, bookingUrl: profile.bookingUrl || undefined, assigneeEmail: profile.assigneeEmail || undefined })}><Plus className="size-4" /> Add route</Button></div>
      </div>
      <div className="creator-queue">
        <div className="creator-queue__list"><h3>Private support queue</h3>{activeQueue.length ? activeQueue.map(item => <button key={item.escalation.id} onClick={() => setSelectedId(item.escalation.id)} className={selectedId === item.escalation.id ? "queue-item queue-item--active" : "queue-item"}><b>{item.studentName || item.studentEmail || "Student"}</b><span>{item.escalation.escalationType} · {item.escalation.status}</span><small>{item.escalation.routingReason}</small></button>) : <p className="muted">No active private breakdowns.</p>}</div>
        <div className="creator-brief"><h3><BookOpenCheck className="size-4" /> Breakdown Brief</h3>{selectedId && brief.data ? <><p><b>Recommended focus:</b> {brief.data.recommendedFocus}</p><p><b>Current bottleneck:</b> {brief.data.checkin?.blocker || "Not captured"}</p><p><b>Recent actions:</b> {brief.data.actions.map(action => action.title).join(" · ") || "None"}</p><p><b>Applied Pack knowledge:</b> {brief.data.knowledge.map(item => item.content).join(" · ") || "None"}</p></> : <p className="muted">Select a private request to see only the context you need for a useful breakdown.</p>}</div>
      </div>
      {selected ? <div className="post-call-card"><div><span className="card-kicker">AFTER THE CALL</span><h3>Turn the breakdown into a next move—not a longer backlog.</h3></div><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Private post-call notes or pasted transcript excerpt. Do not include material you do not have permission to store." /><Input value={nextAction} onChange={event => setNextAction(event.target.value)} placeholder="Suggested next Skoot for the student (optional)" /><Textarea value={packLearning} onChange={event => setPackLearning(event.target.value)} placeholder="Potential Pack learning for your review (optional)" /><div><Button disabled={!notes.trim() || addNote.isPending} onClick={() => addNote.mutate({ escalationId: selected.escalation.id, notes, clientNextAction: nextAction || undefined, proposedKnowledgeContent: packLearning || undefined, proposedKnowledgeType: packLearning ? "decision_rule" : undefined })}>{addNote.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Save private notes</Button><Button className="ml-2" variant="outline" disabled={finish.isPending} onClick={() => finish.mutate({ escalationId: selected.escalation.id })}>Mark complete</Button></div></div> : null}
      <div className="content-skoots"><div><span className="card-kicker">PRIVATE CREATOR INTELLIGENCE</span><h3>Recurring patterns can become a Content Skoot.</h3><p>No names, recordings, screenshots, or publishing actions are included.</p></div><Button variant="outline" disabled={content.isFetching} onClick={() => content.refetch()}>{content.isFetching ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />} Find recurring patterns</Button>{content.data?.length ? <div className="content-skoot-list">{content.data.map(item => <article key={item.bottleneckLabel}><b>{item.title}</b><p>{item.occurrenceCount} anonymized occurrences · Suggested format: {item.format}</p><small>{item.outline}</small></article>)}</div> : null}</div>
    </section>
  );
}
