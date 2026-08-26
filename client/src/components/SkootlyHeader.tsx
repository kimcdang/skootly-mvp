import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { ArrowUpRight, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";

export function BrandMark() {
  return (
    <Link href="/" className="brand-mark" aria-label="Skootly home">
      <img
        className="brand-logo"
        src="/manus-storage/skootly-running-s-logo_049dc868.png"
        alt="Skootly — one bottleneck, one clear move"
      />
    </Link>
  );
}

export function SkootlyHeader({ compact = false }: { compact?: boolean }) {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <header className={compact ? "site-header site-header--compact" : "site-header"}>
      <BrandMark />
      <nav className="header-nav" aria-label="Primary navigation">
        {user ? (
          <>
            <button className="nav-link" onClick={() => setLocation("/founder")}>Today</button>
            <button className="nav-link nav-link--desktop" onClick={() => setLocation("/history")}>Momentum</button>
            {user.role === "admin" ? (
              <button className="nav-link nav-link--desktop" onClick={() => setLocation("/lab")}>Lab</button>
            ) : null}
            <Button variant="outline" className="rounded-full border-2 border-black bg-white" onClick={logout}>
              <LogOut className="size-4" />
              <span className="nav-link--desktop">Sign out</span>
            </Button>
          </>
        ) : (
          <Button
            disabled={loading}
            className="rounded-full border-2 border-black bg-black px-5 text-white shadow-[3px_3px_0_#bca7ff] hover:bg-black/85"
            onClick={() => startLogin()}
          >
            Sign in <ArrowUpRight className="size-4" />
          </Button>
        )}
      </nav>
    </header>
  );
}

export function MemphisShapes({ quiet = false }: { quiet?: boolean }) {
  return (
    <div className={quiet ? "memphis memphis--quiet" : "memphis"} aria-hidden="true">
      <span className="shape shape--mint-circle" />
      <span className="shape shape--lilac-square" />
      <span className="shape shape--yellow-pill" />
      <span className="shape shape--triangle" />
      <span className="shape shape--dots" />
      <span className="shape shape--diamond" />
      <span className="shape shape--line" />
    </div>
  );
}
