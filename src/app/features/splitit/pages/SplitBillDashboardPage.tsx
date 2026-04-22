import { CheckCircle2, Clock3, Eye, ReceiptText, Send, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchSentRequests } from '../api';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitNotification, SplitRequest } from '../types';
import { formatCurrency, formatDate, getSplitMethodLabel, getTransactionById } from '../utils';

function getRequestProgress(request: SplitRequest) {
  const total = request.notifications.length;
  const viewed = request.notifications.filter((notification) => notification.status === 'viewed').length;
  const delivered = request.notifications.filter((notification) => notification.status === 'delivered').length;
  const queued = request.notifications.filter((notification) => notification.status === 'queued').length;
  const reached = viewed + delivered;
  const progress = total ? Math.round((reached / total) * 100) : 0;

  return {
    total,
    viewed,
    delivered,
    queued,
    reached,
    progress,
  };
}

function getRequestStatus(progress: ReturnType<typeof getRequestProgress>) {
  if (!progress.total) {
    return {
      label: 'Draft',
      tone: 'bg-slate-100 text-slate-600',
      helper: 'No participants yet',
    };
  }

  if (progress.viewed === progress.total) {
    return {
      label: 'Opened by all',
      tone: 'bg-emerald-100 text-emerald-700',
      helper: 'Everyone has seen the request',
    };
  }

  if (progress.reached > 0) {
    return {
      label: 'In progress',
      tone: 'bg-amber-100 text-amber-700',
      helper: `${progress.reached}/${progress.total} reached`,
    };
  }

  return {
    label: 'Sending',
    tone: 'bg-slate-100 text-slate-600',
    helper: 'Waiting for delivery',
  };
}

function getNotificationStatusUi(notification: SplitNotification) {
  if (notification.status === 'viewed') {
    return {
      label: 'Opened',
      tone: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (notification.status === 'delivered') {
    return {
      label: 'Delivered',
      tone: 'bg-sky-100 text-sky-700',
    };
  }

  return {
    label: 'Sending',
    tone: 'bg-slate-100 text-slate-600',
  };
}

export function SplitBillDashboardPage() {
  const { lastSentRequest, resetDraft } = useSplitIt();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SplitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

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

  const availableRequests = useMemo(() => {
    if (!lastSentRequest) {
      return requests;
    }

    const deduped = requests.filter((request) => request.id !== lastSentRequest.id);
    return [lastSentRequest, ...deduped];
  }, [lastSentRequest, requests]);

  useEffect(() => {
    if (!selectedRequestId && availableRequests.length) {
      setSelectedRequestId(availableRequests[0].id);
    }
  }, [availableRequests, selectedRequestId]);

  const selectedRequest = availableRequests.find((request) => request.id === selectedRequestId) ?? availableRequests[0];
  const summary = useMemo(() => {
    return availableRequests.reduce(
      (accumulator, request) => {
        const progress = getRequestProgress(request);
        accumulator.totalAmount += request.totalAmount;
        accumulator.totalBills += 1;
        accumulator.awaiting += progress.queued;
        accumulator.opened += progress.viewed;
        accumulator.reached += progress.reached;
        return accumulator;
      },
      {
        totalAmount: 0,
        totalBills: 0,
        awaiting: 0,
        opened: 0,
        reached: 0,
      }
    );
  }, [availableRequests]);

  return (
    <SplitItLayout
      title="Split bill dashboard"
      subtitle="Track all active split bills, see who already opened them, and monitor progress over time."
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/splitit/create')}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900"
          >
            New split bill
          </button>
          <button
            onClick={() => {
              resetDraft();
              navigate('/');
            }}
            className="rounded-2xl bg-[#2d4a6f] px-4 py-4 text-center text-sm font-semibold text-white"
          >
            Back home
          </button>
        </div>
      }
    >
      {loading ? (
        <SectionCard title="Loading dashboard">
          <div className="space-y-3">
            <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </SectionCard>
      ) : availableRequests.length ? (
        <>
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2 text-slate-500">
                <ReceiptText className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Active bills</p>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{summary.totalBills}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Users className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Opened</p>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{summary.opened}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock3 className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Waiting</p>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{summary.awaiting}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Send className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Total sent</p>
              </div>
              <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-900">
                {formatCurrency(summary.totalAmount, availableRequests[0].currency)}
              </p>
            </div>
          </section>

          <SectionCard title="All split bills" description="Choose one request to inspect its progress and participant activity.">
            <div className="space-y-3">
              {availableRequests.map((request) => {
                const progress = getRequestProgress(request);
                const status = getRequestStatus(progress);
                const transaction = getTransactionById(request.transactionId);
                const isSelected = selectedRequest?.id === request.id;

                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                      isSelected ? 'border-[#173b63] bg-[#eef4f9]' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{transaction?.merchant ?? 'Manual split bill'}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(request.createdAt)} • {getSplitMethodLabel(request.splitMethod)}
                        </p>
                      </div>
                      <p className="text-right text-base font-semibold text-slate-900">
                        {formatCurrency(request.totalAmount, request.currency)}
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{status.helper}</span>
                        <span>{progress.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-[#173b63] transition-all"
                          style={{ width: `${Math.max(progress.progress, progress.total ? 12 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {selectedRequest ? (
            <SectionCard title="Request details" description="A clearer view of who already received or opened this split bill.">
              {(() => {
                const progress = getRequestProgress(selectedRequest);
                const transaction = getTransactionById(selectedRequest.transactionId);
                const status = getRequestStatus(progress);

                return (
                  <div className="space-y-4">
                    <div className="rounded-[24px] bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-slate-900">{transaction?.merchant ?? 'Manual split bill'}</p>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(selectedRequest.createdAt)}</p>
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency(selectedRequest.totalAmount, selectedRequest.currency)}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-white px-3 py-3 text-center">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Participants</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{progress.total}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3 text-center">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Reached</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{progress.reached}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3 text-center">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Opened</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{progress.viewed}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                          {getSplitMethodLabel(selectedRequest.splitMethod)}
                        </span>
                        {selectedRequest.receiptFileName ? (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                            Receipt attached
                          </span>
                        ) : null}
                        {selectedRequest.note ? (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                            Note added
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedRequest.notifications.map((notification) => {
                        const notificationStatus = getNotificationStatusUi(notification);

                        return (
                          <div key={notification.id} className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">{notification.participantName}</p>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${notificationStatus.tone}`}>
                                    {notificationStatus.label}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{notification.accountId}</p>
                              </div>
                              <p className="pl-3 text-base font-semibold text-slate-900">
                                {formatCurrency(notification.amount, notification.currency)}
                              </p>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
                              <span>{notification.channel === 'push' ? 'Push notification' : 'In-app notification'}</span>
                              <span>{notification.status === 'viewed' ? <Eye className="h-4 w-4" /> : null}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </SectionCard>
          ) : null}
        </>
      ) : (
        <SectionCard title="No split bills yet">
          <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-10 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-900">Nothing to track yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Once you send a split bill, this page will show the request list, participant activity, and progress.
            </p>
            <button
              onClick={() => navigate('/splitit/create')}
              className="mt-5 rounded-2xl bg-[#2d4a6f] px-4 py-3 text-sm font-semibold text-white"
            >
              Create split bill
            </button>
          </div>
        </SectionCard>
      )}
    </SplitItLayout>
  );
}
