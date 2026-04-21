import { Users } from 'lucide-react';
import { getUsersByIds } from '../utils';
import { SplitDraft } from '../types';
import { formatCurrency } from '../utils';
import { SectionCard } from './SectionCard';

export function LiveSplitSummary({
  draft,
  totalAmount,
  allocations,
  remainingAmount,
}: {
  draft: SplitDraft;
  totalAmount: number;
  allocations: { participantId: string; amount: number }[];
  remainingAmount: number;
}) {
  const participants = getUsersByIds(draft.participantIds);

  return (
    <SectionCard title="Live split summary" description="Updates instantly as you change amount, participants, or split method.">
      <div className="rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Total request</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{formatCurrency(totalAmount, draft.currency)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
            <div className="flex items-center gap-1 text-xs text-white/60">
              <Users className="h-3.5 w-3.5" />
              <span>{participants.length} participants</span>
            </div>
            <p className="mt-1 text-sm font-medium capitalize">{draft.splitMethod} split</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {participants.length ? (
            participants.map((participant) => {
              const allocation = allocations.find((item) => item.participantId === participant.id);

              return (
                <div key={participant.id} className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-3">
                  <div>
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-xs text-white/55">{participant.accountId}</p>
                  </div>
                  <p className="font-medium">{formatCurrency(allocation?.amount ?? 0, draft.currency)}</p>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-3 py-4 text-sm text-white/65">
              Add participants to preview each share.
            </div>
          )}
        </div>

        {draft.splitMethod === 'custom' ? (
          <p className={`mt-4 text-sm ${remainingAmount === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {remainingAmount === 0
              ? 'Custom allocations match the bill total.'
              : `${formatCurrency(Math.abs(remainingAmount), draft.currency)} ${remainingAmount > 0 ? 'left to assign' : 'over allocated'}.`}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
