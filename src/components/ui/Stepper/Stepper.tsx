import styles from './Stepper.module.css';

export interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: readonly Step[];
  currentIndex: number;
  /** Highest step the user has reached. Steps below this are clickable. */
  furthestIndex: number;
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, currentIndex, furthestIndex, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress" className={styles.nav}>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          const isReachable = index <= furthestIndex && onStepClick !== undefined;

          const classes = [
            styles.item,
            isCurrent ? styles.itemCurrent : '',
            isComplete ? styles.itemComplete : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <li key={step.id} className={classes}>
              {isReachable && !isCurrent ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => onStepClick?.(index)}
                >
                  <span className={styles.marker} aria-hidden="true">
                    {isComplete ? '✓' : index + 1}
                  </span>
                  <span className={styles.label}>{step.label}</span>
                </button>
              ) : (
                <span className={styles.button} aria-current={isCurrent ? 'step' : undefined}>
                  <span className={styles.marker} aria-hidden="true">
                    {isComplete ? '✓' : index + 1}
                  </span>
                  <span className={styles.label}>{step.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
