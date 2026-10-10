# Domain tests — deliberate deviations from the API spec

## Amortization worked example

- **Spec:** R150,000 at 12.5% over 24 months → monthly payment of R7,089.50
- **Implementation:** R150,000 at 12.5% over 24 months → R7,096.10

The spec's figure is inconsistent with its own inputs. The standard annuity
formula, applied to the numbers the spec supplies, gives R7,096.10. Matching
R7,089.50 would require a rate of 12.15% or a term of 24 months.

The implementation follows the formula. Tests assert the mathematically
correct value. See the root README → Decisions & trade-offs for rationale
in context.
