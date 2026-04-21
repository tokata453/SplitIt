import { BellRing, CheckCircle2, Clock3, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchSentRequests } from '../api';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitRequest } from '../types';
import { formatCurrency, formatDate } from '../utils';

const notificationMeta = {
  queued: {
    icon: Clock3,
    label: 'Queued',
    tone: 'bg-amber-50 text-amber-700',
  },
  delivered: {
    icon: BellRing,
    label: 'Delivered',
    tone: 'bg-sky-50 text-sky-700',
  },
  viewed: {
    icon: Eye,
    label: 'Viewed',
    tone: 'bg-emerald-50 text-emerald-700',
  },
};

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
  const deliveredCount = activeRequest?.notifications.filter((notification) => notification.status === 'delivered').length ?? 0;
  const viewedCount = activeRequest?.notifications.filter((notification) => notification.status === 'viewed').length ?? 0;
  const queuedCount = activeRequest?.notifications.filter((notification) => notification.status === 'queued').length ?? 0;

  return (
    <SplitItLayout
      title="Requests sent"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              resetDraft();
              navigate('/splitit/create');
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900"
          >
            Start another split
          </button>
          <button
            onClick={() => navigate('/')}
            className="rounded-2xl bg-[#2d4a6f] px-4 py-4 text-center text-sm font-semibold text-white"
          >
            Done
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
          <SectionCard title="Requests sent">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Request sent successfully.
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Viewed</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{viewedCount}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Delivered</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{deliveredCount}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Queued</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{queuedCount}</p>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                    {formatCurrency(activeRequest.totalAmount, activeRequest.currency)}
                  </p>
                </div>
                <p className="text-sm text-slate-500">{formatDate(activeRequest.createdAt)}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Participants">
            <div className="space-y-3">
              {activeRequest.notifications.map((notification) => {
                const meta = notificationMeta[notification.status];
                const Icon = meta.icon;

                return (
                  <div key={notification.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{notification.participantName}</p>
                        <p className="mt-1 text-sm text-slate-500">{notification.accountId}</p>
                      </div>
                      <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </div>
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
            <p className="mt-1 text-sm text-slate-500">Send a split request to see delivery and view states here.</p>
          </div>
        </SectionCard>
      )}
    </SplitItLayout>
  );
}
