export interface CalculateRateRequest {
  loanAmount: number;
  loanTerm: number;
  creditScore: number;
  loanType: string;
}

export interface PaymentScheduleEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface CalculateRateResponse {
  interestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
  paymentSchedule: PaymentScheduleEntry[];
}
