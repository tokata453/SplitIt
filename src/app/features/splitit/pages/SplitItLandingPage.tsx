import { ArrowRight, Clock3, QrCode, ReceiptText, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SplitItLayout } from '../components/SplitItLayout';
import { SectionCard } from '../components/SectionCard';
import { splitItTransactions, splitItUsers } from '../mockData';

export function SplitItLandingPage() {
  const navigate = useNavigate();

  return (
    <SplitItLayout
      title="Split a bill in seconds"
      subtitle="Start with an amount or a recent transaction. SplitIt keeps the default path short and moves details out of the way."
      backTo="/"
    >
      <SectionCard title="Start fast" description="Most users just enter an amount, keep equal split on, and send.">
        <div className="grid gap-3">
          <button
            onClick={() => navigate('/splitit/create')}
            className="rounded-[24px] bg-[#0f3d57] px-4 py-4 text-left text-white transition hover:translate-y-[-1px]"
          >
            <p className="text-sm text-white/70">Default action</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold">Enter amount</p>
                <p className="mt-1 text-sm text-white/75">Create a split manually in one step.</p>
              </div>
              <ArrowRight className="h-5 w-5" />
            </div>
          </button>

          <button
            onClick={() => navigate('/splitit/transactions')}
            className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300"
          >
            <p className="text-sm text-slate-500">Alternative</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-slate-900">Use recent transaction</p>
                <p className="mt-1 text-sm text-slate-600">Auto-fill amount and suggest likely participants.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Designed for trust" description="Advanced actions stay available, but never block the main flow.">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <Users className="mb-3 h-5 w-5 text-[#0f3d57]" />
            <p className="text-sm font-medium text-slate-900">History-based suggestions</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Surface the people you already pay most often.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <QrCode className="mb-3 h-5 w-5 text-[#0f3d57]" />
            <p className="text-sm font-medium text-slate-900">QR add</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Use account QR as a quick add path when needed.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <ReceiptText className="mb-3 h-5 w-5 text-[#0f3d57]" />
            <p className="text-sm font-medium text-slate-900">More details</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Receipt upload and custom amounts live behind one tap.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <Clock3 className="mb-3 h-5 w-5 text-[#0f3d57]" />
            <p className="text-sm font-medium text-slate-900">Request tracking</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">See who received, viewed, and still owes their share.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Sample activity" description="Mock data included for quick MVP testing.">
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">Recent transactions</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{splitItTransactions.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">Suggested participants</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{splitItUsers.length}</p>
          </div>
        </div>
      </SectionCard>
    </SplitItLayout>
  );
}

