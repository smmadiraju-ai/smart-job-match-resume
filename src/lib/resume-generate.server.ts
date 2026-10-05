import { streamText } from "ai";
import { z } from "zod";

import { RESPONSES_PROVIDER_OPTIONS, RESUME_MODEL, createResponsesProvider } from "./ai/responses.server";
import { DETAIL_LEVELS, type DetailLevel, type ResumeContent } from "./resume-types";

const resumeSchema = z.object({
  contact: z.object({ fullName: z.string(), email: z.string(), phone: z.string(), location: z.string(), linkedin: z.string() }),
  headline: z.string(),
  summary: z.array(z.string()),
  skillGroups: z.array(z.object({ label: z.string(), items: z.array(z.string()) })),
  experience: z.array(
    z.object({
      title: z.string(),
      employer: z.string(),
      location: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(z.string()),
  certifications: z.string(),
});

const SYSTEM_PROMPT = `You are an expert US resume writer specialising in ATS-optimised, keyword-matched resumes.

You receive a job description (JD) and the candidate's existing resume as pasted text. From that resume extract ONLY the facts: name, contact details, employers/clients, locations, dates, education and certifications.

Your job:
- Rewrite each role's job title and all duties to match the JD (keep the title realistic for that role's seniority). Ignore the old duties — write new ones from the JD.
- Write the professional summary, the skills & tools groups, and every experience bullet yourself.
- Mirror the JD's exact terminology, tools, systems, standards and responsibilities so the resume matches the JD as closely as possible.
- Tailor each role's bullets to that role's seniority and era: the most recent role owns the most advanced JD responsibilities, earlier roles carry the supporting/field-level version.
- Never invent employers/clients, dates, schools or certifications. Only use the ones in the pasted resume, in the same order.
- Never invent fake metrics, client names or dollar figures.
- Bold the important JD keywords and phrases inside bullets by wrapping them in double asterisks, like **CPM scheduling**. Bold roughly 2-4 phrases per bullet, never a whole bullet.
- Bullets start with a strong past/present-tense verb, no pronouns, no trailing period is required but be consistent.
- Skill groups: 5-6 groups with descriptive labels (e.g. "Project Management & Controls", "Software & Tools"), each with 8-14 short JD-aligned terms.
- Education entries: one string per entry, degree first, then school and year if provided.
- Certifications: a single comma-separated line.`;

export async function generateResumeContent(input: {
  jobDescription: string;
  detailLevel: DetailLevel;
  resumeText: string;
}): Promise<ResumeContent> {
  const level = DETAIL_LEVELS.find((item) => item.value === input.detailLevel) ?? DETAIL_LEVELS[1]!;
  const provider = createResponsesProvider();

  const prompt = `JOB DESCRIPTION
"""
${input.jobDescription}
"""

CANDIDATE'S CURRENT RESUME (use only for facts: name, contact, employers/clients, locations, dates, education, certifications)
"""
${input.resumeText}
"""

DETAIL LEVEL: ${level.label}
- Write exactly ${level.summary} professional summary bullets.
- Write exactly ${level.bullets} bullets for EACH role found in the resume.
- Headline: a short pipe-separated title line matching the JD, e.g. "JAVA FULL STACK DEVELOPER | SPRING BOOT | REACT".
- contact: copy name, email, phone, location and LinkedIn/GitHub link exactly from the resume (empty string if missing).`;

  const result = streamText({
    model: provider.responses(RESUME_MODEL),
    system: SYSTEM_PROMPT + JSON_INSTRUCTIONS,
    prompt,
    providerOptions: RESPONSES_PROVIDER_OPTIONS,
  });

  const text = await result.text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The AI did not return a resume. Please try again.");
  const parsed = resumeSchema.safeParse(JSON.parse(match[0]));
  if (!parsed.success) throw new Error("The AI returned an incomplete resume. Please try again.");
  return parsed.data;
}

const JSON_INSTRUCTIONS = `

Respond with ONLY a JSON object (no prose, no code fences) of this exact shape:
{"contact": {"fullName": string, "email": string, "phone": string, "location": string, "linkedin": string}, "headline": string, "summary": string[], "skillGroups": [{"label": string, "items": string[]}], "experience": [{"title": string, "employer": string, "location": string, "dates": string, "bullets": string[]}], "education": string[], "certifications": string}`;

