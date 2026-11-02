import type { ScreenStudyDb } from '../db.js';
import type {
  CaseStudyOutline,
  CaseStudySection,
  Gap,
  Insight,
  OutlineReview,
  SectionKey,
} from '../../shared/types.js';
import { SECTION_LABELS } from '../../shared/types.js';

/**
 * Heuristic mapping from an insight to the case study section it best supports.
 * Later replaced/augmented by LLM classification; rules are deterministic so
 * users can predict and override them.
 */
export function classifyInsight(insight: Insight | null): SectionKey {
  if (!insight) return 'process';
  if (insight.outcomes.length > 0) return 'outcomes';
  if (insight.decisions.length > 0) return 'decisions';
  const text = `${insight.summary} ${insight.activity ?? ''}`.toLowerCase();
  if (/\b(problem|bug|issue|pain|friction|error|broken)\b/.test(text)) return 'problem';
  if (/\b(result|shipped|launched|outcome|impact|metric)\b/.test(text)) return 'outcomes';
  if (/\b(decided|chose|decision|tradeoff|approach)\b/.test(text)) return 'decisions';
  return 'process';
}

/** Detect sections of the outline that lack supporting media or insight detail. */
export function detectGaps(outline: Omit<CaseStudyOutline, 'gaps' | 'review'>, db: ScreenStudyDb): Gap[] {
  const gaps: Gap[] = [];
  for (const section of outline.sections) {
    if (section.mediaIds.length === 0) {
      gaps.push({
        sectionKey: section.sectionKey,
        message: `"${section.title}" has no supporting media yet.`,
      });
      continue;
    }
    const withInsights = section.mediaIds.filter((id) => {
      const insight = db.getInsightByMedia(id);
      return insight && insight.summary.length > 0;
    });
    if (withInsights.length < section.mediaIds.length) {
      gaps.push({
        sectionKey: section.sectionKey,
        message: `"${section.title}" has ${section.mediaIds.length - withInsights.length} media item(s) without analyzed insights.`,
      });
    }
  }
  return gaps;
}

/** Minimum number of sections with media for a coherent narrative. */
export const MIN_SECTIONS_COVERED = 2;

/**
 * Organization rubric (AC-ORG-05): deterministic checks that flag an outline
 * as "needs review" so an incoherent batch is not silently drafted.
 */
export function reviewOutline(sections: CaseStudySection[], db: ScreenStudyDb): OutlineReview {
  const reasons: string[] = [];
  const mediaIds = sections.flatMap((s) => s.mediaIds);
  if (mediaIds.length === 0) {
    reasons.push('No media is assigned to any section yet.');
  } else {
    const covered = sections.filter((s) => s.mediaIds.length > 0).length;
    if (covered < MIN_SECTIONS_COVERED) {
      reasons.push(
        `Only ${covered} of ${sections.length} sections have supporting media; a coherent narrative needs at least ${MIN_SECTIONS_COVERED}.`,
      );
    }
    const missing = mediaIds.filter((id) => !db.getInsightByMedia(id)?.summary).length;
    if (missing * 2 > mediaIds.length) {
      reasons.push(`${missing} of ${mediaIds.length} assigned media items lack analyzed insights.`);
    }
  }
  return { needsReview: reasons.length > 0, reasons };
}

/**
 * Auto-organize: assign all analyzed-but-unassigned media in the case study's
 * capture window into sections based on insight classification.
 */
export function autoOrganize(db: ScreenStudyDb, caseStudyId: string): CaseStudyOutline {
  const study = db.getCaseStudy(caseStudyId);
  if (!study) throw new Error(`Case study not found: ${caseStudyId}`);
  const sections = db.getSections(caseStudyId);
  const assigned = new Set(sections.flatMap((s) => s.mediaIds));

  const candidates = db
    .listMediaItems()
    .filter((m) => m.status === 'analyzed' && !assigned.has(m.id))
    .filter((m) => {
      if (!study.weekStart || !m.capturedAt) return true;
      const start = new Date(study.weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const captured = new Date(m.capturedAt);
      return captured >= start && captured < end;
    });

  for (const media of candidates) {
    const key = classifyInsight(media.insight);
    const section = db.getSectionByKey(caseStudyId, key);
    if (section) db.assignMediaToSection(section.id, media.id);
  }

  return getOutline(db, caseStudyId);
}

export function getOutline(db: ScreenStudyDb, caseStudyId: string): CaseStudyOutline {
  const study = db.getCaseStudy(caseStudyId);
  if (!study) throw new Error(`Case study not found: ${caseStudyId}`);
  const sections = db.getSections(caseStudyId);
  const outline = { ...study, sections };
  const gaps = detectGaps(outline, db);
  return { ...outline, gaps, review: reviewOutline(sections, db) };
}

export function sectionLabel(key: SectionKey): string {
  return SECTION_LABELS[key];
}
