import { streamText } from "ai";
import { z } from "zod";

import { RESPONSES_PROVIDER_OPTIONS, RESUME_MODEL, createResponsesProvider } from "./ai/responses.server";
import { DETAIL_LEVELS, type DetailLevel, type ProfileInput, type ResumeContent } from "./resume-types";

const resumeSchema = z.object({
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

You receive a job description (JD) and a candidate's factual history (employers, titles, locations, dates, education, certifications).

Your job:
- Write the professional summary, the skills & tools groups, and every experience bullet yourself.
- Mirror the JD's exact terminology, tools, systems, standards and responsibilities so the resume matches the JD as closely as possible.
- Tailor each role's bullets to that role's seniority and era: the most recent role owns the most advanced JD responsibilities, earlier roles carry the supporting/field-level version.
- Never invent employers, job titles, dates, schools or certifications. Only use the ones provided.
- Never invent fake metrics, client names or dollar figures.
- Bold the important JD keywords and phrases inside bullets by wrapping them in double asterisks, like **CPM scheduling**. Bold roughly 2-4 phrases per bullet, never a whole bullet.
- Bullets start with a strong past/present-tense verb, no pronouns, no trailing period is required but be consistent.
- Skill groups: 5-6 groups with descriptive labels (e.g. "Project Management & Controls", "Software & Tools"), each with 8-14 short JD-aligned terms.
- Education entries: one string per entry, degree first, then school and year if provided.
- Certifications: a single comma-separated line.`;

export async function generateResumeContent(input: {
  jobDescription: string;
  detailLevel: DetailLevel;
  profile: ProfileInput;
}): Promise<ResumeContent> {
  const level = DETAIL_LEVELS.find((item) => item.value === input.detailLevel) ?? DETAIL_LEVELS[1]!;
  const provider = createResponsesProvider();

  const history = input.profile.experience
    .filter((role) => role.employer.trim() || role.title.trim())
    .map((role, index) => {
      const dates = [role.startDate, role.endDate].filter(Boolean).join(" – ");
      return `Role ${index + 1}
Employer: ${role.employer}
Title: ${role.title}
Location: ${role.location}
Dates: ${dates}
Candidate notes (optional context, may be empty): ${role.notes || "none"}`;
    })
    .join("\n\n");

  const education = input.profile.education
    .filter((entry) => entry.degree.trim() || entry.school.trim())
    .map((entry) => [entry.degree, entry.school, entry.year].filter(Boolean).join(", "))
    .join("\n");

  const prompt = `JOB DESCRIPTION
"""
${input.jobDescription}
"""

CANDIDATE NAME: ${input.profile.full_name || "Candidate"}
CANDIDATE TARGET HEADLINE (optional): ${input.profile.headline || "derive it from the JD title"}

WORK HISTORY (facts — keep employers, titles, locations and dates exactly as given, same order):
${history || "none provided"}

EDUCATION (keep exactly as given):
${education || "none provided"}

CERTIFICATIONS (keep exactly as given, you may expand abbreviations):
${input.profile.certifications || "none provided"}

DETAIL LEVEL: ${level.label}
- Write exactly ${level.summary} professional summary bullets.
- Write exactly ${level.bullets} bullets for EACH role in the work history.
- Headline: a short pipe-separated title line matching the JD, e.g. "CONSTRUCTION PROJECT MANAGER | PROJECT CONTROLS | FIELD OPERATIONS".`;

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
  return normalize(parsed.data, input.profile);
}

const JSON_INSTRUCTIONS = `

Respond with ONLY a JSON object (no prose, no code fences) of this exact shape:
{"headline": string, "summary": string[], "skillGroups": [{"label": string, "items": string[]}], "experience": [{"title": string, "employer": string, "location": string, "dates": string, "bullets": string[]}], "education": string[], "certifications": string}`;

function normalize(content: ResumeContent, profile: ProfileInput): ResumeContent {
  const facts = profile.experience.filter((role) => role.employer.trim() || role.title.trim());
  return {
    ...content,
    headline: content.headline || profile.headline || "",
    experience: content.experience.map((role, index) => {
      const fact = facts[index];
      return {
        ...role,
        title: fact?.title?.trim() || role.title,
        employer: fact?.employer?.trim() || role.employer,
        location: fact?.location?.trim() || role.location,
        dates: [fact?.startDate, fact?.endDate].filter(Boolean).join(" – ") || role.dates,
      };
    }),
  };
}
