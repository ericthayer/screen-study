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
  // Stricter limits for expensive I/O routes (uploads and file deletes).
  const ioRateLimit = { rateLimit: { max: 60, timeWindow: '1 minute' } };

  app.post('/api/media', { config: ioRateLimit }, async (request, reply) => {
    // Two passes: stream file parts to disk first, then apply field metadata.
    // Form fields may arrive after file parts (standard browser FormData order),
    // so fields cannot be consumed in the same pass as the files.
    interface PendingFile {
      filename: string;
      originalName: string;
      mimeType: string;
      kind: MediaKind;
    }
    const pending: PendingFile[] = [];
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
        pending.push({ filename, originalName: part.filename, mimeType: part.mimetype, kind });
      } else if (part.type === 'field') {
        fields[part.fieldname] = String(part.value);
      }
    }
    if (pending.length === 0) {
      return reply.status(400).send({ error: 'No files provided.' });
    }
    const uploaded = pending.map((file) => {
      const stats = fs.statSync(path.join(ctx.config.mediaDir, file.filename));
      return ctx.db.createMediaItem({
        ...file,
        sizeBytes: stats.size,
        capturedAt: fields.capturedAt ?? null,
        source: fields.source ?? null,
      });
    });
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

  app.delete<{ Params: { id: string } }>(
    '/api/media/:id',
    { config: ioRateLimit },
    async (request, reply) => {
      const item = ctx.db.deleteMediaItem(request.params.id);
      if (!item) return reply.status(404).send({ error: 'Not found' });
      const file = path.join(ctx.config.mediaDir, item.filename);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      return reply.status(204).send();
    },
  );
}
