import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Input } from '@/components';
import type { EligibilityRequest, ValidationRulesResponse } from '@/services/loans/types';
import { emptyForm, toRequest, validateForm } from '../../validation';
import type { FieldErrors, FormValues } from '../../validation';
import styles from './EligibilityForm.module.css';

interface EligibilityFormProps {
  rules: ValidationRulesResponse;
  isSubmitting: boolean;
  onSubmit: (payload: EligibilityRequest) => void;
}

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
];

const PURPOSE_OPTIONS = [
  { value: 'debt_consolidation', label: 'Debt consolidation' },
  { value: 'home_improvement', label: 'Home improvement' },
  { value: 'education', label: 'Education' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export function EligibilityForm({ rules, isSubmitting, onSubmit }: EligibilityFormProps) {
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function update(field: keyof FormValues, value: string) {
    setValues((prev: any) => ({ ...prev, [field]: value }));
    // Clear this field's error as soon as the user edits it — revalidation
    // happens on next submit.
    if (submitted && errors[field]) {
      setErrors((prev: any) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const validationErrors = validateForm(values, rules);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    onSubmit(toRequest(values));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <fieldset className={styles.section}>
        <legend className={styles.legend}>About you</legend>

        <Input
          label="Age"
          type="number"
          inputMode="numeric"
          min={rules.personalInfo.age.min}
          max={rules.personalInfo.age.max}
          value={values.age}
          onChange={(e) => update('age', e.target.value)}
          error={errors.age}
        />

        <div className={styles.field}>
          <label htmlFor="employmentStatus" className={styles.label}>
            Employment status
          </label>
          <select
            id="employmentStatus"
            className={styles.select}
            value={values.employmentStatus}
            onChange={(e) => update('employmentStatus', e.target.value)}
            aria-invalid={errors.employmentStatus ? true : undefined}
            aria-describedby={errors.employmentStatus ? 'employmentStatus-error' : undefined}
          >
            <option value="">Select…</option>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.employmentStatus ? (
            <p id="employmentStatus-error" className={styles.error} role="alert">
              {errors.employmentStatus}
            </p>
          ) : null}
        </div>

        <Input
          label="Months in current employment"
          type="number"
          inputMode="numeric"
          min={rules.personalInfo.employmentDuration.min}
          value={values.employmentDuration}
          onChange={(e) => update('employmentDuration', e.target.value)}
          error={errors.employmentDuration}
        />
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Your finances</legend>

        <Input
          label="Monthly income"
          type="number"
          inputMode="decimal"
          min={rules.financialInfo.monthlyIncome.min}
          prefix="R"
          value={values.monthlyIncome}
          onChange={(e) => update('monthlyIncome', e.target.value)}
          error={errors.monthlyIncome}
        />

        <Input
          label="Monthly expenses"
          type="number"
          inputMode="decimal"
          prefix="R"
          value={values.monthlyExpenses}
          onChange={(e) => update('monthlyExpenses', e.target.value)}
          error={errors.monthlyExpenses}
        />

        <Input
          label="Existing monthly debt"
          type="number"
          inputMode="decimal"
          prefix="R"
          hint="Optional. Leave blank if none."
          value={values.existingDebt}
          onChange={(e) => update('existingDebt', e.target.value)}
          error={errors.existingDebt}
        />

        <Input
          label="Credit score"
          type="number"
          inputMode="numeric"
          min={rules.financialInfo.creditScore.min}
          max={rules.financialInfo.creditScore.max}
          hint="Optional. 300–850."
          value={values.creditScore}
          onChange={(e) => update('creditScore', e.target.value)}
          error={errors.creditScore}
        />
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>The loan</legend>

        <Input
          label="Requested amount"
          type="number"
          inputMode="decimal"
          prefix="R"
          value={values.requestedAmount}
          onChange={(e) => update('requestedAmount', e.target.value)}
          error={errors.requestedAmount}
        />

        <Input
          label="Term (months)"
          type="number"
          inputMode="numeric"
          min={rules.loanDetails.loanTerm.min}
          max={rules.loanDetails.loanTerm.max}
          value={values.loanTerm}
          onChange={(e) => update('loanTerm', e.target.value)}
          error={errors.loanTerm}
        />

        <div className={styles.field}>
          <label htmlFor="loanPurpose" className={styles.label}>
            Purpose
          </label>
          <select
            id="loanPurpose"
            className={styles.select}
            value={values.loanPurpose}
            onChange={(e) => update('loanPurpose', e.target.value)}
            aria-invalid={errors.loanPurpose ? true : undefined}
            aria-describedby={errors.loanPurpose ? 'loanPurpose-error' : undefined}
          >
            <option value="">Select…</option>
            {PURPOSE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.loanPurpose ? (
            <p id="loanPurpose-error" className={styles.error} role="alert">
              {errors.loanPurpose}
            </p>
          ) : null}
        </div>
      </fieldset>

      {submitted && Object.keys(errors).length > 0 ? (
        <Alert tone="danger" role="alert" title="Please fix the following">
          {Object.keys(errors).length} field{Object.keys(errors).length === 1 ? '' : 's'} need
          attention.
        </Alert>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" size="lg" isLoading={isSubmitting}>
          {isSubmitting ? 'Checking…' : 'Check eligibility'}
        </Button>
      </div>
    </form>
  );
}