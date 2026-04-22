import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchSentRequests } from '../api';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitRequest } from '../types';
import { formatCurrency, formatDate, getSplitMethodLabel } from '../utils';

export function ParticipantRequestPage() {
  const { lastSentRequest, resetDraft } = useSplitIt();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SplitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      const response = await fetchSentRequests();
      if (!cancelled) {
        setRequests(response);
        setLoading(false);
      }
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeRequest = lastSentRequest ?? requests[0];
  const participantCount = activeRequest?.notifications.length ?? 0;

  return (
    <SplitItLayout
      title="Requests sent"
      subtitle="Your split request has been delivered to participants."
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/splitit/dashboard')}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900"
          >
            View dashboard
          </button>
          <button
            onClick={() => {
              resetDraft();
              navigate('/splitit/create');
            }}
            className="rounded-2xl bg-[#2d4a6f] px-4 py-4 text-center text-sm font-semibold text-white"
          >
            Start another split
          </button>
        </div>
      }
    >
      {loading ? (
        <SectionCard title="Requests sent">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        </SectionCard>
      ) : activeRequest ? (
        <>
          <section className="overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
            <div className="bg-[linear-gradient(180deg,#f2fbf7_0%,#ffffff_100%)] px-5 py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600">Success</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Request sent successfully</h2>
                <p className="mt-2 text-sm text-slate-500">{formatDate(activeRequest.createdAt)}</p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Total amount</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {formatCurrency(activeRequest.totalAmount, activeRequest.currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 text-center ring-1 ring-slate-200">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Split method</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {getSplitMethodLabel(activeRequest.splitMethod)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 text-center ring-1 ring-slate-200">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Participants notified</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{participantCount}</p>
                </div>
              </div>
            </div>
          </section>

          <SectionCard title="Participants">
            <div className="space-y-3">
              {activeRequest.notifications.map((notification) => {
                return (
                  <div key={notification.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{notification.participantName}</p>
                      <p className="mt-1 text-sm text-slate-500">{notification.accountId}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-900">{formatCurrency(notification.amount, notification.currency)}</span>
                      <span className="text-slate-500">{formatDate(notification.sentAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      ) : (
        <SectionCard title="No sent requests yet">
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="font-medium text-slate-900">Your notification timeline is empty.</p>
            <p className="mt-1 text-sm text-slate-500">Send a split request to see it here.</p>
          </div>
        </SectionCard>
      )}
    </SplitItLayout>
  );
}
