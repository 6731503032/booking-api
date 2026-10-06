# API_CONTRACT.md

**Campus Equipment Booking API**

- **Deployed Base URL:** `https://booking-api.student-projects.workers.dev/api`
- **Local Base URL:** `http://localhost:8787/api`
- **Format:** JSON requests and responses. Send `Content-Type: application/json` on POST and PATCH.
- **Times:** ISO 8601 UTC, for example `2026-10-20T09:00:00.000Z`.

## Endpoints

| Method | Path | Success | Purpose |
|---|---|---:|---|
| GET | `/equipment` | 200 | List equipment |
| GET | `/bookings` | 200 | List bookings (optional `?equipmentId=eq-1`) |
| GET | `/bookings/:id` | 200 | Get one booking |
| POST | `/bookings` | 201 | Create a booking |
| PATCH | `/bookings/:id` | 200 | Update a booking |
| DELETE | `/bookings/:id` | 204 | Delete a booking (no response body) |

## Equipment

### GET /equipment → 200
```json
[
  { "id": "eq-1", "name": "Projector A", "location": "Building 1" },
  { "id": "eq-2", "name": "Camera B", "location": "Building 2" },
  { "id": "eq-3", "name": "Meeting Room C", "location": "Building 3" }
]
```

## Bookings

### Booking object
| Field | Type | Required on create | Notes |
|---|---|---|---|
| `id` | string | No (server creates it) | UUID |
| `equipmentId` | string | Yes | Must exist in equipment |
| `borrowerName` | string | Yes | Not empty |
| `startAt` | string | Yes | Valid ISO date-time, before `endAt` |
| `endAt` | string | Yes | Valid ISO date-time, after `startAt` |
| `purpose` | string | No | Defaults to `""` |

### POST /bookings → 201
Request:
```json
{
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```
Response:
```json
{
  "id": "62c76d89-a423-4bff-9f53-b20dcefd5d0f",
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```

### GET /bookings → 200
Returns an array of booking objects, sorted by `startAt`. Returns `[]` when there are none.

### GET /bookings/:id → 200
Returns one booking object. Returns 404 if the id does not exist.

### PATCH /bookings/:id → 200
Send only the fields to change. The merged booking is validated again (including the overlap check).
Request:
```json
{ "purpose": "Final presentation" }
```
Response: the full updated booking object.

### DELETE /bookings/:id → 204
Returns no body. Returns 404 if the id does not exist.

## Validation rules

1. `equipmentId` must be a non-empty string and must exist in `equipment`.
2. `borrowerName` must be a non-empty string.
3. `purpose`, if sent, must be a string.
4. `startAt` and `endAt` must be valid date-times.
5. `startAt` must be before `endAt`.
6. Bookings for the same equipment must not overlap.

**Overlap rule:** two bookings clash when `existing.startAt < new.endAt AND existing.endAt > new.startAt`.
Back-to-back bookings (09:00–11:00 then 11:00–13:00) are allowed. When updating, the booking being updated is not compared with itself.

## Error format

Every error response is JSON:
```json
{ "error": "A message understandable to a user or developer" }
```

| Status | When | Example message |
|---|---|---|
| 400 | Missing or invalid data, invalid JSON, invalid dates, `startAt` not before `endAt`, unknown `equipmentId` | `startAt must be before endAt` |
| 404 | Booking not found, or route not found | `Booking not found` |
| 409 | Booking overlaps another booking for the same equipment | `This equipment is already booked for that time` |
| 500 | Unexpected server error | `Internal server error` |

**Why 400 for an unknown `equipmentId`:** the URL is valid, but the data in the request body is wrong, so it is a bad request. 404 is used when the resource in the URL does not exist.
