export type InvitationMethod = 'invite' | 'qr';
export type SplitMethod = 'equal' | 'custom' | 'percentage' | 'shares' | 'itemized';
export type CustomAmountMode = 'from_total' | 'collect_exact';
export type BillingMode = 'one_time' | 'recurring';
export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
export type AssignmentState = Record<string, Record<string, number>>;

export interface DraftContact {
  id: string;
  name: string;
  phone: string;
}

export interface DraftInvoiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface DraftSplitMember {
  id: string;
  name: string;
  amount: number;
  items: string[];
  percentage: number;
  shareUnits: number;
}

export interface SplitItDraft {
  groupName?: string;
  members?: DraftContact[];
  invitationMethod?: InvitationMethod;
  billingMode?: BillingMode;
  billingFrequency?: BillingFrequency;
  billingStartDate?: string;
  billingRule?: string;
  ownerPays?: boolean;
  items?: DraftInvoiceItem[];
  totalAmount?: number;
  splitMethod?: SplitMethod;
  customAmountMode?: CustomAmountMode;
  splitMembers?: DraftSplitMember[];
  assignments?: AssignmentState;
}

const SPLITIT_DRAFT_KEY = 'splitit-create-draft';

export function loadSplitItDraft(): SplitItDraft | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawDraft = window.localStorage.getItem(SPLITIT_DRAFT_KEY);
    return rawDraft ? (JSON.parse(rawDraft) as SplitItDraft) : null;
  } catch {
    return null;
  }
}

export function saveSplitItDraft(nextDraft: SplitItDraft) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPLITIT_DRAFT_KEY, JSON.stringify(nextDraft));
}

export function clearSplitItDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SPLITIT_DRAFT_KEY);
}
