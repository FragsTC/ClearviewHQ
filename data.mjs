// Clearview HQ shared data API: one JSON blob in Netlify Blobs, guarded by a team passcode.
import { getStore } from "@netlify/blobs";
import seed from "./seed.json" with { type: "json" };

const KEY = "state";
const PRIVATE = ["reviews/", "conversations/"]; // People tab: admin passcode only
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const MAX_BODY = 512 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function roleFor(pass) {
  const team = process.env.TEAM_PASSCODE, admin = process.env.ADMIN_PASSCODE;
  if (!pass) return null;
  if (admin && pass === admin) return "admin";
  if (team && pass === team) return admin ? "team" : "admin"; // no admin code set: team sees everything
  return null;
}
const isPrivate = (p) => PRIVATE.some((x) => p.startsWith(x));
const validPath = (p) => typeof p === "string" && p.length < 1000 && p.split("/").length % 2 === 0 && p.split("/").every((s) => SEG.test(s) && s !== "." && s !== "..");

function view(state, role) {
  const docs = {};
  for (const [k, v] of Object.entries(state.docs)) if (role === "admin" || !isPrivate(k)) docs[k] = v;
  return docs;
}

export function makeHandler(store) {
  async function load() {
    const got = await store.getWithMetadata(KEY, { type: "json", consistency: "strong" });
    if (got && got.data) return { state: got.data, etag: got.etag };
    return { state: { rev: 1, docs: structuredClone(seed), tangent: null }, etag: null };
  }

  return async (req) => {
    if (!process.env.TEAM_PASSCODE) return json({ error: "Set TEAM_PASSCODE in Netlify environment variables." }, 500);
    const role = roleFor(req.headers.get("x-team-pass"));
    if (!role) return json({ error: "Wrong passcode." }, 401);

    if (req.method === "GET") {
      const { state } = await load();
      const since = Number(new URL(req.url).searchParams.get("rev"));
      const base = { role, rev: state.rev, tangent: state.tangent || null };
      if (since === state.rev) return json({ ...base, same: true });
      return json({ ...base, docs: view(state, role) });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "Too much data in one save." }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "Bad request." }, 400); }
    const ops = Array.isArray(body.ops) ? body.ops.slice(0, 50) : [];
    for (const o of ops) {
      if (o.op === "tangent") continue;
      if (!["set", "update", "delete"].includes(o.op) || !validPath(o.path)) return json({ error: "Bad request." }, 400);
      if (isPrivate(o.path) && role !== "admin") return json({ error: "Only the admin passcode can change People reviews." }, 403);
      if (o.op !== "delete" && (typeof o.data !== "object" || o.data === null || Array.isArray(o.data))) return json({ error: "Bad request." }, 400);
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      const { state, etag } = await load();
      for (const o of ops) {
        if (o.op === "set") state.docs[o.path] = o.data;
        else if (o.op === "update") state.docs[o.path] = { ...(state.docs[o.path] || {}), ...o.data };
        else if (o.op === "delete") delete state.docs[o.path];
        else if (o.op === "tangent") state.tangent = { id: String(o.id || "").slice(0, 40), at: Date.now() };
      }
      if (Object.keys(state.docs).length > 20000) return json({ error: "Storage is full." }, 507);
      state.rev = (state.rev || 0) + 1;
      const res = await store.setJSON(KEY, state, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
      if (res.modified) return json({ ok: true, rev: state.rev });
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
    }
    return json({ error: "Busy, try again." }, 409);
  };
}

export default async (req) => makeHandler(getStore({ name: "clearview-hq", consistency: "strong" }))(req);
export const config = { path: "/api/data" };
