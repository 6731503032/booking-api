import { Hono } from "hono";

type Env = { Bindings: { DB: D1Database } };

type Booking = {
  id: string;
  equipmentId: string;
  borrowerName: string;
  startAt: string;
  endAt: string;
  purpose: string;
};

const app = new Hono<Env>().basePath("/api");

// ---------- helpers ----------
const err = (message: string) => ({ error: message });

// Turn any valid date string into a standard ISO string (or null if invalid)
function toIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Validate a full booking object. Returns an error message or the clean booking.
async function validate(
  db: D1Database,
  data: Record<string, unknown>,
  ignoreId?: string
): Promise<{ error: string; status: 400 | 404 | 409 } | { booking: Omit<Booking, "id"> }> {
  const { equipmentId, borrowerName, startAt, endAt, purpose } = data;

  if (typeof equipmentId !== "string" || !equipmentId.trim())
    return { error: "equipmentId is required", status: 400 };
  if (typeof borrowerName !== "string" || !borrowerName.trim())
    return { error: "borrowerName is required", status: 400 };
  if (purpose !== undefined && typeof purpose !== "string")
    return { error: "purpose must be a string", status: 400 };

  const start = toIso(startAt);
  const end = toIso(endAt);
  if (!start || !end)
    return { error: "startAt and endAt must be valid ISO date-times", status: 400 };
  if (start >= end) return { error: "startAt must be before endAt", status: 400 };

  // equipmentId must exist
  const eq = await db.prepare("SELECT id FROM equipment WHERE id = ?").bind(equipmentId).first();
  if (!eq) return { error: `Equipment '${equipmentId}' not found`, status: 400 };

  // overlap check: existing.start < new.end AND existing.end > new.start
  const clash = await db
    .prepare(
      `SELECT id FROM bookings
       WHERE equipmentId = ? AND startAt < ? AND endAt > ? AND id != ?
       LIMIT 1`
    )
    .bind(equipmentId, end, start, ignoreId ?? "")
    .first();
  if (clash)
    return { error: "This equipment is already booked for that time", status: 409 };

  return {
    booking: {
      equipmentId,
      borrowerName: borrowerName.trim(),
      startAt: start,
      endAt: end,
      purpose: (purpose as string | undefined) ?? "",
    },
  };
}

async function readJson(c: any): Promise<Record<string, unknown> | null> {
  try {
    const body = await c.req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

// ---------- equipment ----------
app.get("/equipment", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, name, location FROM equipment").all();
  return c.json(results, 200);
});

// ---------- bookings ----------
app.get("/bookings", async (c) => {
  const equipmentId = c.req.query("equipmentId");
  const stmt = equipmentId
    ? c.env.DB.prepare("SELECT * FROM bookings WHERE equipmentId = ? ORDER BY startAt").bind(equipmentId)
    : c.env.DB.prepare("SELECT * FROM bookings ORDER BY startAt");
  const { results } = await stmt.all();
  return c.json(results, 200);
});

app.get("/bookings/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM bookings WHERE id = ?")
    .bind(c.req.param("id"))
    .first();
  if (!row) return c.json(err("Booking not found"), 404);
  return c.json(row, 200);
});

app.post("/bookings", async (c) => {
  const body = await readJson(c);
  if (!body) return c.json(err("Request body must be a valid JSON object"), 400);

  const result = await validate(c.env.DB, body);
  if ("error" in result) return c.json(err(result.error), result.status);

  const id = crypto.randomUUID();
  const b = result.booking;
  await c.env.DB.prepare(
    "INSERT INTO bookings (id, equipmentId, borrowerName, startAt, endAt, purpose) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, b.equipmentId, b.borrowerName, b.startAt, b.endAt, b.purpose)
    .run();

  return c.json({ id, ...b }, 201);
});

app.patch("/bookings/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(id).first<Booking>();
  if (!existing) return c.json(err("Booking not found"), 404);

  const body = await readJson(c);
  if (!body) return c.json(err("Request body must be a valid JSON object"), 400);

  // merge changes into the existing booking, then validate the whole thing
  const merged = { ...existing, ...body };
  const result = await validate(c.env.DB, merged, id);
  if ("error" in result) return c.json(err(result.error), result.status);

  const b = result.booking;
  await c.env.DB.prepare(
    "UPDATE bookings SET equipmentId = ?, borrowerName = ?, startAt = ?, endAt = ?, purpose = ? WHERE id = ?"
  )
    .bind(b.equipmentId, b.borrowerName, b.startAt, b.endAt, b.purpose, id)
    .run();

  return c.json({ id, ...b }, 200);
});

app.delete("/bookings/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM bookings WHERE id = ?").bind(id).first();
  if (!existing) return c.json(err("Booking not found"), 404);
  await c.env.DB.prepare("DELETE FROM bookings WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// ---------- errors ----------
app.notFound((c) => c.json(err("Route not found"), 404));
app.onError((e, c) => {
  console.error(e);
  return c.json(err("Internal server error"), 500);
});

export default app;
