import type { ScreenStudyDb } from '../db.js';
import type { AiProvider, ArticleContext } from './ai.js';
import type { ArticleDraft, Groundedness } from '../../shared/types.js';

/** Minimum share of case study media a draft must reference to be publishable. */
export const MIN_GROUNDEDNESS = 0.5;

const BOLD_REFERENCE = /\*\*([^*\n]+?)\*\*/g;
const FILENAME_LIKE = /\.[a-z0-9]{2,5}$/i;

/**
 * Groundedness check (AC-GEN-04): drafts reference artifacts as **filename**.
 * A draft is grounded when it references no unknown artifacts and covers at
 * least MIN_GROUNDEDNESS of the case study's media. Ungrounded drafts cannot
 * be published until edited (a new version) to fix the issues.
 */
export function assessGroundedness(db: ScreenStudyDb, draft: ArticleDraft): Groundedness {
  const names = new Set(
    db
      .getSections(draft.caseStudyId)
      .flatMap((s) => s.mediaIds)
      .map((id) => db.getMediaItem(id)?.originalName)
      .filter((name): name is string => Boolean(name)),
  );
  const referenced = new Set<string>();
  const unknown = new Set<string>();
  for (const match of draft.markdown.matchAll(BOLD_REFERENCE)) {
    const token = match[1].trim();
    if (names.has(token)) referenced.add(token);
    else if (FILENAME_LIKE.test(token)) unknown.add(token);
  }

  const issues: string[] = [];
  const score = names.size === 0 ? 0 : referenced.size / names.size;
  if (names.size === 0) {
    issues.push('The case study has no supporting media to ground the draft.');
  } else if (score < MIN_GROUNDEDNESS) {
    issues.push(
      `The draft references ${referenced.size} of ${names.size} supporting media items (needs at least ${Math.round(MIN_GROUNDEDNESS * 100)}%).`,
    );
  }
  for (const name of unknown) {
    issues.push(`The draft references "${name}", which is not part of this case study.`);
  }
  return {
    grounded: issues.length === 0,
    score: Math.round(score * 100) / 100,
    referencedMedia: referenced.size,
    totalMedia: names.size,
    issues,
  };
}

export function buildArticleContext(db: ScreenStudyDb, caseStudyId: string): ArticleContext {
  const study = db.getCaseStudy(caseStudyId);
  if (!study) throw new Error(`Case study not found: ${caseStudyId}`);
  const sections = db.getSections(caseStudyId).map((section) => ({
    sectionKey: section.sectionKey,
    title: section.title,
    items: section.mediaIds
      .map((mediaId) => {
        const media = db.getMediaItem(mediaId);
        if (!media) return null;
        const insight = db.getInsightByMedia(mediaId);
        return {
          originalName: media.originalName,
          kind: media.kind,
          insight: insight
            ? {
                summary: insight.summary,
                activity: insight.activity,
                decisions: insight.decisions,
                outcomes: insight.outcomes,
                extractedText: insight.extractedText,
                transcript: insight.transcript,
              }
            : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  }));
  return { title: study.title, weekStart: study.weekStart, sections };
}

/** Generate a new versioned draft for a case study using the AI provider. */
export async function generateDraft(
  db: ScreenStudyDb,
  ai: AiProvider,
  caseStudyId: string,
): Promise<ArticleDraft> {
  const context = buildArticleContext(db, caseStudyId);
  const markdown = await ai.generateArticle(context);
  return db.createDraft({
    caseStudyId,
    title: context.title,
    markdown: withFrontmatter(markdown, {
      title: context.title,
      date: context.weekStart ?? new Date().toISOString().slice(0, 10),
      draft: true,
    }),
    provider: ai.name,
  });
}

/** Prepend YAML frontmatter unless the markdown already has it. */
export function withFrontmatter(
  markdown: string,
  fields: { title: string; date: string; draft: boolean },
): string {
  if (markdown.startsWith('---')) return markdown;
  const escapedTitle = fields.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return [
    '---',
    `title: "${escapedTitle}"`,
    `date: ${fields.date}`,
    `draft: ${fields.draft}`,
    '---',
    '',
    markdown,
  ].join('\n');
}

/** Slugify a title for use as a published filename. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}
