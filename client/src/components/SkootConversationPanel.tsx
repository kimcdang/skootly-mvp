import { AIChatBox } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SkootConversationPanel() {
  const utils = trpc.useUtils();
  const latest = trpc.conversation.latest.useQuery();
  const start = trpc.conversation.start.useMutation({
    onSuccess: () => utils.conversation.latest.invalidate(),
    onError: error => toast.error(error.message),
  });
  const send = trpc.conversation.send.useMutation({
    onSuccess: () => utils.conversation.latest.invalidate(),
    onError: error => toast.error(error.message),
  });
  const remove = trpc.conversation.delete.useMutation({
    onSuccess: () => { utils.conversation.latest.invalidate(); toast.success("Private conversation permanently deleted."); },
    onError: error => toast.error(error.message),
  });
  if (latest.isLoading) return <section className="skoot-chat-panel skoot-chat-panel--loading"><Loader2 className="size-4 animate-spin" /> Loading private Skoot…</section>;
  if (!latest.data) return <section className="skoot-chat-panel skoot-chat-empty"><div><MessageCircle className="size-5" /><span className="card-kicker">PRIVATE SKOOT CONVERSATION</span></div><h3>Talk through the next move.</h3><p>Skoot uses only your Skootly workspace, active learning context, and current actions. It does not inspect, post to, or change external platforms.</p><Button onClick={() => start.mutate({ consentConfirmed: true })} disabled={start.isPending}>{start.isPending ? "Starting…" : "Start private conversation"}</Button></section>;
  const messages = latest.data.messages.map(message => ({ role: message.role === "skoot" ? ("assistant" as const) : ("user" as const), content: message.content }));
  return <section className="skoot-chat-panel"><div className="skoot-chat-heading"><div><span className="card-kicker">PRIVATE SKOOT CONVERSATION</span><p>Text-only, private to you. External actions always require your confirmation.</p></div><Button variant="ghost" size="sm" onClick={() => remove.mutate({ conversationId: latest.data!.conversation.id, confirmPermanentDeletion: true })} disabled={remove.isPending}><Trash2 className="size-4" /> Delete</Button></div><AIChatBox messages={messages} onSendMessage={content => send.mutate({ conversationId: latest.data!.conversation.id, content })} isLoading={send.isPending} height="360px" placeholder="Talk it through with Skoot…" emptyStateMessage="What is blocking your next move?" suggestedPrompts={["What should I focus on next?", "Turn my latest lesson into one action.", "What should I do before I launch the challenge?"]} /></section>;
}
