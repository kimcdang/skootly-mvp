import { useAuth } from "@/_core/hooks/useAuth";
import { SkootlyHeader, MemphisShapes } from "@/components/SkootlyHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import "./auth.css";

export default function AccountSecurity() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login?next=%2Faccount" });
  const utils = trpc.useUtils();
  const status = trpc.auth.credentialStatus.useQuery(undefined, { enabled: Boolean(user) });
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const setCredential = trpc.auth.setPassword.useMutation({ onSuccess: async () => { setCurrentPassword(""); setPassword(""); setConfirmPassword(""); await Promise.all([utils.auth.credentialStatus.invalidate(), utils.auth.me.invalidate()]); toast.success("Your Skootly password is ready."); }, onError: error => toast.error(error.message) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (password !== confirmPassword) { toast.error("Passwords do not match."); return; } setCredential.mutate({ password, currentPassword: status.data?.hasPassword ? currentPassword : undefined }); };

  if (loading || !user) return <main className="auth-loading"><Loader2 className="size-6 animate-spin" /> Loading account…</main>;
  return <main className="account-page"><SkootlyHeader compact /><MemphisShapes quiet /><section className="account-shell"><span className="auth-kicker">ACCOUNT SECURITY</span><h1>{status.data?.hasPassword ? "Change your password" : "Add your Skootly password"}</h1><p>Your email is <b>{status.data?.email || "not available"}</b>. Passwords are stored as one-way security hashes and are never displayed.</p>{status.data?.hasPassword ? <p className="account-status"><CheckCircle2 /> Email sign-in is active.</p> : null}<form className="auth-form" onSubmit={submit}>{status.data?.hasPassword ? <Label>Current password<Input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></Label> : null}<Label>New password<Input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={12} maxLength={128} placeholder="At least 12 characters" required /></Label><Label>Confirm new password<Input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} required /></Label><Button type="submit" disabled={!status.data?.email || setCredential.isPending}>{setCredential.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}{status.data?.hasPassword ? "Update password" : "Enable email sign-in"}</Button></form><p className="account-note">Emailed password reset is not included in this MVP. If this account began with Manus, use the legacy sign-in on the login page, then return here to change the password.</p></section></main>;
}
