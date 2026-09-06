import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Lock, User, EyeOff, CheckCheck, Github, Mail } from "lucide-react";
import smoke from "@/assets/smoke.jpg";
import envelope from "@/assets/envelope.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shizukasa — Private conversations, only between you two." },
      {
        name: "description",
        content:
          "Shizukasa is an end-to-end encrypted one-on-one messaging app. No data stored, no noise — a story unfolds in the blank space.",
      },
      { property: "og:title", content: "Shizukasa — Private conversations, only between you two." },
      {
        property: "og:description",
        content:
          "End-to-end encrypted, one-on-one only, no data stored. Quiet, private messaging inspired by Ma — the space between.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Lock, label: "End-to-End Encrypted" },
  { icon: User, label: "One-on-One Only" },
  { icon: EyeOff, label: "No Data Stored" },
  { icon: CheckCheck, label: "Read Receipts" },
];

function useJstTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

function Index() {
  const time = useJstTime();
  const rootRef = useReveal();

  return (
    <div ref={rootRef} className="min-h-screen bg-background text-foreground font-sans antialiased overflow-x-clip">
      {/* ————— Top nav ————— */}
      <header className="fixed inset-x-0 top-0 z-40">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
          <a
            href="#top"
            className="border border-border px-2.5 py-1.5 font-serif text-sm tracking-[0.08em] text-foreground normal-case"
          >
            静 Shizukasa
          </a>
          <p className="hidden sm:block">間 — The space between</p>
          <p suppressHydrationWarning className="tabular-nums">
            Saitama {time || "--:--:--"} JST
          </p>
        </nav>
      </header>

      {/* ————— Section 1 · Hero ————— */}
      <section id="top" className="relative flex min-h-screen flex-col items-center justify-center px-6">
        {/* Ink-wash smoke bleeding from the top */}
        <img
          src={smoke}
          alt=""
          aria-hidden
          width={1920}
          height={1080}
          className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] w-full object-cover object-top opacity-60 [mask-image:linear-gradient(to_bottom,black_0%,transparent_85%)]"
        />

        {/* Faded ink-linework motif */}
        <img
          src={envelope}
          alt="Ink drawing of a sealed envelope and a key"
          loading="lazy"
          width={1400}
          height={900}
          className="pointer-events-none absolute bottom-[6%] left-1/2 w-[min(72vw,560px)] -translate-x-1/2 opacity-35 mix-blend-multiply [mask-image:radial-gradient(closest-side,black_30%,transparent_100%)]"
        />

        <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
          <h1 className="reveal font-serif text-[clamp(4rem,14vw,11rem)] font-semibold leading-[0.95] tracking-tight">
            Shizukasa
          </h1>
          <p className="reveal mt-6 font-serif text-[clamp(1.25rem,3vw,2rem)] italic text-muted-foreground" style={{ transitionDelay: "120ms" }}>
            Private conversations, only between you two.
          </p>
          <p className="reveal mt-3 text-xs tracking-[0.3em] uppercase text-muted-foreground/70" style={{ transitionDelay: "200ms" }}>
            物語は、余白で進む。
          </p>

          <ul className="reveal mt-16 grid grid-cols-1 gap-x-12 gap-y-4 text-left text-sm text-muted-foreground sm:grid-cols-2" style={{ transitionDelay: "300ms" }}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <Icon size={15} strokeWidth={1.5} className="text-foreground/70" />
                <span className="tracking-[0.08em]">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ————— Center divider · CTA ————— */}
      <section className="relative flex flex-col items-center px-6 py-28">
        <span aria-hidden className="h-24 w-px bg-gradient-to-b from-transparent via-border to-foreground/40" />
        <a
          href="https://chat.yourdomain.com"
          className="cta-glow reveal mt-14 inline-flex items-center gap-3 rounded-full bg-primary px-12 py-5 text-base font-medium tracking-[0.06em] text-primary-foreground"
        >
          Start Chatting
          <span aria-hidden>→</span>
        </a>
        <p className="mt-8 text-[11px] tracking-[0.3em] uppercase text-muted-foreground/70">
          Scroll ↓
        </p>
        <span aria-hidden className="mt-14 h-24 w-px bg-gradient-to-b from-foreground/40 via-border to-transparent" />
      </section>

      {/* ————— Section 2 · Contact / Footer ————— */}
      <footer className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6">
        {/* Ink-wash texture fading at the very bottom */}
        <img
          src={smoke}
          alt=""
          aria-hidden
          loading="lazy"
          width={1920}
          height={1080}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[60vh] w-full rotate-180 object-cover object-top opacity-40 [mask-image:linear-gradient(to_bottom,black_0%,transparent_85%)]"
        />
        <div className="reveal relative z-10 flex flex-col items-center gap-6 text-center">
          <a
            href="https://github.com/Sinflin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github size={16} strokeWidth={1.5} />
            github.com/Sinflin
          </a>
          <a
            href="mailto:adityvishwakarama257@gmail.com"
            className="flex items-center gap-3 text-sm tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mail size={16} strokeWidth={1.5} />
            adityvishwakarama257@gmail.com
          </a>
          <p className="mt-8 font-serif text-lg italic text-foreground/80">
            Built for private conversation.
          </p>
        </div>
      </footer>
    </div>
  );
}
