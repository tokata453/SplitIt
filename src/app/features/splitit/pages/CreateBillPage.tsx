import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { useNavigate } from 'react-router';
import { fetchTransactionHistory } from '../api';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitItTransaction } from '../types';
import { formatCurrency, formatDate } from '../utils';

export function CreateBillPage() {
  const navigate = useNavigate();
  const { draft, calculation, setAmountInput, setCurrency, selectTransaction } = useSplitIt();
  const [transactions, setTransactions] = useState<SplitItTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const amountValidationMessage = calculation.totalAmount <= 0 ? `Enter an amount greater than ${formatCurrency(0, draft.currency)}.` : '';
  const suggestedTransactionId = transactions[0]?.id;

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      const response = await fetchTransactionHistory();
      if (!cancelled) {
        setTransactions(response);
        setLoadingTransactions(false);
      }
    };

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SplitItLayout
      title="Create bill"
      subtitle="Enter an amount or pick a recent transaction. Equal split stays as the default."
      footer={
        <button
          onClick={() => navigate('/splitit/participants')}
          disabled={Boolean(amountValidationMessage)}
          className="w-full rounded-xl bg-[#2d4a6f] px-4 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Continue
        </button>
      }
    >
      <SectionCard title="Bill amount">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              id="bill-amount"
              inputMode="decimal"
              value={draft.amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0.00"
              className="h-14 w-full bg-transparent px-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900 outline-none"
            />
            <div className="flex rounded-xl bg-white p-1">
              {(['USD', 'KHR'] as const).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => setCurrency(currency)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    draft.currency === currency ? 'bg-[#2d4a6f] text-white' : 'text-slate-500'
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Transaction history" description="Choose a recent payment to auto-fill the amount.">
        {loadingTransactions ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : transactions.length ? (
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {transactions.map((transaction) => (
              (() => {
                const isSelected = draft.selectedTransactionId === transaction.id;
                const isSuggested = suggestedTransactionId === transaction.id;

                return (
              <button
                key={transaction.id}
                onClick={() => selectTransaction(transaction.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left ${
                  isSelected
                    ? 'border-[#2d4a6f] bg-[#eef3f8]'
                    : isSuggested
                    ? 'border-[#b9cce0] bg-[#f4f8fb]'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{transaction.merchant}</p>
                      {isSuggested ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                          Suggested
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(transaction.postedAt)}</p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCurrency(transaction.amount, transaction.currency)}</p>
                </div>
              </button>
                );
              })()
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <History className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-900">No recent transactions</p>
            <p className="mt-1 text-sm text-slate-500">Manual amount entry is still available above.</p>
          </div>
        )}
      </SectionCard>

      {amountValidationMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {amountValidationMessage}
        </div>
      ) : null}
    </SplitItLayout>
  );
}
