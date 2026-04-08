import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Share2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getGroupById, Group } from '../utils/splitItData';
import { fetchGroupById, onGroupsChanged } from '../utils/splitItApi';

export function GroupDetail() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');
  const [group, setGroup] = useState<Group | undefined>(() => getGroupById(groupId));

  useEffect(() => {
    let isMounted = true;

    const loadGroup = async () => {
      const nextGroup = await fetchGroupById(groupId);
      if (!isMounted) return;
      setGroup(nextGroup);
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
        <div className="rounded-3xl bg-white px-6 py-8 text-center max-w-sm">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Group not found</h1>
          <button
            onClick={() => navigate('/splitit')}
            className="rounded-xl bg-[#2d4a6f] px-4 py-3 text-sm font-medium text-white"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const paidCount = group.membersList.filter((member) => member.status === 'paid').length;
  const rejectedCount = group.membersList.filter((member) => member.status === 'rejected').length;
  const hasOtherRejectedParticipant = group.role === 'participant' && group.membersList.some((member) => !member.isYou && member.status === 'rejected');
  const ownerOutstanding = group.membersList
    .filter((member) => !member.isYou && member.status !== 'paid')
    .reduce((sum, member) => sum + member.amount, 0);
  const currentUser = group.membersList.find((member) => member.isYou);
  const canParticipantReview = group.role === 'participant';
  const activeCycle = group.recurring?.cycles.find((cycle) => cycle.id === group.recurring?.activeCycleId) ?? group.recurring?.cycles[0];
  const cycleHistory = group.recurring?.cycles.filter((cycle) => cycle.id !== activeCycle?.id) ?? [];
  const recurringOutstanding = (activeCycle?.outstandingAmount ?? 0) + (group.recurring?.unpaidCarryoverAmount ?? 0);
  const cycleStatusStyles = {
    due: 'bg-amber-50 text-amber-700',
    partial: 'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
    overdue: 'bg-red-50 text-red-700',
    upcoming: 'bg-slate-100 text-slate-700',
  } as const;

  const handleReview = () => navigate(`/splitit/group/${groupId}/review/you`);
  const handleOwnerReview = () =>
    navigate(`/splitit/group/${groupId}/review/owner`, {
      state: { viewerRole: 'owner' },
    });
  const handleShare = () => alert('Share link would open here');
  const handleRecheckBill = () => {
    navigate(`/splitit/group/${groupId}/invoice`, {
      state: {
        mode: 'revision',
        groupName: group.name,
        invitationMethod: 'invite',
        members: group.membersList.filter((member) => !member.isYou).map((member) => ({
          id: member.id,
          name: member.name,
          phone: '',
        })),
        items: group.review.items.map((item, index) => ({
          id: `${group.id}-${index}`,
          name: item.name,
          price: item.price,
          quantity: 1,
        })),
        rejectionReason: group.review.rejectionReason,
      },
    });
  };
  const handleEditSplit = () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <div className="px-4 pt-12 pb-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate('/splitit')} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">Group</h1>
            <button onClick={handleShare} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{group.name}</h2>
                <p className="text-sm text-white/65 mt-1">
                  {group.billingMode === 'recurring' ? 'recurring' : group.role}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">{group.role === 'owner' ? 'To collect' : 'Your share'}</p>
                <p className="text-xl font-semibold text-white">
                  ${(
                    group.billingMode === 'recurring'
                      ? recurringOutstanding
                      : group.role === 'owner'
                      ? ownerOutstanding
                      : group.yourShare
                  ).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${(paidCount / group.membersList.length) * 100}%` }}
              />
            </div>
          </div>
 
          <div className="mt-4 flex gap-2 rounded-full bg-white/10 p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === 'overview' ? 'bg-white text-[#1e3a5f]' : 'text-white/70'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === 'activity' ? 'bg-white text-[#1e3a5f]' : 'text-white/70'
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-t-3xl bg-[#f7f8fa] px-4 py-5 overflow-y-auto">
          {activeTab === 'overview' ? (
            <div className="space-y-3">
              {group.recurring && activeCycle && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Current cycle</p>
                        <p className="mt-1 font-medium text-slate-900">{activeCycle.label}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Due {activeCycle.dueDate} • Next {group.recurring.nextCycleDate}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cycleStatusStyles[activeCycle.status]}`}>
                        {activeCycle.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-3">
                        <p className="text-xs text-slate-500">Cycle total</p>
                        <p className="mt-1 font-semibold text-slate-900">${activeCycle.totalAmount.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-3">
                        <p className="text-xs text-slate-500">Collected</p>
                        <p className="mt-1 font-semibold text-emerald-600">${activeCycle.collectedAmount.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-3">
                        <p className="text-xs text-slate-500">Outstanding</p>
                        <p className="mt-1 font-semibold text-slate-900">${activeCycle.outstandingAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {group.recurring.unpaidCarryoverAmount > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-red-500">Carryover unpaid</p>
                      <p className="mt-1 text-lg font-semibold text-red-700">
                        ${group.recurring.unpaidCarryoverAmount.toFixed(2)}
                      </p>
                      <p className="mt-1 text-sm text-red-600">
                        Unpaid sub-bills from previous cycles stay separate from the current cycle.
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-medium text-slate-900">Cycle history</p>
                      <span className="text-xs text-slate-400">{group.recurring.rule}</span>
                    </div>
                    <div className="space-y-3">
                      {[activeCycle, ...cycleHistory].slice(0, 3).map((cycle) => (
                        <div key={cycle.id} className="rounded-xl bg-slate-50 px-3 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{cycle.label}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Due {cycle.dueDate} • Outstanding ${cycle.outstandingAmount.toFixed(2)}
                              </p>
                            </div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cycleStatusStyles[cycle.status]}`}>
                              {cycle.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {group.membersList.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{member.name}</p>
                        {member.isYou && <span className="text-xs text-slate-400">You</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">${member.amount.toFixed(2)}</p>
                    </div>
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      member.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : member.status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : member.status === 'approved'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {member.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                      {member.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {member.status === 'approved' && <Clock className="w-3 h-3" />}
                      {member.status === 'pending' && <AlertCircle className="w-3 h-3" />}
                      {member.status}
                    </div>
                  </div>
                  {member.note && <p className="mt-3 text-sm text-red-600">{member.note}</p>}
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                {group.role === 'owner' ? (
                  <div className="flex gap-2">
                    <button onClick={handleOwnerReview} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                      Review bill
                    </button>
                    <button
                      onClick={rejectedCount > 0 ? handleRecheckBill : handleEditSplit}
                      className="flex-1 rounded-xl bg-[#2d4a6f] px-4 py-3 text-sm font-medium text-white"
                    >
                      Resplit
                    </button>
                  </div>
                ) : canParticipantReview ? (
                  <div className="space-y-3">
                    <button onClick={handleReview} className="w-full rounded-xl bg-[#2d4a6f] px-4 py-3 text-sm font-medium text-white">
                      Review bill
                    </button>
                    {hasOtherRejectedParticipant && (
                      <p className="text-sm text-red-600">
                        Another participant rejected this split. You can still review the current bill while waiting for an update.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    {currentUser?.status === 'rejected' ? 'Waiting for updated split.' : 'No action required.'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {group.activities.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{activity.description}</p>
                      <p className="text-xs text-slate-500 mt-1">{activity.date}</p>
                    </div>
                    <p className="font-medium text-slate-900">${activity.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
