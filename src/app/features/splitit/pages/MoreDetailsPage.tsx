import { ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { getUsersByIds } from '../utils';

export function MoreDetailsPage() {
  const navigate = useNavigate();
  const { draft, setSplitMethod, setCustomAmount, setReceiptFileName, setNote } = useSplitIt();
  const participants = getUsersByIds(draft.participantIds);

  const handleReceiptUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const fileName = event.target.files?.[0]?.name;
    setReceiptFileName(fileName);
  };

  return (
    <SplitItLayout
      title="More details"
      footer={
        <button
          onClick={() => navigate('/splitit/review')}
          className="w-full rounded-[22px] bg-[#0f3d57] px-4 py-4 text-base font-semibold text-white"
        >
          Done
        </button>
      }
    >
      <SectionCard title="Receipt">
        <label className="flex cursor-pointer items-center justify-between rounded-[22px] border border-dashed border-slate-300 px-4 py-4">
          <p className="font-medium text-slate-900">{draft.receiptFileName ?? 'Attach receipt'}</p>
          <span className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Choose file</span>
          <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="hidden" />
        </label>
      </SectionCard>

      <SectionCard title="Split method">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSplitMethod('equal')}
            className={`rounded-[22px] px-4 py-4 text-left ${draft.splitMethod === 'equal' ? 'bg-[#0f3d57] text-white' : 'bg-slate-50 text-slate-700'}`}
          >
            <p className="font-semibold">Equal split</p>
          </button>
          <button
            onClick={() => setSplitMethod('custom')}
            className={`rounded-[22px] px-4 py-4 text-left ${draft.splitMethod === 'custom' ? 'bg-[#0f3d57] text-white' : 'bg-slate-50 text-slate-700'}`}
          >
            <p className="font-semibold">Custom split</p>
          </button>
        </div>

        {draft.splitMethod === 'custom' ? (
          <div className="mt-4 space-y-3">
            {participants.length ? (
              participants.map((participant) => (
                <div key={participant.id} className="rounded-[22px] border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{participant.name}</p>
                      <p className="text-xs text-slate-500">{participant.accountId}</p>
                    </div>
                    <input
                      inputMode="decimal"
                      value={draft.customAmounts[participant.id] ?? ''}
                      onChange={(event) => setCustomAmount(participant.id, event.target.value)}
                      placeholder="0.00"
                      className="h-12 w-28 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-right font-semibold outline-none focus:border-[#0f3d57]"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] bg-slate-50 px-4 py-4 text-sm text-slate-500">Add participants first.</div>
            )}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Note">
        <textarea
          value={draft.note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add note"
          className="min-h-24 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0f3d57]"
        />
      </SectionCard>
    </SplitItLayout>
  );
}
