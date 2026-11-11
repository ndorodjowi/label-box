// Netlify Function: jembatan aman antara aplikasi dan database Neon.
// Connection string disimpan di environment variable DATABASE_URL (tidak pernah dikirim ke browser).
// Memakai Neon SQL-over-HTTP, jadi tidak butuh npm install.

let ready = false;

async function q(text, params = []) {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL belum diatur di Netlify.");
  const host = new URL(cs).hostname;
  const r = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": cs },
    body: JSON.stringify({ query: text, params }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || "Neon error " + r.status);
  return j.rows || [];
}

async function init() {
  if (ready) return;
  await q(`create table if not exists label_sets (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    header text,
    auto boolean default false,
    items jsonb not null default '[]',
    images jsonb not null default '[]',
    created_at timestamptz not null default now()
  )`);
  ready = true;
}

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const parse = v => (typeof v === "string" ? JSON.parse(v) : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async (req) => {
  try {
    await init();
    const url = new URL(req.url);

    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        if (!UUID.test(id)) return json({ error: "ID tidak valid" }, 400);
        const rows = await q("select id,name,header,auto,items,images from label_sets where id=$1", [id]);
        if (!rows.length) return json({ error: "Set tidak ditemukan" }, 404);
        const r = rows[0];
        return json({ ...r, items: parse(r.items), images: parse(r.images) });
      }
      const rows = await q("select id,name,created_at from label_sets order by created_at desc limit 50");
      return json(rows);
    }

    if (req.method === "POST") {
      const raw = await req.text();
      if (raw.length > 4_000_000) return json({ error: "Data terlalu besar" }, 413);
      const b = JSON.parse(raw);
      const name = String(b.name || "").trim().slice(0, 120);
      if (!name) return json({ error: "Nama set wajib diisi" }, 400);
      if (!Array.isArray(b.items) || b.items.length > 500) return json({ error: "Data label tidak valid" }, 400);
      if (!Array.isArray(b.images) || b.images.length > 50) return json({ error: "Data foto tidak valid" }, 400);
      const rows = await q(
        "insert into label_sets (name,header,auto,items,images) values ($1,$2,$3,$4::jsonb,$5::jsonb) returning id",
        [name, String(b.header || "").slice(0, 200), !!b.auto, JSON.stringify(b.items), JSON.stringify(b.images)]
      );
      return json({ id: rows[0].id }, 201);
    }

    return json({ error: "Method tidak didukung" }, 405);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};
