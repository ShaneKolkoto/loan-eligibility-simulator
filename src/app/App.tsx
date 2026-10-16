import { Alert, Button, Card, Spinner } from '@/components';
import { useEligibility } from '@/hooks/useEligibility';
import { useLoanProducts } from '@/hooks/useLoanProducts';
import { useValidationRules } from '@/hooks/useValidationRules';
import { EligibilityForm } from '@/features/eligibility/components/EligibilityForm/EligibilityForm';
import { EligibilityResult } from '@/features/eligibility/components/EligibilityResult/EligibilityResult';
import type { LoanPurpose } from '@/services/loans/types';
import styles from './App.module.css';

export default function App() {
  const rulesState = useValidationRules();
  const productsState = useLoanProducts();
  const eligibilityState = useEligibility();

  const submittedPurpose: LoanPurpose =
    eligibilityState.lastRequest?.loanDetails.loanPurpose ?? 'other';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Loan Eligibility Simulator</h1>
        <p className={styles.subtitle}>
          Enter your details to see an estimate of what you could borrow.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <Card title="Your details">
            {rulesState.isLoading ? (
              <Spinner label="Loading form" />
            ) : rulesState.error || !rulesState.rules ? (
              <Alert tone="danger" role="alert" title="Couldn't load the form">
                {rulesState.error ?? 'Validation rules unavailable.'}
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <Button variant="secondary" onClick={rulesState.reload}>
                    Try again
                  </Button>
                </div>
              </Alert>
            ) : (
              <EligibilityForm
                rules={rulesState.rules}
                products={productsState.products}
                isSubmitting={eligibilityState.isLoading}
                onSubmit={eligibilityState.submit}
              />
            )}
          </Card>
        </div>

        <div className={styles.resultColumn}>
          {eligibilityState.error ? (
            <Alert tone="danger" role="alert" title="Something went wrong">
              {eligibilityState.error}
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Button variant="secondary" onClick={eligibilityState.reset}>
                  Dismiss
                </Button>
              </div>
            </Alert>
          ) : eligibilityState.data ? (
            <EligibilityResult
              result={eligibilityState.data}
              products={productsState.products}
              loanPurpose={submittedPurpose}
            />
          ) : (
            <Card title="Your result">
              <p className={styles.placeholder}>
                Fill in the form and select <strong>Check eligibility</strong> to see your estimated
                result here.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
