import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
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

/**
 * Magic-byte sniffing (FR-ING-04): the client-supplied MIME type and
 * extension are claims, not proof. Binary formats are verified against their
 * signatures; text-based SVG is validated by content marker.
 */
function sniffKind(bytes: Buffer): MediaKind | null {
  if (bytes.length < 4) return null;
  // Images.
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image'; // PNG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image'; // JPEG
  if (bytes.subarray(0, 6).toString('ascii') === 'GIF87a') return 'image';
  if (bytes.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image';
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image'; // WebP
  if (bytes.subarray(0, 5).toString('utf8').toLowerCase().includes('<svg')) return 'image'; // SVG
  // Video.
  if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') return 'video'; // MP4/MOV
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
    return 'video'; // WebM/MKV (EBML)
  // Audio.
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'audio'; // MP3 frame sync
  if (bytes.subarray(0, 3).toString('ascii') === 'ID3') return 'audio'; // MP3 with tags
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WAVE'
  )
    return 'audio'; // WAV
  if (bytes.subarray(0, 4).toString('ascii') === 'OggS') return 'audio'; // OGG
  if (bytes.subarray(0, 4).toString('ascii') === 'fLaC') return 'audio'; // FLAC
  return null;
}

/** Detect M4A specifically (ISO-BMFF with an audio brand) for error messages. */
function isM4a(bytes: Buffer): boolean {
  return (
    bytes.length >= 12 &&
    bytes.subarray(4, 8).toString('ascii') === 'ftyp' &&
    bytes.subarray(8, 12).toString('ascii') === 'M4A '
  );
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
      sizeBytes: number;
      contentHash: string;
    }
    const pending: PendingFile[] = [];
    const fields: Record<string, string> = {};
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const claimedKind = kindFor(part.filename, part.mimetype);
        if (!claimedKind) {
          return reply
            .status(415)
            .send({ error: `Unsupported file type: ${part.filename} (${part.mimetype})` });
        }
        const filename = `${randomUUID()}${path.extname(part.filename).toLowerCase()}`;
        const sizeBytes = await ctx.storage.save(filename, part.file);
        if (part.file.truncated) {
          ctx.storage.deleteFile(filename);
          return reply.status(413).send({ error: 'File exceeds maximum upload size.' });
        }

        // Verify the bytes match a signature for the claimed kind (or M4A).
        const bytes = ctx.storage.readBuffer(filename);
        const sniffed = bytes ? sniffKind(bytes) : null;
        const kind =
          sniffed === claimedKind || (claimedKind === 'audio' && bytes && isM4a(bytes))
            ? claimedKind
            : null;
        if (!kind) {
          ctx.storage.deleteFile(filename);
          return reply.status(415).send({
            error: `File content does not match an allowed media type: ${part.filename}`,
          });
        }

        const contentHash = createHash('sha256')
          .update(bytes ?? Buffer.alloc(0))
          .digest('hex');
        pending.push({
          filename,
          originalName: part.filename,
          mimeType: part.mimetype,
          kind,
          sizeBytes,
          contentHash,
        });
      } else if (part.type === 'field') {
        fields[part.fieldname] = String(part.value);
      }
    }
    if (pending.length === 0) {
      return reply.status(400).send({ error: 'No files provided.' });
    }

    // Content-hash dedupe (FR-ING-07): an identical upload returns the
    // existing media item instead of storing a second copy.
    const uploaded = [];
    const duplicates = [];
    for (const file of pending) {
      const existing = ctx.db.findMediaByHash(file.contentHash);
      if (existing) {
        ctx.storage.deleteFile(file.filename);
        duplicates.push(existing);
        continue;
      }
      uploaded.push(
        ctx.db.createMediaItem({
          ...file,
          capturedAt: fields.capturedAt ?? null,
          source: fields.source ?? null,
        }),
      );
    }
    return reply.status(201).send({ items: uploaded, duplicates });
  });

  app.get(
    '/api/media',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async () => {
      return { items: ctx.db.listMediaItems() };
    },
  );

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
      ctx.storage.deleteFile(item.filename);
      return reply.status(204).send();
    },
  );
}
