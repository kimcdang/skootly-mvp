import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark, MemphisShapes } from "@/components/SkootlyHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startLegacyManusLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import "./auth.css";

type Mode = "login" | "register";

function safeNextPath() {
  const value = new URLSearchParams(window.location.search).get("next");
  return value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login") ? value : "/founder";
}

export default function AuthPage() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");
  const nextPath = useMemo(safeNextPath, []);
  const previewGuest = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "guest";
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setLocation(nextPath); } });
  const register = trpc.auth.register.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setLocation(nextPath === "/founder" ? "/onboarding" : nextPath); } });
  const pending = login.isPending || register.isPending;
  const error = clientError || login.error?.message || register.error?.message;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setClientError("");
    if (mode === "register" && password !== confirmPassword) { setClientError("Passwords do not match."); return; }
    if (mode === "register") register.mutate({ name, email, password });
    else login.mutate({ email, password });
  };

  if (loading) return <main className="auth-loading"><Loader2 className="size-6 animate-spin" /> Loading Skootly…</main>;
  if (user && !previewGuest) return <main className="auth-page"><MemphisShapes quiet /><section className="auth-shell auth-shell--signed-in"><BrandMark /><span className="auth-kicker">YOU'RE SIGNED IN</span><h1>Ready for your next move?</h1><p>Continue to today’s Skoot, or add a password to this account.</p><div className="auth-actions"><Button onClick={() => setLocation(nextPath)}>Go to Today <ArrowRight className="size-4" /></Button><Button variant="outline" onClick={() => setLocation("/account")}>Account security</Button></div></section></main>;

  return (
    <main className="auth-page">
      <MemphisShapes quiet />
      <section className="auth-shell">
        <div className="auth-story">
          <BrandMark />
          <span className="auth-kicker">YOUR NEXT MOVE, WITHOUT THE NOISE</span>
          <h1>Come back to what matters now.</h1>
          <p>One bottleneck. One clear move. Your progress stays tied to your private Skootly account.</p>
          <div className="auth-proof"><span><Check /> One primary Skoot</span><span><Check /> Private progress</span><span><Check /> No Manus account required</span></div>
        </div>
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setClientError(""); }}>Sign in</button>
            <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setClientError(""); }}>Create account</button>
          </div>
          <div className="auth-card__heading"><span className="auth-icon"><LockKeyhole /></span><div><h2>{mode === "login" ? "Welcome back" : "Start moving forward"}</h2><p>{mode === "login" ? "Use your Skootly email and password." : "Create your private Skootly workspace."}</p></div></div>
          <form className="auth-form" onSubmit={submit}>
            {mode === "register" ? <Label>First name<Input autoComplete="given-name" value={name} onChange={event => setName(event.target.value)} placeholder="Your name" required minLength={2} maxLength={120} /></Label> : null}
            <Label>Email<Input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required maxLength={320} /></Label>
            <Label>Password<Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === "register" ? "At least 12 characters" : "Your password"} required minLength={mode === "register" ? 12 : 1} maxLength={128} /></Label>
            {mode === "register" ? <Label>Confirm password<Input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat your password" required minLength={12} maxLength={128} /></Label> : null}
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
            <Button type="submit" size="lg" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}{mode === "login" ? "Sign in to Skootly" : "Create my account"}</Button>
          </form>
          <div className="auth-legacy"><p>{mode === "login" ? "Did this account originally use Manus sign-in?" : "Already created Skootly through Manus?"}</p><button onClick={startLegacyManusLogin}>Continue with Manus once</button><small>Then open Account to add or change your Skootly password. Email reset is not included in this MVP.</small></div>
          <Link href="/" className="auth-home-link">Back to Skootly</Link>
        </div>
      </section>
    </main>
  );
}
