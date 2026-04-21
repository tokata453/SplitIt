import { useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { fetchTransactionHistory } from '../api';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitItTransaction } from '../types';
import { formatCurrency, formatDate } from '../utils';

export function TransactionHistoryPage() {
  const navigate = useNavigate();
  const { draft, selectTransaction } = useSplitIt();
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<SplitItTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      setLoading(true);
      const response = await fetchTransactionHistory(search);
      if (!cancelled) {
        setTransactions(response);
        setLoading(false);
      }
    };

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <SplitItLayout title="Choose a transaction" subtitle="Selecting one auto-fills the amount and can pre-suggest participants from payment history.">
      <SectionCard title="Search history">
        <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Merchant, category, or amount"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </SectionCard>

      <SectionCard title="Recent transactions" description="Tap a transaction to use it for SplitIt.">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-[22px] bg-slate-100" />
            ))}
          </div>
        ) : transactions.length ? (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <button
                key={transaction.id}
                onClick={() => {
                  selectTransaction(transaction.id);
                  navigate('/splitit/create');
                }}
                className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                  draft.selectedTransactionId === transaction.id
                    ? 'border-[#0f3d57] bg-[#eaf4f8]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{transaction.merchant}</p>
                    <p className="mt-1 text-sm text-slate-500">{transaction.category} • {formatDate(transaction.postedAt)}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Suggested participants: {transaction.participantsHint.length || 'None'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(transaction.amount, transaction.currency)}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.receiptAvailable ? 'Receipt available' : 'No receipt'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-8 text-center">
            <History className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-900">No transactions found</p>
            <p className="mt-1 text-sm text-slate-500">Try another search term or continue with manual amount entry.</p>
          </div>
        )}
      </SectionCard>
    </SplitItLayout>
  );
}
