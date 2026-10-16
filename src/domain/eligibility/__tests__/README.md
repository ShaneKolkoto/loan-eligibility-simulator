# Domain tests — deliberate deviations from the API spec

The domain implements the API's field-level rules faithfully, but adds
several business rules the spec doesn't define. This file records each
deviation and why it exists. See the root README → Decisions & trade-offs
for the full rationale in context.

---

## Amortization worked example

- **Spec:** R150,000 at 12.5% over 24 months → monthly payment of R7,089.50
- **Implementation:** R150,000 at 12.5% over 24 months → R7,096.10

The spec's figure is inconsistent with its own inputs. The standard annuity
formula, applied to the numbers the spec supplies, gives R7,096.10. Matching
R7,089.50 would require a rate of ~12.15% or a term of ~24.2 months, both of
which contradict the spec's stated inputs.

The implementation follows the formula. Tests assert the mathematically
correct value.

---

## Credit policy gates

The spec's `/validation-rules` endpoint defines shape constraints — age
range, minimum income, amount range, term range — but no credit policy
gates. Applied literally, an applicant with a 666,667% debt-to-income ratio
and zero disposable income passes every rule.

The domain adds three gates that a real retail lender enforces:

### DTI ≤ 40%

Existing debt as a share of monthly income. The standard first test in
retail lending. Above the threshold, the application is declined.

### Disposable income after repayment ≥ R1,000

Can the applicant afford the new instalment on top of existing commitments?
This is the correct test for a term loan. LTI is deliberately not a gate:
a loan can be large relative to income yet still comfortably serviceable
over a fixed term.

### Minimum credit score of 550

Below 550, the application is declined regardless of affordability. A very
low score is a decline, not merely expensive pricing.

A **missing** score (`NaN`) is not a decline. It's the unverified case,
priced at the worst band and flagged in the decision reason. That's a
different situation from a verified low score.

---

## Employment rules are per status

The spec defines a single `employmentDuration` minimum (3 months) without
regard to status. Applied literally, that produces two odd outcomes:

- A retired applicant who has been drawing a pension for 20 years passes,
  but one who retired last month fails — even with a healthy pension.
- An unemployed applicant is judged on how long they've been unemployed,
  when the actual issue is the absence of income.

The domain applies per-status rules:

| Status | Rule |
|---|---|
| Employed / self-employed | Minimum months in current employment, as the API defines |
| Retired | No duration requirement. Pension and investment income are qualifying income. |
| Unemployed | Rejected. There is no income to service a loan. |

This is a deliberate departure from a literal reading of the spec. The spec
expresses a general rule, and the general rule is wrong for two of the three
statuses it applies to.

---

## Product-aware validation

The `/loans/products` endpoint defines per-product term and amount ranges.
The form enforces them at the UI layer; the domain doesn't know about
products. For example:

- Vehicle Finance requires a 12-month minimum term; the generic `loanTerm`
  rule allows 6.
- Vehicle Finance's amount range starts at R50,000; the generic
  `requestedAmount` rule allows R5,000.

The client filters term options to the selected product's range, updates
the amount hint, and re-validates on final submit. The domain's job is to
evaluate a single request against a single product's rules, which the API
expresses as a flat set — so product-awareness lives in the form.

---

## How to read these tests

Each test file exercises one module of the domain:

- `affordability.test.ts` — DTI, LTI, disposable income, affordability score
- `amortization.test.ts` — the annuity formula, the schedule, zero-rate edge case
- `rates.test.ts` — the credit-score-to-rate mapping, missing-score handling, clamping
- `evaluate.test.ts` — the orchestrator: rule checks, gates, likelihood, risk

Where a test asserts behaviour that diverges from the spec's literal reading,
it carries a comment explaining the divergence. The comment names the rule
and points at the README for the full rationale.