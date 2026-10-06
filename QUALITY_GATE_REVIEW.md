# QUALITY_GATE_REVIEW.md

- **Project:** Campus Equipment Booking API
- **Base API URL used for testing:** https://booking-api.student-projects.workers.dev/api
- **Decision:** READY
- **Evidence:** screenshots of all tests are in the `evidence.pdf` file
- **First version snapshot:** git commit `a83ba46` on 2026-10-06 at 14:32 (+0700), message "Campus equipment booking API". This is my first commit. Later fixes are in commits other coomits

| Quality Gate area | Finding | Action taken | Evidence |
|---|---|---|---|
| Reliability | My first POST in PowerShell sent broken JSON (the quotes were changed). I needed to be sure the API does not crash on bad input. | The API returned `400 {"error":"Request body must be a valid JSON object"}` instead of crashing. I fixed my test method by saving the JSON in files and sending them with `--data-binary "@file.json"`. | Test 12 (`badjson.json`) returns 400 with the JSON error. Test 2 returns 201 Created after I fixed my test method. |
| Accuracy | I needed to check that the overlap rule is exact. A booking that starts when another ends (11:00) should be allowed, but a real overlap (10:00 to 12:00) should not. | The check is `existing.startAt < new.endAt AND existing.endAt > new.startAt`. I tested both cases. | Test 6 (overlap) returns 409. Test 7 (back-to-back, `b2b.json`) returns 201. |
| Reliability | An update must not create an overlap, and it must not conflict with the booking being updated. | The update query excludes the booking's own id (`id != ?`) and checks the merged data. I tested a normal update and an update into a conflict. | Test 5 (PATCH purpose) returns 200 with no false conflict. Test 8 (PATCH `startAt` into another booking's time) returns 409. |
| Reasoning | An unknown `equipmentId` could return 404 or 400. I had to choose one. | I return 400, because the problem is invalid data in the request body. 404 is used when the URL resource (`/bookings/:id`) does not exist. 409 is only for a time conflict. | Test 10 returns `400 {"error":"Equipment 'eq-999' not found"}`. Test 13 returns 404 for a missing booking id. |
| You Own It | `wrangler` suggested the binding name `booking_db`, but my code reads `env.DB`. If I had pasted it in, every route would have failed. | I kept `binding = "DB"` in `wrangler.toml` and only copied the real `database_id`. | The dev output showed `env.DB (booking-db) D1 Database`. `GET /api/equipment` returned 200 with 3 items. |
| Delivery Quality | 4 tests failed because I forgot to create `b2b.json`, `missing.json`, `badjson.json` and `patchconflict.json`. | I created the files and reran tests 7, 8, 11 and 12. | The reruns returned 201, 409, 400 and 400. |

## Assumptions and limitations
- Times are stored as UTC ISO strings so they can be compared correctly.
- Back-to-back bookings are allowed (one ends at 11:00, the next starts at 11:00).
- There is no login and no front end. Anyone with the URL can add or delete bookings.
- `purpose` is optional and defaults to an empty string.

## Submission Decision
**READY:** All required routes work, the tests were run on my deployed Worker, and I can explain my work. The evidence file shows the test results.