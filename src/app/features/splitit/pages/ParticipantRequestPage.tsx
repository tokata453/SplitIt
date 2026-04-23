import { Check, Download, RotateCcw, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchSentRequests } from '../api';
import { SectionCard } from '../components/SectionCard';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] px-4 py-8">
        <SectionCard title="Requests sent">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        </SectionCard>
      </div>
    );
  }

  if (!activeRequest) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] px-4 py-8">
        <SectionCard title="No sent requests yet">
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="font-medium text-slate-900">Your notification timeline is empty.</p>
            <p className="mt-1 text-sm text-slate-500">Send a split request to see it here.</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto flex h-dvh max-w-md flex-col px-5 pb-5 pt-24 text-white">
          <div className="text-center">
            <div className=" mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#76d900]">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <h2 className="mt-4 text-3xl font-light tracking-[0.12em]">Success</h2>
            <p className="mt-1 text-sm text-white/70">Split request sent</p>
          </div>

          <div className="relative mt-7 rounded-[14px] bg-white text-slate-700 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total request</p>
              <p className="mt-2 text-3xl font-semibold tracking-[0.02em] text-slate-800">
                {formatCurrency(activeRequest.totalAmount, activeRequest.currency)}
              </p>
              <p className="mt-1 text-sm text-slate-500">{participantCount} participants notified</p>
            </div>

            <div className="relative border-t border-dashed border-slate-300 px-5 py-4">
              <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#2d4a6f]" />
              <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#2d4a6f]" />
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-[1fr_1.3fr] gap-4">
                  <span className="text-slate-500">Request ID:</span>
                  <span className="font-semibold tracking-[0.04em] text-slate-700">{activeRequest.id}</span>
                </div>
                <div className="grid grid-cols-[1fr_1.3fr] gap-4">
                  <span className="text-slate-500">Sent date:</span>
                  <span className="font-semibold text-slate-700">{formatDate(activeRequest.createdAt)}</span>
                </div>
                <div className="grid grid-cols-[1fr_1.3fr] gap-4">
                  <span className="text-slate-500">Split method:</span>
                  <span className="font-semibold text-slate-700">{getSplitMethodLabel(activeRequest.splitMethod)}</span>
                </div>
                <div className="grid grid-cols-[1fr_1.3fr] gap-4">
                  <span className="text-slate-500">Reminder:</span>
                  <span className="font-semibold capitalize text-slate-700">
                    {activeRequest.reminderSettings?.enabled ? activeRequest.reminderSettings.frequency : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 px-8 text-center text-white/70">
            {[
              { label: 'Share', icon: Share2 },
              { label: 'Repeat', icon: RotateCcw },
              { label: 'Download', icon: Download },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" className="flex flex-col items-center gap-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold tracking-[0.08em]">{action.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            <button
              onClick={() => navigate('/splitit/dashboard')}
              className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-[#1e3a5f]"
            >
              View dashboard
            </button>
            <button
              onClick={() => {
                resetDraft();
                navigate('/');
              }}
              className="rounded-2xl bg-[#ef4b50] px-4 py-4 text-center text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
      </div>
    </div>
  );
}
