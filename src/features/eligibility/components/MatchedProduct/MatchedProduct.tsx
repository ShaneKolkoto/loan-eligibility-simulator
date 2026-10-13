import { Card } from '@/components';
import type { LoanProduct, LoanPurpose } from '@/services/loans/types';
import styles from './MatchedProduct.module.css';

interface MatchedProductProps {
  products: LoanProduct[];
  /** The purpose the applicant selected. Determines which product applies. */
  loanPurpose: LoanPurpose;
}

const CURRENCY = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

export function MatchedProduct({ products, loanPurpose }: MatchedProductProps) {
  const matched = products.find((product) => product.purposes.includes(loanPurpose));

  // No match: the applicant selected a purpose no product serves. Render
  // nothing rather than an empty card — the rest of the result still stands.
  if (!matched) return null;

  return (
    <Card title="Matched product">
      <div className={styles.product}>
        <div className={styles.header}>
          <h3 className={styles.name}>{matched.name}</h3>
          <p className={styles.description}>{matched.description}</p>
        </div>

        <dl className={styles.facts}>
          <Fact
            label="Amount"
            value={`${CURRENCY.format(matched.minAmount)} – ${CURRENCY.format(matched.maxAmount)}`}
          />
          <Fact label="Term" value={`${matched.minTerm} – ${matched.maxTerm} months`} />
          <Fact
            label="Rate"
            value={`${matched.interestRateRange.min.toFixed(1)}% – ${matched.interestRateRange.max.toFixed(1)}%`}
          />
        </dl>
      </div>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{value}</dd>
    </div>
  );
}
