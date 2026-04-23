import { ArrowRight, BellRing, Clock3, ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { fetchIncomingRequests, fetchSentRequests } from '../api';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import {
  SplitDashboardRole,
  SplitIncomingParticipant,
  SplitIncomingRequest,
  SplitIncomingStatus,
  SplitNotification,
  SplitParticipantPaymentStatus,
  SplitReminderFrequency,
  SplitRequest,
} from '../types';
import { formatCurrency, formatDate, getSplitMethodLabel, getTransactionById } from '../utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

function getNotificationPaymentStatus(notification: SplitNotification): SplitParticipantPaymentStatus {
  return notification.paymentStatus ?? (notification.status === 'viewed' ? 'paid' : 'pending');
}

function getPaymentTone(status: SplitParticipantPaymentStatus) {
  return status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : 'bg-amber-50 text-amber-700 border-amber-100';
}

function getIncomingStatusLabel(status: SplitIncomingStatus) {
  if (status === 'paid') return 'Paid';
  if (status === 'rejected') return 'Rejected';
  if (status === 'payment_due') return 'Ready to pay';
  return 'Review Required';
}

function sumAmount<T extends { amount: number }>(items: T[]) {
  return items.reduce((total, item) => total + item.amount, 0);
}

const reminderOptions: { id: SplitReminderFrequency; label: string; helper: string }[] = [
  { id: 'none', label: 'Off', helper: 'No automatic reminders for this bill.' },
  { id: 'daily', label: 'Daily', helper: 'Send a reminder every day until it is paid.' },
  { id: 'weekly', label: 'Weekly', helper: 'Send a reminder once every week.' },
  { id: 'monthly', label: 'Monthly', helper: 'Send a reminder once every month.' },
];

function buildFallbackParticipants(request: SplitIncomingRequest): SplitIncomingParticipant[] {
  const remainingPeople = Math.max(request.participantCount - 1, 0);
  const remainingAmount = Math.max(request.totalAmount - request.yourAmount, 0);
  const estimatedOtherShare = remainingPeople ? Number((remainingAmount / remainingPeople).toFixed(2)) : 0;

  return [
    {
      id: 'me',
      name: 'You',
      accountId: 'Your account',
      amount: request.yourAmount,
      status: request.status === 'paid' ? 'paid' : 'pending',
      isYou: true,
    },
    ...Array.from({ length: remainingPeople }).map((_, index) => ({
      id: `participant-${index + 1}`,
      name: `Participant ${index + 1}`,
      accountId: 'Sathapana account',
      amount: estimatedOtherShare,
      status: request.status === 'paid' ? 'paid' as SplitParticipantPaymentStatus : 'pending' as SplitParticipantPaymentStatus,
    })),
  ];
}

function EmptyDetailState() {
  const navigate = useNavigate();

  return (
    <SplitItLayout title="Bill not found" subtitle="This split bill may have been removed." backTo="/splitit/dashboard">
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
        <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-lg font-semibold text-slate-900">No bill detail available</p>
        <button
          onClick={() => navigate('/splitit/dashboard')}
          className="mt-5 rounded-2xl bg-[#2d4a6f] px-5 py-3 text-sm font-semibold text-white"
        >
          Back to dashboard
        </button>
      </div>
    </SplitItLayout>
  );
}

function OwnerBillDetail({ request }: { request: SplitRequest }) {
  const transaction = getTransactionById(request.transactionId);
  const paidPeople = request.notifications.filter((notification) => getNotificationPaymentStatus(notification) === 'paid');
  const pendingPeople = request.notifications.filter((notification) => getNotificationPaymentStatus(notification) === 'pending');
  const amountReceived = sumAmount(paidPeople);
  const amountPending = sumAmount(pendingPeople);
  const paidCount = paidPeople.length;
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<SplitReminderFrequency>(
    request.reminderSettings?.enabled ? request.reminderSettings.frequency : 'none'
  );
  const [ownerActionMessage, setOwnerActionMessage] = useState('');

  const handleSendAlert = () => {
    if (!pendingPeople.length) {
      setOwnerActionMessage('Everyone has already paid for this bill.');
      return;
    }

    const participantNames = pendingPeople.map((participant) => participant.participantName).join(', ');
    setOwnerActionMessage(`Alert sent to ${pendingPeople.length} pending participant${pendingPeople.length > 1 ? 's' : ''}: ${participantNames}.`);
  };

  const currentReminderLabel = reminderOptions.find((option) => option.id === reminderFrequency)?.label ?? 'Off';
  const footer = (
    <div className="space-y-3">
      {ownerActionMessage ? (
        <p className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
          {ownerActionMessage}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          onClick={handleSendAlert}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#173b63] px-4 py-3 text-sm font-semibold text-white"
        >
          <BellRing className="h-4 w-4" />
          Send alert
        </button>
        <button
          onClick={() => setIsReminderDialogOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
        >
          <Clock3 className="h-4 w-4" />
          Reminder setting
        </button>
      </div>
    </div>
  );

  return (
    <SplitItLayout
      title="Bill detail"
      subtitle="Track who has paid and what is still waiting."
      backTo="/splitit/dashboard"
      footer={footer}
    >
      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Owner view</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {transaction?.merchant ?? 'Split bill'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {formatDate(request.createdAt)} · {getSplitMethodLabel(request.splitMethod)}
            </p>
          </div>
          <span className="rounded-full bg-[#e7eef8] px-3 py-1.5 text-xs font-semibold text-[#173b63]">
            {paidCount}/{request.notifications.length} paid
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-700">Received</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-emerald-900">
              {formatCurrency(amountReceived, request.currency)}
            </p>
          </div>
          <div className="rounded-[22px] bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-700">Still pending</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-amber-900">
              {formatCurrency(amountPending, request.currency)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total bill</span>
            <span className="font-semibold text-slate-900">{formatCurrency(request.totalAmount, request.currency)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">Reminder</span>
            <span className="font-semibold text-slate-900">{currentReminderLabel}</span>
          </div>
          {request.note ? <p className="mt-3 text-sm leading-6 text-slate-500">{request.note}</p> : null}
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950">Participants</h3>
          <p className="text-sm font-medium text-slate-400">{request.notifications.length} people</p>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {request.notifications.map((notification) => {
            const paymentStatus = getNotificationPaymentStatus(notification);

            return (
              <div key={notification.id} className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{notification.participantName}</p>
                  <p className="mt-1 text-xs text-slate-400">{notification.accountId}</p>
                  {paymentStatus === 'paid' && notification.paidAt ? (
                    <p className="mt-1 text-xs text-emerald-600">Paid {formatDate(notification.paidAt)}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(notification.amount, notification.currency)}</p>
                  <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getPaymentTone(paymentStatus)}`}>
                    {paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-sm rounded-[26px] border-0 bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
            <DialogTitle className="text-lg text-slate-950">Reminder setting</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Choose how often SplitIt should remind unpaid participants.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-4 py-4">
            {reminderOptions.map((option) => {
              const isActive = reminderFrequency === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setReminderFrequency(option.id);
                    setOwnerActionMessage(`Reminder updated to ${option.label.toLowerCase()} for this bill.`);
                    setIsReminderDialogOpen(false);
                  }}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-[#173b63] bg-[#edf3f8]'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{option.label}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500">{option.helper}</p>
                    </div>
                    {isActive ? (
                      <span className="rounded-full bg-[#173b63] px-2.5 py-1 text-xs font-semibold text-white">
                        Active
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </SplitItLayout>
  );
}

function ParticipantBillDetail({ request }: { request: SplitIncomingRequest }) {
  const navigate = useNavigate();
  const transaction = getTransactionById(request.transactionId);
  const [status, setStatus] = useState(request.status);
  const participants = useMemo(() => {
    const baseParticipants = request.participants?.length ? request.participants : buildFallbackParticipants(request);

    return baseParticipants.map((participant) => {
      if (!participant.isYou) return participant;
      return {
        ...participant,
        status: status === 'paid' ? 'paid' as SplitParticipantPaymentStatus : 'pending' as SplitParticipantPaymentStatus,
      };
    });
  }, [request, status]);
  const paidPeople = participants.filter((participant) => participant.status === 'paid');
  const pendingPeople = participants.filter((participant) => participant.status === 'pending');
  const paidAmount = sumAmount(paidPeople);
  const pendingAmount = sumAmount(pendingPeople);
  const canAct = status === 'pending_review' || status === 'payment_due';

  const footer = canAct ? (
    <div className="flex gap-3">
      <button
        onClick={() => setStatus('rejected')}
        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
      >
        Reject
      </button>
      <button
        onClick={() => {
          navigate('/splitit/payment-review', {
            state: {
              amount: request.yourAmount,
              currency: request.currency,
              merchant: transaction?.merchant ?? 'Split bill payment',
              ownerName: request.ownerName,
              ownerAccountId: request.ownerAccountId,
              reference: `BILL-${request.id.toUpperCase()}`,
              transactionId: request.transactionId,
              requestId: request.id,
              returnTo: `/splitit/dashboard/participant/${request.id}`,
            },
          });
        }}
        className="flex-1 rounded-2xl bg-[#2d4a6f] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2d4a6f]/20"
      >
        Approve & pay
      </button>
    </div>
  ) : null;

  return (
    <SplitItLayout
      title="Bill detail"
      subtitle="See your share and everyone’s payment status."
      backTo="/splitit/dashboard"
      footer={footer}
    >
      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Participant view</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {transaction?.merchant ?? 'Split bill'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              From {request.ownerName} · {formatDate(request.createdAt)}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {getIncomingStatusLabel(status)}
          </span>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#f7f8fa] p-4">
          <p className="text-sm font-medium text-slate-500">Your share</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            {formatCurrency(request.yourAmount, request.currency)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-700">Paid by group</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-emerald-900">
              {formatCurrency(paidAmount, request.currency)}
            </p>
          </div>
          <div className="rounded-[22px] bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-700">Still pending</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-amber-900">
              {formatCurrency(pendingAmount, request.currency)}
            </p>
          </div>
        </div>

        {request.note ? <p className="mt-4 text-sm leading-6 text-slate-500">{request.note}</p> : null}
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950">Payment status</h3>
          <p className="text-sm font-medium text-slate-400">{paidPeople.length}/{participants.length} paid</p>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {participant.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">{participant.accountId}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-slate-900">{formatCurrency(participant.amount, request.currency)}</p>
                <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getPaymentTone(participant.status)}`}>
                  {participant.status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!canAct ? (
        <button
          onClick={() => navigate('/splitit/dashboard')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a6f] px-4 py-3 text-sm font-semibold text-white"
        >
          Back to dashboard <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </SplitItLayout>
  );
}

export function SplitBillDetailPage() {
  const { role, id } = useParams<{ role: SplitDashboardRole; id: string }>();
  const { lastSentRequest } = useSplitIt();
  const [sentRequests, setSentRequests] = useState<SplitRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<SplitIncomingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchSentRequests(), fetchIncomingRequests()]).then(([sent, incoming]) => {
      if (!isMounted) return;
      setSentRequests(sent);
      setIncomingRequests(incoming);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const ownerRequest = useMemo(() => {
    if (role !== 'owner' || !id) return null;
    const requests = lastSentRequest ? [lastSentRequest, ...sentRequests] : sentRequests;
    return requests.find((request) => request.id === id) ?? null;
  }, [id, lastSentRequest, role, sentRequests]);

  const incomingRequest = useMemo(() => {
    if (role !== 'participant' || !id) return null;
    return incomingRequests.find((request) => request.id === id) ?? null;
  }, [id, incomingRequests, role]);

  if (isLoading) {
    return (
      <SplitItLayout title="Bill detail" subtitle="Loading payment status..." backTo="/splitit/dashboard" variant="light">
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-[30px] bg-slate-100" />
          <div className="h-64 animate-pulse rounded-[30px] bg-slate-100" />
        </div>
      </SplitItLayout>
    );
  }

  if (role === 'owner' && ownerRequest) {
    return <OwnerBillDetail request={ownerRequest} />;
  }

  if (role === 'participant' && incomingRequest) {
    return <ParticipantBillDetail request={incomingRequest} />;
  }

  return <EmptyDetailState />;
}
