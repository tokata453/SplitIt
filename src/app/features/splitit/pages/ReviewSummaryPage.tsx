import { useState } from 'react';
import { ChevronRight, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { sendSplitRequest } from '../api';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { useSplitIt } from '../context';
import { formatCurrency, getSplitMemberName, getSplitMembers, getSplitMethodLabel, validateDraft } from '../utils';

export function ReviewSummaryPage() {
  const navigate = useNavigate();
  const { draft, calculation, receiptPreviewUrl, receiptPreviewType, setLastSentRequest } = useSplitIt();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const splitMembers = getSplitMembers(draft);
  const validationMessage = validateDraft(draft);

  const handleSend = async () => {
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const request = await sendSplitRequest(draft);
      setLastSentRequest(request);
      navigate('/splitit/requests');
    } catch {
      setSubmitError('Unable to send the request right now. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <SplitItLayout
      title="Review request"
      subtitle="A simple final check before SplitIt sends the request to each participant."
      footer={
        <button
          onClick={handleSend}
          disabled={submitting}
          className="w-full rounded-[22px] bg-[#0f3d57] px-4 py-4 text-base font-semibold text-white disabled:cursor-wait disabled:bg-slate-400"
        >
          {submitting ? 'Sending requests...' : 'Send split request'}
        </button>
      }
    >
      <button
        onClick={() => navigate('/splitit/more-details')}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
      >
        <div>
          <p className="font-medium text-slate-900">More options</p>
          <p className="mt-1 text-sm text-slate-500">Receipt, note, and custom split settings</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </button>

      <SectionCard title="Summary">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-white px-2 py-1">
          <div className="px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total amount</p>
            <p className="mt-1 text-base font-semibold tracking-[0.01em] leading-none text-slate-900">
              {formatCurrency(calculation.totalAmount, draft.currency)}
            </p>
          </div>

          <div className="border-l border-slate-100 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Split method</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] leading-none text-slate-900">
              {getSplitMethodLabel(draft.splitMethod)}
            </p>
          </div>
        </div>
      </SectionCard>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Split breakdown</h2>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {splitMembers.length}
          </div>
        </div>
        <div className="space-y-2">
          {splitMembers.map((member) => {
            const allocation = calculation.allocations.find((item) => item.participantId === member.id);

            return (
              <div key={member.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{getSplitMemberName(member)}</p>
                  <p className="truncate text-xs text-slate-500">{member.accountId}</p>
                </div>
                <p className="pl-4 text-base font-medium text-slate-900">{formatCurrency(allocation?.amount ?? 0, draft.currency)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {(draft.receiptFileName || draft.note.trim()) ? (
        <SectionCard title="Added details">
          <div className="space-y-2 text-sm text-slate-600">
            {draft.receiptFileName ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Receipt</p>
                <p className="mt-1 font-medium text-slate-900">{draft.receiptFileName}</p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    <Eye className="h-4 w-4" />
                    Preview receipt
                  </button>
                </div>
              </div>
            ) : null}
            {draft.note.trim() ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Request note</p>
                <p className="mt-1 font-medium text-slate-900">{draft.note.trim()}</p>
              </div>
            ) : null}
            {draft.splitMethod === 'shares' && draft.receiptItems.length ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Receipt items</p>
                <div className="mt-2 space-y-2">
                  {draft.receiptItems.map((item) => {
                    const assignedNames = item.assignedParticipantIds
                      .map((participantId) => splitMembers.find((member) => member.id === participantId))
                      .map((member) => (member ? getSplitMemberName(member) : undefined))
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <p className="truncate text-slate-500">{assignedNames || 'Unassigned'}</p>
                        </div>
                        <p className="font-medium text-slate-900">{formatCurrency(item.amount, draft.currency)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {submitError ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md rounded-[22px]">
          <DialogHeader>
            <DialogTitle>Receipt preview</DialogTitle>
            <DialogDescription>
              Review the uploaded file before sending the request.
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
              <p className="mt-3 text-sm text-slate-500">Receipt preview is available after uploading a file.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SplitItLayout>
  );
}
