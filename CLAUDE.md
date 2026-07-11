# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-purpose Traditional Chinese (zh-TW) microsite built for an ITRI (工研院) press conference ("工研菁英獎"). It has two pages: a public AI chat assistant for reporters (`public/index.html`) and a password-gated admin page for editing the assistant's knowledge base (`public/admin.html`). It's deployed on Vercel as static files + two serverless functions — no framework, no bundler, no npm dependencies.

## Architecture

Plain Vercel file-based-routing project:
- `public/` is served as-is (static files). `index.html` is the reporter-facing chat UI; `admin.html` is the admin editor. `vercel.json` rewrites `/admin` → `/admin.html`; every other static path is served by its literal filename (several images in `public/` have spaces/parentheses/Chinese characters in their names, so they need URL-encoding wherever they're referenced).
- `api/` — each file is one serverless function: `api/chat.js` → `POST /api/chat`, `api/admin.js` → `POST /api/admin`. Both are written as `export default async function handler(req, res)`; Vercel's Node runtime accepts this ESM style even though `package.json` has no `"type": "module"`.
- `package.json` declares zero dependencies (`engines.node >= 18` is only there for native `fetch`). There's no database or CMS.

### The "knowledge base" is a single system-prompt string

There's no content store beyond one string, passed around like this:
1. `index.html` keeps the whole conversation in a client-side `hist[]` array and POSTs it to `/api/chat` on every turn.
2. `api/chat.js` forwards that history to the Anthropic Messages API (`model: claude-haiku-4-5-20251001`) with `system: process.env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT`. In other words, the entire knowledge base (award descriptions, quotes, links) is one big system-prompt string, normally supplied via the `SYSTEM_PROMPT` env var.
3. `admin.html` is how a non-engineer edits that string: it POSTs `{ password, systemPrompt }` to `/api/admin`, which is meant to check `password` against `ADMIN_PASSWORD`, rewrite the project's `SYSTEM_PROMPT` env var via the Vercel REST API (`VERCEL_TOKEN` + `VERCEL_PROJECT_ID`), and redeploy so `api/chat.js` picks up the change (see Known Issues — this last step is currently not wired up).
4. The admin "login" screen is cosmetic only: `doLogin()` in `admin.html` accepts any non-empty string client-side and just reveals the editor UI. The real password check happens only when `doSave()` POSTs to `/api/admin`; there's no session/token, so the password is resent with every save.
5. `DEFAULT_SYSTEM_PROMPT` (in `api/chat.js`) and `DEFAULT_PROMPT` (in `admin.html`, pre-filled into the textarea on login) are two independent hard-coded copies of the same baseline content. Nothing keeps them in sync — they've already drifted (chat.js's copy has two extra lines about 2026 data that admin.html's copy lacks). Update both together when changing the baseline prompt.
6. `index.html`'s `renderText()` is the only rendering layer bot replies get: a literal `IMAGE:<url>` token in the reply text becomes an inline `<img>`, plus minimal `##`/`###` headings, `**bold**`, and auto-linked bare URLs. To make the assistant show an image (e.g. the award infographic JPGs already sitting in `public/`), put `IMAGE:https://.../file.jpg` in the system-prompt text.

### Environment variables (configured in the Vercel dashboard, not in-repo — no `.env` file exists)

| Name | Used by | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/chat.js` | Calls the Anthropic Messages API |
| `SYSTEM_PROMPT` | `api/chat.js` reads it, `api/admin.js` writes it | The live knowledge base; falls back to `DEFAULT_SYSTEM_PROMPT` if unset |
| `ADMIN_PASSWORD` | `api/admin.js` | Gates saving a new `SYSTEM_PROMPT` |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | `api/admin.js` | Auth for calling the Vercel REST API to update the env var / redeploy |

## Commands

There is no build step, linter, test suite, or npm script here — `package.json` has no `scripts`, no dependencies, and there's no lockfile or CI config (no `.github/workflows`). In practice:
- Edit `public/*.html` and `api/*.js` directly; there's nothing to compile.
- To syntax-check a serverless function, `node --check api/whatever.js` is **not reliable** in this repo (see Known Issues) — verify by actually loading it as it runs in production instead: `node -e "import('./api/chat.js')"`.
- Running locally requires the Vercel CLI (`vercel dev`), which serves `public/` and `api/` together; this isn't documented anywhere in-repo, since the README's deployment flow is entirely dashboard/GitHub-integration driven (push to GitHub → import into Vercel with Framework Preset "Other" → set the 4 env vars above → Redeploy from the Deployments tab).
- There's no mocking layer — exercising `/api/chat` or `/api/admin` for real requires live `ANTHROPIC_API_KEY`/`VERCEL_TOKEN` values.

## Known issues (current state of `api/admin.js`)

`api/admin.js` is currently broken:
- **Fatal syntax error at line 119**: a stray `} catch (err) {` with no matching `try`. The file has one complete `try {...} catch {...}` ending at line 67 (delete-then-recreate the `SYSTEM_PROMPT` env var, then return), immediately followed by ~50 lines of leftover code from an earlier implementation, ending in this orphaned `catch`. This throws `SyntaxError: Unexpected token 'catch'` wherever the module is actually loaded.
  - `node --check api/admin.js` will **not** catch this and reports success — a false negative, because this repo's `package.json` has no `"type": "module"`, so `--check` doesn't validate the file in the ESM parse goal it's actually loaded under. Confirm real syntax errors with `node -e "import('./api/admin.js')"` (or copy to a `.mjs` file and `node --check` that) instead of trusting a plain `--check`.
- Lines ~69–122 (everything after the real `try/catch`) are unreachable dead code: an older list/delete/patch-on-409 version of the same env-var update, plus the only call in the file that triggers a Vercel redeploy (`POST /v13/deployments`). The live code path (lines 22–67) updates `SYSTEM_PROMPT` and returns success immediately but **never redeploys** — so even after the syntax error is fixed, saving from the admin UI won't actually change the bot's answers (Vercel doesn't hot-apply env var changes to already-running functions), despite the UI's "約 30 秒後生效" ("live in ~30s") message. The README's own initial-setup instructions work around exactly this by telling the operator to manually click Redeploy after setting env vars.
  - Fixing this requires deciding whether to delete the dead tail outright or restore a redeploy call in the live path — treat that as an open decision, not a given, before touching this file.
