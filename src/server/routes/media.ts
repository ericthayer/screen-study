import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import type { MediaKind } from '../../shared/types.js';

const EXTENSION_KIND: Record<string, MediaKind> = {
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.svg': 'image',
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video',
  '.mkv': 'video',
  '.mp3': 'audio',
  '.wav': 'audio',
  '.m4a': 'audio',
  '.ogg': 'audio',
  '.flac': 'audio',
};

function kindFor(filename: string, mimeType: string): MediaKind | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return EXTENSION_KIND[path.extname(filename).toLowerCase()] ?? null;
}

export function registerMediaRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post('/api/media', async (request, reply) => {
    const uploaded: unknown[] = [];
    const fields: Record<string, string> = {};
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const kind = kindFor(part.filename, part.mimetype);
        if (!kind) {
          return reply
            .status(415)
            .send({ error: `Unsupported file type: ${part.filename} (${part.mimetype})` });
        }
        const filename = `${randomUUID()}${path.extname(part.filename).toLowerCase()}`;
        const dest = path.join(ctx.config.mediaDir, filename);
        await pipeline(part.file, fs.createWriteStream(dest));
        if (part.file.truncated) {
          fs.unlinkSync(dest);
          return reply.status(413).send({ error: 'File exceeds maximum upload size.' });
        }
        const stats = fs.statSync(dest);
        const item = ctx.db.createMediaItem({
          filename,
          originalName: part.filename,
          mimeType: part.mimetype,
          kind,
          sizeBytes: stats.size,
          capturedAt: fields.capturedAt ?? null,
          source: fields.source ?? null,
        });
        uploaded.push(item);
      } else if (part.type === 'field') {
        fields[part.fieldname] = String(part.value);
      }
    }
    if (uploaded.length === 0) {
      return reply.status(400).send({ error: 'No files provided.' });
    }
    return reply.status(201).send({ items: uploaded });
  });

  app.get('/api/media', async () => {
    return { items: ctx.db.listMediaItems() };
  });

  app.get<{ Params: { id: string } }>('/api/media/:id', async (request, reply) => {
    const item = ctx.db.getMediaItem(request.params.id);
    if (!item) return reply.status(404).send({ error: 'Not found' });
    return { item: { ...item, insight: ctx.db.getInsightByMedia(item.id) } };
  });

  app.patch<{ Params: { id: string }; Body: { capturedAt?: string; source?: string; durationSeconds?: number } }>(
    '/api/media/:id',
    async (request, reply) => {
      const item = ctx.db.updateMediaItem(request.params.id, request.body ?? {});
      if (!item) return reply.status(404).send({ error: 'Not found' });
      return { item };
    },
  );

  app.delete<{ Params: { id: string } }>('/api/media/:id', async (request, reply) => {
    const item = ctx.db.deleteMediaItem(request.params.id);
    if (!item) return reply.status(404).send({ error: 'Not found' });
    const file = path.join(ctx.config.mediaDir, item.filename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return reply.status(204).send();
  });
}
