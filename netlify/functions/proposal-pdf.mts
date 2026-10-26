import { getStore } from '@netlify/blobs';

export default async (req: Request) => {
  const limit = 3 * 1024 * 1024;
  try {
    const store = getStore({ name: 'proposal-pdfs', consistency: 'strong' });
    if (req.method === 'GET') {
      const key = new URL(req.url).searchParams.get('key') || '';
      if (!/^[a-f0-9-]{36}\.pdf$/.test(key)) return new Response('Proposal tidak ditemukan', { status: 404 });
      const pdf = await store.get(key, { type: 'arrayBuffer' });
      if (!pdf) return new Response('Proposal tidak ditemukan', { status: 404 });
      return new Response(pdf, { headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="proposal.pdf"',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      } });
    }
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
    if (Number(req.headers.get('content-length')) > limit) return Response.json({ error: 'Maksimal ukuran PDF 3 MB.' }, { status: 413 });
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (!bytes.length || bytes.length > limit) return Response.json({ error: 'Maksimal ukuran PDF 3 MB.' }, { status: 413 });
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') return Response.json({ error: 'Pilih file PDF proposal yang valid.' }, { status: 415 });
    const key = `${crypto.randomUUID()}.pdf`;
    await store.set(key, bytes.buffer);
    return Response.json({ url: `/.netlify/functions/proposal-pdf?key=${key}` }, { status: 201 });
  } catch {
    return Response.json({ error: 'PDF belum berhasil diproses. Coba lagi.' }, { status: 503 });
  }
};
