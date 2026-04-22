import { Users } from 'lucide-react';
import { SplitDraft } from '../types';
import { formatCurrency, getSplitMemberName, getSplitMembers, getSplitMethodLabel } from '../utils';
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
  const members = getSplitMembers(draft);

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
              <span>{members.length} in this split</span>
            </div>
            <p className="mt-1 text-sm font-medium">{getSplitMethodLabel(draft.splitMethod)}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {members.length ? (
            members.map((member) => {
              const allocation = allocations.find((item) => item.participantId === member.id);

              return (
                <div key={member.id} className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-3">
                  <div>
                    <p className="font-medium">{getSplitMemberName(member)}</p>
                    <p className="text-xs text-white/55">{member.accountId}</p>
                  </div>
                  <p className="font-medium">{formatCurrency(allocation?.amount ?? 0, draft.currency)}</p>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-3 py-4 text-sm text-white/65">
              Add at least one participant to preview the split.
            </div>
          )}
        </div>

        {draft.splitMethod !== 'equal' ? (
          <p className={`mt-4 text-sm ${remainingAmount === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {draft.splitMethod === 'amount'
              ? remainingAmount === 0
                ? 'Entered amounts match the bill total.'
                : `${formatCurrency(Math.abs(remainingAmount), draft.currency)} ${remainingAmount > 0 ? 'left to assign' : 'over allocated'}.`
              : draft.splitMethod === 'percentage'
                ? `${Math.abs(remainingAmount).toFixed(2)}% ${remainingAmount > 0 ? 'left to assign' : 'over allocated'}.`
                : remainingAmount === 0
                  ? 'Items are balanced across the bill total.'
                  : `${formatCurrency(Math.abs(remainingAmount), draft.currency)} still tied to unassigned receipt items.`}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
