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
│   ├── app/                   # app shell, providers
│   ├── components/
│   │   └── ui/                # design-system primitives
│   ├── domain/
│   │   └── eligibility/       # pure business logic (no React)
│   ├── features/
│   │   └── eligibility/       # UI + validation for the loan feature
│   ├── hooks/                 # useEligibility, useLoanProducts, useValidationRules
│   ├── services/
│   │   └── loans/             # API client, types, Zod schemas
│   ├── test/                  # test setup, MSW server + handlers
│   ├── index.css              # design tokens
│   └── main.tsx
├── Dockerfile                 # multi-stage production image
├── nginx.conf                 # SPA fallback + caching
├── .dockerignore
├── .nvmrc                     # Node version
├── .env.example               # environment variable reference
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

### Environment variables

Copy the example file to create your local `.env`:

```bash
cp .env.example .env
```

| Variable               | Default | Purpose                                                                        |
| ---------------------- | ------- | ------------------------------------------------------------------------------ |
| `VITE_API_BASE_URL`    | `/api`  | Base URL the client fetches from. In dev and test, MSW intercepts it.          |
| `VITE_ENABLE_MOCK_API` | `true`  | When `true`, MSW starts and serves the API. Set to `false` for a real backend. |

`.env` is gitignored — never commit it. `.env.example` is committed and is the
source of truth for what the app expects.

> Vite only exposes variables prefixed with `VITE_` to client code. This is
> deliberate — it prevents accidental leakage of server-side secrets into the
> bundle.

### Run locally

```bash
pnpm dev
```

The app is served at **http://localhost:5173**.

> The API is mocked in the browser via MSW, so no backend is required.

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
2. **runtime** — serves the bundle from `nginx:alpine` as a non-root user, with
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

Unit and component tests live next to the code they exercise. The suite is
concentrated where the risk is:

- **Domain** (`src/domain/eligibility/`) — pure functions, exhaustive coverage
  of every rule and edge case. A wrong number here becomes a wrong decision
  for a customer.
- **Hooks** (`src/hooks/`) — the API boundary. Success, failure, and loading
  paths, tested against MSW.
- **Feature components** — form validation, the stepper's per-step gating,
  product-aware term filtering, and the result panel's branching.
- **UI primitives** — only where there's real behaviour: `Button`'s
  loading/disabled semantics, `Input`'s error-to-screen-reader wiring.

`Card` and `Spinner` are deliberately untested — no branching, covered
indirectly by every feature test that uses them.

Run the suite:

```bash
pnpm test          # once
pnpm test:watch    # watch mode
pnpm test:coverage # with coverage
pnpm e2e           # Playwright
```

---

## Architecture

The app is layered so each concern can be understood and tested in isolation.

```
┌───────────────────────────────────────────────────────┐
│  app/App.tsx           composes hooks + components    │
├───────────────────────────────────────────────────────┤
│  features/eligibility/ components + form validation   │
├───────────────────────────────────────────────────────┤
│  hooks/                useEligibility,                │
│                        useLoanProducts,               │
│                        useValidationRules             │
├───────────────────────────────────────────────────────┤
│  services/loans/       API client + Zod schemas       │
├───────────────────────────────────────────────────────┤
│  domain/eligibility/   pure logic, no React, no I/O   │
└───────────────────────────────────────────────────────┘
```

### Why each layer exists

- **`domain/eligibility/`** — affordability, interest pricing, amortization,
  and the orchestrator. Pure functions: given the same input, always the same
  output. This is what makes the business rules testable without a browser,
  and it's the layer where a bank's rules would actually live.
- **`services/loans/`** — the API boundary. Types mirror the contract; Zod
  schemas validate every response at runtime. A malformed response fails
  loudly instead of corrupting the UI.
- **`hooks/`** — where React meets the API. Loading, error, and data state in
  one place per endpoint. Components don't fetch; they call hooks.
- **`features/eligibility/`** — the feature's components. They know the domain
  but not the API's wire format.
- **`components/ui/`** — design-system primitives. They know nothing about
  loans and could be lifted into another app unchanged.
- **`app/`** — the shell. Composes hooks and feature components; holds no
  logic of its own.

### The mock backend

MSW handlers in `src/test/msw/handlers.ts` call the real domain logic:

```ts
const result = evaluateEligibility(parsed.data, validationRules);
return HttpResponse.json(result);
```

The mocked backend and the frontend's own calculations cannot drift. If the
domain logic changes, the mock follows automatically — and the mock behaves
the way a real service would: same inputs, same outputs, same status codes.

### The mock runs inside the Docker image

The project has no real backend, so MSW is bundled into the production build
and starts unless `VITE_ENABLE_MOCK_API=false` is set at build time. Without
this, the container would render an empty shell, since every API call would
fall through nginx's SPA fallback and return HTML.

To point the app at a real backend:

```bash
docker build --build-arg VITE_ENABLE_MOCK_API=false -t app:real .
```

In a real pipeline, that flag would be set per environment.

---

## Decisions & trade-offs

### Spec deviation: amortization worked example

The API specification's `/calculate-rate` example shows a monthly payment of
**R7,089.50** for R150,000 at 12.5% over 24 months. Applying the standard
annuity formula to those same inputs yields **R7,096.10**.

The 6.60 difference appears to be a hand-written artifact in the spec
matching R7,089.50 would require either a rate of ~12.15% or a term of
~24.2 months, both of which contradict the spec's own inputs.

The implementation follows the formula. Tests assert the mathematically
correct value, and this note records the deviation deliberately rather than
silently. I'd raise it with the backend team before integrating for real — a
6-rand difference per month compounds across a portfolio.

### Validation rules come from the API, not the client

The eligibility engine takes the validation rules as an argument rather than
hard-coding thresholds. This mirrors the spec's `/validation-rules` endpoint,
and means a product change (e.g. raising the minimum income) is a data change,
not a frontend release.

### Serviceability, not LTI, gates a term loan

The spec's validation-rules endpoint doesn't define a loan-to-income gate. My
first implementation added one anyway  a 60% ceiling. That was wrong for a
term loan. A customer earning R25,000 with R24,985 of disposable income was
declined a R25,000 loan repaid over 12 months, despite the R1,230 instalment
being comfortably serviceable.

LTI is a rule of thumb for revolving credit, where the balance persists. For
an amortising term loan, the correct test is whether the instalment fits
disposable income. The model now gates on:

- **DTI ≤ 40%** : existing debt as a share of income
- **Disposable after repayment ≥ R1,000** : can they afford the instalment?

LTI remains as a soft signal that lowers the risk score, but does not cause
an outright decline.

### Product-aware validation

The `/loans/products` endpoint defines per-product term and amount ranges. The
form enforces them: Vehicle Finance requires a 12-month minimum and its amount
range starts at R50,000. Without this, a 6-month Vehicle Finance application
would pass the generic term rule (min 6) while violating the product's own
minimum.

Term options filter to the selected product's range; the amount and term hints
show the product's actual limits; changing purpose clears an invalid term; and
the final submit re-validates both fields against the selected product.

### Response validation at the boundary

Every API response is parsed through a Zod schema before the UI sees it. This
is not ceremony — it caught a real bug on the first run. The schema assumed
`debtToIncomeRatio` was bounded at 100, but DTI is a ratio expressed as a
percentage: an applicant owing 3× their income has a DTI of 300. Capping it
would have silently hidden exactly the cases the UI most needs to show.

### Zero new runtime dependencies

Plain CSS with custom properties instead of a styling library. A small custom
hook instead of a query library. The only runtime dependencies are React and
Zod. This keeps the Docker image small and means every abstraction in the
codebase is one we chose, not one we inherited.

---

## What I'd do with more time

Ordered by impact.

**Correctness**

1. **Error boundary** — a rendering error currently blanks the page. React
   error boundaries would contain failures to the affected subtree and show a
   recoverable message.
2. **Persist form state across reloads** — session storage would restore a
   partially completed application.

**User experience**

3. **Live affordability preview as the user types the requested amount** —
   currently the preview only covers income and expenses.
4. **Sensible defaults** — pre-fill the term with the product's midpoint, the
   amount with a round number near the income-based ceiling.
5. **Scroll the result into view on submission** — on mobile the result
   appears below the fold.

**Engineering**

6. **Playwright E2E tests** — the suite is unit and component level. A handful
   of end-to-end paths would protect against integration regressions.
7. **Coverage reporting in CI** — `pnpm test:coverage` exists but isn't wired
   into the pipeline or gated on a threshold.
8. **Bundle analysis** — `rollup-plugin-visualizer` in the build.
9. **i18n and a formatting layer** — currency and locale are hard-coded to
   `en-ZA` and ZAR.

**Product**

10. **Offer the full product range** — the form offers Vehicle Finance as a
    purpose, but the underlying rate calculation still defaults to the personal
    loan product. Wiring the selected product through to `interestRateFor`
    would complete the picture.
````
