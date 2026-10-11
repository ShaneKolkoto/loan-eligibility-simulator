import type { ReactNode } from 'react';
import styles from './Alert.module.css';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  tone: AlertTone;
  title?: string;
  children: ReactNode;
  role?: 'alert' | 'status';
}

export function Alert({ tone, title, children, role = 'status' }: AlertProps) {
  const classes = [styles.alert, styles[tone]].join(' ');
  return (
    <div className={classes} role={role}>
      {title ? <p className={styles.title}>{title}</p> : null}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
