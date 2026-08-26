import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MemphisShapes, SkootlyHeader } from "@/components/SkootlyHeader";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { EXPERIMENTS, type ExperimentVersion } from "@shared/experiments";
import { ArrowRight, Check, CircleDot, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const experimentOrder: ExperimentVersion[] = ["founder", "coach", "client_success"];

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const tracked = useRef(false);
  const track = trpc.skootly.track.useMutation();

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track.mutate({ experimentVersion: "neutral", eventName: "landing_page_view" });
  }, [track]);

  const begin = async () => {
    if (user) return setLocation("/founder");
    await track.mutateAsync({ experimentVersion: "neutral", eventName: "signup_started" }).catch(() => undefined);
    startLogin();
  };

  return (
    <div className="landing-page">
      <SkootlyHeader />
      <main>
        <section className="hero-shell">
          <MemphisShapes />
          <div className="hero-copy">
            <div className="eyebrow"><CircleDot className="size-4" /> The focused-execution app</div>
            <h1>DO LESS.<br /><span>MOVE FORWARD.</span></h1>
            <p>
              Skootly figures out what is actually blocking your goal, then gives you only the one or two moves most likely to change it.
            </p>
            <div className="hero-actions">
              <Button size="lg" className="skoot-button skoot-button--black" onClick={begin}>
                Find my next move <ArrowRight className="size-5" />
              </Button>
              <span className="hero-note"><Check className="size-4" /> No ten-step overwhelm</span>
            </div>
          </div>
          <div className="hero-focus-card">
            <div className="mini-label">YOUR BOTTLENECK</div>
            <p className="focus-diagnosis">You have enough opportunities. Follow-up is the constraint.</p>
            <div className="hero-skoot">
              <span>01</span>
              <div><strong>Follow up with 6 warm prospects.</strong><small>Closest path to progress today.</small></div>
            </div>
            <div className="not-today-strip"><span>NOT TODAY</span> Rebuild the website</div>
          </div>
        </section>

        <section className="promise-strip">
          <span>GOAL</span><i /> <span>BOTTLENECK</span><i /> <strong>SKOOT</strong><i /> <span>OUTCOME</span>
        </section>

        <section className="experiments-section">
          <div className="section-heading">
            <div><span className="mini-label">THREE WAYS TO SKOOT</span><h2>Same engine.<br />Different point of view.</h2></div>
            <p>We are validating where decisive focus creates the strongest pull. Pick the experience closest to your work.</p>
          </div>
          <div className="experiment-grid">
            {experimentOrder.map((version, index) => {
              const experiment = EXPERIMENTS[version];
              return (
                <article key={version} className={`experiment-card experiment-card--${experiment.accent}`}>
                  <span className="experiment-number">0{index + 1}</span>
                  <div className="experiment-audience">{experiment.eyebrow}</div>
                  <h3>{experiment.positioning}</h3>
                  <p>{experiment.promise}</p>
                  <button onClick={() => setLocation(experiment.route)}>
                    Open experience <ArrowRight className="size-4" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="why-section">
          <div className="why-sticker"><Sparkles className="size-8" /><strong>LESS NOISE</strong><span>MORE MOMENTUM</span></div>
          <div className="why-copy">
            <span className="mini-label">WHY SKOOTLY</span>
            <h2>A supportive opinion,<br />not another idea machine.</h2>
            <p>Skootly makes a decision, explains why, and tells you what to ignore. When you report what happened, the next recommendation starts with better evidence.</p>
            <Button className="skoot-button skoot-button--black" onClick={begin}>Start today <ArrowRight className="size-4" /></Button>
          </div>
        </section>
      </main>
      <footer className="site-footer"><strong>SKOOTLY.</strong><span>Do less. Move forward.</span><span>Built for focused validation.</span></footer>
    </div>
  );
}
