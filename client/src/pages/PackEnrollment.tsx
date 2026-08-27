import { BrandMark, MemphisShapes } from "@/components/SkootlyHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, Loader2, LockKeyhole } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function PackEnrollment() {
  const [, params] = useRoute("/join/:token");
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const token = params?.token || "";
  const preview = trpc.creatorPacks.invitePreview.useQuery({ token }, { enabled: token.length >= 40 });
  const accept = trpc.creatorPacks.acceptInvite.useMutation({ onSuccess: () => setLocation("/founder") });
  if (loading || preview.isLoading) return <main className="auth-loading"><Loader2 className="size-6 animate-spin" />Opening your Pack invitation…</main>;
  if (!preview.data) return <main className="auth-page"><MemphisShapes quiet /><section className="auth-shell auth-shell--signed-in"><BrandMark /><span className="auth-kicker">INVITATION UNAVAILABLE</span><h1>This Pack link is no longer active.</h1><p>Ask your coach for a new private enrollment link.</p><Button onClick={() => setLocation("/login")}><ArrowRight className="size-4" /> Go to Skootly</Button></section></main>;
  const next = `/join/${token}`;
  return <main className="auth-page"><MemphisShapes quiet /><section className="auth-shell auth-shell--signed-in"><BrandMark /><span className="auth-kicker">PRIVATE PACK INVITATION</span><h1>{preview.data.packName}</h1><p>You’re joining {preview.data.creatorName}’s {preview.data.cadenceLabel} path. The destination is: <b>{preview.data.destination}</b></p><div className="rounded-2xl border-2 border-black bg-[#fff2bd] p-4 text-left text-sm"><b>Invited for:</b> {preview.data.emailHint}<br /><b>Expires:</b> {new Date(preview.data.expiresAt).toLocaleString()}</div>{!user ? <div className="auth-actions"><Button onClick={() => setLocation(`/login?next=${encodeURIComponent(next)}`)}><LockKeyhole className="size-4" /> Sign in or create an account</Button><p className="text-sm text-stone-600">Use the email address your coach invited. Skootly will return you here after account setup.</p></div> : <div className="auth-actions"><Button disabled={accept.isPending} onClick={() => accept.mutate({ token })}>{accept.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Join this Pack</Button>{accept.error ? <p className="auth-error">{accept.error.message}</p> : null}</div>}</section></main>;
}
