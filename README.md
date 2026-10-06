# Campus Equipment Booking API

A REST API for booking shared equipment (projectors, cameras, rooms) without double-booking.
Built with Hono + TypeScript on Cloudflare Workers, using Cloudflare D1 (SQLite).

- **Deployed Base API URL:** `https://booking-api.student-projects.workers.dev/api`

## Files

| File | Purpose |
|---|---|
| `src/index.ts` | All API routes and validation |
| `schema.sql` | Database tables and seed equipment |
| `wrangler.toml` | Cloudflare config (D1 binding `DB`) |
| `AI_LOG.md` | AI usage log |
| `QUALITY_GATE_REVIEW.md` | Quality Gate review |
| `evidence.pdf` | Screenshots of the test results |

## How to run

```powershell
npm install --legacy-peer-deps
npx wrangler d1 create booking-db     # copy the database_id into wrangler.toml (keep binding = "DB")
```

**Local:**
```powershell
npm run db:local      # creates tables + 3 equipment records (also resets local data)
npm run dev           # API at http://localhost:8787/api
```

**Deployed (Cloudflare):**
```powershell
npm run db:remote     # creates tables + 3 equipment records (also resets remote data)
npm run deploy        # publishes the Worker
```

## Data model (ERD)

```
equipment (id PK, name, location)
    1 ────< many
bookings (id PK, equipmentId FK -> equipment.id, borrowerName, startAt, endAt, purpose)
```

Seed equipment: `eq-1` Projector A, `eq-2` Camera B, `eq-3` Meeting Room C.

## API contract

| Method | Path | Success | Notes |
|---|---|---|---|
| GET | /equipment | 200 | List equipment |
| GET | /bookings | 200 | List bookings (optional `?equipmentId=eq-1`) |
| GET | /bookings/:id | 200 | 404 if missing |
| POST | /bookings | 201 | All fields required except `purpose` |
| PATCH | /bookings/:id | 200 | Send only the fields to change |
| DELETE | /bookings/:id | 204 | 404 if missing, no response body |

Booking body:
```json
{
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```

Every error is JSON: `{ "error": "message" }`

| Status | When |
|---|---|
| 400 | Missing or invalid data, invalid JSON, invalid dates, `startAt` not before `endAt`, unknown `equipmentId` |
| 404 | Booking not found, or route not found |
| 409 | Booking overlaps another booking for the same equipment |

**Overlap rule:** two bookings clash when `existing.startAt < new.endAt AND existing.endAt > new.startAt`.
Back-to-back bookings (09:00–11:00 then 11:00–13:00) are allowed. On update, the booking being updated is excluded from the check.

All SQL that uses request data uses `?` placeholders with `.bind()`. Request data is never added into SQL strings.

## Testing (15 cases, PowerShell)

Use `curl.exe` (not `curl`) in PowerShell. To test locally, set `$BASE = "http://localhost:8787/api"`.

### Setup

```powershell
$BASE = "https://booking-api.student-projects.workers.dev/api"
```

Create the test files once (in the project folder):

```powershell
@'
{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}
'@ | Set-Content ok.json -Encoding ascii

@'
{"equipmentId":"eq-1","borrowerName":"Mali","startAt":"2026-10-20T10:00:00.000Z","endAt":"2026-10-20T12:00:00.000Z","purpose":"Test"}
'@ | Set-Content overlap.json -Encoding ascii

@'
{"equipmentId":"eq-1","borrowerName":"Mali","startAt":"2026-10-21T12:00:00.000Z","endAt":"2026-10-21T10:00:00.000Z","purpose":"Test"}
'@ | Set-Content badtime.json -Encoding ascii

@'
{"equipmentId":"eq-999","borrowerName":"Mali","startAt":"2026-10-22T09:00:00.000Z","endAt":"2026-10-22T10:00:00.000Z","purpose":"Test"}
'@ | Set-Content noequip.json -Encoding ascii

@'
{"purpose":"Final presentation"}
'@ | Set-Content patch.json -Encoding ascii

@'
{"equipmentId":"eq-1","borrowerName":"Mali","startAt":"2026-10-20T11:00:00.000Z","endAt":"2026-10-20T13:00:00.000Z","purpose":"Back to back"}
'@ | Set-Content b2b.json -Encoding ascii

@'
{"equipmentId":"eq-1","startAt":"2026-10-23T09:00:00.000Z","endAt":"2026-10-23T10:00:00.000Z"}
'@ | Set-Content missing.json -Encoding ascii

@'
{ this is not json
'@ | Set-Content badjson.json -Encoding ascii

@'
{"startAt":"2026-10-20T10:00:00.000Z"}
'@ | Set-Content patchconflict.json -Encoding ascii
```

### Test cases

| # | Test | Expected |
|---|---|---|
| 1 | List equipment | 200 |
| 2 | Create booking | 201 |
| 3 | List bookings | 200 |
| 4 | Get one booking | 200 |
| 5 | Update booking (PATCH) | 200 |
| 6 | Overlapping booking | 409 |
| 7 | Back-to-back booking allowed | 201 |
| 8 | Update into a conflict | 409 |
| 9 | Start time after end time | 400 |
| 10 | Unknown equipmentId | 400 |
| 11 | Missing borrowerName | 400 |
| 12 | Invalid JSON | 400 |
| 13 | Booking not found | 404 |
| 14 | Delete booking | 204 |
| 15 | Get deleted booking | 404 |

**1. List equipment → 200**
```powershell
curl.exe -i "$BASE/equipment"
```

**2. Create booking → 201** (copy the `id` from the response)
```powershell
curl.exe -i -X POST "$BASE/bookings" -H "Content-Type: application/json" --data-binary "@ok.json"
$ID1 = "PASTE_ID_HERE"
```

**3. List bookings → 200**
```powershell
curl.exe -i "$BASE/bookings"
```

**4. Get one booking → 200**
```powershell
curl.exe -i "$BASE/bookings/$ID1"
```

**5. Update booking → 200** (purpose changes)
```powershell
curl.exe -i -X PATCH "$BASE/bookings/$ID1" -H "Content-Type: application/json" --data-binary "@patch.json"
```

**6. Overlapping booking → 409**
```powershell
curl.exe -i -X POST "$BASE/bookings" -H "Content-Type: application/json" --data-binary "@overlap.json"
```

**7. Back-to-back booking allowed → 201** (copy the new `id`)
```powershell
curl.exe -i -X POST "$BASE/bookings" -H "Content-Type: application/json" --data-binary "@b2b.json"
$ID2 = "PASTE_ID_HERE"
```

**8. Update into a conflict → 409**
```powershell
curl.exe -i -X PATCH "$BASE/bookings/$ID2" -H "Content-Type: application/json" --data-binary "@patchconflict.json"
```

**9. Start time after end time → 400**
```powershell
curl.exe -i -X POST "$BASE/bookings" -H "Content-Type: application/json" --data-binary "@badtime.json"
```

**10. Unknown equipmentId → 400**
```powershell
curl.exe -i -X POST "$BASE/bookings" -H "Content-Type: application/json" --data-binary "@noequip.json"
```

**11. Missing borrowerName → 400**
```powershell
curl.exe -i -X POST "$BASE/bookings" -H "Content-Type: application/json" --data-binary "@missing.json"
```

**12. Invalid JSON → 400**
```powershell
curl.exe -i -X POST "$BASE/bookings" -H "Content-Type: application/json" --data-binary "@badjson.json"
```

**13. Booking not found → 404**
```powershell
curl.exe -i "$BASE/bookings/does-not-exist"
```

**14. Delete booking → 204** (no body)
```powershell
curl.exe -i -X DELETE "$BASE/bookings/$ID1"
```

**15. Get deleted booking → 404**
```powershell
curl.exe -i "$BASE/bookings/$ID1"
```

**Cleanup**
```powershell
curl.exe -i -X DELETE "$BASE/bookings/$ID2"
```

## Assumptions and limitations

- Times are stored as UTC ISO strings so they compare correctly.
- Unknown `equipmentId` returns 400 (bad data in the body), not 404.
- `purpose` is optional and defaults to an empty string.
- No login and no front end. Anyone with the URL can add or delete bookings.
