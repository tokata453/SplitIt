import { useNavigate } from 'react-router';
import { ArrowLeft, UserPlus, X, Search, Mail, QrCode, Repeat } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  BillingFrequency,
  BillingMode,
  InvitationMethod,
  DraftContact as Contact,
  loadSplitItDraft,
  saveSplitItDraft,
} from '../utils/splitItDraft';

export function CreateGroup() {
  const navigate = useNavigate();
  const draft = useMemo(() => loadSplitItDraft(), []);
  const [groupName, setGroupName] = useState(draft?.groupName ?? '');
  const [selectedMembers, setSelectedMembers] = useState<Contact[]>(draft?.members ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [billingMode, setBillingMode] = useState<BillingMode>(draft?.billingMode ?? 'one_time');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(draft?.billingFrequency ?? 'monthly');
  const [billingStartDate, setBillingStartDate] = useState(
    draft?.billingStartDate ?? new Date().toISOString().slice(0, 10)
  );
  const [billingRule, setBillingRule] = useState(draft?.billingRule ?? 'Every 1st of month');
  const [invitationMethod, setInvitationMethod] = useState<InvitationMethod>(
    draft?.invitationMethod ?? 'invite'
  );

  const mockContacts: Contact[] = [
    { id: '1', name: 'Sophea Chan', phone: '+855 12 345 678' },
    { id: '2', name: 'Dara Kim', phone: '+855 98 765 432' },
    { id: '3', name: 'Sothea Ung', phone: '+855 77 888 999' },
    { id: '4', name: 'Rattana Ly', phone: '+855 11 222 333' },
    { id: '5', name: 'Vanna Sok', phone: '+855 99 111 222' },
  ];

  const filteredContacts = mockContacts.filter(
    (contact) =>
      !selectedMembers.find((member) => member.id === contact.id) &&
      (contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery))
  );

  const handleAddMember = (contact: Contact) => {
    setSelectedMembers([...selectedMembers, contact]);
  };

  const handleRemoveMember = (contactId: string) => {
    setSelectedMembers(selectedMembers.filter((member) => member.id !== contactId));
  };

  const canContinue =
    Boolean(groupName) &&
    (invitationMethod === 'qr' || selectedMembers.length > 0) &&
    (billingMode === 'one_time' || Boolean(billingStartDate && billingRule.trim()));
  const qrSummary = invitationMethod === 'qr'
    ? `${selectedMembers.length || 0} saved ${selectedMembers.length === 1 ? 'participant' : 'participants'}`
    : `${selectedMembers.length} selected`;
  const recurringLabelMap: Record<BillingFrequency, string> = {
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
    custom: 'Custom rule',
  };

  useEffect(() => {
    saveSplitItDraft({
      ...loadSplitItDraft(),
      groupName,
      members: selectedMembers,
      billingMode,
      billingFrequency,
      billingStartDate,
      billingRule,
      invitationMethod,
    });
  }, [groupName, selectedMembers, billingMode, billingFrequency, billingStartDate, billingRule, invitationMethod]);

  const handleCreateGroup = () => {
    if (!canContinue) return;

    navigate('/splitit/group/new/invoice', {
      state: {
        groupName,
        members: selectedMembers,
        billingMode,
        billingFrequency,
        billingStartDate,
        billingRule,
        invitationMethod,
        mode: 'create',
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <div className="px-4 pt-12 pb-5">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/splitit')}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">Create Group</h1>
            <div className="w-10" />
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white">Step 1 of 3</span>
            </div>

            <div className="relative px-1 pt-1">
              <div className="absolute left-4 right-4 top-5.5 h-1 rounded-full bg-white/20" />
              <div className="relative grid grid-cols-3">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white text-[#1e3a5f] font-semibold text-lg flex items-center justify-center">1</div>
                  <span className="mt-3 text-sm font-medium text-white uppercase">Group</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#3f5f87] text-white font-semibold text-lg flex items-center justify-center">2</div>
                  <span className="mt-3 text-sm font-medium text-white/70 uppercase">Invoice</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#3f5f87] text-white font-semibold text-lg flex items-center justify-center">3</div>
                  <span className="mt-3 text-sm font-medium text-white/70 uppercase">Split</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-4">
            <label className="text-xs text-white/65 mb-2 block">Group name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Friday Team Lunch"
              className="w-full rounded-xl bg-white/15 px-4 py-3 text-white placeholder-white/45 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 rounded-t-3xl bg-[#f7f8fa] px-4 py-5 overflow-y-auto">
          <div className="mb-4 rounded-2xl bg-white p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBillingMode('one_time')}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  billingMode === 'one_time' ? 'bg-[#eef4fb] text-[#1e3a5f]' : 'text-slate-500'
                }`}
              >
                One-time
              </button>
              <button
                onClick={() => setBillingMode('recurring')}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  billingMode === 'recurring' ? 'bg-[#eef4fb] text-[#1e3a5f]' : 'text-slate-500'
                }`}
              >
                Recurring
              </button>
            </div>
          </div>

          {billingMode === 'recurring' && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Repeat className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Recurring schedule</p>
                  <p className="text-sm text-slate-500">Set how often this group collects payment.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['daily', 'weekly', 'monthly', 'custom'] as BillingFrequency[]).map((frequency) => (
                  <button
                    key={frequency}
                    onClick={() => {
                      setBillingFrequency(frequency);
                      if (frequency === 'daily') setBillingRule('Every day');
                      if (frequency === 'weekly') setBillingRule('Every Monday');
                      if (frequency === 'monthly') setBillingRule('Every 1st of month');
                      if (frequency === 'custom') setBillingRule('');
                    }}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                      billingFrequency === frequency
                        ? 'border-[#2d4a6f] bg-[#eef4fb] text-[#1e3a5f]'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {frequency === 'custom' ? 'Custom' : recurringLabelMap[frequency]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-2 block text-xs text-slate-500">Start date</label>
                  <input
                    type="date"
                    value={billingStartDate}
                    onChange={(e) => setBillingStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-slate-500">Repeat rule</label>
                  <input
                    type="text"
                    value={billingRule}
                    onChange={(e) => setBillingRule(e.target.value)}
                    placeholder="Every 1st of month"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Preview</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {groupName || 'New subscription group'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {billingRule || recurringLabelMap[billingFrequency]} • Starts {billingStartDate || 'not set'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <button
              onClick={() => setInvitationMethod('invite')}
              className={`w-full rounded-2xl border px-4 py-4 text-left ${
                invitationMethod === 'invite'
                  ? 'border-[#2d4a6f] bg-[#eef4fb]'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Direct Invite</p>
                  <p className="text-sm text-slate-500">Pick from contacts</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setInvitationMethod('qr')}
              className={`w-full rounded-2xl border px-4 py-4 text-left ${
                invitationMethod === 'qr'
                  ? 'border-[#2d4a6f] bg-[#eef4fb]'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">QR Access</p>
                  <p className="text-sm text-slate-500">Share a join code</p>
                </div>
              </div>
            </button>
          </div>

          {invitationMethod === 'invite' ? (
            <>
              {selectedMembers.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <div key={member.id} className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-900">{member.name}</span>
                      <button onClick={() => handleRemoveMember(member.id)}>
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts"
                  className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-4 py-3 outline-none text-slate-900"
                />
              </div>

              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleAddMember(contact)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="font-medium text-slate-700">{contact.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{contact.name}</p>
                        <p className="text-sm text-slate-500">{contact.phone}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center">
              <div className="mx-auto mb-4 w-fit rounded-[28px] bg-slate-50 p-5">
                <div className="grid grid-cols-7 gap-1">
                  {[
                    1,1,1,0,1,1,1,
                    1,0,1,1,0,1,0,
                    1,1,0,1,1,0,1,
                    0,1,1,1,0,1,1,
                    1,0,1,0,1,1,0,
                    1,1,0,1,1,0,1,
                    1,0,1,1,0,1,1,
                  ].map((cell, index) => (
                    <div
                      key={index}
                      className={`h-3.5 w-3.5 rounded-[2px] ${cell ? 'bg-[#1e3a5f]' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
              </div>
              <p className="font-medium text-slate-900">{groupName || 'New bill group'}</p>
              <p className="mt-1 text-xs text-slate-500">{qrSummary}</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <button
            onClick={handleCreateGroup}
            disabled={!canContinue}
            className="w-full rounded-xl bg-[#2d4a6f] px-4 py-4 text-sm font-medium text-white disabled:bg-slate-300"
          >
            {billingMode === 'recurring' ? 'Continue to Charge Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
