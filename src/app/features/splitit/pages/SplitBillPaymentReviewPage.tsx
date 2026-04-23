import { ArrowLeft, ReceiptText, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { formatCurrency } from '../utils';

interface SplitBillPaymentReviewState {
  amount?: number;
  currency?: 'USD' | 'KHR';
  merchant?: string;
  ownerName?: string;
  ownerAccountId?: string;
  reference?: string;
  transactionId?: string;
  requestId?: string;
  returnTo?: string;
}

export function SplitBillPaymentReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const payment = (location.state as SplitBillPaymentReviewState | null) ?? {};
  const amount = payment.amount ?? 0;
  const currency = payment.currency ?? 'USD';
  const merchant = payment.merchant ?? 'Split bill payment';
  const ownerName = payment.ownerName ?? 'Bill owner';
  const ownerAccountId = payment.ownerAccountId ?? '001 234 567';
  const reference = payment.reference ?? `BILL-${Date.now()}`;
  const returnTo = payment.returnTo ?? '/splitit/dashboard';

  const handleConfirmPayment = () => {
    navigate('/splitit/payment-success', {
      state: {
        amount,
        merchant,
        reference,
        transactionId: payment.transactionId ?? payment.requestId,
        paidAt: new Date().toISOString(),
        hideSplitBill: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-6 pt-12">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(returnTo)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">Confirm payment</h1>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-24 rounded-[30px] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">You are about to pay</p>
              <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCurrency(amount, currency)}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] bg-[#f7f8fa] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#173b63] shadow-sm">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-slate-900">{merchant}</p>
                <p className="mt-1 text-sm text-slate-500">Split bill payment</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <div className="grid grid-cols-[1fr_1.2fr] gap-4">
              <span className="text-slate-500">Pay to</span>
              <span className="font-semibold text-slate-900">{ownerName}</span>
            </div>
            <div className="grid grid-cols-[1fr_1.2fr] gap-4">
              <span className="text-slate-500">Owner account</span>
              <span className="font-semibold text-slate-900">{ownerAccountId}</span>
            </div>
            <div className="grid grid-cols-[1fr_1.2fr] gap-4">
              <span className="text-slate-500">Bill reference</span>
              <span className="font-semibold text-slate-900">{reference}</span>
            </div>
            <div className="grid grid-cols-[1fr_1.2fr] gap-4">
              <span className="text-slate-500">Debit from</span>
              <span className="font-semibold text-slate-900">001 999 999</span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          <button
            onClick={handleConfirmPayment}
            className="w-full rounded-2xl bg-[#ef4b50] px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white"
          >
            Confirm payment
          </button>
          <button
            onClick={() => navigate(returnTo)}
            className="w-full rounded-2xl bg-white px-4 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[#1e3a5f]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
