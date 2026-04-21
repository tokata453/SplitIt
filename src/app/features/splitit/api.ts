import { splitItCurrentUser, splitItTransactions, splitItUsers } from './mockData';
import { SplitDraft, SplitItTransaction, SplitItUser, SplitNotification, SplitRequest } from './types';
import { buildSplitCalculation, getTransactionById, getUsersByIds } from './utils';

const DRAFT_STORAGE_KEY = 'splitit-mvp-draft';
const REQUESTS_STORAGE_KEY = 'splitit-mvp-requests';
const NETWORK_DELAY_MS = 320;

function wait(duration = NETWORK_DELAY_MS) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function readJson<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export async function fetchTransactionHistory(search = '') {
  await wait();

  const query = search.trim().toLowerCase();
  const matches = !query
    ? splitItTransactions
    : splitItTransactions.filter((transaction) =>
        [transaction.merchant, transaction.category, transaction.amount.toString()].some((value) =>
          value.toLowerCase().includes(query)
        )
      );

  return matches;
}

export async function fetchParticipantSuggestions() {
  await wait();
  return [...splitItUsers].sort((left, right) => right.recentTransferCount - left.recentTransferCount).slice(0, 8);
}

export async function searchParticipants(search: string) {
  await wait();

  const query = search.trim().toLowerCase();
  if (!query) {
    return [];
  }

  return splitItUsers.filter((user) =>
    [user.name, user.accountId, user.phone].some((value) => value.toLowerCase().includes(query))
  );
}

export async function findParticipantByQrPayload(payload: string) {
  await wait(220);

  const normalized = payload.trim().toLowerCase();
  return splitItUsers.find((user) => user.accountId.toLowerCase() === normalized) ?? null;
}

export async function saveDraft(draft: SplitDraft) {
  await wait(50);
  writeJson(DRAFT_STORAGE_KEY, draft);
  return draft;
}

function normalizeDraft(draft: Partial<SplitDraft> | null | undefined, initialDraft: SplitDraft): SplitDraft {
  return {
    ...initialDraft,
    ...draft,
    participantIds: draft?.participantIds ?? initialDraft.participantIds,
    customAmounts: {
      ...initialDraft.customAmounts,
      ...(draft?.customAmounts ?? {}),
    },
    percentageShares: {
      ...initialDraft.percentageShares,
      ...(draft?.percentageShares ?? {}),
    },
    unitShares: {
      ...initialDraft.unitShares,
      ...(draft?.unitShares ?? {}),
    },
    receiptItems: draft?.receiptItems ?? initialDraft.receiptItems,
  };
}

export function loadDraft(initialDraft: SplitDraft) {
  const storedDraft = readJson<Partial<SplitDraft> | null>(DRAFT_STORAGE_KEY, null);
  return normalizeDraft(storedDraft, initialDraft);
}

export function getPreviousSplitParticipantIds() {
  const requests = readJson<SplitRequest[]>(REQUESTS_STORAGE_KEY, []);
  return requests[0]?.participantIds ?? [];
}

export function clearDraft() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export async function fetchSentRequests() {
  await wait(180);
  return readJson<SplitRequest[]>(REQUESTS_STORAGE_KEY, []);
}

export async function sendSplitRequest(draft: SplitDraft) {
  await wait(450);

  const calculation = buildSplitCalculation(draft);
  const participants = getUsersByIds(draft.participantIds);
  const transaction = getTransactionById(draft.selectedTransactionId);
  const now = new Date().toISOString();

  const notifications: SplitNotification[] = calculation.allocations.map((allocation, index) => {
    const participant = participants.find((user) => user.id === allocation.participantId) as SplitItUser;

    return {
      id: `notif-${Date.now()}-${participant.id}`,
      participantId: participant.id,
      participantName: participant.name,
      accountId: participant.accountId,
      amount: allocation.amount,
      currency: draft.currency,
      message: transaction
        ? `${splitItCurrentUser.name} requested your share for ${transaction.merchant}.`
        : `${splitItCurrentUser.name} sent you a SplitIt request.`,
      status: index === 0 ? 'viewed' : index === 1 ? 'delivered' : 'queued',
      channel: index % 2 === 0 ? 'push' : 'in_app',
      sentAt: now,
    };
  });

  const nextRequest: SplitRequest = {
    id: `split-${Date.now()}`,
    createdAt: now,
    requestedBy: splitItCurrentUser.id,
    totalAmount: calculation.totalAmount,
    currency: draft.currency,
    splitMethod: draft.splitMethod,
    participantIds: draft.participantIds,
    transactionId: draft.selectedTransactionId,
    receiptFileName: draft.receiptFileName,
    receiptItems: draft.receiptItems.length ? draft.receiptItems : undefined,
    note: draft.note.trim() || undefined,
    allocations: calculation.allocations,
    notifications,
  };

  const existingRequests = readJson<SplitRequest[]>(REQUESTS_STORAGE_KEY, []);
  writeJson(REQUESTS_STORAGE_KEY, [nextRequest, ...existingRequests]);

  return nextRequest;
}

export function getTransactionTitle(transaction?: SplitItTransaction) {
  return transaction ? `${transaction.merchant} • ${transaction.category}` : 'Manual amount entry';
}
