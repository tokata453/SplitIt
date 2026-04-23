import { splitItCurrentUser, splitItTransactions, splitItUsers } from './mockData';
import { SplitCalculation, SplitCurrency, SplitDraft, SplitItTransaction, SplitItUser, SplitReceiptItem } from './types';

const splitMethodLabels = {
  equal: 'Equal split',
  amount: 'By amount',
  percentage: 'By percentage',
  shares: 'By items',
} as const;

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

export function getSplitMembers(draft: SplitDraft) {
  const participants = getUsersByIds(draft.participantIds);
  return draft.includeOwner ? [splitItCurrentUser, ...participants] : participants;
}

export function getSplitMemberName(user: SplitItUser) {
  return user.id === splitItCurrentUser.id ? 'You' : user.name;
}

export function getDraftAmount(draft: SplitDraft, transaction?: SplitItTransaction) {
  return parseAmount(draft.amountInput) || transaction?.amount || 0;
}

export function getSplitMethodLabel(method: SplitDraft['splitMethod']) {
  return splitMethodLabels[method];
}

function roundCurrencyAmount(amount: number) {
  return Number(amount.toFixed(2));
}

export function buildMockReceiptItems(totalAmount: number): SplitReceiptItem[] {
  const safeTotal = roundCurrencyAmount(totalAmount);
  if (safeTotal <= 0) {
    return [];
  }

  const labels = ['Main course', 'Shared drink', 'Side order', 'Dessert'];
  const weights = [0.4, 0.22, 0.2, 0.18];

  return labels.map((label, index) => {
    const amount = index === labels.length - 1
      ? roundCurrencyAmount(safeTotal - labels.slice(0, index).reduce((sum, _, priorIndex) => {
          return sum + roundCurrencyAmount(safeTotal * weights[priorIndex]);
        }, 0))
      : roundCurrencyAmount(safeTotal * weights[index]);

    return {
      id: `receipt-item-${index + 1}`,
      label,
      amount,
      assignedParticipantIds: [],
    };
  });
}

export function buildSplitCalculation(draft: SplitDraft): SplitCalculation {
  const transaction = getTransactionById(draft.selectedTransactionId);
  const totalAmount = getDraftAmount(draft, transaction);
  const members = getSplitMembers(draft);
  const participantCount = members.length;

  if (!participantCount || totalAmount <= 0) {
    return {
      totalAmount,
      participantCount,
      allocations: members.map((member) => ({
        participantId: member.id,
        amount: 0,
      })),
      perPersonAmount: 0,
      remainingAmount: totalAmount,
      isValid: false,
    };
  }

  if (draft.splitMethod === 'equal') {
    const perPersonAmount = roundCurrencyAmount(totalAmount / participantCount);
    const allocations = members.map((member, index) => {
      const amount = index === members.length - 1
        ? roundCurrencyAmount(totalAmount - perPersonAmount * index)
        : perPersonAmount;

      return {
        participantId: member.id,
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

  if (draft.splitMethod === 'amount') {
    const allocations = members.map((member) => ({
      participantId: member.id,
      amount: roundCurrencyAmount(parseAmount(draft.customAmounts?.[member.id] ?? '0')),
    }));
    const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const remainingAmount = roundCurrencyAmount(totalAmount - allocatedTotal);

    return {
      totalAmount,
      participantCount,
      allocations,
      perPersonAmount: participantCount ? roundCurrencyAmount(allocatedTotal / participantCount) : 0,
      remainingAmount,
      isValid: remainingAmount === 0 && allocations.every((allocation) => allocation.amount > 0),
    };
  }

  if (draft.splitMethod === 'percentage') {
    const rawPercentages = members.map((member) => parseAmount(draft.percentageShares?.[member.id] ?? '0'));
    const totalPercentage = rawPercentages.reduce((sum, value) => sum + value, 0);
    const allocations = members.map((member, index) => {
      const percentage = rawPercentages[index];
      const amount = index === members.length - 1
        ? roundCurrencyAmount(totalAmount - members.slice(0, index).reduce((sum, _, priorIndex) => {
            return sum + roundCurrencyAmount(totalAmount * (rawPercentages[priorIndex] / 100));
          }, 0))
        : roundCurrencyAmount(totalAmount * (percentage / 100));

      return {
        participantId: member.id,
        amount: percentage > 0 ? amount : 0,
      };
    });
    const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const remainingAmount = roundCurrencyAmount(totalAmount - allocatedTotal);

    return {
      totalAmount,
      participantCount,
      allocations,
      perPersonAmount: participantCount ? roundCurrencyAmount(allocatedTotal / participantCount) : 0,
      remainingAmount: roundCurrencyAmount(100 - totalPercentage),
      isValid: roundCurrencyAmount(totalPercentage) === 100 && remainingAmount === 0 && rawPercentages.every((value) => value > 0),
    };
  }

  const allocationsMap = new Map(members.map((member) => [member.id, 0]));
  let remainingAmount = 0;

  draft.receiptItems.forEach((item) => {
    if (!item.assignedParticipantIds.length) {
      remainingAmount += item.amount;
      return;
    }

    const perParticipantAmount = roundCurrencyAmount(item.amount / item.assignedParticipantIds.length);

    item.assignedParticipantIds.forEach((participantId, index) => {
      const amount = index === item.assignedParticipantIds.length - 1
        ? roundCurrencyAmount(item.amount - perParticipantAmount * index)
        : perParticipantAmount;
      allocationsMap.set(participantId, roundCurrencyAmount((allocationsMap.get(participantId) ?? 0) + amount));
    });
  });

  const allocations = members.map((member) => ({
    participantId: member.id,
    amount: allocationsMap.get(member.id) ?? 0,
  }));
  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const receiptItemsTotal = roundCurrencyAmount(draft.receiptItems.reduce((sum, item) => sum + item.amount, 0));
  remainingAmount = roundCurrencyAmount(remainingAmount);

  return {
    totalAmount,
    participantCount,
    allocations,
    perPersonAmount: participantCount ? roundCurrencyAmount(allocatedTotal / participantCount) : 0,
    remainingAmount,
    isValid: Boolean(draft.receiptFileName) && draft.receiptItems.length > 0 && receiptItemsTotal === totalAmount && remainingAmount === 0,
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

  if (!participants.length && !draft.phoneInvites.length) {
    return 'Add at least one participant or phone invite to send this split request.';
  }

  if (draft.splitMethod === 'amount' && !calculation.isValid) {
    return calculation.remainingAmount > 0
      ? `Allocate the remaining ${formatCurrency(calculation.remainingAmount, draft.currency)} before sending.`
      : 'Amounts must match the total exactly.';
  }

  if (draft.splitMethod === 'percentage' && !calculation.isValid) {
    return `Percentages must add up to 100%.`;
  }

  if (draft.splitMethod === 'shares' && !calculation.isValid) {
    if (!draft.receiptFileName) {
      return 'Attach a receipt before using item split.';
    }

    if (!draft.receiptItems.length) {
      return 'No receipt items were extracted yet.';
    }

    if (draft.receiptItems.some((item) => item.assignedParticipantIds.length === 0)) {
      return 'Assign every receipt item before sending.';
    }

    return 'Receipt item total must match the bill total.';
  }

  return '';
}
