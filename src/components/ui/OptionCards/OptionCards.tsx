import { useId } from 'react';
import styles from './OptionCards.module.css';

export interface OptionCard<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface OptionCardsProps<T extends string> {
  label: string;
  options: readonly OptionCard<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string;
  columns?: 2 | 3;
}

export function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  columns = 2,
}: OptionCardsProps<T>) {
  const groupName = useId();
  const errorId = `${groupName}-error`;

  return (
    <fieldset
      className={styles.fieldset}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className={styles.legend}>{label}</legend>

      <div className={`${styles.grid} ${columns === 3 ? styles.grid3 : styles.grid2}`}>
        {options.map((option) => {
          const optionId = `${groupName}-${option.value}`;
          const descId = `${optionId}-desc`;
          const isSelected = value === option.value;

          return (
            <div
              key={option.value}
              className={`${styles.cell} ${isSelected ? styles.cellSelected : ''}`}
            >
              <input
                id={optionId}
                type="radio"
                name={groupName}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className={styles.input}
                aria-describedby={option.description ? descId : undefined}
              />
              <label htmlFor={optionId} className={styles.card}>
                <span className={styles.cardLabel}>{option.label}</span>
              </label>
              {option.description ? (
                <span id={descId} className={styles.cardDescription}>
                  {option.description}
                </span>
              ) : null}
              {isSelected ? (
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </div>
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
