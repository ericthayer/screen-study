import { describe, expect, it } from 'vitest';
import { slugify, withFrontmatter } from '../src/server/services/article.js';
import { validateBundle } from '../src/server/services/publish.js';

describe('withFrontmatter', () => {
  it('prepends YAML frontmatter', () => {
    const out = withFrontmatter('# Hello', { title: 'My Study', date: '2026-08-03', draft: true });
    expect(out).toBe('---\ntitle: "My Study"\ndate: 2026-08-03\ndraft: true\n---\n\n# Hello');
  });

  it('does not double-add frontmatter', () => {
    const md = '---\ntitle: "x"\n---\n\nBody';
    expect(withFrontmatter(md, { title: 'y', date: '2026-01-01', draft: true })).toBe(md);
  });

  it('escapes quotes in titles', () => {
    const out = withFrontmatter('Body', { title: 'A "quoted" title', date: '2026-01-01', draft: false });
    expect(out).toContain('title: "A \\"quoted\\" title"');
  });
});

describe('slugify', () => {
  it('slugifies titles', () => {
    expect(slugify('Checkout Redesign: Week 32!')).toBe('checkout-redesign-week-32');
  });

  it('falls back for empty slugs', () => {
    expect(slugify('!!!')).toBe('untitled');
  });
});

describe('validateBundle (AC-PUB-01)', () => {
  const frontmatter = '---\ntitle: "T"\ndate: 2026-08-03\ndraft: true\n---\n\n';

  it('accepts a valid bundle', () => {
    expect(
      validateBundle({ slug: 't', markdown: `${frontmatter}![shot](./a.png)`, mediaKeys: ['a.png'] }),
    ).toEqual([]);
  });

  it('flags missing frontmatter', () => {
    expect(validateBundle({ slug: 't', markdown: '# Body', mediaKeys: [] })).toEqual([
      'Missing YAML frontmatter block.',
    ]);
  });

  it('flags invalid frontmatter fields', () => {
    const issues = validateBundle({ slug: 't', markdown: '---\ndate: soon\n---\n', mediaKeys: [] });
    expect(issues).toHaveLength(3);
  });

  it('flags empty alt text and media missing from the bundle', () => {
    const issues = validateBundle({ slug: 't', markdown: `${frontmatter}![ ](./b.png)`, mediaKeys: [] });
    expect(issues).toEqual([
      'Image ./b.png has empty alt text.',
      'Referenced media ./b.png is not included in the bundle.',
    ]);
  });
});
