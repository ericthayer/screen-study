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

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const IMAGE_LINK = /!\[([^\]]*)\]\(\.\/([^)\s]+)\)/g;

/**
 * Target-agnostic bundle schema check (AC-PUB-01): valid frontmatter, every
 * referenced media file is included, and every image has non-empty alt text.
 * Returns human-readable issues; an empty list means the bundle is valid.
 */
export function validateBundle(bundle: PublishBundle): string[] {
  const issues: string[] = [];
  const frontmatter = FRONTMATTER.exec(bundle.markdown)?.[1];
  if (frontmatter === undefined) {
    issues.push('Missing YAML frontmatter block.');
  } else {
    if (!/^title: .+$/m.test(frontmatter)) issues.push('Frontmatter is missing "title".');
    if (!/^date: \d{4}-\d{2}-\d{2}$/m.test(frontmatter))
      issues.push('Frontmatter "date" must be YYYY-MM-DD.');
    if (!/^draft: (true|false)$/m.test(frontmatter))
      issues.push('Frontmatter "draft" must be true or false.');
  }
  const included = new Set(bundle.mediaKeys);
  for (const match of bundle.markdown.matchAll(IMAGE_LINK)) {
    const [, alt, key] = match;
    if (!alt.trim()) issues.push(`Image ./${key} has empty alt text.`);
    if (!included.has(key)) issues.push(`Referenced media ./${key} is not included in the bundle.`);
  }
  return issues;
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
  publish(db: ScreenStudyDb, draftId: string): Promise<AdapterResult>;
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

  /**
   * @param media storage holding uploaded media (read-only here)
   * @param output storage rooted at PUBLISH_DIR where articles are written
   */
  constructor(
    private media: StorageService,
    private output: StorageService,
  ) {}

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
        if (!media || !this.media.exists(media.filename)) continue;
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

  async publish(db: ScreenStudyDb, draftId: string): Promise<AdapterResult> {
    const bundle = this.render(db, draftId);
    const prefix = bundle.slug;

    this.output.deleteDir(prefix);
    for (const key of bundle.mediaKeys) {
      await this.output.save(path.posix.join(prefix, key), this.media.createReadStream(key));
    }
    // Mark as published in frontmatter.
    this.output.writeText(
      path.posix.join(prefix, 'index.md'),
      bundle.markdown.replace(/^draft: true$/m, 'draft: false'),
    );

    // Return the absolute published directory as the location so operators can
    // find the output on disk; retract() resolves it back to the storage key.
    return { location: this.output.absolutePath(prefix) ?? prefix };
  }

  retract(record: PublishRecord): void {
    if (record.status === 'published' && record.path) {
      // record.path is the absolute directory returned by publish(); the slug
      // (last segment) is the storage key. Records created before output moved
      // to PUBLISH_DIR point into the media storage, so retract from there.
      const slug = path.basename(record.path);
      const legacy = this.media.absolutePath(slug) === record.path;
      (legacy ? this.media : this.output).deleteDir(slug);
    }
  }
}
