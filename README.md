# Loan Eligibility Simulator

A responsive frontend that lets a customer enter their income, expenses, and a
desired loan amount, and see an estimated eligibility result with a clear
breakdown of the reasoning.

> Take-home submission for the Capitec **Software Engineer: Front-End** role.

---

## Table of contents

- [Stack](#stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Run locally](#run-locally)
  - [Run with Docker](#run-with-docker)
- [Scripts](#scripts)
- [Testing](#testing)
- [Architecture](#architecture)
- [Decisions & trade-offs](#decisions--trade-offs)
- [What I'd do with more time](#what-id-do-with-more-time)

---

## Stack

| Concern            | Choice                                  |
| ------------------ | --------------------------------------- |
| UI                 | React 19 + TypeScript (strict)          |
| Build tool         | Vite 8                                  |
| Validation         | Zod 4                                   |
| Unit / component   | Vitest 5 + React Testing Library        |
| E2E                | Playwright                              |
| Mocked API         | MSW 3 (Mock Service Worker)             |
| Containerisation   | Docker (multi-stage, non-root, nginx)   |
| CI                 | GitHub Actions                          |
| Lint / format      | ESLint 10 + Prettier                    |

---

## Project structure

```
.
├── src/
│   ├── app/                   # app shell, providers
│   ├── domain/
│   │   └── eligibility/       # pure business logic (no React)
│   ├── features/
│   │   └── eligibility/       # UI + hooks for the loan feature
│   ├── services/              # API clients / fetch wrappers
│   ├── components/            # shared UI primitives
│   ├── lib/                   # helpers, utils
│   ├── test/                  # test setup, MSW server + handlers
│   └── main.tsx
├── Dockerfile                 # multi-stage production image
├── nginx.conf                 # SPA fallback + caching
├── .dockerignore
├── .nvmrc                     # Node version
├── compose.yaml               # watch-mode rebuild loop
├── .github/workflows/ci.yml   # lint → typecheck → test → build
└── package.json
```

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
```

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

To stop the container, `Ctrl+C` (or `docker stop <id>` if run detached).

---

## Scripts

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `pnpm dev`             | Start the Vite dev server                             |
| `pnpm build`           | Type-check and produce a production bundle in `dist/` |
| `pnpm preview`         | Serve the production bundle locally                   |
| `pnpm lint`            | Run ESLint (fails on warnings)                        |
| `pnpm lint:fix`        | Run ESLint and auto-fix what it can                   |
| `pnpm format`          | Format with Prettier                                  |
| `pnpm format:check`    | Check formatting without writing                      |
| `pnpm typecheck`       | Run `tsc --noEmit`                                    |
| `pnpm test`            | Run the Vitest suite once                             |
| `pnpm test:watch`      | Run Vitest in watch mode                              |
| `pnpm test:ui`         | Run Vitest with the interactive UI                    |
| `pnpm test:coverage`   | Run Vitest with coverage                              |
| `pnpm e2e`             | Run Playwright end-to-end tests                       |
| `pnpm verify`          | Lint + typecheck + test + build — the full gate       |

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

---

## Decisions & trade-offs


---

## What I'd do with more time
