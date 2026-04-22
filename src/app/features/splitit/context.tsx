import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { clearDraft, getPreviousSplitParticipantIds, loadDraft, saveDraft } from './api';
import { splitItDefaultDraft } from './mockData';
import { SplitDraft, SplitReceiptItem, SplitRequest } from './types';
import { buildSplitCalculation, getTransactionById } from './utils';

interface SplitItContextValue {
  draft: SplitDraft;
  lastSentRequest: SplitRequest | null;
  calculation: ReturnType<typeof buildSplitCalculation>;
  selectedTransactionTitle: string;
  receiptPreviewUrl: string | null;
  receiptPreviewType: string;
  setAmountInput: (value: string) => void;
  setCurrency: (currency: SplitDraft['currency']) => void;
  selectTransaction: (transactionId?: string) => void;
  setIncludeOwner: (includeOwner: boolean) => void;
  toggleParticipant: (participantId: string) => void;
  setSplitMethod: (method: SplitDraft['splitMethod']) => void;
  setCustomAmount: (participantId: string, amount: string) => void;
  setPercentageShare: (participantId: string, amount: string) => void;
  setUnitShare: (participantId: string, amount: string) => void;
  setReceiptFileName: (fileName?: string) => void;
  setReceiptPreview: (url: string | null, type?: string) => void;
  clearReceiptPreview: () => void;
  setReceiptItems: (items: SplitReceiptItem[]) => void;
  toggleReceiptItemParticipant: (itemId: string, participantId: string) => void;
  setNote: (note: string) => void;
  setLastSentRequest: (request: SplitRequest | null) => void;
  resetDraft: () => void;
}

const SplitItContext = createContext<SplitItContextValue | null>(null);

function buildDraftWithPreviousParticipants(baseDraft: SplitDraft) {
  if (baseDraft.participantIds.length) {
    return baseDraft;
  }

  const previousParticipantIds = getPreviousSplitParticipantIds();

  return previousParticipantIds.length
    ? {
        ...baseDraft,
        participantIds: previousParticipantIds,
      }
    : baseDraft;
}

export function SplitItProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SplitDraft>(() => buildDraftWithPreviousParticipants(loadDraft(splitItDefaultDraft)));
  const [lastSentRequest, setLastSentRequest] = useState<SplitRequest | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewType, setReceiptPreviewType] = useState('');

  useEffect(() => {
    void saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  const calculation = useMemo(() => buildSplitCalculation(draft), [draft]);
  const transaction = getTransactionById(draft.selectedTransactionId);
  const selectedTransactionTitle = transaction ? transaction.merchant : 'Manual entry';

  const value: SplitItContextValue = {
    draft,
    lastSentRequest,
    calculation,
    selectedTransactionTitle,
    receiptPreviewUrl,
    receiptPreviewType,
    setAmountInput: (value) => {
      setDraft((currentDraft) => {
        const selectedTransaction = getTransactionById(currentDraft.selectedTransactionId);
        const isManualOverride = Boolean(selectedTransaction) && value !== selectedTransaction.amount.toFixed(2);

        return {
          ...currentDraft,
          amountInput: value,
          selectedTransactionId: isManualOverride ? undefined : currentDraft.selectedTransactionId,
        };
      });
    },
    setCurrency: (currency) => {
      setDraft((currentDraft) => {
        const selectedTransaction = getTransactionById(currentDraft.selectedTransactionId);

        return {
          ...currentDraft,
          currency,
          selectedTransactionId: selectedTransaction?.currency === currency ? currentDraft.selectedTransactionId : undefined,
        };
      });
    },
    selectTransaction: (transactionId) => {
      const transactionChoice = getTransactionById(transactionId);

      setDraft((currentDraft) => ({
        ...currentDraft,
        selectedTransactionId: transactionId,
        amountInput: transactionChoice ? transactionChoice.amount.toFixed(2) : currentDraft.amountInput,
        currency: transactionChoice?.currency ?? currentDraft.currency,
      }));
    },
    setIncludeOwner: (includeOwner) => {
      setDraft((currentDraft) => {
        if (includeOwner) {
          return {
            ...currentDraft,
            includeOwner: true,
          };
        }

        const customAmounts = { ...currentDraft.customAmounts };
        const percentageShares = { ...currentDraft.percentageShares };
        const unitShares = { ...currentDraft.unitShares };

        delete customAmounts.me;
        delete percentageShares.me;
        delete unitShares.me;

        return {
          ...currentDraft,
          includeOwner: false,
          customAmounts,
          percentageShares,
          unitShares,
          receiptItems: currentDraft.receiptItems.map((item) => ({
            ...item,
            assignedParticipantIds: item.assignedParticipantIds.filter((participantId) => participantId !== 'me'),
          })),
        };
      });
    },
    toggleParticipant: (participantId) => {
      setDraft((currentDraft) => {
        const exists = currentDraft.participantIds.includes(participantId);
        const participantIds = exists
          ? currentDraft.participantIds.filter((id) => id !== participantId)
          : [...currentDraft.participantIds, participantId];
        const customAmounts = { ...currentDraft.customAmounts };
        const percentageShares = { ...currentDraft.percentageShares };
        const unitShares = { ...currentDraft.unitShares };
        const receiptItems = currentDraft.receiptItems.map((item) => ({
          ...item,
          assignedParticipantIds: exists
            ? item.assignedParticipantIds.filter((id) => id !== participantId)
            : item.assignedParticipantIds,
        }));

        if (exists) {
          delete customAmounts[participantId];
          delete percentageShares[participantId];
          delete unitShares[participantId];
        }

        return {
          ...currentDraft,
          participantIds,
          customAmounts,
          percentageShares,
          unitShares,
          receiptItems,
        };
      });
    },
    setSplitMethod: (method) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        splitMethod: method,
      }));
    },
    setCustomAmount: (participantId, amount) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        customAmounts: {
          ...currentDraft.customAmounts,
          [participantId]: amount,
        },
      }));
    },
    setPercentageShare: (participantId, amount) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        percentageShares: {
          ...currentDraft.percentageShares,
          [participantId]: amount,
        },
      }));
    },
    setUnitShare: (participantId, amount) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        unitShares: {
          ...currentDraft.unitShares,
          [participantId]: amount,
        },
      }));
    },
    setReceiptFileName: (fileName) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        receiptFileName: fileName,
      }));
    },
    setReceiptPreview: (url, type = '') => {
      setReceiptPreviewUrl((currentUrl) => {
        if (currentUrl && currentUrl !== url) {
          URL.revokeObjectURL(currentUrl);
        }
        return url;
      });
      setReceiptPreviewType(type);
    },
    clearReceiptPreview: () => {
      setReceiptPreviewUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
      setReceiptPreviewType('');
    },
    setReceiptItems: (items) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        receiptItems: items,
      }));
    },
    toggleReceiptItemParticipant: (itemId, participantId) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        receiptItems: currentDraft.receiptItems.map((item) => (
          item.id !== itemId
            ? item
            : {
                ...item,
                assignedParticipantIds: item.assignedParticipantIds.includes(participantId)
                  ? item.assignedParticipantIds.filter((id) => id !== participantId)
                  : [...item.assignedParticipantIds, participantId],
              }
        )),
      }));
    },
    setNote: (note) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        note,
      }));
    },
    setLastSentRequest,
    resetDraft: () => {
      clearDraft();
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
      setReceiptPreviewUrl(null);
      setReceiptPreviewType('');
      setDraft(buildDraftWithPreviousParticipants(splitItDefaultDraft));
      setLastSentRequest(null);
    },
  };

  return <SplitItContext.Provider value={value}>{children}</SplitItContext.Provider>;
}

export function useSplitIt() {
  const context = useContext(SplitItContext);

  if (!context) {
    throw new Error('useSplitIt must be used within SplitItProvider');
  }

  return context;
}
