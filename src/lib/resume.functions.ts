import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emptyProfile, type ProfileInput, type ResumeContent } from "./resume-types";

const experienceSchema = z.object({
  employer: z.string(),
  title: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string(),
});

const educationSchema = z.object({
  degree: z.string(),
  school: z.string(),
  year: z.string(),
});

const profileSchema = z.object({
  full_name: z.string(),
  headline: z.string(),
  phone: z.string(),
  email: z.string(),
  location: z.string(),
  linkedin: z.string(),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  certifications: z.string(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return emptyProfile();

    const base = emptyProfile();
    return {
      full_name: data.full_name ?? "",
      headline: data.headline ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      location: data.location ?? "",
      linkedin: data.linkedin ?? "",
      experience: (data.experience as ProfileInput["experience"])?.length
        ? (data.experience as ProfileInput["experience"])
        : base.experience,
      education: (data.education as ProfileInput["education"])?.length
        ? (data.education as ProfileInput["education"])
        : base.education,
      certifications: data.certifications ?? "",
    } satisfies ProfileInput;
  });

// The resume name is locked to the signed-in account. It is read from the
// stored profile once (falling back to the auth user's name/email) and can
// never be overwritten by client input, so a user can only build resumes in
// their own name.
type NameContext = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string };

async function lockedName(context: NameContext): Promise<string> {
  const existing = await context.supabase
    .from("profiles")
    .select("full_name")
    .eq("id", context.userId)
    .maybeSingle();
  const current = (existing.data?.full_name as string | null)?.trim();
  if (current) return current;

  const { data } = await context.supabase.auth.getUser();
  const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta = typeof meta["full_name"] === "string" ? (meta["full_name"] as string).trim() : "";
  const fromEmail = data.user?.email?.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";
  const derived = fromMeta || fromEmail;

  if (derived) {
    await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, full_name: derived, updated_at: new Date().toISOString() });
  }
  return derived;
}

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const full_name = await lockedName(context);
    const { error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      ...data,
      full_name,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true, full_name };
  });

export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        jobDescription: z.string().min(40, "Paste a longer job description."),
        detailLevel: z.enum(["little", "more", "heavy"]),
        profile: profileSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { generateResumeContent } = await import("./resume-generate.server");

    const full_name = await lockedName(context);
    const profile = { ...data.profile, full_name };

    await context.supabase.from("profiles").upsert({
      id: context.userId,
      ...profile,
      updated_at: new Date().toISOString(),
    });

    const content = await generateResumeContent({ ...data, profile });

    const title = `${content.headline?.split("|")[0]?.trim() || "Resume"} — ${new Date().toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    )}`;

    const { data: row, error } = await context.supabase
      .from("resumes")
      .insert({
        user_id: context.userId,
        title,
        job_description: data.jobDescription,
        detail_level: data.detailLevel,
        content,
      })
      .select("id, title, created_at")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id, title: row.title, content };
  });

export const listMyResumes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("resumes")
      .select("id, title, detail_level, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });

export const getResume = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("resumes")
      .select("id, title, job_description, detail_level, content, created_at")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const downloadResumeDocx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const [{ buildResumeDocx }, resume, profile] = await Promise.all([
      import("./resume-docx.server"),
      context.supabase.from("resumes").select("content, title").eq("id", data.id).single(),
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    if (resume.error) throw new Error(resume.error.message);

    const base64 = await buildResumeDocx(resume.data.content as unknown as ResumeContent, {
      fullName: profile.data?.full_name ?? "",
      phone: profile.data?.phone ?? "",
      email: profile.data?.email ?? "",
      location: profile.data?.location ?? "",
      linkedin: profile.data?.linkedin ?? "",
    });

    const fileName = `${(profile.data?.full_name || "resume").replace(/[^\w]+/g, "_")}_Resume.docx`;
    return { base64, fileName };
  });

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("resumes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
