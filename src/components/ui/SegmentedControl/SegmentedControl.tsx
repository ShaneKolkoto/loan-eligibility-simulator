import { useId } from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
  hint,
}: SegmentedControlProps<T>) {
  const groupName = useId();
  const errorId = `${groupName}-error`;
  const hintId = `${groupName}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset
      className={styles.fieldset}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
    >
      <legend className={styles.legend}>{label}</legend>

      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}

      <div className={styles.group}>
        {options.map((option) => {
          const optionId = `${groupName}-${String(option.value)}`;
          const isSelected = value === option.value;
          return (
            <label
              key={String(option.value)}
              htmlFor={optionId}
              className={`${styles.pill} ${isSelected ? styles.pillSelected : ''}`}
            >
              <input
                id={optionId}
                type="radio"
                name={groupName}
                value={String(option.value)}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className={styles.input}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
