import { BellRing, CheckCircle2, Clock3, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
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

  return (
    <SplitItLayout
      title="Requests sent"
      subtitle="Participants receive a push or in-app request immediately after submission."
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={resetDraft}
            className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900"
          >
            Start another split
          </button>
          <Link
            to="/splitit/create"
            className="rounded-[22px] bg-[#0f3d57] px-4 py-4 text-center text-sm font-semibold text-white"
          >
            Reuse details
          </Link>
        </div>
      }
    >
      {loading ? (
        <SectionCard title="Latest split request">
          <div className="h-40 animate-pulse rounded-[22px] bg-slate-100" />
        </SectionCard>
      ) : activeRequest ? (
        <>
          <SectionCard title="Latest split request">
            <div className="rounded-[26px] bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Total requested</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{formatCurrency(activeRequest.totalAmount, activeRequest.currency)}</p>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-300">
                  {activeRequest.notifications.length} notifications
                </div>
              </div>
              <p className="mt-4 text-sm text-white/65">Created {formatDate(activeRequest.createdAt)}</p>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/6 px-3 py-3 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Split request submitted successfully.
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Participant notification view" description="Mock delivery states for the sent request.">
            <div className="space-y-3">
              {activeRequest.notifications.map((notification) => {
                const meta = notificationMeta[notification.status];
                const Icon = meta.icon;

                return (
                  <div key={notification.id} className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{notification.participantName}</p>
                        <p className="mt-1 text-sm text-slate-500">{notification.accountId}</p>
                        <p className="mt-3 text-sm text-slate-600">{notification.message}</p>
                      </div>
                      <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                      <span>{formatCurrency(notification.amount, notification.currency)}</span>
                      <span>{formatDate(notification.sentAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      ) : (
        <SectionCard title="No sent requests yet">
          <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="font-medium text-slate-900">Your notification timeline is empty.</p>
            <p className="mt-1 text-sm text-slate-500">Send a split request to see delivery and view states here.</p>
          </div>
        </SectionCard>
      )}
    </SplitItLayout>
  );
}
