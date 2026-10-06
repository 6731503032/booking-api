# AI_LOG.md

**Tool used:** Claude (Anthropic) as a coding assistant.
**Project:** Campus Equipment Booking API (Hono + TypeScript + Cloudflare D1)

## Log of important prompts

| # | What I asked | What I used from the answer | What I checked myself |
|---|---|---|---|
| 1 | Build an API with Cloudflare D1 for the test paper (equipment + bookings CRUD, validation, 400/404/409). | Project files: `src/index.ts`, `schema.sql`, `wrangler.toml`, `package.json`, `README.md`. | Read the code and compared the routes and status codes with the test paper's contract. Confirmed queries use `?` with `.bind()`. |
| 2 | `npm install` failed with an ERESOLVE error (wrangler vs `@cloudflare/workers-types` versions). | Use `npm install --legacy-peer-deps`. | Ran it. It installed 40 packages with 0 vulnerabilities. |
| 3 | `wrangler d1 create` printed `binding = "booking_db"`. What do I do? | Keep the binding name `DB` so it matches `env.DB` in the code, and paste in the real `database_id`. | Edited `wrangler.toml`. `wrangler dev` then showed `env.DB (booking-db) D1 Database`. |
| 4 | The dev server started a tunnel by mistake. | Stop it with Ctrl+C and run only `npm run dev`. | Restarted. `GET /api/equipment` returned 200 with 3 items. |
| 5 | POST returned `400 Request body must be a valid JSON object` in PowerShell. | PowerShell breaks the quotes inside the JSON, so put the JSON in `.json` files and send them with `--data-binary "@file.json"`. | Created the files and reran the tests. Create returned 201. |
| 6 | Give me all the tests for the test paper and tell me what to screenshot. Then rewrite for the deployed Cloudflare Worker, not localhost. | A list of 15 test cases using `$BASE` and `curl.exe`. | Ran them against my deployed Worker and took screenshots of each status line and body. |
| 7 | Change the account subdomain and suggest a name. | The name `student-projects`. | Changed it in the Cloudflare dashboard. A new SSL certificate took a few minutes to be issued. |
| 8 | Write `AI_LOG.md` and `QUALITY_GATE_REVIEW.md`. | Drafts of both files. | Checked each claim against my own test results and edited the wording. |

## What I did not take from AI
- I ran every command and test myself and took the screenshots myself.
- I decided which tests to include as evidence.

## What I verified on my own
- Status codes: 200, 201, 204 for success; 400, 404, 409 for errors.
- An overlapping booking for the same equipment returns 409.
- A back-to-back booking (11:00 starts when the previous one ends at 11:00) is allowed.
- Every error response uses `{ "error": "..." }`.
- Data is saved in the real Cloudflare D1 database, not only in memory.

## Mistakes I ran into and fixed
- npm dependency conflict (prompt 2).
- Wrong binding name suggested by wrangler (prompt 3).
- PowerShell quoting problem (prompt 5).
- Forgot to create 4 test JSON files, so 4 tests failed until I created them.
