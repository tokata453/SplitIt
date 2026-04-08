import { useLocation, useNavigate } from 'react-router';
import { CheckCircle } from 'lucide-react';

export function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const amount = (location.state as { amount?: number } | null)?.amount ?? 30;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto max-w-md min-h-screen flex flex-col justify-center px-4">
        <div className="rounded-3xl bg-white px-6 py-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Payment complete</h1>
          <p className="text-sm text-slate-500 mb-8">${amount.toFixed(2)} sent</p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/splitit')}
              className="w-full rounded-xl bg-[#2d4a6f] px-4 py-4 text-sm font-medium text-white"
            >
              View groups
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full rounded-xl bg-slate-100 px-4 py-4 text-sm font-medium text-slate-700"
            >
              Back home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
