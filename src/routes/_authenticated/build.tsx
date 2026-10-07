import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { FileDown, FileText, Loader2, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  DETAIL_LEVELS,
  emptyEducation,
  emptyExperience,
  emptyProfile,
  type DetailLevel,
  type ProfileInput,
  type ResumeContent,
} from "@/lib/resume-types";
import {
  deleteResume,
  downloadResumeDocx,
  generateResume,
  getMyProfile,
  getResume,
  listMyResumes,
} from "@/lib/resume.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/build")({
  head: () => ({
    meta: [
      { title: "Build a resume — TailorCV" },
      { name: "description", content: "Create a JD-matched resume and download it as Word." },
      { property: "og:title", content: "Build a resume — TailorCV" },
      { property: "og:description", content: "Create a JD-matched resume and download it as Word." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuildPage,
});

function Bolded({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-panel">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function BuildPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchList = useServerFn(listMyResumes);
  const runGenerate = useServerFn(generateResume);
  const runDownload = useServerFn(downloadResumeDocx);
  const runGet = useServerFn(getResume);
  const runDelete = useServerFn(deleteResume);

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const listQuery = useQuery({ queryKey: ["resumes"], queryFn: () => fetchList() });

  const [profile, setProfile] = useState<ProfileInput>(emptyProfile());
  const [jd, setJd] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [level, setLevel] = useState<DetailLevel>("more");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<{ id: string; content: ResumeContent } | null>(null);

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
  }, [profileQuery.data]);

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  async function handleGenerate() {
    if (jd.trim().length < 40) { toast.error("Paste the full job description first."); return; }
    if (resumeText.trim().length < 80) { toast.error("Paste your current resume first."); return; }
    setBusy(true);
    try {
      const res = await runGenerate({ data: { jobDescription: jd, detailLevel: level, resumeText } });
      setResult({ id: res.id, content: res.content });
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Your resume is ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the resume.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(id: string) {
    setDownloading(true);
    try {
      const { base64, fileName } = await runDownload({ data: { id } });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  async function openResume(id: string) {
    const row = await runGet({ data: { id } });
    setResult({ id: row.id, content: row.content as ResumeContent });
  }

  async function removeResume(id: string) {
    await runDelete({ data: { id } });
    if (result?.id === id) setResult(null);
    queryClient.invalidateQueries({ queryKey: ["resumes"] });
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ink text-gold">
            <FileText className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">TailorCV</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Section title="1. Job description">
            <Textarea
              rows={9}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description you're applying to…"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {DETAIL_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    level === l.value ? "border-gold bg-gold/10" : "border-border hover:bg-muted",
                  )}
                >
                  <p className="font-display text-sm font-semibold">{l.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{l.blurb}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section title="2. Your current resume">
            <p className="text-sm text-muted-foreground">
              Paste your whole resume. We keep your name, contact details, employers, dates, education and certifications — and rewrite your roles and duties to match the job.
            </p>
            <Textarea
              rows={14}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your current resume here…"
            />
          </Section>

          <Button size="lg" className="w-full" disabled={busy} onClick={handleGenerate}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "Writing your resume…" : "Create my resume"}
          </Button>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Section title="Preview">
            {!result ? (
              <p className="text-sm text-muted-foreground">Your resume will appear here once it's created.</p>
            ) : (
              <>
                <Button disabled={downloading} onClick={() => handleDownload(result.id)}>
                  {downloading ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
                  Download Word
                </Button>
                <article className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-background p-6 text-sm leading-relaxed">
                  <h3 className="text-center text-xl font-bold uppercase">{result.content.contact?.fullName || profile.full_name}</h3>
                  <p className="text-center font-bold uppercase">{result.content.headline}</p>
                  <p className="text-center text-xs text-muted-foreground">
                    {(result.content.contact ? [result.content.contact.email, result.content.contact.phone, result.content.contact.location, result.content.contact.linkedin] : [profile.email, profile.phone, profile.location, profile.linkedin]).filter(Boolean).join(" | ")}
                  </p>
                  <Heading>Professional Summary</Heading>
                  <ul className="list-disc space-y-1 pl-5">
                    {result.content.summary.map((s, i) => (
                      <li key={i}><Bolded text={s} /></li>
                    ))}
                  </ul>
                  <Heading>Skills & Tools</Heading>
                  {result.content.skillGroups.map((g) => (
                    <p key={g.label}><strong>{g.label}:</strong> {g.items.join(", ")}</p>
                  ))}
                  <Heading>Professional Experience</Heading>
                  {result.content.experience.map((r, i) => (
                    <div key={i} className="mb-3">
                      <p><strong>{r.title}</strong> — <strong>{r.employer}</strong></p>
                      <p className="text-xs text-muted-foreground">{[r.location, r.dates].filter(Boolean).join(" | ")}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {r.bullets.map((b, j) => (
                          <li key={j}><Bolded text={b} /></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {result.content.education.length > 0 && (
                    <>
                      <Heading>Education</Heading>
                      {result.content.education.map((e, i) => <p key={i}>{e}</p>)}
                    </>
                  )}
                  {result.content.certifications && (
                    <>
                      <Heading>Certifications</Heading>
                      <p>{result.content.certifications}</p>
                    </>
                  )}
                </article>
              </>
            )}
          </Section>

          <Section title="My resumes">
            {!listQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">No resumes yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {listQuery.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                    <button className="truncate text-left text-sm font-medium hover:underline" onClick={() => openResume(r.id)}>
                      {r.title}
                    </button>
                    <div className="flex shrink-0 items-center">
                      <Button variant="ghost" size="icon" aria-label="Download Word" disabled={downloading} onClick={() => handleDownload(r.id)}>
                        <FileDown className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete resume" onClick={() => removeResume(r.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </main>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h4 className="mb-2 mt-5 border-b border-foreground pb-1 text-xs font-bold uppercase tracking-wider">{children}</h4>;
}
