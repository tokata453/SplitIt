import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getGroupById,
  getRecurringOwnerOutstanding,
  getRecurringParticipantOutstanding,
  getRecurringCurrentUserCarryover,
  getRecurringCurrentUserCycleAmount,
  getRecurringCurrentUserCycleStatus,
  Group,
} from '../utils/splitItData';
import { fetchGroupById, onGroupsChanged, patchGroup } from '../utils/splitItApi';

function syncActiveRecurringCycle(group: Group, membersList: Group['membersList']) {
  if (!group.recurring) {
    return group.recurring;
  }

  return {
    ...group.recurring,
    cycles: group.recurring.cycles.map((cycle) => {
      if (cycle.id !== group.recurring?.activeCycleId) {
        return cycle;
      }

      const nextMembers = cycle.members.map((member) => {
        const matchedGroupMember = membersList.find((groupMember) => groupMember.name === member.name);
        return matchedGroupMember ? { ...member, status: matchedGroupMember.status } : member;
      });
      const collectedAmount = nextMembers
        .filter((member) => member.status === 'paid')
        .reduce((sum, member) => sum + member.amount, 0);
      const outstandingAmount = nextMembers
        .filter((member) => member.status !== 'paid')
        .reduce((sum, member) => sum + member.amount, 0);

      return {
        ...cycle,
        members: nextMembers,
        collectedAmount: Number(collectedAmount.toFixed(2)),
        outstandingAmount: Number(outstandingAmount.toFixed(2)),
        status: outstandingAmount === 0 ? 'completed' : collectedAmount > 0 ? 'partial' : cycle.status,
      };
    }),
  };
}

function applyRecurringPayment(group: Group) {
  const currentUser = group.membersList.find((member) => member.isYou);

  if (!group.recurring || !currentUser) {
    return {
      recurring: group.recurring,
      paidAmount: group.yourShare,
      activeMemberStatus: currentUser?.status ?? 'pending',
    };
  }

  let paidAmount = 0;
  let activeMemberStatus = currentUser.status;
  const nextCycles = [...group.recurring.cycles]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((cycle) => {
      const cycleMember = cycle.members.find((member) => member.isYou || member.name === currentUser.name);

      if (!cycleMember || cycleMember.status === 'paid') {
        return cycle;
      }

      paidAmount += cycleMember.amount;
      if (cycle.id === group.recurring?.activeCycleId) {
        activeMemberStatus = 'paid';
      }

      return {
        ...cycle,
        members: cycle.members.map((member) => (
          member.id === cycleMember.id ? { ...member, status: 'paid' as const } : member
        )),
      };
    });

  return {
    recurring: {
      ...group.recurring,
      cycles: nextCycles,
    },
    paidAmount,
    activeMemberStatus,
  };
}

export function PaymentReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId } = useParams();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [group, setGroup] = useState<Group | undefined>(() => getGroupById(groupId));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadGroup = async () => {
      const nextGroup = await fetchGroupById(groupId);
      if (!isMounted) return;
      setGroup(nextGroup);
      setIsApproved(Boolean(nextGroup?.membersList.find((member) => member.isYou)?.status === 'approved'));
    };

    void loadGroup();

    const unsubscribe = onGroupsChanged(() => {
      void loadGroup();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [groupId]);

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f] flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white px-6 py-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-3">Review unavailable</h1>
          <button onClick={() => navigate('/splitit')} className="rounded-xl bg-[#2d4a6f] px-4 py-3 text-sm font-medium text-white">
            Back
          </button>
        </div>
      </div>
    );
  }

  const currentUser = group.membersList.find((member) => member.isYou);
  const viewerRole = ((location.state as { viewerRole?: 'owner' | 'participant' } | null)?.viewerRole) ?? group.role;
  const isOwnerViewer = viewerRole === 'owner';
  const currentStatus = group.recurring && !isOwnerViewer
    ? getRecurringCurrentUserCycleStatus(group) ?? (currentUser?.status ?? 'pending')
    : currentUser?.status ?? 'pending';
  const isReadOnlyReview = currentStatus === 'paid' || currentStatus === 'rejected';
  const isPaidReview = currentStatus === 'paid';
  const isRejectedReview = currentStatus === 'rejected';
  const hasApprovedState = isApproved || currentStatus === 'approved';
  const recurringReviewAmount = group.recurring
    ? (isOwnerViewer ? getRecurringOwnerOutstanding(group) : getRecurringParticipantOutstanding(group))
    : 0;
  const reviewAmount = group.recurring
    ? recurringReviewAmount
    : isOwnerViewer
    ? group.totalAmount
    : group.yourShare;

  const handleResplit = () => {
    navigate(`/splitit/group/${groupId}/split`, {
      state: {
        mode: 'revision',
        groupName: group.name,
        invitationMethod: 'invite',
        ownerPays: group.ownerPays ?? true,
        totalAmount: group.totalAmount,
        items: group.review.items.map((item, index) => ({
          id: `${group.id}-${index}`,
          name: item.name,
          price: item.price,
          quantity: 1,
        })),
        members: group.membersList.filter((member) => !member.isYou).map((member) => ({
          id: member.id,
          name: member.name,
          phone: '',
        })),
        presetMembers: group.membersList.map((member) => ({
          id: member.isYou ? 'owner' : member.id,
          name: member.name,
          amount: member.amount,
          items: [],
          percentage: group.totalAmount > 0 ? (member.amount / group.totalAmount) * 100 : 0,
          shareUnits: 1,
        })),
        rejectionReason: group.review.rejectionReason,
      },
    });
  };

  const handleApprove = async () => {
    if (!groupId) return;

    setIsSaving(true);
    const nextGroup = await patchGroup(groupId, (currentGroup) => ({
      ...currentGroup,
      status: currentGroup.recurring ? 'active' : currentGroup.status,
      membersList: currentGroup.membersList.map((member) => (
        member.isYou ? { ...member, status: 'approved' } : member
      )),
      recurring: syncActiveRecurringCycle(
        currentGroup,
        currentGroup.membersList.map((member) => (
          member.isYou ? { ...member, status: 'approved' } : member
        ))
      ),
      activities: [
        {
          id: `${currentGroup.id}-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          description: 'You approved your split and are ready to pay',
          amount: currentGroup.recurring ? getRecurringParticipantOutstanding(currentGroup) : currentGroup.yourShare,
          status: 'pending',
        },
        ...currentGroup.activities,
      ],
    }));
    setGroup(nextGroup);
    setIsApproved(true);
    setIsSaving(false);
  };
  const handlePay = async () => {
      if (!groupId) return;

      setIsSaving(true);
      const nextGroup = await patchGroup(groupId, (currentGroup) => {
        const recurringPayment = applyRecurringPayment(currentGroup);
        const nextMembersList = currentGroup.membersList.map((member) => (
          member.isYou ? { ...member, status: recurringPayment.activeMemberStatus } : member
        ));
        const everyonePaid = nextMembersList.every((member) => member.status === 'paid');
        const nextRecurring = currentGroup.recurring
          ? syncActiveRecurringCycle(
              {
                ...currentGroup,
                recurring: recurringPayment.recurring,
              },
              nextMembersList
            )
          : syncActiveRecurringCycle(currentGroup, nextMembersList);
        const nextRecurringOutstanding = currentGroup.recurring
          ? getRecurringParticipantOutstanding({
              ...currentGroup,
              membersList: nextMembersList,
              recurring: nextRecurring,
            })
          : 0;

        return {
          ...currentGroup,
          paid: currentGroup.recurring ? nextRecurringOutstanding === 0 : true,
          status: currentGroup.recurring ? 'active' : everyonePaid ? 'completed' : 'active',
          membersList: nextMembersList,
          recurring: nextRecurring,
          activities: [
            {
              id: `${currentGroup.id}-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              description: 'You completed payment',
              amount: currentGroup.recurring ? recurringPayment.paidAmount : currentGroup.yourShare,
              status: 'paid',
            },
            ...currentGroup.activities,
          ],
        };
      });
      setGroup(nextGroup);
      setIsSaving(false);

      navigate('/splitit/payment-success', {
        state: {
          amount: reviewAmount,
        },
      });
    };
  const handleReject = async () => {
    if (!rejectReason || !groupId) return;

    setIsSaving(true);
    await patchGroup(groupId, (currentGroup) => ({
      ...currentGroup,
      status: currentGroup.recurring ? 'active' : 'pending',
      paid: false,
      membersList: currentGroup.membersList.map((member) => (
        member.isYou ? { ...member, status: 'rejected', note: rejectReason } : member
      )),
      recurring: syncActiveRecurringCycle(
        currentGroup,
        currentGroup.membersList.map((member) => (
          member.isYou ? { ...member, status: 'rejected', note: rejectReason } : member
        ))
      ),
      activities: [
        {
          id: `${currentGroup.id}-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          description: 'You rejected your assigned split',
          amount: currentGroup.yourShare,
          status: 'rejected',
        },
        ...currentGroup.activities,
      ],
      review: {
        ...currentGroup.review,
        rejectionReason: rejectReason,
      },
    }));
    setIsSaving(false);

    navigate(`/splitit/group/${groupId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <div className="px-4 pt-12 pb-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate(`/splitit/group/${groupId}`)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">Review</h1>
            <div className="w-10" />
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-5 text-center">
            <p className="text-sm text-white/60 mb-2">{group.name}</p>
            <p className="text-4xl font-semibold text-white">
              ${reviewAmount.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-white/70">
              {isOwnerViewer
                ? 'Review the bill before sending an updated split.'
                : isSaving
                ? 'Saving changes...'
                : isPaidReview
                ? 'Payment completed.'
                : isRejectedReview
                ? 'You rejected this bill.'
                : hasApprovedState
                ? 'Approved. Ready for payment.'
                : 'Review the split before payment.'}
            </p>
          </div>
        </div>

        <div className="flex-1 rounded-t-3xl bg-[#f7f8fa] px-4 py-5 overflow-y-auto">
          <>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-3">
              <p className="text-sm text-slate-500 mb-3">Items</p>
              <div className="space-y-3">
                {group.review.items.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between">
                    <span className="text-sm text-slate-900">{item.name}</span>
                    <span className="text-sm font-medium text-slate-900">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {group.review.rejectionReason && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 mb-3">
                <p className="text-sm text-red-700">{group.review.rejectionReason}</p>
              </div>
            )}

            {group.recurring && !isOwnerViewer && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Current cycle</span>
                  <span className="text-sm font-medium text-slate-900">${getRecurringCurrentUserCycleAmount(group).toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Carryover unpaid</span>
                  <span className="text-sm font-medium text-red-600">
                    ${getRecurringCurrentUserCarryover(group).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-lg font-semibold text-slate-900">
                  ${reviewAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          {isOwnerViewer ? (
            <button
              onClick={handleResplit}
              className="w-full rounded-xl bg-[#2d4a6f] px-4 py-4 text-sm font-medium text-white"
            >
              Resplit bill
            </button>
          ) : isReadOnlyReview ? (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              isPaidReview ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {isPaidReview ? 'Paid' : 'Rejected'}
            </div>
          ) : hasApprovedState ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                <span>Split approved</span>
              </div>
              <button
                onClick={handlePay}
                disabled={isSaving}
                className="w-full rounded-xl bg-emerald-500 px-4 py-4 text-sm font-medium text-white disabled:bg-emerald-300"
              >
                {isSaving ? 'Processing...' : 'Pay now'}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isSaving}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-[#2d4a6f] px-4 py-4 text-sm font-medium text-white disabled:bg-slate-300"
              >
                {isSaving ? 'Saving...' : 'Approve'}
              </button>
            </div>
          )}
        </div>

        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/40">
            <div className="w-full rounded-t-3xl bg-white px-4 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Reject</h3>
                <button onClick={() => setShowRejectModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason"
                className="w-full min-h-[120px] resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none"
              />
              <div className="mt-4 flex gap-3">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason}
                  className="flex-1 rounded-xl bg-[#2d4a6f] px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
