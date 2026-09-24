import { describe, expect, it } from 'vitest';
import { slugify, withFrontmatter } from '../src/server/services/article.js';

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
