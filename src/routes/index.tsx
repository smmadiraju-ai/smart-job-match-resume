import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileDown, FileText, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DETAIL_LEVELS } from "@/lib/resume-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TailorCV — JD-matched resumes, written for you" },
      {
        name: "description",
        content:
          "Paste the job description, add your employers and dates, and TailorCV writes the summary, skills and every bullet to match — downloadable as a Word file.",
      },
      { property: "og:title", content: "TailorCV — JD-matched resumes, written for you" },
      {
        property: "og:description",
        content:
          "Paste the job description, add your employers and dates, and TailorCV writes the summary, skills and every bullet to match — downloadable as a Word file.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: Target,
    title: "Paste the job description",
    body: "Every keyword, tool and responsibility in the posting becomes the source of truth for your resume.",
  },
  {
    icon: FileText,
    title: "Add only the facts",
    body: "Employers, titles, locations, dates, education and certifications. Duties are not your job here.",
  },
  {
    icon: Sparkles,
    title: "AI writes the rest",
    body: "Professional summary, skills and tools, and every experience bullet — matched to the posting.",
  },
  {
    icon: FileDown,
    title: "Download in Word",
    body: "Formatted exactly like a recruiter-ready resume, with the important keywords already bolded.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ink text-gold">
            <FileText className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">TailorCV</span>
        </div>
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-gold" />
          Built for keyword-matched applications
        </p>
        <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-6xl">
          A resume written to match the job,
          <span className="text-muted-foreground"> not just to list your history.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          You give the job description and your real employment facts. The AI writes your summary,
          your skills and tools, and every single bullet so the resume mirrors the posting.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">
              Build my resume <ArrowRight className="size-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Downloads as an editable Word document.
          </span>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-px px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="pr-6">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground">
                0{index + 1}
                <step.icon className="size-4 text-gold" />
              </div>
              <h2 className="mt-4 font-display text-base font-semibold tracking-tight">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Choose how deep it goes
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Same format, same accuracy — you control how much detail lands on the page.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {DETAIL_LEVELS.map((level) => (
            <div
              key={level.value}
              className="rounded-2xl border border-border bg-card p-6 shadow-panel"
            >
              <p className="font-display text-lg font-semibold tracking-tight">{level.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{level.blurb}</p>
              <p className="mt-5 text-xs font-medium uppercase tracking-widest text-gold-foreground">
                ~{level.bullets} bullets per role
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10 text-center text-sm text-muted-foreground">
        TailorCV — never invents employers, titles or dates.
      </footer>
    </main>
  );
}
