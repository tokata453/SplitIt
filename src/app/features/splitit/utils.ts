import { splitItTransactions, splitItUsers } from './mockData';
import { SplitCalculation, SplitCurrency, SplitDraft, SplitItTransaction, SplitItUser } from './types';

export function formatCurrency(amount: number, currency: SplitCurrency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'KHR' ? 0 : 2,
    maximumFractionDigits: currency === 'KHR' ? 0 : 2,
  }).format(amount);
}

export function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

export function parseAmount(value: string) {
  const normalized = value.replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getTransactionById(transactionId?: string) {
  return splitItTransactions.find((transaction) => transaction.id === transactionId);
}

export function getUsersByIds(userIds: string[]) {
  return userIds
    .map((userId) => splitItUsers.find((user) => user.id === userId))
    .filter((user): user is SplitItUser => Boolean(user));
}

export function getDraftAmount(draft: SplitDraft, transaction?: SplitItTransaction) {
  return parseAmount(draft.amountInput) || transaction?.amount || 0;
}

export function buildSplitCalculation(draft: SplitDraft): SplitCalculation {
  const transaction = getTransactionById(draft.selectedTransactionId);
  const totalAmount = getDraftAmount(draft, transaction);
  const participants = getUsersByIds(draft.participantIds);
  const participantCount = participants.length;

  if (!participantCount || totalAmount <= 0) {
    return {
      totalAmount,
      participantCount,
      allocations: participants.map((participant) => ({
        participantId: participant.id,
        amount: 0,
      })),
      perPersonAmount: 0,
      remainingAmount: totalAmount,
      isValid: false,
    };
  }

  if (draft.splitMethod === 'equal') {
    const perPersonAmount = Number((totalAmount / participantCount).toFixed(2));
    const allocations = participants.map((participant, index) => {
      const amount = index === participants.length - 1
        ? Number((totalAmount - perPersonAmount * index).toFixed(2))
        : perPersonAmount;

      return {
        participantId: participant.id,
        amount,
      };
    });

    return {
      totalAmount,
      participantCount,
      allocations,
      perPersonAmount,
      remainingAmount: 0,
      isValid: true,
    };
  }

  const allocations = participants.map((participant) => ({
    participantId: participant.id,
    amount: Number((parseAmount(draft.customAmounts[participant.id] ?? '0')).toFixed(2)),
  }));
  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const remainingAmount = Number((totalAmount - allocatedTotal).toFixed(2));

  return {
    totalAmount,
    participantCount,
    allocations,
    perPersonAmount: participantCount ? Number((allocatedTotal / participantCount).toFixed(2)) : 0,
    remainingAmount,
    isValid: remainingAmount === 0 && allocations.every((allocation) => allocation.amount > 0),
  };
}

export function validateDraft(draft: SplitDraft) {
  const transaction = getTransactionById(draft.selectedTransactionId);
  const totalAmount = getDraftAmount(draft, transaction);
  const participants = getUsersByIds(draft.participantIds);
  const calculation = buildSplitCalculation(draft);

  if (totalAmount <= 0) {
    return `Enter an amount greater than ${formatCurrency(0, draft.currency)}.`;
  }

  if (!participants.length) {
    return 'Add at least one participant.';
  }

  if (draft.splitMethod === 'custom' && !calculation.isValid) {
    return calculation.remainingAmount > 0
      ? `Allocate the remaining ${formatCurrency(calculation.remainingAmount, draft.currency)} before sending.`
      : 'Custom amounts must match the total exactly.';
  }

  return '';
}
