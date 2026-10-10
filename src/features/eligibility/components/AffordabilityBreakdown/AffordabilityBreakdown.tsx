import type { AffordabilityAnalysis } from '@/services/loans/types';
import styles from './AffordabilityBreakdown.module.css';

interface AffordabilityBreakdownProps {
  analysis: AffordabilityAnalysis;
}

const CURRENCY = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 2,
});

export function AffordabilityBreakdown({ analysis }: AffordabilityBreakdownProps) {
  return (
    <dl className={styles.grid}>
      <div className={styles.item}>
        <dt className={styles.label}>Disposable income</dt>
        <dd className={styles.value}>{CURRENCY.format(analysis.disposableIncome)}</dd>
      </div>
      <div className={styles.item}>
        <dt className={styles.label}>Debt-to-income</dt>
        <dd className={styles.value}>{analysis.debtToIncomeRatio.toFixed(1)}%</dd>
      </div>
      <div className={styles.item}>
        <dt className={styles.label}>Loan-to-income</dt>
        <dd className={styles.value}>{analysis.loanToIncomeRatio.toFixed(0)}%</dd>
      </div>
      <div className={styles.item}>
        <dt className={styles.label}>Affordability</dt>
        <dd className={`${styles.value} ${styles[analysis.affordabilityScore]}`}>
          {capitalise(analysis.affordabilityScore)}
        </dd>
      </div>
    </dl>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}