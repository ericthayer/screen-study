import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { ScreenStudyDb } from '../db.js';
import type { PublishRecord } from '../../shared/types.js';
import { slugify } from './article.js';

/**
 * Filesystem publisher: writes the article as a Markdown file plus copies of
 * referenced media into a publish directory. That directory can be the content
 * folder of a static site (Astro/Hugo/Eleventy), which makes this compatible
 * with git-based publishing workflows.
 */
export function publishDraft(
  db: ScreenStudyDb,
  config: AppConfig,
  draftId: string,
): PublishRecord {
  const draft = db.getDraft(draftId);
  if (!draft) throw new Error(`Draft not found: ${draftId}`);

  const slug = slugify(draft.title);
  const articleDir = path.join(config.publishDir, slug);

  try {
    fs.rmSync(articleDir, { recursive: true, force: true });
    fs.mkdirSync(articleDir, { recursive: true });

    // Copy media referenced by the case study sections and rewrite references.
    let markdown = draft.markdown;
    const sections = db.getSections(draft.caseStudyId);
    for (const section of sections) {
      for (const mediaId of section.mediaIds) {
        const media = db.getMediaItem(mediaId);
        if (!media) continue;
        const src = path.join(config.mediaDir, media.filename);
        if (!fs.existsSync(src)) continue;
        const dest = path.join(articleDir, media.filename);
        fs.copyFileSync(src, dest);
        markdown = markdown.split(`**${media.originalName}**`).join(`![${media.originalName}](./${media.filename})`);
      }
    }

    // Mark as published in frontmatter.
    markdown = markdown.replace(/^draft: true$/m, 'draft: false');

    const articlePath = path.join(articleDir, 'index.md');
    fs.writeFileSync(articlePath, markdown, 'utf8');

    const record = db.createPublishRecord({
      draftId,
      target: 'filesystem',
      status: 'published',
      path: articleDir,
    });
    db.updateDraft(draftId, { status: 'published' });
    return record;
  } catch (error) {
    return db.createPublishRecord({
      draftId,
      target: 'filesystem',
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function unpublishDraft(
  db: ScreenStudyDb,
  _config: AppConfig,
  recordId: string,
): PublishRecord {
  const record = db.getPublishRecord(recordId);
  if (!record) throw new Error(`Publish record not found: ${recordId}`);
  if (record.status === 'published' && record.path) {
    fs.rmSync(record.path, { recursive: true, force: true });
  }
  db.markUnpublished(recordId);
  return db.getPublishRecord(recordId)!;
}
