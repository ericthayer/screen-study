import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScreenStudyDb } from '../src/server/db.js';
import { classifyInsight, getOutline } from '../src/server/services/organize.js';
import type { Insight } from '../src/shared/types.js';

function makeInsight(partial: Partial<Insight>): Insight {
  return {
    id: 'i1',
    mediaId: 'm1',
    summary: '',
    activity: null,
    decisions: [],
    outcomes: [],
    extractedText: null,
    transcript: null,
    provider: 'local',
    model: null,
    edited: false,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('classifyInsight', () => {
  it('routes insights with outcomes to the outcomes section', () => {
    expect(classifyInsight(makeInsight({ outcomes: ['Shipped the fix'] }))).toBe('outcomes');
  });

  it('routes insights with decisions to the decisions section', () => {
    expect(classifyInsight(makeInsight({ decisions: ['Chose Flexbox'] }))).toBe('decisions');
  });

  it('routes problem-flavored summaries to the problem section', () => {
    expect(classifyInsight(makeInsight({ summary: 'Investigating a layout bug in Safari' }))).toBe(
      'problem',
    );
  });

  it('defaults to process', () => {
    expect(classifyInsight(makeInsight({ summary: 'Working on the dashboard' }))).toBe('process');
    expect(classifyInsight(null)).toBe('process');
  });
});

describe('detectGaps', () => {
  let db: ScreenStudyDb;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'screen-study-gaps-'));
    db = new ScreenStudyDb(path.join(dir, 'test.db'));
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('flags empty sections', () => {
    const study = db.createCaseStudy({ title: 'Test' });
    const outline = getOutline(db, study.id);
    expect(outline.gaps).toHaveLength(4);
    expect(outline.gaps[0].message).toContain('no supporting media');
  });

  it('flags sections with unanalyzed media', () => {
    const study = db.createCaseStudy({ title: 'Test' });
    const media = db.createMediaItem({
      filename: 'a.png',
      originalName: 'a.png',
      mimeType: 'image/png',
      kind: 'image',
      sizeBytes: 10,
    });
    const process = db.getSectionByKey(study.id, 'process')!;
    db.assignMediaToSection(process.id, media.id);
    const outline = getOutline(db, study.id);
    expect(outline.gaps.some((g) => g.message.includes('without analyzed insights'))).toBe(true);
    expect(outline.gaps).toHaveLength(4); // 3 empty + 1 unanalyzed
  });
});
