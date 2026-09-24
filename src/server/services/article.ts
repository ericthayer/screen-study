import type { ScreenStudyDb } from '../db.js';
import type { AiProvider, ArticleContext } from './ai.js';
import type { ArticleDraft } from '../../shared/types.js';

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
