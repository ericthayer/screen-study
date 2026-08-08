import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { MediaItem } from '../../shared/types.js';

export interface MediaAnalysis {
  summary: string;
  activity: string | null;
  decisions: string[];
  outcomes: string[];
  extractedText: string | null;
  transcript: string | null;
}

export interface ArticleContext {
  title: string;
  weekStart: string | null;
  sections: {
    sectionKey: string;
    title: string;
    items: { originalName: string; kind: string; insight: MediaAnalysis | null }[];
  }[];
}

export interface AiProvider {
  name: string;
  model: string | null;
  analyzeImage(media: MediaItem, absolutePath: string): Promise<MediaAnalysis>;
  transcribeAudio(media: MediaItem, absolutePath: string): Promise<string>;
  analyzeMedia(media: MediaItem, absolutePath: string): Promise<MediaAnalysis>;
  generateArticle(context: ArticleContext): Promise<string>;
}

const ANALYSIS_PROMPT = `You are analyzing a captured work artifact (screenshot or recording frame) from a UX engineer's week.
Respond with ONLY a JSON object (no markdown fences) with these fields:
- "summary": 1-2 sentence description of what the artifact shows
- "activity": the work activity being performed (e.g. "designing a settings page", "debugging CSS layout")
- "decisions": array of design/engineering decisions visible or implied (strings)
- "outcomes": array of outcomes or results visible (strings)
- "extractedText": any meaningful text visible in the image (UI copy, code, headings), or null`;

function parseAnalysisJson(text: string): MediaAnalysis {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    activity: typeof parsed.activity === 'string' ? parsed.activity : null,
    decisions: Array.isArray(parsed.decisions)
      ? parsed.decisions.filter((d): d is string => typeof d === 'string')
      : [],
    outcomes: Array.isArray(parsed.outcomes)
      ? parsed.outcomes.filter((o): o is string => typeof o === 'string')
      : [],
    extractedText: typeof parsed.extractedText === 'string' ? parsed.extractedText : null,
    transcript: null,
  };
}

const ARTICLE_PROMPT = `You are a staff UX engineer writing a case study article about a week of work.
Write a polished, first-person UX Engineering case study in Markdown based on the organized outline provided.
Use the section headings given. Reference media items by filename in bold (e.g. **screenshot.png**) where they support the narrative.
Keep it authentic and specific to the insights provided. Do not invent metrics.`;

class AnthropicProvider implements AiProvider {
  name = 'anthropic';
  model: string;
  private clientPromise: Promise<import('@anthropic-ai/sdk').default> | null = null;

  constructor(
    private apiKey: string,
    model: string,
  ) {
    this.model = model;
  }

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import('@anthropic-ai/sdk').then(
        (mod) => new mod.default({ apiKey: this.apiKey }),
      );
    }
    return this.clientPromise;
  }

  async analyzeImage(media: MediaItem, absolutePath: string): Promise<MediaAnalysis> {
    const client = await this.client();
    const data = fs.readFileSync(absolutePath).toString('base64');
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                data,
              },
            },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    return parseAnalysisJson(text);
  }

  async transcribeAudio(_media: MediaItem, _absolutePath: string): Promise<string> {
    throw new Error(
      'Audio transcription is not supported by the Anthropic provider. Configure OpenAI for Whisper transcription.',
    );
  }

  async analyzeMedia(media: MediaItem, absolutePath: string): Promise<MediaAnalysis> {
    if (media.kind === 'image') {
      return this.analyzeImage(media, absolutePath);
    }
    if (media.kind === 'audio' || media.kind === 'video') {
      const transcript = await this.transcribeAudio(media, absolutePath);
      return {
        summary: `Transcribed ${media.kind}: ${media.originalName}`,
        activity: null,
        decisions: [],
        outcomes: [],
        extractedText: null,
        transcript,
      };
    }
    throw new Error(`Unsupported media kind: ${media.kind}`);
  }

  async generateArticle(context: ArticleContext): Promise<string> {
    const client = await this.client();
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: ARTICLE_PROMPT,
      messages: [
        { role: 'user', content: `Outline and insights:\n${JSON.stringify(context, null, 2)}` },
      ],
    });
    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }
}

class OpenAiProvider implements AiProvider {
  name = 'openai';
  model: string;
  private clientPromise: Promise<import('openai').default> | null = null;

  constructor(
    private apiKey: string,
    model: string,
  ) {
    this.model = model;
  }

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import('openai').then(
        (mod) => new mod.default({ apiKey: this.apiKey }),
      );
    }
    return this.clientPromise;
  }

  async analyzeImage(media: MediaItem, absolutePath: string): Promise<MediaAnalysis> {
    const client = await this.client();
    const data = fs.readFileSync(absolutePath).toString('base64');
    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${media.mimeType};base64,${data}` },
            },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });
    return parseAnalysisJson(response.choices[0]?.message?.content ?? '{}');
  }

  async transcribeAudio(_media: MediaItem, absolutePath: string): Promise<string> {
    const client = await this.client();
    const response = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(absolutePath),
    });
    return response.text;
  }

  async analyzeMedia(media: MediaItem, absolutePath: string): Promise<MediaAnalysis> {
    if (media.kind === 'image') {
      return this.analyzeImage(media, absolutePath);
    }
    const transcript = await this.transcribeAudio(media, absolutePath);
    return {
      summary: `Transcribed ${media.kind}: ${media.originalName}`,
      activity: null,
      decisions: [],
      outcomes: [],
      extractedText: null,
      transcript,
    };
  }

  async generateArticle(context: ArticleContext): Promise<string> {
    const client = await this.client();
    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: ARTICLE_PROMPT },
        { role: 'user', content: `Outline and insights:\n${JSON.stringify(context, null, 2)}` },
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  }
}

/**
 * Offline fallback provider. Produces structured placeholder insights from
 * file metadata so the full pipeline works without network access or API keys.
 */
class LocalProvider implements AiProvider {
  name = 'local';
  model = null;

  async analyzeImage(media: MediaItem, _absolutePath: string): Promise<MediaAnalysis> {
    return this.placeholder(media);
  }

  async transcribeAudio(media: MediaItem, _absolutePath: string): Promise<string> {
    return `[Transcription unavailable without an AI provider. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY.] Source: ${media.originalName}`;
  }

  async analyzeMedia(media: MediaItem, _absolutePath: string): Promise<MediaAnalysis> {
    if (media.kind === 'audio' || media.kind === 'video') {
      const transcript = await this.transcribeAudio(media, _absolutePath);
      const base = await this.placeholder(media);
      return { ...base, transcript };
    }
    return this.placeholder(media);
  }

  private placeholder(media: MediaItem): MediaAnalysis {
    const ext = path.extname(media.originalName).replace('.', '').toUpperCase();
    return {
      summary: `${media.kind === 'image' ? 'Screenshot' : media.kind === 'video' ? 'Screen recording' : 'Audio note'} "${media.originalName}" (${ext}, ${Math.round(media.sizeBytes / 1024)} KB) captured ${media.capturedAt ?? 'recently'}.`,
      activity: null,
      decisions: [],
      outcomes: [],
      extractedText: null,
      transcript: null,
    };
  }

  async generateArticle(context: ArticleContext): Promise<string> {
    const lines: string[] = [`# ${context.title}`, ''];
    if (context.weekStart) {
      lines.push(`*Week of ${context.weekStart}*`, '');
    }
    for (const section of context.sections) {
      lines.push(`## ${section.title}`, '');
      if (section.items.length === 0) {
        lines.push('_No supporting artifacts captured for this section yet._', '');
        continue;
      }
      for (const item of section.items) {
        lines.push(`### ${item.originalName}`, '');
        if (item.insight?.summary) {
          lines.push(item.insight.summary, '');
        }
        if (item.insight?.decisions?.length) {
          lines.push('**Decisions:**');
          for (const d of item.insight.decisions) lines.push(`- ${d}`);
          lines.push('');
        }
        if (item.insight?.outcomes?.length) {
          lines.push('**Outcomes:**');
          for (const o of item.insight.outcomes) lines.push(`- ${o}`);
          lines.push('');
        }
        if (item.insight?.transcript) {
          lines.push('**Transcript:**', '', `> ${item.insight.transcript}`, '');
        }
      }
    }
    return lines.join('\n');
  }
}

export function createAiProvider(config: AppConfig): AiProvider {
  if (config.aiProvider === 'anthropic' && config.anthropicApiKey) {
    return new AnthropicProvider(config.anthropicApiKey, config.anthropicModel);
  }
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    return new OpenAiProvider(config.openaiApiKey, config.openaiModel);
  }
  return new LocalProvider();
}
