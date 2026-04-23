export type SplitMethod = 'equal' | 'amount' | 'percentage' | 'shares';
export type NotificationStatus = 'queued' | 'delivered' | 'viewed';
export type SplitCurrency = 'USD' | 'KHR';
export type SplitDashboardRole = 'owner' | 'participant';
export type SplitIncomingStatus = 'pending_review' | 'payment_due' | 'paid' | 'rejected';

export interface SplitItUser {
  id: string;
  name: string;
  initials: string;
  accountId: string;
  phone: string;
  bank: string;
  recentTransferCount: number;
  lastTransferAt: string;
}

export interface SplitItTransaction {
  id: string;
  merchant: string;
  amount: number;
  currency: SplitCurrency;
  postedAt: string;
  category: string;
  participantsHint: string[];
  receiptAvailable: boolean;
}

export interface SplitAllocation {
  participantId: string;
  amount: number;
}

export interface SplitReceiptItem {
  id: string;
  label: string;
  amount: number;
  assignedParticipantIds: string[];
}

export interface SplitNotification {
  id: string;
  participantId: string;
  participantName: string;
  accountId: string;
  amount: number;
  currency: SplitCurrency;
  message: string;
  status: NotificationStatus;
  channel: 'push' | 'in_app';
  sentAt: string;
}

export interface SplitRequest {
  id: string;
  createdAt: string;
  requestedBy: string;
  totalAmount: number;
  currency: SplitCurrency;
  splitMethod: SplitMethod;
  participantIds: string[];
  transactionId?: string;
  receiptFileName?: string;
  receiptItems?: SplitReceiptItem[];
  note?: string;
  allocations: SplitAllocation[];
  notifications: SplitNotification[];
}

export interface SplitIncomingRequest {
  id: string;
  createdAt: string;
  ownerName: string;
  ownerAccountId: string;
  totalAmount: number;
  yourAmount: number;
  currency: SplitCurrency;
  splitMethod: SplitMethod;
  participantCount: number;
  transactionId?: string;
  receiptFileName?: string;
  note?: string;
  status: SplitIncomingStatus;
  message: string;
}

export interface SplitDraft {
  amountInput: string;
  currency: SplitCurrency;
  selectedTransactionId?: string;
  includeOwner: boolean;
  participantIds: string[];
  splitMethod: SplitMethod;
  customAmounts: Record<string, string>;
  percentageShares: Record<string, string>;
  unitShares: Record<string, string>;
  receiptFileName?: string;
  receiptItems: SplitReceiptItem[];
  note: string;
}

export interface SplitCalculation {
  totalAmount: number;
  participantCount: number;
  allocations: SplitAllocation[];
  perPersonAmount: number;
  remainingAmount: number;
  isValid: boolean;
}
