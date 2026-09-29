export type DetailLevel = "little" | "more" | "heavy";

export const DETAIL_LEVELS: {
  value: DetailLevel;
  label: string;
  blurb: string;
  bullets: number;
  summary: number;
}[] = [
  {
    value: "little",
    label: "Little detailed",
    blurb: "Tight one-page feel — about 6 bullets per role.",
    bullets: 6,
    summary: 5,
  },
  {
    value: "more",
    label: "More detailed",
    blurb: "Balanced two-page resume — about 10 bullets per role.",
    bullets: 10,
    summary: 8,
  },
  {
    value: "heavy",
    label: "Heavy detailed",
    blurb: "Maximum keyword coverage — about 15 bullets per role.",
    bullets: 15,
    summary: 10,
  },
];

export type ExperienceInput = {
  employer: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type EducationInput = {
  degree: string;
  school: string;
  year: string;
};

export type ProfileInput = {
  full_name: string;
  headline: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  experience: ExperienceInput[];
  education: EducationInput[];
  certifications: string;
};

export type ResumeContent = {
  headline: string;
  summary: string[];
  skillGroups: { label: string; items: string[] }[];
  experience: {
    title: string;
    employer: string;
    location: string;
    dates: string;
    bullets: string[];
  }[];
  education: string[];
  certifications: string;
};

export const emptyExperience = (): ExperienceInput => ({
  employer: "",
  title: "",
  location: "",
  startDate: "",
  endDate: "",
  notes: "",
});

export const emptyEducation = (): EducationInput => ({ degree: "", school: "", year: "" });

export const emptyProfile = (): ProfileInput => ({
  full_name: "",
  headline: "",
  phone: "",
  email: "",
  location: "",
  linkedin: "",
  experience: [emptyExperience()],
  education: [emptyEducation()],
  certifications: "",
});
