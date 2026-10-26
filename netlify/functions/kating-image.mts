import { getStore } from '@netlify/blobs';

const types: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const limit = 3 * 1024 * 1024;
export default async (req: Request) => {
  try {
    const store = getStore({ name: 'kating-images', consistency: 'strong' });
    if (req.method === 'GET') {
      const key = new URL(req.url).searchParams.get('key') || '';
      if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) return new Response('Gambar tidak ditemukan', { status: 404 });
      const image = await store.get(key, { type: 'arrayBuffer' });
      if (!image) return new Response('Gambar tidak ditemukan', { status: 404 });
      return new Response(image, { headers: { 'Content-Type': types[key.split('.').pop()!], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
    if (Number(req.headers.get('content-length')) > limit) return Response.json({ error: 'Maksimal ukuran gambar 3 MB.' }, { status: 413 });
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (!bytes.length || bytes.length > limit) return Response.json({ error: 'Maksimal ukuran gambar 3 MB.' }, { status: 413 });
    const ext = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg'
      : [137,80,78,71,13,10,26,10].every((b, index) => bytes[index] === b) ? 'png'
      : new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP' ? 'webp' : '';
    if (!ext) return Response.json({ error: 'Pilih gambar JPG, PNG, atau WebP.' }, { status: 415 });
    const key = `${crypto.randomUUID()}.${ext}`;
    await store.set(key, bytes.buffer);
    return Response.json({ url: `/.netlify/functions/kating-image?key=${key}` }, { status: 201 });
  } catch {
    return Response.json({ error: 'Gambar belum berhasil diproses. Coba lagi.' }, { status: 503 });
  }
};
