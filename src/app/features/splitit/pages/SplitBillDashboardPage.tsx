import { BarChart3, ChevronDown, Clock3, ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchIncomingRequests, fetchSentRequests } from '../api';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { useSplitIt } from '../context';
import { SplitDashboardRole, SplitIncomingRequest, SplitIncomingStatus, SplitRequest } from '../types';
import { formatCurrency, formatDate, getSplitMethodLabel, getTransactionById } from '../utils';

type DashboardTimelineFilter = 'active' | 'history';
type DashboardRoleFilter = 'all' | 'owner' | 'participant';
type DashboardStatusFilter = 'all' | 'needs_action' | 'in_progress' | 'completed' | 'rejected';

type OwnerProgress = {
  total: number;
  viewed: number;
  delivered: number;
  queued: number;
  reached: number;
  progress: number;
};

type DashboardItem = {
  id: string;
  role: SplitDashboardRole;
  title: string;
  createdAt: string;
  currency: SplitRequest['currency'];
  splitMethod: SplitRequest['splitMethod'];
  statusLabel: string;
  statusTone: string;
  statusFilter: DashboardStatusFilter;
  timelineFilter: DashboardTimelineFilter;
  helper: string;
  amountLabel: string;
  note?: string;
  receiptFileName?: string;
  ownerRequest?: SplitRequest;
  incomingRequest?: SplitIncomingRequest;
};

function getOwnerProgress(request: SplitRequest): OwnerProgress {
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

function getIncomingStatusUi(status: SplitIncomingStatus) {
  if (status === 'rejected') {
    return {
      label: 'Rejected',
      tone: 'bg-rose-100 text-rose-700',
      helper: 'You rejected this bill',
      statusFilter: 'rejected' as DashboardStatusFilter,
      timelineFilter: 'history' as DashboardTimelineFilter,
    };
  }

  if (status === 'paid') {
    return {
      label: 'Paid',
      tone: 'bg-emerald-100 text-emerald-700',
      helper: 'Your share is completed',
      statusFilter: 'completed' as DashboardStatusFilter,
      timelineFilter: 'history' as DashboardTimelineFilter,
    };
  }

  if (status === 'payment_due') {
    return {
      label: 'Payment due',
      tone: 'bg-amber-100 text-amber-700',
      helper: 'Your share is ready for payment',
      statusFilter: 'needs_action' as DashboardStatusFilter,
      timelineFilter: 'active' as DashboardTimelineFilter,
    };
  }

  return {
    label: 'Review needed',
    tone: 'bg-sky-100 text-sky-700',
    helper: 'Check the split before payment',
    statusFilter: 'needs_action' as DashboardStatusFilter,
    timelineFilter: 'active' as DashboardTimelineFilter,
  };
}

function getOwnerStatusUi(progress: OwnerProgress) {
  if (!progress.total) {
    return {
      label: 'Draft',
      tone: 'bg-slate-100 text-slate-600',
      helper: 'No participants yet',
      statusFilter: 'needs_action' as DashboardStatusFilter,
      timelineFilter: 'active' as DashboardTimelineFilter,
    };
  }

  if (progress.viewed === progress.total) {
    return {
      label: 'Opened by all',
      tone: 'bg-emerald-100 text-emerald-700',
      helper: 'Everyone has seen the request',
      statusFilter: 'completed' as DashboardStatusFilter,
      timelineFilter: 'history' as DashboardTimelineFilter,
    };
  }

  if (progress.reached > 0) {
    return {
      label: 'In progress',
      tone: 'bg-amber-100 text-amber-700',
      helper: `${progress.reached}/${progress.total} participants reached`,
      statusFilter: 'in_progress' as DashboardStatusFilter,
      timelineFilter: 'active' as DashboardTimelineFilter,
    };
  }

  return {
    label: 'Sending',
    tone: 'bg-slate-100 text-slate-600',
    helper: 'Waiting for delivery',
    statusFilter: 'needs_action' as DashboardStatusFilter,
    timelineFilter: 'active' as DashboardTimelineFilter,
  };
}

function buildOwnerDashboardItem(request: SplitRequest): DashboardItem {
  const progress = getOwnerProgress(request);
  const status = getOwnerStatusUi(progress);
  const transaction = getTransactionById(request.transactionId);

  return {
    id: request.id,
    role: 'owner',
    title: transaction?.merchant ?? 'Manual split bill',
    createdAt: request.createdAt,
    currency: request.currency,
    splitMethod: request.splitMethod,
    statusLabel: status.label,
    statusTone: status.tone,
    statusFilter: status.statusFilter,
    timelineFilter: status.timelineFilter,
    helper: status.helper,
    amountLabel: formatCurrency(request.totalAmount, request.currency),
    note: request.note,
    receiptFileName: request.receiptFileName,
    ownerRequest: request,
  };
}

function buildIncomingDashboardItem(request: SplitIncomingRequest): DashboardItem {
  const status = getIncomingStatusUi(request.status);
  const transaction = getTransactionById(request.transactionId);

  return {
    id: request.id,
    role: 'participant',
    title: transaction?.merchant ?? `${request.ownerName}'s split bill`,
    createdAt: request.createdAt,
    currency: request.currency,
    splitMethod: request.splitMethod,
    statusLabel: status.label,
    statusTone: status.tone,
    statusFilter: status.statusFilter,
    timelineFilter: status.timelineFilter,
    helper: status.helper,
    amountLabel: formatCurrency(request.yourAmount, request.currency),
    note: request.note,
    receiptFileName: request.receiptFileName,
    incomingRequest: request,
  };
}

function isNeedsAttentionItem(item: DashboardItem) {
  if (item.incomingRequest) {
    return item.incomingRequest.status === 'payment_due' || item.incomingRequest.status === 'pending_review';
  }

  if (item.ownerRequest) {
    const progress = getOwnerProgress(item.ownerRequest);
    return progress.total === 0 || progress.viewed !== progress.total;
  }

  return false;
}

function getNotificationStatusLabel(status: SplitRequest['notifications'][number]['status']) {
  if (status === 'viewed') {
    return 'Opened';
  }

  if (status === 'delivered') {
    return 'Delivered';
  }

  return 'Queued';
}

function getPercentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function SplitBillDashboardPage() {
  const { lastSentRequest, resetDraft } = useSplitIt();
  const navigate = useNavigate();
  const [sentRequests, setSentRequests] = useState<SplitRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<SplitIncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState<DashboardTimelineFilter>('active');
  const [roleFilter, setRoleFilter] = useState<DashboardRoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const updateIncomingRequestStatus = (requestId: string, status: SplitIncomingStatus) => {
    setIncomingRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId ? { ...request, status } : request
      )
    );
  };

  const payIncomingRequest = (requestId: string) => {
    updateIncomingRequestStatus(requestId, 'paid');
  };

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      const [sentResponse, incomingResponse] = await Promise.all([
        fetchSentRequests(),
        fetchIncomingRequests(),
      ]);

      if (!cancelled) {
        setSentRequests(sentResponse);
        setIncomingRequests(incomingResponse);
        setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const ownerRequests = useMemo(() => {
    if (!lastSentRequest) {
      return sentRequests;
    }

    const deduped = sentRequests.filter((request) => request.id !== lastSentRequest.id);
    return [lastSentRequest, ...deduped];
  }, [lastSentRequest, sentRequests]);

  const dashboardItems = useMemo(() => {
    return [
      ...ownerRequests.map(buildOwnerDashboardItem),
      ...incomingRequests.map(buildIncomingDashboardItem),
    ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [incomingRequests, ownerRequests]);

  const filteredItems = useMemo(() => {
    return dashboardItems.filter((item) => {
      if (item.timelineFilter !== timelineFilter) {
        return false;
      }

      if (roleFilter !== 'all' && item.role !== roleFilter) {
        return false;
      }

      if (statusFilter !== 'all' && item.statusFilter !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [dashboardItems, roleFilter, statusFilter, timelineFilter]);

  const selectedItem = filteredItems.find((item) => item.id === selectedItemId)
    ?? dashboardItems.find((item) => item.id === selectedItemId)
    ?? filteredItems[0]
    ?? dashboardItems[0];

  const summary = useMemo(() => {
    return dashboardItems.reduce(
      (accumulator, item) => {
        accumulator.totalBills += 1;
        accumulator.needsAction += isNeedsAttentionItem(item) ? 1 : 0;
        accumulator.ownerBills += item.role === 'owner' ? 1 : 0;
        accumulator.participantBills += item.role === 'participant' ? 1 : 0;
        accumulator.activeBills += item.timelineFilter === 'active' ? 1 : 0;
        accumulator.historyBills += item.timelineFilter === 'history' ? 1 : 0;
        accumulator.inProgressBills += item.statusFilter === 'in_progress' ? 1 : 0;
        accumulator.completedBills += item.statusFilter === 'completed' ? 1 : 0;
        accumulator.rejectedBills += item.statusFilter === 'rejected' ? 1 : 0;

        if (item.ownerRequest) {
          const progress = getOwnerProgress(item.ownerRequest);

          accumulator.ownerTotalAmount += item.ownerRequest.totalAmount;
          accumulator.ownerParticipantCount += progress.total;
          accumulator.ownerReachedCount += progress.reached;
          accumulator.ownerOpenedCount += progress.viewed;
        }

        if (item.incomingRequest) {
          accumulator.participantTotalAmount += item.incomingRequest.yourAmount;

          if (item.incomingRequest.status === 'pending_review') {
            accumulator.pendingReviewBills += 1;
            accumulator.reviewAmount += item.incomingRequest.yourAmount;
          }

          if (item.incomingRequest.status === 'payment_due') {
            accumulator.paymentDueBills += 1;
            accumulator.readyToPayAmount += item.incomingRequest.yourAmount;
          }

          if (item.incomingRequest.status === 'paid') {
            accumulator.paidAmount += item.incomingRequest.yourAmount;
          }

          if (item.incomingRequest.status === 'rejected') {
            accumulator.rejectedAmount += item.incomingRequest.yourAmount;
          }
        }

        return accumulator;
      },
      {
        totalBills: 0,
        needsAction: 0,
        ownerBills: 0,
        participantBills: 0,
        activeBills: 0,
        historyBills: 0,
        inProgressBills: 0,
        completedBills: 0,
        rejectedBills: 0,
        pendingReviewBills: 0,
        paymentDueBills: 0,
        ownerParticipantCount: 0,
        ownerReachedCount: 0,
        ownerOpenedCount: 0,
        ownerTotalAmount: 0,
        participantTotalAmount: 0,
        readyToPayAmount: 0,
        reviewAmount: 0,
        paidAmount: 0,
        rejectedAmount: 0,
      }
    );
  }, [dashboardItems]);

  const ownerReachRate = getPercentage(summary.ownerReachedCount, summary.ownerParticipantCount);
  const ownerOpenRate = getPercentage(summary.ownerOpenedCount, summary.ownerParticipantCount);
  const summaryTitle = summary.pendingReviewBills
    ? `${summary.pendingReviewBills} ${summary.pendingReviewBills === 1 ? 'bill is' : 'bills are'} waiting for your review`
    : summary.paymentDueBills
    ? `${formatCurrency(summary.readyToPayAmount, 'USD')} is ready to send`
    : summary.activeBills
    ? `${summary.activeBills} active ${summary.activeBills === 1 ? 'bill' : 'bills'} in progress`
    : 'Your split bills are caught up';
  const summaryDescription = summary.pendingReviewBills
    ? 'Review these before money moves. You can approve the amount, pay it later, or reject anything that looks wrong.'
    : summary.paymentDueBills
    ? 'Money to send is the approved amount from participant bills that is waiting for payment.'
    : summary.activeBills
    ? 'Active bills are still moving. Track who has opened your requests and what you may still need to pay.'
    : 'No bill needs action right now. Completed and rejected bills stay in history for reference.';
  const financialControlDescription = summary.readyToPayAmount > 0
    ? `${formatCurrency(summary.readyToPayAmount, 'USD')} is approved and ready to leave your account. Another ${formatCurrency(summary.reviewAmount, 'USD')} is still waiting for your decision.`
    : summary.reviewAmount > 0
    ? `${formatCurrency(summary.reviewAmount, 'USD')} is not committed yet. Review those bills before approving any payment.`
    : summary.participantTotalAmount > 0
    ? `You have tracked ${formatCurrency(summary.participantTotalAmount, 'USD')} in bills shared with you. No payment is waiting right now.`
    : 'No participant spending has been tracked yet.';

  const analyticsStatusRows = [
    { label: 'Needs action', value: summary.needsAction, helper: 'Review, payment, or owner follow-up', tone: 'bg-[#173b63]' },
    { label: 'In progress', value: summary.inProgressBills, helper: 'Sent and waiting on participants', tone: 'bg-amber-500' },
    { label: 'Completed', value: summary.completedBills, helper: 'Paid or opened by everyone', tone: 'bg-emerald-500' },
    { label: 'Rejected', value: summary.rejectedBills, helper: 'Declined participant bills', tone: 'bg-rose-500' },
  ];
  const analyticsRoleRows = [
    { label: 'Created by you', value: summary.ownerBills, helper: `${formatCurrency(summary.ownerTotalAmount, 'USD')} total bill value`, tone: 'bg-[#2d4a6f]' },
    { label: 'Shared with you', value: summary.participantBills, helper: `${formatCurrency(summary.participantTotalAmount, 'USD')} assigned to you`, tone: 'bg-slate-400' },
  ];
  const analyticsTimelineRows = [
    { label: 'Active', value: summary.activeBills, helper: 'Still needs movement', tone: 'bg-[#173b63]' },
    { label: 'History', value: summary.historyBills, helper: 'Completed or rejected', tone: 'bg-slate-300' },
  ];
  const spendingCategoryRows = Object.values(
    dashboardItems.reduce<Record<string, { label: string; amount: number; count: number }>>((accumulator, item) => {
      if (!item.incomingRequest) {
        return accumulator;
      }

      const transaction = getTransactionById(item.incomingRequest.transactionId);
      const label = transaction?.category ?? 'Other';
      const current = accumulator[label] ?? { label, amount: 0, count: 0 };

      accumulator[label] = {
        ...current,
        amount: current.amount + item.incomingRequest.yourAmount,
        count: current.count + 1,
      };

      return accumulator;
    }, {})
  ).sort((left, right) => right.amount - left.amount);
  const largestMoneyRows = dashboardItems
    .map((item) => {
      const amount = item.incomingRequest?.yourAmount ?? item.ownerRequest?.totalAmount ?? 0;
      const transaction = getTransactionById(item.incomingRequest?.transactionId ?? item.ownerRequest?.transactionId ?? '');

      return {
        ...item,
        analyticsAmount: amount,
        category: transaction?.category ?? 'Other',
        moneyMeaning: item.role === 'participant'
          ? item.statusFilter === 'completed'
            ? 'Paid share'
            : item.statusFilter === 'rejected'
            ? 'Rejected share'
            : item.incomingRequest?.status === 'payment_due'
            ? 'Money to send'
            : 'Needs decision'
          : 'Bill you manage',
      };
    })
    .sort((left, right) => right.analyticsAmount - left.analyticsAmount)
    .slice(0, 5);
  const recentAnalyticsItems = dashboardItems.slice(0, 5);

  const roleOptions: { id: DashboardRoleFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'owner', label: 'Owner' },
    { id: 'participant', label: 'Participant' },
  ];

  const statusOptions: { id: DashboardStatusFilter; label: string }[] = [
    { id: 'all', label: 'All status' },
    { id: 'needs_action', label: 'Needs action' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'rejected', label: 'Rejected' },
  ];

  const timelineOptions: { id: DashboardTimelineFilter; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'history', label: 'History' },
  ];
  const currentTimelineLabel = timelineOptions.find((option) => option.id === timelineFilter)?.label ?? 'Active';
  const currentRoleLabel = roleOptions.find((option) => option.id === roleFilter)?.label ?? 'All';
  const currentStatusLabel = statusOptions.find((option) => option.id === statusFilter)?.label ?? 'All status';
  const activeFilterCount = Number(timelineFilter !== 'active') + Number(roleFilter !== 'all') + Number(statusFilter !== 'all');
  return (
    <SplitItLayout
      title="Split bill dashboard"
      subtitle="Track bills you created and bills shared with you in one place."
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
      ) : dashboardItems.length ? (
        <>
          <section>
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock3 className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Today</p>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {summaryTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {summaryDescription}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnalyticsOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#173b63] transition hover:border-slate-300"
                >
                  <BarChart3 className="h-4 w-4" />
                  Details
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Money to send</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrency(summary.readyToPayAmount, 'USD')}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Need decision</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{summary.pendingReviewBills}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Active bills</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{summary.activeBills}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">Split bills</h2>
                  <span className="text-sm text-slate-400">
                    {filteredItems.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {currentTimelineLabel} · {currentRoleLabel === 'All' ? 'All roles' : currentRoleLabel} · {currentStatusLabel}
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                    >
                      <span>Filter</span>
                      {activeFilterCount ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                          {activeFilterCount}
                        </span>
                      ) : null}
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-2xl border-slate-200 p-2 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 p-1">
                        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          View
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={timelineFilter} onValueChange={(value) => setTimelineFilter(value as DashboardTimelineFilter)}>
                          {timelineOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.id}
                              value={option.id}
                              hideIndicator
                              keepOpenOnSelect
                              className="rounded-lg px-2 py-2 text-sm text-slate-700 data-[state=checked]:bg-white data-[state=checked]:font-semibold data-[state=checked]:text-slate-900"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-1">
                        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Role
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={roleFilter} onValueChange={(value) => setRoleFilter(value as DashboardRoleFilter)}>
                          {roleOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.id}
                              value={option.id}
                              hideIndicator
                              keepOpenOnSelect
                              className="rounded-lg px-2 py-2 text-sm text-slate-700 data-[state=checked]:bg-white data-[state=checked]:font-semibold data-[state=checked]:text-slate-900"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </div>
                    </div>

                    <div className="mt-2 rounded-xl bg-slate-50 p-1">
                      <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Status
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as DashboardStatusFilter)}>
                        {statusOptions.map((option) => (
                          <DropdownMenuRadioItem
                            key={option.id}
                            value={option.id}
                            hideIndicator
                            keepOpenOnSelect
                            className="rounded-lg px-2 py-2 text-sm text-slate-700 data-[state=checked]:bg-white data-[state=checked]:font-semibold data-[state=checked]:text-slate-900"
                          >
                            {option.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="space-y-3">
              {filteredItems.length ? filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setIsDetailOpen(true);
                  }}
                  className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(item.createdAt)} • {getSplitMethodLabel(item.splitMethod)}
                          </p>
                        </div>
                        <p className="pl-3 text-right text-base font-semibold text-slate-900">{item.amountLabel}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.statusTone}`}>
                          {item.statusLabel}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.role === 'owner' ? 'bg-[#e7eef8] text-[#173b63]' : 'bg-[#f2f4f7] text-slate-600'
                        }`}>
                          {item.role === 'owner' ? 'Owner' : 'Participant'}
                        </span>
                        {item.incomingRequest ? (
                          <span className="text-xs font-medium text-slate-400">
                            {item.incomingRequest.ownerName}
                          </span>
                        ) : null}
                      </div>

                      {item.ownerRequest ? (
                        (() => {
                          const progress = getOwnerProgress(item.ownerRequest);
                          return progress.total ? (
                            <p className="mt-3 text-sm text-slate-400">
                              {progress.reached}/{progress.total} reached
                            </p>
                          ) : null;
                        })()
                      ) : null}
                    </div>
                  </div>
                </button>
              )) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-8 text-center">
                  <p className="font-medium text-slate-900">No bills in this view</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <SectionCard title="No split bills yet">
          <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-10 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-900">Nothing to track yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Once split bills are created or shared with you, they will appear here for both owner and participant tracking.
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

      <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
        <DialogContent className="max-h-[86dvh] max-w-md overflow-hidden rounded-[24px] border-0 bg-[#f7f8fa] p-0">
          <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4 pr-12 text-left">
            <DialogTitle className="text-lg leading-6 text-slate-900">Split bill analytics</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Money movement, decisions, and bill patterns.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(86dvh-5.5rem)] space-y-3 overflow-y-auto px-4 py-4">
            <div className="rounded-[20px] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Main takeaway</p>
              <p className="mt-2 text-lg font-semibold leading-7 text-slate-900">{summaryTitle}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{summaryDescription}</p>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Financial control</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{financialControlDescription}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-[#edf3fa] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f7897]">To send</p>
                  <p className="mt-2 text-sm font-semibold text-[#173b63]">{formatCurrency(summary.readyToPayAmount, 'USD')}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Not decided</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(summary.reviewAmount, 'USD')}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500">Paid</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-700">{formatCurrency(summary.paidAmount, 'USD')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Money to send</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(summary.readyToPayAmount, 'USD')}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{summary.paymentDueBills} approved {summary.paymentDueBills === 1 ? 'bill' : 'bills'} waiting for payment</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Review amount</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(summary.reviewAmount, 'USD')}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Not payable until you approve the split</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Owner reach</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{ownerReachRate}%</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{summary.ownerReachedCount}/{summary.ownerParticipantCount} participants reached</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Open rate</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{ownerOpenRate}%</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{summary.ownerOpenedCount}/{summary.ownerParticipantCount} participants opened</p>
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Where your share goes</p>
                <p className="text-xs font-medium text-slate-400">{formatCurrency(summary.participantTotalAmount, 'USD')}</p>
              </div>
              <div className="mt-4 space-y-4">
                {spendingCategoryRows.length ? spendingCategoryRows.map((row) => (
                  <div key={row.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.count} {row.count === 1 ? 'bill' : 'bills'} shared with you</p>
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(row.amount, 'USD')}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#173b63]"
                        style={{ width: `${getPercentage(row.amount, summary.participantTotalAmount)}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <p className="text-sm leading-6 text-slate-500">No participant bill data yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bill status</p>
                <p className="text-xs font-medium text-slate-400">{summary.totalBills} total</p>
              </div>
              <div className="mt-4 space-y-4">
                {analyticsStatusRows.map((row) => (
                  <div key={row.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.helper}</p>
                      </div>
                      <p className="font-semibold text-slate-900">{row.value}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${row.tone}`}
                        style={{ width: `${getPercentage(row.value, summary.totalBills)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Where bills come from</p>
              <div className="mt-4 space-y-4">
                {analyticsRoleRows.map((row) => (
                  <div key={row.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.helper}</p>
                      </div>
                      <p className="font-semibold text-slate-900">{row.value}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${row.tone}`}
                        style={{ width: `${getPercentage(row.value, summary.totalBills)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Active vs history</p>
              <div className="mt-4 space-y-4">
                {analyticsTimelineRows.map((row) => (
                  <div key={row.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.helper}</p>
                      </div>
                      <p className="font-semibold text-slate-900">{row.value}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${row.tone}`}
                        style={{ width: `${getPercentage(row.value, summary.totalBills)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Largest money movements</p>
              <div className="mt-3 divide-y divide-slate-100">
                {largestMoneyRows.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setIsAnalyticsOpen(false);
                      setIsDetailOpen(true);
                    }}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.moneyMeaning} · {item.category} · {item.statusLabel}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(item.analyticsAmount, item.currency)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recent bill details</p>
              <div className="mt-3 divide-y divide-slate-100">
                {recentAnalyticsItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setIsAnalyticsOpen(false);
                      setIsDetailOpen(true);
                    }}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.role === 'owner' ? 'Created by you' : `Shared by ${item.incomingRequest?.ownerName ?? 'Owner'}`} · {item.statusLabel}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">{item.amountLabel}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen && Boolean(selectedItem)} onOpenChange={setIsDetailOpen}>
        <DialogContent className="flex h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-[24px] border-0 bg-[#f7f8fa] p-0">
          {selectedItem ? (
            selectedItem.role === 'owner' && selectedItem.ownerRequest ? (
              (() => {
                const request = selectedItem.ownerRequest as SplitRequest;
                const progress = getOwnerProgress(request);
                const transaction = getTransactionById(request.transactionId);

                return (
                  <>
                    <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 pr-12 text-left">
                      <DialogTitle className="text-lg leading-6 text-slate-900">{selectedItem.title}</DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        {formatDate(request.createdAt)} • {formatCurrency(request.totalAmount, request.currency)}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                      <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-slate-900">{selectedItem.title}</p>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedItem.statusTone}`}>
                                {selectedItem.statusLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{selectedItem.helper}</p>
                          </div>
                          <p className="text-lg font-semibold text-slate-900">{formatCurrency(request.totalAmount, request.currency)}</p>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Participants</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{progress.total}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Reached</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{progress.reached}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Opened</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{progress.viewed}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Split method</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{getSplitMethodLabel(request.splitMethod)}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Transaction</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{transaction?.merchant ?? 'Manual bill'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bill details</p>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Created</span>
                            <span className="font-medium text-slate-900">{formatDate(request.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Currency</span>
                            <span className="font-medium text-slate-900">{request.currency}</span>
                          </div>
                          {transaction?.category ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Category</span>
                              <span className="font-medium text-slate-900">{transaction.category}</span>
                            </div>
                          ) : null}
                          {request.receiptFileName ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Receipt</span>
                              <span className="font-medium text-slate-900">{request.receiptFileName}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {request.allocations.length ? (
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Split breakdown</p>
                          <div className="mt-3 space-y-3">
                            {request.allocations.map((allocation, index) => {
                              const notification = request.notifications.find((entry) => entry.participantId === allocation.participantId);
                              return (
                                <div key={`${allocation.participantId}-${index}`} className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-900">{notification?.participantName ?? allocation.participantId}</p>
                                    <p className="text-sm text-slate-500">{notification?.accountId ?? 'Participant'}</p>
                                  </div>
                                  <p className="pl-3 text-sm font-semibold text-slate-900">
                                    {formatCurrency(allocation.amount, request.currency)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {request.note ? (
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Note</p>
                          <p className="mt-3 text-sm leading-6 text-slate-700">{request.note}</p>
                        </div>
                      ) : null}

                      {request.receiptItems?.length ? (
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Receipt items</p>
                          <div className="mt-3 space-y-3">
                            {request.receiptItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-900">{item.label}</p>
                                  <p className="text-sm text-slate-500">
                                    {item.assignedParticipantIds.length} {item.assignedParticipantIds.length === 1 ? 'person' : 'people'}
                                  </p>
                                </div>
                                <p className="pl-3 text-sm font-semibold text-slate-900">
                                  {formatCurrency(item.amount, request.currency)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Request activity</p>
                        <div className="mt-3 space-y-3">
                        {request.notifications.map((notification) => (
                          <div key={notification.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{notification.participantName}</p>
                                <p className="mt-1 text-sm text-slate-500">{notification.accountId}</p>
                              </div>
                              <p className="pl-3 text-base font-semibold text-slate-900">
                                {formatCurrency(notification.amount, notification.currency)}
                              </p>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
                              <span>{notification.channel === 'push' ? 'Push notification' : 'In-app notification'}</span>
                              <span>{getNotificationStatusLabel(notification.status)}</span>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : selectedItem.incomingRequest ? (
              (() => {
                const request = selectedItem.incomingRequest as SplitIncomingRequest;
                const transaction = getTransactionById(request.transactionId);
                const yourSharePercent = request.totalAmount > 0
                  ? Math.round((request.yourAmount / request.totalAmount) * 100)
                  : 0;
                const needsParticipantReview = request.status === 'pending_review';
                const canPayParticipantBill = request.status === 'pending_review' || request.status === 'payment_due';

                return (
                  <>
                    <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 pr-12 text-left">
                      <DialogTitle className="text-lg leading-6 text-slate-900">{selectedItem.title}</DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        Shared by {request.ownerName} • {formatDate(request.createdAt)}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                      <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-slate-900">Your share</p>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedItem.statusTone}`}>
                                {selectedItem.statusLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{request.message}</p>
                          </div>
                          <p className="text-lg font-semibold text-slate-900">{formatCurrency(request.yourAmount, request.currency)}</p>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Total bill</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(request.totalAmount, request.currency)}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Members</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{request.participantCount}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Method</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{getSplitMethodLabel(request.splitMethod)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Your share details</p>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Your amount</span>
                            <span className="font-medium text-slate-900">{formatCurrency(request.yourAmount, request.currency)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Share of total bill</span>
                            <span className="font-medium text-slate-900">{yourSharePercent}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Current status</span>
                            <span className="font-medium text-slate-900">{selectedItem.statusLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bill details</p>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Created</span>
                            <span className="font-medium text-slate-900">{formatDate(request.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Currency</span>
                            <span className="font-medium text-slate-900">{request.currency}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Transaction</span>
                            <span className="font-medium text-slate-900">{transaction?.merchant ?? 'Manual bill'}</span>
                          </div>
                          {transaction?.category ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Category</span>
                              <span className="font-medium text-slate-900">{transaction.category}</span>
                            </div>
                          ) : null}
                          {request.receiptFileName ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Receipt</span>
                              <span className="font-medium text-slate-900">{request.receiptFileName}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bill owner</p>
                        <p className="mt-2 font-semibold text-slate-900">{request.ownerName}</p>
                        <p className="mt-1 text-sm text-slate-500">{request.ownerAccountId}</p>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">What happens next</p>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          {request.status === 'paid'
                            ? 'Your part of this bill has already been completed. You can keep this screen as a record of the shared bill.'
                            : request.status === 'payment_due'
                            ? 'This bill is ready for payment. Review the amount, confirm the owner details, then pay your share instantly from here.'
                            : request.status === 'rejected'
                            ? 'You rejected this bill. It stays here as history so you can still review the original request.'
                            : 'Review the bill details first. If the split looks correct, approve and pay in one step. Reject it if something looks wrong.'}
                        </p>
                      </div>

                      {request.note ? (
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Note</p>
                          <p className="mt-3 text-sm leading-6 text-slate-700">{request.note}</p>
                        </div>
                      ) : null}
                    </div>

                    {canPayParticipantBill ? (
                      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                        <p className="mb-2 text-xs font-medium text-slate-500">
                          {needsParticipantReview
                            ? 'Approve only if the amount and owner look correct. Payment will complete immediately.'
                            : 'This share is already approved. Pay now to finish the bill.'}
                        </p>
                        <div className={needsParticipantReview ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
                          {needsParticipantReview ? (
                            <button
                              type="button"
                              onClick={() => updateIncomingRequestStatus(request.id, 'rejected')}
                              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                            >
                              Reject bill
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => payIncomingRequest(request.id)}
                            className="rounded-2xl bg-[#173b63] px-4 py-3 text-sm font-semibold text-white"
                          >
                            {needsParticipantReview ? 'Approve & pay now' : `Pay ${formatCurrency(request.yourAmount, request.currency)}`}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                );
              })()
            ) : null
          ) : null}
        </DialogContent>
      </Dialog>
    </SplitItLayout>
  );
}
