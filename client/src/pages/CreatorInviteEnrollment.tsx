import { BrandMark, MemphisShapes } from "@/components/SkootlyHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function CreatorInviteEnrollment() {
  const [, params] = useRoute("/creator/join/:token");
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const token = params?.token || "";
  const preview = trpc.creatorPacks.creatorInvitePreview.useQuery({ token }, { enabled: token.length >= 40 });
  const accept = trpc.creatorPacks.acceptCreatorInvite.useMutation({ onSuccess: () => setLocation("/onboarding") });
  if (loading || preview.isLoading) return <main className="auth-loading"><Loader2 className="size-6 animate-spin" /> Opening your creator invitation…</main>;
  if (!preview.data) return <main className="auth-page"><MemphisShapes quiet /><section className="auth-shell auth-shell--signed-in"><BrandMark /><span className="auth-kicker">INVITATION UNAVAILABLE</span><h1>This creator invitation is no longer active.</h1><p>Ask the person who invited you for a new private link.</p><Button onClick={() => setLocation("/login")}><ArrowRight className="size-4" /> Go to Skootly</Button></section></main>;
  const next = `/creator/join/${token}`;
  return <main className="auth-page"><MemphisShapes quiet /><section className="auth-shell auth-shell--signed-in"><BrandMark /><span className="auth-kicker">PRIVATE CREATOR INVITATION</span><h1>Build your own Skoot Packs.</h1><p>{preview.data.inviterName} invited you to start an independent Creator workspace. You will not see their Packs, students, conversations, or support queue.</p><div className="rounded-2xl border-2 border-black bg-[#e0f6e9] p-4 text-left text-sm"><b>Invited for:</b> {preview.data.emailHint}<br /><b>Expires:</b> {new Date(preview.data.expiresAt).toLocaleString()}</div>{!user ? <div className="auth-actions"><Button onClick={() => setLocation(`/login?next=${encodeURIComponent(next)}`)}><LockKeyhole className="size-4" /> Sign in or create an account</Button><p className="text-sm text-stone-600">Use the email address this invitation was created for. Skootly will return you here after account setup.</p></div> : <div className="auth-actions"><Button disabled={accept.isPending} onClick={() => accept.mutate({ token })}>{accept.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Start my Creator workspace</Button>{accept.error ? <p className="auth-error">{accept.error.message}</p> : <p className="text-sm text-stone-600"><Check className="mr-1 inline size-4" />Your workspace will be private by default.</p>}</div>}</section></main>;
}
