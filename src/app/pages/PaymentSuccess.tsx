import { useLocation, useNavigate } from 'react-router';
import { Check, Download, RotateCcw, Share2, Split } from 'lucide-react';

interface PaymentSuccessState {
  amount?: number;
  merchant?: string;
  reference?: string;
  transactionId?: string;
  paidAt?: string;
  hideSplitBill?: boolean;
}

export function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const payment = (location.state as PaymentSuccessState | null) ?? {};
  const amount = payment.amount ?? 30;
  const merchant = payment.merchant ?? 'QR payment';
  const reference = payment.reference ?? `QR-${Date.now()}`;
  const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date();
  const shouldHideSplitBill = Boolean(payment.hideSplitBill);
  const paidAtLabel = paidAt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleSplitBill = () => {
    navigate('/splitit/create', {
      state: {
        splitPayment: {
          amount,
          merchant,
          reference,
          transactionId: payment.transactionId,
          paidAt: payment.paidAt,
        },
      },
    });
  };

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto flex h-dvh max-w-md flex-col px-5 pb-5 pt-12">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#76d900]">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="mt-5 text-3xl font-light tracking-[0.12em] text-white">Success</h1>
        </div>

        <div className="relative mt-10 rounded-[10px] bg-white text-slate-700 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
          <div className="px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f6b526] ring-4 ring-[#e84d3d]">
                <span className="text-xs font-bold text-blue-700">QR</span>
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-semibold tracking-[0.08em] text-slate-700">
                  -{amount.toFixed(2)} <span className="text-xl">USD</span>
                </p>
                <p className="mt-2 truncate text-lg text-slate-500">{merchant}</p>
              </div>
            </div>
          </div>

          <div className="relative border-t border-dashed border-slate-300 px-5 py-5">
            <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#2d4a6f]" />
            <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#2d4a6f]" />
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-[1fr_1.4fr] gap-4">
                <span className="text-slate-500">Trx. ID:</span>
                <span className="font-semibold tracking-[0.06em] text-slate-700">{reference}</span>
              </div>
              <div className="grid grid-cols-[1fr_1.4fr] gap-4">
                <span className="text-slate-500">Transaction date:</span>
                <span className="font-semibold text-slate-700">{paidAtLabel}</span>
              </div>
              <div className="grid grid-cols-[1fr_1.4fr] gap-4">
                <span className="text-slate-500">Paid from:</span>
                <span className="font-semibold tracking-[0.06em] text-slate-700">001 999 999</span>
              </div>
              <div className="grid grid-cols-[1fr_1.4fr] gap-4">
                <span className="text-slate-500">Debit amount:</span>
                <span className="font-semibold text-slate-700">{amount.toFixed(2)} USD</span>
              </div>
              <div className="grid grid-cols-[1fr_1.4fr] gap-4">
                <span className="text-slate-500">Receiver account:</span>
                <span className="font-semibold tracking-[0.06em] text-slate-700">001 234 567</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-5 px-8 text-center text-white/70">
          {[
            { label: 'Share', icon: Share2 },
            { label: 'Repeat', icon: RotateCcw },
            { label: 'Download', icon: Download },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} type="button" className="flex flex-col items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-semibold tracking-[0.08em]">{action.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto space-y-3 pt-6">
          {!shouldHideSplitBill ? (
            <button
              onClick={handleSplitBill}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef4b50] px-4 py-4 text-base font-bold uppercase tracking-[0.16em] text-white"
            >
              <Split className="h-5 w-5" />
              Split this bill
            </button>
          ) : null}
            <button
              onClick={() => navigate('/')}
              className="w-full rounded-2xl bg-white px-4 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[#1e3a5f]"
            >
              Done
            </button>
        </div>
      </div>
    </div>
  );
}
