# Loan Eligibility Simulator

![CI](https://github.com/ShaneKolkoto/loan-eligibility-simulator/actions/workflows/ci.yml/badge.svg)

A responsive frontend that lets a customer enter their income, expenses, and a
desired loan amount, and see an estimated eligibility result with a clear
breakdown of the reasoning.

---

## Table of contents

- [Stack](#stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Environment variables](#environment-variables)
  - [Run locally](#run-locally)
  - [Run with Docker](#run-with-docker)
- [Scripts](#scripts)
- [Testing](#testing)
- [Architecture](#architecture)
- [Decisions & trade-offs](#decisions--trade-offs)
- [What I'd do with more time](#what-id-do-with-more-time)

---

## Stack

| Concern          | Choice                                |
| ---------------- | ------------------------------------- |
| UI               | React 19 + TypeScript (strict)        |
| Build tool       | Vite 8                                |
| Validation       | Zod 4                                 |
| Unit / component | Vitest 5 + React Testing Library      |
| E2E              | Playwright                            |
| Mocked API       | MSW 3 (Mock Service Worker)           |
| Containerisation | Docker (multi-stage, non-root, nginx) |
| CI               | GitHub Actions                        |
| Lint / format    | ESLint 10 + Prettier                  |

---

## Project structure
```

.
├── src/
│ ├── app/ # app shell, providers
│ ├── components/
│ │ └── ui/ # design-system primitives
│ ├── domain/
│ │ └── eligibility/ # pure business logic (no React)
│ ├── features/
│ │ └── eligibility/ # UI + validation for the loan feature
│ ├── hooks/ # useEligibility, useValidationRules
│ ├── services/
│ │ └── loans/ # API client, types, Zod schemas
│ ├── test/ # test setup, MSW server + handlers
│ ├── index.css # design tokens
│ └── main.tsx
├── Dockerfile # multi-stage production image
├── nginx.conf # SPA fallback + caching
├── .dockerignore
├── .nvmrc # Node version
├── .env.example # environment variable reference
├── compose.yaml # watch-mode rebuild loop
├── .github/workflows/ci.yml # lint → typecheck → test → build
└── package.json

````

---

## Getting started

### Prerequisites

- **Node.js 22+** — `.nvmrc` is included, so `nvm use` just works.
- **pnpm 9+** — `npm i -g pnpm`
- **Docker** — optional, only needed to build/run the container locally.

### Install

```bash
git clone <your-repo-url>
cd loan-eligibility-simulator
pnpm install
````

### Environment variables

The project reads a small number of environment variables. Copy the example
file to create your local `.env`:

```bash
cp .env.example .env
```

| Variable               | Default | Purpose                                                                        |
| ---------------------- | ------- | ------------------------------------------------------------------------------ |
| `VITE_API_BASE_URL`    | `/api`  | Base URL the client fetches from. In dev and test, MSW intercepts it.          |
| `VITE_ENABLE_MOCK_API` | `true`  | When `true`, MSW starts and serves the API. Set to `false` for a real backend. |

`.env` is gitignored — never commit it. `.env.example` is committed and is the
source of truth for what the app expects.

> **Note:** Vite only exposes variables prefixed with `VITE_` to client code.
> This is deliberate — it prevents accidental leakage of server-side secrets
> into the bundle.

### Run locally

```bash
pnpm dev
```

The app is served at **http://localhost:5173**.

> The API is mocked in the browser via MSW, so no backend is required.
> See [Architecture](#architecture) for how the mock layer is wired.

### Run with Docker

Build and run the production image:

```bash
docker build -t loan-eligibility-simulator:local .
docker run --rm -p 8080:8080 loan-eligibility-simulator:local
```

Or use watch mode for automatic rebuilds on save:

```bash
docker compose watch
```

The app is served at **http://localhost:8080** in both cases.

The image is a multi-stage build:

1. **build** — installs dependencies and produces the static bundle with `pnpm build`.
2. **runtime** — serves the bundle from `nginx:alpine` as a **non-root** user, with
   an SPA fallback so client-side routes resolve correctly.

Because Vite bakes environment variables into the bundle at build time, the
Docker build accepts `VITE_ENABLE_MOCK_API` as a build arg:

```bash
# Default: MSW is bundled in, container is self-contained
docker build -t loan-eligibility-simulator:local .

# Point at a real backend instead
docker build --build-arg VITE_ENABLE_MOCK_API=false -t loan-eligibility-simulator:real .
```

To stop the container, `Ctrl+C` (or `docker stop <id>` if run detached).

---

## Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `pnpm dev`           | Start the Vite dev server                             |
| `pnpm build`         | Type-check and produce a production bundle in `dist/` |
| `pnpm preview`       | Serve the production bundle locally                   |
| `pnpm lint`          | Run ESLint (fails on warnings)                        |
| `pnpm lint:fix`      | Run ESLint and auto-fix what it can                   |
| `pnpm format`        | Format with Prettier                                  |
| `pnpm format:check`  | Check formatting without writing                      |
| `pnpm typecheck`     | Run `tsc --noEmit`                                    |
| `pnpm test`          | Run the Vitest suite once                             |
| `pnpm test:watch`    | Run Vitest in watch mode                              |
| `pnpm test:ui`       | Run Vitest with the interactive UI                    |
| `pnpm test:coverage` | Run Vitest with coverage                              |
| `pnpm e2e`           | Run Playwright end-to-end tests                       |
| `pnpm verify`        | Lint + typecheck + test + build — the full gate       |

`pnpm verify` is the same command CI runs. If it's green locally, CI should be green.

---

## Testing

Unit and component tests live next to the code they exercise:

```
src/
├── domain/eligibility/       # pure logic + *.test.ts
├── features/eligibility/     # components + *.test.tsx
└── test/                     # shared test setup, MSW server + handlers
```

- **Unit tests** target the pure eligibility engine in `src/domain/eligibility/`
  — no React, no DOM, fast and deterministic.
- **Component tests** use React Testing Library and assert on what the user sees,
  not on implementation details.
- **Network is mocked with MSW**, so components are tested against realistic
  request/response behaviour rather than hand-stubbed functions.
- **E2E tests** (Playwright) cover the end-to-end happy path and a couple of
  failure paths against a real browser.

Run everything:

```bash
pnpm test
pnpm e2e
```

---

## Architecture

_(to be completed)_

---

## Decisions & trade-offs

### Spec deviation: amortization worked example

The API specification's `/calculate-rate` example shows a monthly payment
of **R7,089.50** for R150,000 at 12.5% over 24 months. Applying the standard
annuity formula to those same inputs yields **R7,096.10**.

The 6.60 difference appears to be a hand-written artifact in the spec —
matching R7,089.50 would require either a rate of ~12.15% or a term of
~24.2 months, both of which contradict the spec's own inputs.

The implementation follows the formula. Tests assert the mathematically
correct value, and this note records the deviation deliberately rather than
silently. I'd raise it with the backend team before integrating for real —
a 6-rand difference per month compounds across a portfolio.

### Validation rules come from the API, not the client

The eligibility engine takes the validation rules as an argument rather than
hard-coding thresholds. This mirrors the spec's `/validation-rules` endpoint,
and means a product change (e.g. raising the minimum income) is a data
change, not a frontend release.

### Mock backend calls the real domain logic

The MSW handlers invoke `evaluateEligibility` directly, so the mocked backend
and the frontend's own calculations cannot drift. If the domain logic
changes, the mock follows automatically — and the mock behaves like a real
Spring service would: same inputs, same outputs.

---

## What I'd do with more time

````

## You also need to create `.env.example`

```bash
cat > .env.example <<'EOF'
# Environment variables for the Loan Eligibility Simulator.
#
# Copy this file to `.env` for local development:
#
#     cp .env.example .env
#
# Vite only exposes variables prefixed with VITE_ to client-side code.

# Base URL the API client fetches from. In dev and test, MSW intercepts
# requests to this path, so it doesn't need to resolve to a real server.
VITE_API_BASE_URL=/api

# When 'true', MSW starts and serves the mocked API. Set to 'false' to
# point the app at a real backend instead.
#
# In Docker, this is passed as a build arg rather than read from .env,
# because Vite bakes env vars into the bundle at build time:
#
#     docker build --build-arg VITE_ENABLE_MOCK_API=false -t app:real .
VITE_ENABLE_MOCK_API=true
EOF
````

The quoted `'EOF'` matters on Git Bash — it stops the shell from expanding `$` characters, which would silently corrupt the file.

## Confirm `.env` is gitignored

```bash
git check-ignore -v .env
```

Should print a rule. If it doesn't, add this to `.gitignore`:

```gitignore
# Environment files
.env
.env.*
!.env.example
```

The `!.env.example` line un-ignores the example file so it _is_ committed. That's the whole point — the example documents what the app expects, without leaking values.

## What changed in the README

- **New "Environment variables" section** between Install and Run locally, with the `cp .env.example .env` instruction, a table of the two variables, and a note about the `VITE_` prefix
- **Docker section** now shows the `--build-arg VITE_ENABLE_MOCK_API=false` form for pointing at a real backend
- **Project structure** includes `.env.example` and fixes the mangled box-drawing characters from the earlier encoding issue
- **ToC** updated with the new Environment variables entry

## Verify

```bash
pnpm verify
```

Then confirm a fresh clone would work:

```bash
# Simulate a fresh clone in a temp directory
cd /tmp
git clone <your-repo-url> test-clone
cd test-clone
cp .env.example .env
pnpm install
pnpm verify
```
