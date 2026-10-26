// Penyimpanan bersama untuk semua pengunjung situs.
(function () {
  const API = String(window.TRACKER_API_URL || "").trim();
  if (!API) return;
  const LS = window.localStorage;
  let uid = LS.getItem("tmUid");
  if (!uid) { uid = "u" + Math.random().toString(36).slice(2, 10); LS.setItem("tmUid", uid); }

  const store = {}, watchers = [];
  let pending = 0, lastWrite = 0, queue = Promise.resolve();
  const segs = p => p.split("/");
  const meta = { fromCache: false, hasPendingWrites: false };
  const snap = p => ({ id: segs(p).pop(), exists: p in store, data: () => store[p], metadata: meta });
  const kids = p => { const n = segs(p).length + 1; return Object.keys(store).filter(k => k.startsWith(p + "/") && segs(k).length === n).map(snap); };
  const colSnap = p => { const docs = kids(p); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta }; };

  function fire(paths) {
    watchers.slice().forEach(w => {
      if (w.kind === "doc") { if (!paths || paths.includes(w.path)) w.cb(snap(w.path)); }
      else if (!paths || paths.some(k => k.startsWith(w.path + "/"))) w.cb(colSnap(w.path));
    });
  }
  function watch(w) {
    watchers.push(w);
    setTimeout(() => w.cb(w.kind === "doc" ? snap(w.path) : colSnap(w.path)), 0);
    return () => { const i = watchers.indexOf(w); if (i >= 0) watchers.splice(i, 1); };
  }
  function status(message) { window.dispatchEvent(new CustomEvent("tracker-sync", { detail: message })); }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  function write(path, data, merge = false) {
    if (data === null) delete store[path]; else store[path] = merge ? Object.assign({}, store[path], data) : JSON.parse(JSON.stringify(data));
    fire([path]); pending++; lastWrite = Date.now();
    status("Menyimpan perubahan…");
    const job = queue.then(async () => {
      for (;;) {
        try {
          const response = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ path, data, merge }), signal: AbortSignal.timeout(15000) });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error("write_failed");
          return;
        } catch {
          status("Belum tersinkron. Menghubungkan ulang… Jangan tutup halaman.");
          await delay(6000);
        }
      }
    });
    queue = job.catch(() => {});
    return job.then(() => {}).finally(() => { pending--; lastWrite = Date.now(); if (!pending) status("Mode bersama: semua perubahan tersinkron untuk semua orang."); });
  }
  async function pull() {
    if (pending > 0 || Date.now() - lastWrite < 3000) return;
    const startedWrite = lastWrite;
    const r = await fetch(API + "?action=all", { cache: "no-store", signal: AbortSignal.timeout(15000) }); const j = await r.json();
    if (!r.ok || !j || !j.data) throw new Error("bad response");
    if (pending > 0 || lastWrite !== startedWrite) return;
    const next = j.data, changed = [];
    for (const k of new Set([...Object.keys(store), ...Object.keys(next)])) {
      if (JSON.stringify(store[k]) !== JSON.stringify(next[k])) {
        changed.push(k); if (k in next) store[k] = next[k]; else delete store[k];
      }
    }
    if (changed.length) fire(changed);
  }

  function docRef(path) {
    return {
      id: segs(path).pop(), path,
      get: async () => snap(path),
      set: d => write(path, d),
      update: async d => { if (!(path in store)) throw new Error("not_found"); return write(path, d, true); },
      delete: () => write(path, null),
      onSnapshot: cb => watch({ kind: "doc", path, cb }),
      collection: p => colRef(path + "/" + p)
    };
  }
  function colRef(path) {
    return {
      path,
      doc: id => docRef(path + "/" + (id || "d" + Date.now().toString(36))),
      add: async function (d) { const r = this.doc(); await r.set(d); return r; },
      get: async () => colSnap(path),
      onSnapshot: cb => watch({ kind: "col", path, cb })
    };
  }

  const db = { doc: docRef, collection: colRef };
  const ready = (async () => {
    for (;;) {
      try { await pull(); return true; }
      catch { status("Belum terhubung ke penyimpanan bersama. Mencoba lagi…"); await delay(6000); }
    }
  })();
  setInterval(() => pull().then(() => { if (!pending) status("Mode bersama: semua perubahan tersinkron untuk semua orang."); }).catch(() => status("Koneksi terputus. Mencoba sinkronisasi ulang…")), 6000);
  window.addEventListener("online", () => pull().catch(() => {}));
  window.claude = {
    use: async name => {
      if (!(await ready)) return null;
      if (name === "db") return db;
      if (name === "user") return { id: async () => uid };
      return null;
    }
  };
})();
