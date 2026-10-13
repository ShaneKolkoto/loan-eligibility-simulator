import { Alert, Card } from '@/components';
import type { EligibilityResponse, LoanProduct, LoanPurpose } from '@/services/loans/types';
import { AffordabilityBreakdown } from '../AffordabilityBreakdown/AffordabilityBreakdown';
import { MatchedProduct } from '../MatchedProduct/MatchedProduct';
import styles from './EligibilityResult.module.css';

interface EligibilityResultProps {
  result: EligibilityResponse;
  products: LoanProduct[];
  loanPurpose: LoanPurpose;
}

const CURRENCY = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 2,
});

export function EligibilityResult({ result, products, loanPurpose }: EligibilityResultProps) {
  const { eligibilityResult, recommendedLoan, affordabilityAnalysis } = result;
  const eligible = eligibilityResult.isEligible;

  return (
    <div className={styles.wrapper} aria-live="polite">
      <Alert
        tone={eligible ? 'success' : 'danger'}
        role="status"
        title={eligible ? 'You may qualify' : 'Not eligible right now'}
      >
        {eligibilityResult.decisionReason}
      </Alert>

      {/* Only show the matched product when the applicant is eligible.
          Showing a product to someone we've just declined would be odd. */}
      {eligible ? <MatchedProduct products={products} loanPurpose={loanPurpose} /> : null}

      <Card title="Affordability">
        <AffordabilityBreakdown analysis={affordabilityAnalysis} />
      </Card>

      <Card title={eligible ? 'Recommended loan' : 'If you took this loan'}>
        <dl className={styles.summary}>
          <Row label="Maximum amount" value={CURRENCY.format(recommendedLoan.maxAmount)} />
          <Row
            label="Recommended amount"
            value={CURRENCY.format(recommendedLoan.recommendedAmount)}
          />
          <Row label="Interest rate" value={`${recommendedLoan.interestRate.toFixed(2)}%`} />
          <Row label="Monthly payment" value={CURRENCY.format(recommendedLoan.monthlyPayment)} />
          <Row label="Total repayment" value={CURRENCY.format(recommendedLoan.totalRepayment)} />
        </dl>
      </Card>

      <Card title="Risk assessment">
        <dl className={styles.summary}>
          <Row label="Risk category" value={capitalise(eligibilityResult.riskCategory)} />
          <Row label="Approval likelihood" value={`${eligibilityResult.approvalLikelihood}%`} />
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd className={styles.rowValue}>{value}</dd>
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
