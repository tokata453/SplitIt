import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Users, Clock, CheckCircle, DollarSign, TrendingUp, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchGroups, onGroupsChanged } from '../utils/splitItApi';
import { getGroups, Group } from '../utils/splitItData';

export function SplitItHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'owner' | 'participant'>('all');
  const [groups, setGroups] = useState<Group[]>(() => getGroups());

  useEffect(() => {
    let isMounted = true;

    const loadGroups = async () => {
      const nextGroups = await fetchGroups();
      if (!isMounted) return;
      setGroups(nextGroups);
    };

    void loadGroups();

    const unsubscribe = onGroupsChanged(() => {
      void loadGroups();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const activeGroups = groups.filter((group) => group.status !== 'completed');
  const completedGroups = groups.filter((group) => group.status === 'completed');
  const filteredActiveGroups = activeGroups.filter(
    (group) => activeRoleFilter === 'all' || group.role === activeRoleFilter
  );

  const totalOwed = activeGroups
    .filter((group) => group.role === 'participant' && !group.paid)
    .reduce((sum, group) => sum + group.yourShare, 0);
  const totalSettled = completedGroups.reduce(
    (sum, group) => sum + (group.role === 'owner' ? group.totalAmount : group.yourShare),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <div className="px-4 pt-12 pb-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">SplitIt</h1>
            <button
              onClick={() => navigate('/splitit/create-group')}
              className="w-10 h-10 rounded-full bg-white text-[#1e3a5f] flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl bg-white/10 px-4 py-4">
              <div className="flex items-center gap-2 mb-2 text-white/65">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">You owe</span>
              </div>
              <p className="text-2xl font-semibold text-white">${totalOwed.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-4">
              <div className="flex items-center gap-2 mb-2 text-white/65">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Settled</span>
              </div>
              <p className="text-2xl font-semibold text-white">${totalSettled.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-2 rounded-full bg-white/10 p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === 'active' ? 'bg-white text-[#1e3a5f]' : 'text-white/70'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === 'history' ? 'bg-white text-[#1e3a5f]' : 'text-white/70'
              }`}
            >
              History
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-t-3xl bg-[#f7f8fa] px-4 py-5 overflow-y-auto">
          {activeTab === 'active' ? (
            <div className="space-y-3">
              <div className="flex gap-2 rounded-2xl bg-white p-1 border border-slate-200">
                {(['all', 'owner', 'participant'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveRoleFilter(filter)}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium capitalize ${
                      activeRoleFilter === filter ? 'bg-[#2d4a6f] text-white' : 'text-slate-500'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {filteredActiveGroups.length > 0 ? (
                filteredActiveGroups.map((group) => {
                  const currentUser = group.membersList.find((member) => member.isYou);
                  const hasRejectedMember = group.membersList.some((member) => member.status === 'rejected');
                  const isCurrentUserRejected = currentUser?.status === 'rejected';
                  const activeCycle = group.recurring?.cycles.find((cycle) => cycle.id === group.recurring?.activeCycleId) ?? group.recurring?.cycles[0];
                  const carryoverAmount = group.recurring?.unpaidCarryoverAmount ?? 0;
                  const amount = group.billingMode === 'recurring'
                    ? group.role === 'owner'
                      ? (activeCycle?.outstandingAmount ?? 0) + carryoverAmount
                      : group.yourShare + carryoverAmount
                    : group.role === 'owner'
                    ? (group.ownerCollectionAmount ?? 0)
                    : group.yourShare;
                  const statusLabel = group.role === 'owner'
                    ? hasRejectedMember
                      ? 'Needs revision'
                      : amount > 0
                      ? 'Collecting'
                      : 'Completed'
                    : isCurrentUserRejected
                    ? 'Rejected'
                    : hasRejectedMember
                    ? 'Needs revision'
                    : group.status === 'pending'
                    ? 'Awaiting review'
                    : group.paid
                    ? 'Paid'
                    : 'Pay now';

                  return (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/splitit/group/${group.id}`)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-slate-400" />
                            <h3 className="font-medium text-slate-900 truncate">{group.name}</h3>
                            {group.billingMode === 'recurring' && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                recurring
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {group.members} members • {group.role}
                            {group.recurring ? ` • next ${group.recurring.nextCycleDate}` : ''}
                          </p>
                          {carryoverAmount > 0 && (
                            <p className="mt-1 text-xs text-red-600">
                              ${carryoverAmount.toFixed(2)} unpaid from previous cycle
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">${amount.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">
                            {group.billingMode === 'recurring'
                              ? group.role === 'owner'
                                ? 'Cycle + carryover'
                                : 'Due + carryover'
                              : group.role === 'owner'
                              ? 'To collect'
                              : 'Your share'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-4 h-4" />
                          <span>{group.date}</span>
                        </div>
                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusLabel === 'Rejected' || statusLabel === 'Needs revision'
                            ? 'bg-red-50 text-red-700'
                            : statusLabel === 'Awaiting review'
                            ? 'bg-amber-50 text-amber-700'
                            : statusLabel === 'Paid' || statusLabel === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {(statusLabel === 'Rejected' || statusLabel === 'Needs revision') && <XCircle className="w-3 h-3" />}
                          {statusLabel}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-white px-6 py-10 text-center border border-slate-200">
                  <h3 className="font-medium text-slate-900 mb-1">
                    {activeRoleFilter === 'all' ? 'No active groups' : `No ${activeRoleFilter} groups`}
                  </h3>
                  <p className="text-sm text-slate-500 mb-5">
                    {activeRoleFilter === 'owner'
                      ? 'You have no active groups as owner.'
                      : activeRoleFilter === 'participant'
                      ? 'You have no active groups as participant.'
                      : 'Create a new group to get started.'}
                  </p>
                  <button
                    onClick={() => navigate('/splitit/create-group')}
                    className="rounded-xl bg-[#2d4a6f] px-4 py-3 text-sm font-medium text-white"
                  >
                    Create group
                  </button>
                </div>
              )}
            </div>
          ) : completedGroups.length > 0 ? (
            <div className="space-y-3">
              {completedGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/splitit/group/${group.id}`)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-slate-400" />
                        <h3 className="font-medium text-slate-900 truncate">{group.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        {group.members} members • {group.role}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        ${(group.role === 'owner' ? group.totalAmount : group.yourShare).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">{group.role === 'owner' ? 'Collected' : 'Settled'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-6 py-10 text-center border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-1">No history</h3>
              <p className="text-sm text-slate-500">Completed groups will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
