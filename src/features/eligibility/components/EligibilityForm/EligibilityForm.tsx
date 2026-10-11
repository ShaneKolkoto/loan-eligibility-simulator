import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Input, OptionCards, SegmentedControl, Stepper } from '@/components';
import type { Step } from '@/components';
import type {
  EligibilityRequest,
  EmploymentStatus,
  LoanProduct,
  LoanPurpose,
  ValidationRulesResponse,
} from '@/services/loans/types';
import { emptyForm, toRequest, validateForm, validateStep } from '../../validation';
import type { FieldErrors, FormValues } from '../../validation';
import styles from './EligibilityForm.module.css';

interface EligibilityFormProps {
  rules: ValidationRulesResponse;
  products: LoanProduct[];
  isSubmitting: boolean;
  onSubmit: (payload: EligibilityRequest) => void;
}

type StepId = 'about-you' | 'finances' | 'loan';

const STEPS: readonly Step[] = [
  { id: 'about-you', label: 'About you' },
  { id: 'finances', label: 'Your finances' },
  { id: 'loan', label: 'The loan' },
] as const;

const STEP_IDS: readonly StepId[] = ['about-you', 'finances', 'loan'];

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed', description: 'Full-time or part-time' },
  { value: 'self_employed', label: 'Self-employed', description: 'Own business or freelance' },
  { value: 'unemployed', label: 'Unemployed', description: 'Not currently working' },
  { value: 'retired', label: 'Retired', description: 'No longer working' },
] as const;

const PURPOSE_OPTIONS = [
  { value: 'debt_consolidation', label: 'Debt consolidation' },
  { value: 'home_improvement', label: 'Home improvement' },
  { value: 'education', label: 'Education' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
  { value: 'new_vehicle', label: 'Vehicle Finance' },
] as const;

const TERM_OPTIONS = [
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
  { value: 24, label: '24 months' },
  { value: 36, label: '36 months' },
  { value: 48, label: '48 months' },
  { value: 60, label: '60 months' },
] as const;

const CURRENCY = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

export function EligibilityForm({
  rules,
  products,
  isSubmitting,
  onSubmit,
}: EligibilityFormProps) {
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [furthestIndex, setFurthestIndex] = useState(0);

  const currentStepId = STEP_IDS[currentIndex] ?? 'about-you';
  const isLastStep = currentIndex === STEP_IDS.length - 1;

  // The product that serves the currently selected purpose, if any. Drives
  // the term and amount ranges shown on the loan step.
  const selectedProduct = useMemo(() => {
    if (!values.loanPurpose) return null;
    return products.find((p) => p.purposes.includes(values.loanPurpose as LoanPurpose)) ?? null;
  }, [products, values.loanPurpose]);

  // Term options filtered to the selected product's range. Vehicle finance,
  // for example, requires a minimum of 12 months; personal loans allow 6.
  const termOptions = useMemo(() => {
    if (!selectedProduct) return TERM_OPTIONS;
    return TERM_OPTIONS.filter(
      (opt) => opt.value >= selectedProduct.minTerm && opt.value <= selectedProduct.maxTerm,
    );
  }, [selectedProduct]);

  const disposablePreview = useMemo(() => {
    const income = Number(values.monthlyIncome);
    const expenses = Number(values.monthlyExpenses);
    const debt = values.existingDebt === '' ? 0 : Number(values.existingDebt);
    if (!Number.isFinite(income) || income <= 0) return null;
    if (values.monthlyExpenses === '' || !Number.isFinite(expenses)) return null;
    return income - expenses - debt;
  }, [values.monthlyIncome, values.monthlyExpenses, values.existingDebt]);

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };

      // If the purpose changed and the currently selected term is no longer
      // valid for the newly selected product, clear it so the user is
      // forced to re-select. This prevents a stale value from passing
      // validation under the wrong product's rules.
      if (field === 'loanPurpose') {
        const product = products.find((p) => p.purposes.includes(value as LoanPurpose));
        if (product && next.loanTerm !== '') {
          const term = Number(next.loanTerm);
          if (!Number.isFinite(term) || term < product.minTerm || term > product.maxTerm) {
            next.loanTerm = '';
          }
        }
      }

      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateCurrentStep(): boolean {
    const stepErrors = { ...validateStep(currentStepId, values, rules) };

    // Product-specific constraints the generic rules can't express — for
    // example, Vehicle Finance requires a minimum term of 12 months and a
    // minimum amount of R50,000, where the generic rules allow 6 and R5,000.
    if (currentStepId === 'loan' && selectedProduct) {
      const term = Number(values.loanTerm);
      if (values.loanTerm !== '' && Number.isFinite(term)) {
        if (term < selectedProduct.minTerm) {
          stepErrors.loanTerm = `${selectedProduct.name} requires a minimum term of ${selectedProduct.minTerm} months`;
        } else if (term > selectedProduct.maxTerm) {
          stepErrors.loanTerm = `${selectedProduct.name} allows a maximum term of ${selectedProduct.maxTerm} months`;
        }
      }

      const amount = Number(values.requestedAmount);
      if (values.requestedAmount !== '' && Number.isFinite(amount)) {
        if (amount < selectedProduct.minAmount) {
          stepErrors.requestedAmount = `${selectedProduct.name} requires a minimum amount of ${CURRENCY.format(selectedProduct.minAmount)}`;
        } else if (amount > selectedProduct.maxAmount) {
          stepErrors.requestedAmount = `${selectedProduct.name} allows a maximum amount of ${CURRENCY.format(selectedProduct.maxAmount)}`;
        }
      }
    }

    setErrors((prev) => {
      const next: FieldErrors = { ...prev };
      for (const key of Object.keys(next)) {
        if (isFieldInStep(key as keyof FormValues, currentStepId)) delete next[key];
      }
      return { ...next, ...stepErrors };
    });

    return Object.keys(stepErrors).length === 0;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setFurthestIndex((prev) => Math.max(prev, nextIndex));
  }

  function goBack() {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function goToStep(index: number) {
    if (index > furthestIndex) return;
    setCurrentIndex(index);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLastStep) {
      goNext();
      return;
    }

    const allErrors = validateForm(values, rules);

    // Re-apply product-specific constraints on final submit, since the user
    // may have gone back and changed the purpose after passing the loan step.
    if (selectedProduct) {
      const term = Number(values.loanTerm);
      if (values.loanTerm !== '' && Number.isFinite(term)) {
        if (term < selectedProduct.minTerm) {
          allErrors.loanTerm = `${selectedProduct.name} requires a minimum term of ${selectedProduct.minTerm} months`;
        } else if (term > selectedProduct.maxTerm) {
          allErrors.loanTerm = `${selectedProduct.name} allows a maximum term of ${selectedProduct.maxTerm} months`;
        }
      }

      const amount = Number(values.requestedAmount);
      if (values.requestedAmount !== '' && Number.isFinite(amount)) {
        if (amount < selectedProduct.minAmount) {
          allErrors.requestedAmount = `${selectedProduct.name} requires a minimum amount of ${CURRENCY.format(selectedProduct.minAmount)}`;
        } else if (amount > selectedProduct.maxAmount) {
          allErrors.requestedAmount = `${selectedProduct.name} allows a maximum amount of ${CURRENCY.format(selectedProduct.maxAmount)}`;
        }
      }
    }

    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      const firstBadStepIndex = STEP_IDS.findIndex((stepId) =>
        Object.keys(allErrors).some((field) => isFieldInStep(field as keyof FormValues, stepId)),
      );
      if (firstBadStepIndex >= 0) setCurrentIndex(firstBadStepIndex);
      return;
    }

    onSubmit(toRequest(values));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <Stepper
        steps={STEPS}
        currentIndex={currentIndex}
        furthestIndex={furthestIndex}
        onStepClick={goToStep}
      />

      <div className={styles.stepBody}>
        {currentStepId === 'about-you' ? (
          <fieldset className={styles.section}>
            <legend className={styles.legend}>About you</legend>

            <Input
              label="Age"
              type="number"
              inputMode="numeric"
              autoComplete="off"
              min={rules.personalInfo.age.min}
              max={rules.personalInfo.age.max}
              hint={`Between ${rules.personalInfo.age.min} and ${rules.personalInfo.age.max}`}
              value={values.age}
              onChange={(e) => update('age', e.target.value)}
              error={errors.age}
            />

            <OptionCards<EmploymentStatus>
              label="Employment status"
              options={EMPLOYMENT_OPTIONS}
              value={values.employmentStatus as EmploymentStatus | ''}
              onChange={(value) => update('employmentStatus', value)}
              error={errors.employmentStatus}
            />

            <Input
              label="Months in current employment"
              type="number"
              inputMode="numeric"
              autoComplete="off"
              min={rules.personalInfo.employmentDuration.min}
              hint={`Minimum ${rules.personalInfo.employmentDuration.min} months`}
              value={values.employmentDuration}
              onChange={(e) => update('employmentDuration', e.target.value)}
              error={errors.employmentDuration}
            />
          </fieldset>
        ) : null}

        {currentStepId === 'finances' ? (
          <fieldset className={styles.section}>
            <legend className={styles.legend}>Your finances</legend>

            <Input
              label="Monthly income"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              min={rules.financialInfo.monthlyIncome.min}
              prefix="R"
              hint={`Minimum ${CURRENCY.format(rules.financialInfo.monthlyIncome.min)}`}
              value={values.monthlyIncome}
              onChange={(e) => update('monthlyIncome', e.target.value)}
              error={errors.monthlyIncome}
            />

            <Input
              label="Monthly expenses"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              prefix="R"
              value={values.monthlyExpenses}
              onChange={(e) => update('monthlyExpenses', e.target.value)}
              error={errors.monthlyExpenses}
            />

            <Input
              label="Existing monthly debt"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              prefix="R"
              hint="Optional. Leave blank if none."
              value={values.existingDebt}
              onChange={(e) => update('existingDebt', e.target.value)}
              error={errors.existingDebt}
            />

            {disposablePreview !== null ? (
              <div
                className={`${styles.preview} ${disposablePreview < 0 ? styles.previewNegative : ''}`}
                role="status"
                aria-live="polite"
              >
                <span className={styles.previewLabel}>Disposable income</span>
                <span className={styles.previewValue}>
                  {CURRENCY.format(disposablePreview)}
                </span>
              </div>
            ) : null}

            <Input
              label="Credit score"
              type="number"
              inputMode="numeric"
              autoComplete="off"
              min={rules.financialInfo.creditScore.min}
              max={rules.financialInfo.creditScore.max}
              hint={`Optional. Between ${rules.financialInfo.creditScore.min} and ${rules.financialInfo.creditScore.max}.`}
              value={values.creditScore}
              onChange={(e) => update('creditScore', e.target.value)}
              error={errors.creditScore}
            />
          </fieldset>
        ) : null}

        {currentStepId === 'loan' ? (
          <fieldset className={styles.section}>
            <legend className={styles.legend}>The loan</legend>

            <OptionCards<LoanPurpose>
              label="Purpose"
              options={PURPOSE_OPTIONS}
              value={values.loanPurpose as LoanPurpose | ''}
              onChange={(value) => update('loanPurpose', value)}
              error={errors.loanPurpose}
              columns={3}
            />

            <Input
              label="Requested amount"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              prefix="R"
              hint={
                selectedProduct
                  ? `${selectedProduct.name}: ${CURRENCY.format(selectedProduct.minAmount)} – ${CURRENCY.format(selectedProduct.maxAmount)}`
                  : `Between ${CURRENCY.format(rules.loanDetails.requestedAmount.min)} and ${CURRENCY.format(
                      rules.loanDetails.requestedAmount.max ?? 0,
                    )}`
              }
              value={values.requestedAmount}
              onChange={(e) => update('requestedAmount', e.target.value)}
              error={errors.requestedAmount}
            />

            <SegmentedControl<number>
              label="Term"
              options={termOptions}
              value={values.loanTerm === '' ? null : Number(values.loanTerm)}
              onChange={(value) => update('loanTerm', String(value))}
              error={errors.loanTerm}
              hint={
                selectedProduct
                  ? `${selectedProduct.name}: ${selectedProduct.minTerm}–${selectedProduct.maxTerm} months`
                  : `Between ${rules.loanDetails.loanTerm.min} and ${rules.loanDetails.loanTerm.max} months`
              }
            />
          </fieldset>
        ) : null}
      </div>

      {Object.keys(errors).length > 0 &&
      Object.keys(errors).some((field) =>
        isFieldInStep(field as keyof FormValues, currentStepId),
      ) ? (
        <Alert tone="danger" role="alert" title="Please fix the following">
          {
            Object.keys(errors).filter((field) =>
              isFieldInStep(field as keyof FormValues, currentStepId),
            ).length
          }{' '}
          field
          {Object.keys(errors).filter((field) =>
            isFieldInStep(field as keyof FormValues, currentStepId),
          ).length === 1
            ? ''
            : 's'}{' '}
          need attention.
        </Alert>
      ) : null}

      <div className={styles.actions}>
        {currentIndex > 0 ? (
          <Button type="button" variant="secondary" size="lg" onClick={goBack}>
            Back
          </Button>
        ) : null}
        <Button type="submit" size="lg" isLoading={isSubmitting}>
          {isLastStep ? (isSubmitting ? 'Checking…' : 'Check eligibility') : 'Next'}
        </Button>
      </div>
    </form>
  );
}

function isFieldInStep(field: keyof FormValues, stepId: StepId): boolean {
  switch (stepId) {
    case 'about-you':
      return field === 'age' || field === 'employmentStatus' || field === 'employmentDuration';
    case 'finances':
      return (
        field === 'monthlyIncome' ||
        field === 'monthlyExpenses' ||
        field === 'existingDebt' ||
        field === 'creditScore'
      );
    case 'loan':
      return field === 'requestedAmount' || field === 'loanTerm' || field === 'loanPurpose';
    default:
      return false;
  }
}