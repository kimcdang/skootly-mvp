import { createHash } from "node:crypto";

export const MAX_TRANSCRIPT_CHARS = 60_000;
export const MAX_HOMEWORK_CHARS = 15_000;

export function sanitizeLearningText(value: string | undefined, limit: number) {
  if (!value) return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, limit);
}

export function hashLearningSource(input: {
  provider: string;
  title: string;
  lessonUrl?: string;
  transcript?: string;
  homework?: string;
}) {
  return createHash("sha256")
    .update(
      [input.provider, input.title, input.lessonUrl || "", input.transcript || "", input.homework || ""]
        .map(value => value.trim().toLocaleLowerCase())
        .join("\n---\n"),
    )
    .digest("hex");
}

export function parseHomeworkItems(homework: string) {
  const lines = homework
    .split("\n")
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(line => line.length >= 3)
    .slice(0, 12);
  return lines.map(title => ({ title: title.slice(0, 500), details: null, engagementType: classifyEngagement(title) }));
}

export function classifyEngagement(value: string) {
  const normalized = value.toLocaleLowerCase();
  if (/\b(post|share|publish|progress update)\b/.test(normalized)) return "post_progress" as const;
  if (/\b(ask|question|clarif)\b/.test(normalized)) return "ask_question" as const;
  if (/\b(reply|respond|comment)\b/.test(normalized)) return "reply_to_discussion" as const;
  if (/\b(watch|complete (?:the )?lesson)\b/.test(normalized)) return "complete_lesson" as const;
  return "complete_homework" as const;
}

/** Extracts only verbatim, bounded source snippets; it never invents course concepts. */
export function deriveLearningConcepts(transcript: string) {
  const candidates = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map(item => item.trim())
    .filter(item => item.length >= 24)
    .filter(item => !/^https?:\/\//i.test(item));
  return Array.from(new Set(candidates.map(item => item.slice(0, 240)))).slice(0, 4);
}

export function buildLearningContext(
  sources: Array<{
    title: string;
    communityName: string | null;
    lessonUrl: string | null;
    normalizedConcepts?: string | null;
    transcript: string | null;
    homework: string | null;
  }>,
) {
  return sources
    .slice(0, 5)
    .map(source => {
      const label = [source.title, source.communityName].filter(Boolean).join(" — ");
      const transcriptExcerpt = source.transcript ? source.transcript.slice(0, 1200) : "";
      const homeworkExcerpt = source.homework ? source.homework.slice(0, 900) : "";
      const concepts = source.normalizedConcepts ? (JSON.parse(source.normalizedConcepts) as string[]).join(" | ") : "";
      return `Source: ${label}\nLesson link: ${source.lessonUrl || "not provided"}\nVerbatim concepts: ${concepts || "not provided"}\nTranscript/captions: ${transcriptExcerpt || "not provided"}\nHomework: ${homeworkExcerpt || "not provided"}`;
    })
    .join("\n\n---\n\n")
    .slice(0, 6_000);
}
