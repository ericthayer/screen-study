import path from 'node:path';
import type { ScreenStudyDb } from '../db.js';
import type { PublishRecord } from '../../shared/types.js';
import type { StorageService } from './storage.js';
import { slugify } from './article.js';

/** A publishable bundle: the rendered article plus the media it references. */
export interface PublishBundle {
  slug: string;
  markdown: string;
  mediaKeys: string[];
}

/** Result of a publish/retract call against a target. */
export interface AdapterResult {
  /** Target-specific locator (e.g. a directory path or PR URL). */
  location: string | null;
}

/**
 * Publishing target seam (ADR-010): publishing targets implement this
 * interface so a Git-push or CMS adapter can be added without changing the
 * publish routes. The filesystem adapter below is the first implementation.
 */
export interface PublishingAdapter {
  readonly target: string;
  /** Build the bundle that would be published, without touching the target. */
  render(db: ScreenStudyDb, draftId: string): PublishBundle;
  /** Like publish, but writes nothing — returns the bundle for preview. */
  dryRun(db: ScreenStudyDb, draftId: string): PublishBundle;
  publish(db: ScreenStudyDb, draftId: string): AdapterResult;
  retract(record: PublishRecord): void;
}

/**
 * Filesystem adapter: writes the article as a Markdown file plus copies of
 * referenced media into a publish directory. That directory can be the content
 * folder of a static site (Astro/Hugo/Eleventy), which makes this compatible
 * with git-based publishing workflows.
 */
export class FilesystemPublisher implements PublishingAdapter {
  readonly target = 'filesystem';

  constructor(private storage: StorageService) {}

  render(db: ScreenStudyDb, draftId: string): PublishBundle {
    const draft = db.getDraft(draftId);
    if (!draft) throw new Error(`Draft not found: ${draftId}`);

    // Collect media referenced by the case study sections and rewrite references.
    let markdown = draft.markdown;
    const mediaKeys: string[] = [];
    const sections = db.getSections(draft.caseStudyId);
    for (const section of sections) {
      for (const mediaId of section.mediaIds) {
        const media = db.getMediaItem(mediaId);
        if (!media || !this.storage.exists(media.filename)) continue;
        mediaKeys.push(media.filename);
        markdown = markdown
          .split(`**${media.originalName}**`)
          .join(`![${media.originalName}](./${media.filename})`);
      }
    }

    return { slug: slugify(draft.title), markdown, mediaKeys };
  }

  dryRun(db: ScreenStudyDb, draftId: string): PublishBundle {
    return this.render(db, draftId);
  }

  publish(db: ScreenStudyDb, draftId: string): AdapterResult {
    const bundle = this.render(db, draftId);
    const prefix = bundle.slug;

    this.storage.deleteDir(prefix);
    for (const key of bundle.mediaKeys) {
      this.storage.copy(key, path.posix.join(prefix, key));
    }
    // Mark as published in frontmatter.
    this.storage.writeText(
      path.posix.join(prefix, 'index.md'),
      bundle.markdown.replace(/^draft: true$/m, 'draft: false'),
    );

    const location = this.storage.absolutePath(prefix);
    return { location: location ?? prefix };
  }

  retract(record: PublishRecord): void {
    if (record.status === 'published' && record.path) {
      const prefix = path.basename(record.path);
      this.storage.deleteDir(prefix);
    }
  }
}
