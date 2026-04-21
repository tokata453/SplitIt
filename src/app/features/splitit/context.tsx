import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { clearDraft, getPreviousSplitParticipantIds, loadDraft, saveDraft } from './api';
import { splitItDefaultDraft } from './mockData';
import { SplitDraft, SplitRequest } from './types';
import { buildSplitCalculation, getTransactionById } from './utils';

interface SplitItContextValue {
  draft: SplitDraft;
  lastSentRequest: SplitRequest | null;
    calculation: ReturnType<typeof buildSplitCalculation>;
    selectedTransactionTitle: string;
    setAmountInput: (value: string) => void;
    setCurrency: (currency: SplitDraft['currency']) => void;
    selectTransaction: (transactionId?: string) => void;
  toggleParticipant: (participantId: string) => void;
  setSplitMethod: (method: SplitDraft['splitMethod']) => void;
  setCustomAmount: (participantId: string, amount: string) => void;
  setReceiptFileName: (fileName?: string) => void;
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

  useEffect(() => {
    void saveDraft(draft);
  }, [draft]);

  const calculation = useMemo(() => buildSplitCalculation(draft), [draft]);
  const transaction = getTransactionById(draft.selectedTransactionId);
  const selectedTransactionTitle = transaction ? transaction.merchant : 'Manual entry';

  const value: SplitItContextValue = {
    draft,
    lastSentRequest,
    calculation,
    selectedTransactionTitle,
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
    toggleParticipant: (participantId) => {
      setDraft((currentDraft) => {
        const exists = currentDraft.participantIds.includes(participantId);
        const participantIds = exists
          ? currentDraft.participantIds.filter((id) => id !== participantId)
          : [...currentDraft.participantIds, participantId];
        const customAmounts = { ...currentDraft.customAmounts };

        if (exists) {
          delete customAmounts[participantId];
        }

        return {
          ...currentDraft,
          participantIds,
          customAmounts,
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
    setReceiptFileName: (fileName) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        receiptFileName: fileName,
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
