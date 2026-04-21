import { ChangeEvent, useEffect, useState } from 'react';
import { Eye, FileText, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { useSplitIt } from '../context';
import { SplitMethod } from '../types';
import { buildMockReceiptItems, formatCurrency, getSplitMethodLabel, getUsersByIds } from '../utils';

const splitMethodOptions: { id: SplitMethod; title: string; helper: string }[] = [
  { id: 'equal', title: 'Equal', helper: 'Split the total evenly.' },
  { id: 'amount', title: 'Amount', helper: 'Enter exact amounts.' },
  { id: 'percentage', title: 'Percent', helper: 'Use percentages up to 100%.' },
  { id: 'shares', title: 'Items', helper: 'Assign receipt items to participants.' },
];

const noteSuggestions = ['Dinner split', 'Team expense', 'Please confirm today'];

export function MoreDetailsPage() {
  const navigate = useNavigate();
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewType, setReceiptPreviewType] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const {
    draft,
    calculation,
    setSplitMethod,
    setCustomAmount,
    setPercentageShare,
    setReceiptFileName,
    setReceiptItems,
    toggleReceiptItemParticipant,
    setNote,
  } = useSplitIt();
  const participants = getUsersByIds(draft.participantIds);
  const hasReceipt = Boolean(draft.receiptFileName);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  const handleReceiptUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const fileName = file?.name;

    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }

    setReceiptPreviewUrl(file ? URL.createObjectURL(file) : null);
    setReceiptPreviewType(file?.type ?? '');
    setReceiptFileName(fileName);
    setReceiptItems(fileName ? buildMockReceiptItems(calculation.totalAmount) : []);
  };

  const handleRemoveReceipt = () => {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }

    setReceiptPreviewUrl(null);
    setReceiptPreviewType('');
    setIsPreviewOpen(false);
    setReceiptFileName(undefined);
    setReceiptItems([]);

    if (draft.splitMethod === 'shares') {
      setSplitMethod('equal');
    }
  };

  const fillEqualAmounts = () => {
    if (!participants.length || calculation.totalAmount <= 0) {
      return;
    }

    const perPersonAmount = calculation.totalAmount / participants.length;

    participants.forEach((participant, index) => {
      const amount = index === participants.length - 1
        ? calculation.totalAmount - perPersonAmount * index
        : perPersonAmount;

      setCustomAmount(participant.id, amount.toFixed(2));
    });
  };

  const fillEqualPercentages = () => {
    if (!participants.length) {
      return;
    }

    const basePercentage = 100 / participants.length;

    participants.forEach((participant, index) => {
      const value = index === participants.length - 1
        ? 100 - basePercentage * index
        : basePercentage;

      setPercentageShare(participant.id, value.toFixed(2));
    });
  };

  const clearMethodInputs = () => {
    participants.forEach((participant) => {
      setCustomAmount(participant.id, '');
      setPercentageShare(participant.id, '');
    });
  };

  const percentageTotal = participants.reduce((sum, participant) => {
    const value = Number(draft.percentageShares?.[participant.id] ?? '0');
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const updateReceiptItem = (itemId: string, field: 'label' | 'amount', value: string) => {
    setReceiptItems(
      draft.receiptItems.map((item) => (
        item.id !== itemId
          ? item
          : {
              ...item,
              [field]: field === 'label' ? value : Number.isFinite(Number(value)) ? Number(value) : 0,
            }
      )),
    );
  };

  const removeReceiptItem = (itemId: string) => {
    setReceiptItems(draft.receiptItems.filter((item) => item.id !== itemId));
  };

  const addReceiptItem = () => {
    setReceiptItems([
      ...draft.receiptItems,
      {
        id: `receipt-item-${Date.now()}`,
        label: `New item ${draft.receiptItems.length + 1}`,
        amount: 0,
        assignedParticipantIds: [],
      },
    ]);
  };

  return (
    <SplitItLayout
      title="More details"
      subtitle="Add a receipt, choose how to split, and leave a short note before sending."
      footer={
        <button
          onClick={() => navigate('/splitit/review')}
          className="w-full rounded-[18px] bg-slate-900 px-4 py-4 text-base font-semibold text-white"
        >
          Save details
        </button>
      }
    >
      <SectionCard title="Receipt">
        <label className="flex cursor-pointer items-center justify-between rounded-[18px] border border-slate-200 px-4 py-4">
          <div>
            <p className="font-medium text-slate-900">{draft.receiptFileName ?? 'No receipt attached'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {hasReceipt ? `${draft.receiptItems.length} items extracted` : 'Image or PDF'}
            </p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {draft.receiptFileName ? 'Replace' : 'Upload'}
          </span>
          <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="hidden" />
        </label>
        {hasReceipt ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <Eye className="h-4 w-4" />
              Preview receipt
            </button>
            <button
              type="button"
              onClick={handleRemoveReceipt}
              className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
            >
              Remove receipt
            </button>
          </div>
        ) : null}

        {hasReceipt ? (
          <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Edit extracted receipt</p>
                <p className="mt-1 text-sm text-slate-500">Review item names and amounts before assigning them.</p>
              </div>
              <button
                type="button"
                onClick={addReceiptItem}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>

            <div className="space-y-3">
              {draft.receiptItems.length ? (
                draft.receiptItems.map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-slate-200 bg-white p-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_120px_44px] items-center gap-2">
                      <input
                        value={item.label}
                        onChange={(event) => updateReceiptItem(item.id, 'label', event.target.value)}
                        placeholder="Item name"
                        className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 outline-none"
                      />
                      <input
                        inputMode="decimal"
                        value={item.amount}
                        onChange={(event) => updateReceiptItem(item.id, 'amount', event.target.value)}
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-right text-sm font-semibold text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeReceiptItem(item.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:text-slate-900"
                        aria-label={`Remove ${item.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                  No receipt items yet. Add one manually or upload the receipt again after entering the bill total.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Split method" description="Choose one clear way to divide the bill.">
        <div className="grid grid-cols-2 gap-2">
          {splitMethodOptions.map((option) => {
            const isActive = draft.splitMethod === option.id;
            const isDisabled = option.id === 'shares' && !hasReceipt;

            return (
              <button
                key={option.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    setSplitMethod(option.id);
                  }
                }}
                className={`rounded-[18px] border px-4 py-4 text-left transition ${
                  isDisabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <p className="text-sm font-semibold">{option.title}</p>
                <p className={`mt-1 text-xs ${isDisabled ? 'text-slate-400' : isActive ? 'text-white/70' : 'text-slate-500'}`}>
                  {isDisabled ? 'Attach receipt first.' : option.helper}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[18px] bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{getSplitMethodLabel(draft.splitMethod)}</p>
              <p className="mt-1 text-sm text-slate-500">
                Total {formatCurrency(calculation.totalAmount, draft.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
              <p className={`mt-1 text-sm font-semibold ${calculation.isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                {calculation.isValid ? 'Balanced' : 'Needs input'}
              </p>
            </div>
          </div>

          {draft.splitMethod === 'amount' ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fillEqualAmounts}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Fill evenly
              </button>
              <button
                type="button"
                onClick={clearMethodInputs}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Clear
              </button>
            </div>
          ) : null}

          {draft.splitMethod === 'percentage' ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fillEqualPercentages}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Fill evenly
              </button>
              <button
                type="button"
                onClick={clearMethodInputs}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Clear
              </button>
              <p className="text-sm text-slate-500">Current total: {percentageTotal.toFixed(2)}%</p>
            </div>
          ) : null}

          {draft.splitMethod === 'shares' ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-500">
                {draft.receiptItems.length} items extracted • {formatCurrency(calculation.remainingAmount, draft.currency)} unassigned
              </p>
            </div>
          ) : null}
        </div>

        {draft.splitMethod === 'equal' ? (
          <div className="mt-4 rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-500">
            SplitIt will divide the total equally across {participants.length || 0} participants.
          </div>
        ) : null}

        {draft.splitMethod === 'amount' ? (
          <div className="mt-4 space-y-2">
            {participants.length ? (
              participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between rounded-[18px] border border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{participant.name}</p>
                    <p className="text-xs text-slate-500">{participant.accountId}</p>
                  </div>
                  <input
                    inputMode="decimal"
                    value={draft.customAmounts[participant.id] ?? ''}
                    onChange={(event) => setCustomAmount(participant.id, event.target.value)}
                    placeholder="0.00"
                    className="h-11 w-24 rounded-xl border border-slate-200 px-3 text-right text-sm font-semibold text-slate-900 outline-none"
                  />
                </div>
              ))
            ) : (
              <div className="mt-4 rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-500">Add participants first.</div>
            )}
          </div>
        ) : null}

        {draft.splitMethod === 'percentage' ? (
          <div className="mt-4 space-y-2">
            {participants.length ? (
              participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between rounded-[18px] border border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{participant.name}</p>
                    <p className="text-xs text-slate-500">{participant.accountId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="decimal"
                      value={draft.percentageShares?.[participant.id] ?? ''}
                      onChange={(event) => setPercentageShare(participant.id, event.target.value)}
                      placeholder="0"
                      className="h-11 w-20 rounded-xl border border-slate-200 px-3 text-right text-sm font-semibold text-slate-900 outline-none"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="mt-4 rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-500">Add participants first.</div>
            )}
          </div>
        ) : null}

        {draft.splitMethod === 'shares' ? (
          <div className="mt-4 space-y-2">
            {!hasReceipt ? (
              <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                Attach a receipt to extract items before assigning them.
              </div>
            ) : !participants.length ? (
              <div className="rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-500">Add participants first.</div>
            ) : draft.receiptItems.length ? (
              draft.receiptItems.map((item) => {
                const assignedNames = item.assignedParticipantIds
                  .map((participantId) => participants.find((participant) => participant.id === participantId)?.name)
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div key={item.id} className="rounded-[18px] border border-slate-200 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {assignedNames || 'Tap participants below to assign this item.'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount, draft.currency)}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {participants.map((participant) => {
                        const isSelected = item.assignedParticipantIds.includes(participant.id);

                        return (
                          <button
                            key={participant.id}
                            type="button"
                            onClick={() => toggleReceiptItemParticipant(item.id, participant.id)}
                            className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            {participant.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-500">
                No items extracted yet. Re-upload the receipt after entering the bill total.
              </div>
            )}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Note">
        <div className="mb-3 flex flex-wrap gap-2">
          {noteSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setNote(draft.note.trim() ? `${draft.note.trim()}\n${suggestion}` : suggestion)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <textarea
          value={draft.note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          className="min-h-24 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
        />
      </SectionCard>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md rounded-[22px]">
          <DialogHeader>
            <DialogTitle>Receipt preview</DialogTitle>
            <DialogDescription>
              Review the uploaded file before editing the extracted receipt items.
            </DialogDescription>
          </DialogHeader>

          {receiptPreviewUrl ? (
            receiptPreviewType.startsWith('image/') ? (
              <img
                src={receiptPreviewUrl}
                alt={draft.receiptFileName ?? 'Receipt preview'}
                className="max-h-[70vh] w-full rounded-[18px] border border-slate-200 object-contain"
              />
            ) : receiptPreviewType === 'application/pdf' ? (
              <iframe
                src={receiptPreviewUrl}
                title={draft.receiptFileName ?? 'Receipt PDF preview'}
                className="h-[70vh] w-full rounded-[18px] border border-slate-200"
              />
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <FileText className="h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-900">{draft.receiptFileName}</p>
                <p className="mt-1 text-sm text-slate-500">Preview is not available for this file type.</p>
              </div>
            )
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-center">
              <ImageIcon className="h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">Upload a receipt to preview it here.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SplitItLayout>
  );
}
