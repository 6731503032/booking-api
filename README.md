# Campus Equipment Booking API

Hono + TypeScript on Cloudflare Workers with D1 (SQLite).

## Run it

```bash
npm install
npx wrangler d1 create booking-db        # copy the database_id into wrangler.toml
npm run db:local                          # creates tables + 3 equipment records
npm run dev                               # API at http://localhost:8787/api
```

Base API URL for testing: `http://localhost:8787/api`

## Data model (ERD)

```
equipment (id PK, name, location)
    1 ────< many
bookings (id PK, equipmentId FK -> equipment.id, borrowerName, startAt, endAt, purpose)
```

## API contract

| Method | Path | Success | Notes |
|---|---|---|---|
| GET | /equipment | 200 | list equipment |
| GET | /bookings | 200 | list (optional `?equipmentId=eq-1`) |
| GET | /bookings/:id | 200 | 404 if missing |
| POST | /bookings | 201 | all fields required except `purpose` |
| PATCH | /bookings/:id | 200 | send only changed fields |
| DELETE | /bookings/:id | 204 | 404 if missing |

Errors are always `{ "error": "message" }`:
- **400** missing/invalid data, bad dates, start >= end, unknown `equipmentId`
- **404** booking or route not found
- **409** overlapping booking for the same equipment

Overlap rule: two bookings clash when `existing.start < new.end AND existing.end > new.start`
(back-to-back bookings, e.g. 09–11 then 11–13, are allowed).

## Test with curl (evidence cases)

```bash
BASE=http://localhost:8787/api

# 1. List equipment -> 200
curl -i $BASE/equipment

# 2. Create booking -> 201 (copy the id from the response)
curl -i -X POST $BASE/bookings -H "Content-Type: application/json" -d '{
  "equipmentId":"eq-1","borrowerName":"Somchai Jaidee",
  "startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z",
  "purpose":"Class presentation"}'

# 3. Overlapping booking -> 409
curl -i -X POST $BASE/bookings -H "Content-Type: application/json" -d '{
  "equipmentId":"eq-1","borrowerName":"Mali",
  "startAt":"2026-10-20T10:00:00.000Z","endAt":"2026-10-20T12:00:00.000Z","purpose":"Test"}'

# 4. Start after end -> 400
curl -i -X POST $BASE/bookings -H "Content-Type: application/json" -d '{
  "equipmentId":"eq-1","borrowerName":"Mali",
  "startAt":"2026-10-21T12:00:00.000Z","endAt":"2026-10-21T10:00:00.000Z","purpose":"Test"}'

# 5. Unknown equipment -> 400
curl -i -X POST $BASE/bookings -H "Content-Type: application/json" -d '{
  "equipmentId":"eq-999","borrowerName":"Mali",
  "startAt":"2026-10-22T09:00:00.000Z","endAt":"2026-10-22T10:00:00.000Z","purpose":"Test"}'

ID=PASTE_BOOKING_ID_HERE

# 6. Get one -> 200
curl -i $BASE/bookings/$ID

# 7. Update purpose -> 200
curl -i -X PATCH $BASE/bookings/$ID -H "Content-Type: application/json" -d '{"purpose":"Final presentation"}'

# 8. Delete -> 204
curl -i -X DELETE $BASE/bookings/$ID

# 9. Get deleted -> 404
curl -i $BASE/bookings/$ID
```

## Deploy (optional)

```bash
npm run db:remote
npm run deploy
```

## Also submit
`AI_LOG.md` and `QUALITY_GATE_REVIEW.md` (write these yourself: prompts you used, what you verified, and 3+ findings as *found → fixed → evidence*).
