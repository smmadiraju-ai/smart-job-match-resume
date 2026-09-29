import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import type { ResumeContent } from "./resume-types";

const FONT = "Calibri";

/** Splits "plain **bold** plain" into docx runs. */
function runs(text: string, base: { size?: number; color?: string } = {}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    return new TextRun({
      text: bold ? part.slice(2, -2) : part,
      bold,
      font: FONT,
      size: base.size ?? 21,
      color: base.color ?? "1A1A1A",
    });
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 260, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "1A1A1A", space: 2 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: FONT,
        size: 24,
        color: "1A1A1A",
      }),
    ],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "resume-bullets", level: 0 },
    spacing: { after: 40, line: 264 },
    children: runs(text),
  });
}

export async function buildResumeDocx(content: ResumeContent, contact: {
  fullName: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
}) {
  const contactLine = [contact.phone, contact.email, contact.location, contact.linkedin]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join("  |  ");

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: (contact.fullName || "Your Name").toUpperCase(),
          bold: true,
          font: FONT,
          size: 40,
          color: "1A1A1A",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: content.headline.toUpperCase(),
          bold: true,
          font: FONT,
          size: 22,
          color: "1A1A1A",
        }),
      ],
    }),
  ];

  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: contactLine, font: FONT, size: 20, color: "3A3A3A" })],
      }),
    );
  }

  children.push(sectionHeading("Professional Summary"));
  content.summary.forEach((line) => children.push(bullet(line)));

  children.push(sectionHeading("Skills & Tools"));
  content.skillGroups.forEach((group) => {
    children.push(
      new Paragraph({
        spacing: { after: 80, line: 264 },
        children: [
          new TextRun({ text: `${group.label}: `, bold: true, font: FONT, size: 21, color: "1A1A1A" }),
          new TextRun({
            text: group.items.join(" | "),
            font: FONT,
            size: 21,
            color: "1A1A1A",
          }),
        ],
      }),
    );
  });

  children.push(sectionHeading("Experience"));
  content.experience.forEach((role) => {
    children.push(
      new Paragraph({
        spacing: { before: 180, after: 0 },
        children: [
          new TextRun({ text: role.title, bold: true, font: FONT, size: 24, color: "1A1A1A" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: role.employer, bold: true, font: FONT, size: 21, color: "1A1A1A" }),
          new TextRun({
            text: [role.location, role.dates].filter(Boolean).join("  |  ")
              ? `  —  ${[role.location, role.dates].filter(Boolean).join("  |  ")}`
              : "",
            font: FONT,
            size: 21,
            color: "3A3A3A",
          }),
        ],
      }),
    );
    role.bullets.forEach((line) => children.push(bullet(line)));
  });

  if (content.education.length) {
    children.push(sectionHeading("Education"));
    content.education.forEach((line) =>
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: runs(line),
        }),
      ),
    );
  }

  if (content.certifications?.trim()) {
    children.push(sectionHeading("Certifications"));
    children.push(new Paragraph({ spacing: { after: 60 }, children: runs(content.certifications) }));
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: FONT },
          paragraph: { outlineLevel: 0 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "resume-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export type { HeadingLevel };
