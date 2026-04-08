import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Users, DollarSign, Check, ScanLine, Percent, PieChart, Grip, Package2 } from 'lucide-react';
import {
  AssignmentState,
  BillingFrequency,
  BillingMode,
  clearSplitItDraft,
  CustomAmountMode,
  DraftContact as Contact,
  DraftInvoiceItem as InvoiceItem,
  DraftSplitMember as Member,
  InvitationMethod,
  SplitMethod,
  loadSplitItDraft,
  saveSplitItDraft,
} from '../utils/splitItDraft';
import { Group } from '../utils/splitItData';
import { createOrUpdateGroup, patchGroup } from '../utils/splitItApi';

interface SplitterState {
  items?: InvoiceItem[];
  totalAmount?: number;
  groupName?: string;
  members?: Contact[];
  invitationMethod?: InvitationMethod;
  billingMode?: BillingMode;
  billingFrequency?: BillingFrequency;
  billingStartDate?: string;
  billingRule?: string;
  ownerPays?: boolean;
  customAmountMode?: CustomAmountMode;
  rejectionReason?: string;
  mode?: 'create' | 'revision';
  presetMembers?: Member[];
}

function formatCycleLabel(date: Date, frequency?: BillingFrequency) {
  if (frequency === 'weekly') {
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  if (frequency === 'daily') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getNextCycleDate(dateString: string, frequency?: BillingFrequency) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  if (frequency === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().slice(0, 10);
}

export function BillSplitter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId } = useParams();
  const routeState = (location.state as SplitterState | null) ?? null;
  const draft = useMemo(() => loadSplitItDraft(), []);
  const mergedState = {
    ...draft,
    ...routeState,
    groupName: routeState?.groupName ?? draft?.groupName,
    members: routeState?.members ?? draft?.members,
    invitationMethod: routeState?.invitationMethod ?? draft?.invitationMethod,
    billingMode: routeState?.billingMode ?? draft?.billingMode,
    billingFrequency: routeState?.billingFrequency ?? draft?.billingFrequency,
    billingStartDate: routeState?.billingStartDate ?? draft?.billingStartDate,
    billingRule: routeState?.billingRule ?? draft?.billingRule,
    ownerPays: routeState?.ownerPays ?? draft?.ownerPays,
    customAmountMode: routeState?.customAmountMode ?? draft?.customAmountMode,
    items: routeState?.items ?? draft?.items,
    totalAmount: routeState?.totalAmount ?? draft?.totalAmount,
    presetMembers: routeState?.presetMembers ?? draft?.splitMembers,
  };

  const participants = mergedState.members ?? [
    { id: '1', name: 'Sophea Chan', phone: '' },
    { id: '2', name: 'Dara Kim', phone: '' },
    { id: '3', name: 'Sothea Ung', phone: '' },
  ];

  const invoiceItems = mergedState.items ?? [
    { id: 'i-1', name: 'Pizza', price: 20, quantity: 2 },
    { id: 'i-2', name: 'Drinks', price: 10, quantity: 2 },
  ];

  const totalAmount = mergedState.totalAmount ?? invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const initialOwnerPays = mergedState.ownerPays ?? true;
  const memberCount = participants.length + (initialOwnerPays ? 1 : 0);
  const equalAmount = totalAmount / memberCount;

  const initialMembers: Member[] = useMemo(() => {
    if (mergedState.presetMembers?.length) {
      return mergedState.presetMembers;
    }

    return [
      ...participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        amount: equalAmount,
        items: [],
        percentage: 100 / memberCount,
        shareUnits: 1,
      })),
      {
        id: 'owner',
        name: 'You',
        amount: initialOwnerPays ? equalAmount : 0,
        items: [],
        percentage: initialOwnerPays ? 100 / memberCount : 0,
        shareUnits: initialOwnerPays ? 1 : 0,
      },
    ];
  }, [participants, equalAmount, memberCount, mergedState.presetMembers, initialOwnerPays]);

  const [ownerPays, setOwnerPays] = useState(initialOwnerPays);
  const isRecurring = mergedState.billingMode === 'recurring';
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(draft?.splitMethod ?? (isRecurring ? 'custom' : 'equal'));
  const [customAmountMode, setCustomAmountMode] = useState<CustomAmountMode>(
    mergedState.customAmountMode ?? (isRecurring ? 'collect_exact' : 'from_total')
  );
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [assignments, setAssignments] = useState<AssignmentState>(() =>
    draft?.assignments ?? initialMembers.reduce<AssignmentState>((acc, member) => {
      acc[member.id] = invoiceItems.reduce<Record<string, number>>((itemAcc, item) => {
        itemAcc[item.id] = 0;
        return itemAcc;
      }, {});
      return acc;
    }, {})
  );

  const getPayerMembers = (memberList: Member[], includeOwner: boolean) =>
    memberList.filter((member) => includeOwner || member.id !== 'owner');

  const zeroOwnerMember = (member: Member) => ({
    ...member,
    amount: 0,
    percentage: 0,
    shareUnits: 0,
    items: [],
  });

  const recalculateFromAssignments = (
    nextAssignments: AssignmentState,
    memberList: Member[],
    includeOwner: boolean
  ) => {
    return memberList.map((member) => {
      if (!includeOwner && member.id === 'owner') {
        return zeroOwnerMember(member);
      }

      const memberAssignments = nextAssignments[member.id] ?? {};
      const assignedItems = invoiceItems
        .filter((item) => (memberAssignments[item.id] ?? 0) > 0)
        .map((item) => `${item.name} x${memberAssignments[item.id]}`);
      const amount = invoiceItems.reduce(
        (sum, item) => sum + (memberAssignments[item.id] ?? 0) * item.price,
        0
      );

      return {
        ...member,
        amount,
        items: assignedItems,
      };
    });
  };

  const recalculateMembers = (
    method: SplitMethod,
    memberList: Member[],
    nextAssignments: AssignmentState,
    includeOwner: boolean
  ) => {
    const payerMembers = getPayerMembers(memberList, includeOwner);
    const payerCount = Math.max(payerMembers.length, 1);

    if (method === 'equal') {
      const nextAmount = totalAmount / payerCount;
      const nextPercentage = 100 / payerCount;
      return memberList.map((member) => (
        includeOwner || member.id !== 'owner'
          ? { ...member, amount: nextAmount, percentage: nextPercentage, shareUnits: Math.max(1, member.shareUnits || 1), items: [] }
          : zeroOwnerMember(member)
      ));
    }

    if (method === 'percentage') {
      const nextPercentage = 100 / payerCount;
      return memberList.map((member) => (
        includeOwner || member.id !== 'owner'
          ? { ...member, percentage: nextPercentage, amount: totalAmount * (nextPercentage / 100), items: [] }
          : zeroOwnerMember(member)
      ));
    }

    if (method === 'shares') {
      const normalizedMembers = memberList.map((member) => (
        includeOwner || member.id !== 'owner'
          ? { ...member, shareUnits: Math.max(1, member.shareUnits || 1), items: [] }
          : zeroOwnerMember(member)
      ));
      const totalUnits = getPayerMembers(normalizedMembers, includeOwner).reduce(
        (sum, member) => sum + member.shareUnits,
        0
      );

      return normalizedMembers.map((member) => (
        includeOwner || member.id !== 'owner'
          ? { ...member, amount: totalAmount * (member.shareUnits / totalUnits) }
          : zeroOwnerMember(member)
      ));
    }

    if (method === 'itemized') {
      return recalculateFromAssignments(nextAssignments, memberList, includeOwner);
    }

    return memberList.map((member) => (
      includeOwner || member.id !== 'owner' ? member : zeroOwnerMember(member)
    ));
  };

  const handleSplitMethodChange = (method: SplitMethod) => {
    setSplitMethod(method);
    setMembers((currentMembers) => recalculateMembers(method, currentMembers, assignments, ownerPays));
  };

  const handleCustomAmountChange = (memberId: string, amount: number) => {
    setMembers(members.map((member) => (
      member.id === memberId ? { ...member, amount } : member
    )));
  };

  const handlePercentageChange = (memberId: string, percentage: number) => {
    setMembers(members.map((member) => (
      member.id === memberId
        ? { ...member, percentage, amount: totalAmount * ((percentage || 0) / 100) }
        : member
    )));
  };

  const handleShareUnitChange = (memberId: string, shareUnits: number) => {
    const updatedMembers = members.map((member) => (
      member.id === memberId ? { ...member, shareUnits: Math.max(1, Math.floor(shareUnits || 1)) } : member
    ));
    setMembers(recalculateMembers('shares', updatedMembers, assignments, ownerPays));
  };

  const handleAssignmentChange = (memberId: string, itemId: string, quantity: number) => {
    const sanitizedQuantity = Math.max(0, Math.floor(quantity || 0));
    const currentAssignedQuantity = assignments[memberId]?.[itemId] ?? 0;
    const assignedByOthers = visibleMembers.reduce((sum, member) => {
      if (member.id === memberId) {
        return sum;
      }

      return sum + (assignments[member.id]?.[itemId] ?? 0);
    }, 0);
    const targetItem = invoiceItems.find((item) => item.id === itemId);
    const maxAllowedQuantity = Math.max(
      0,
      (targetItem?.quantity ?? 0) - assignedByOthers
    );
    const nextQuantity = Math.min(
      sanitizedQuantity,
      Math.max(currentAssignedQuantity, maxAllowedQuantity)
    );
    const nextAssignments: AssignmentState = {
      ...assignments,
      [memberId]: {
        ...(assignments[memberId] ?? {}),
        [itemId]: nextQuantity,
      },
    };

    setAssignments(nextAssignments);
    setMembers((currentMembers) => recalculateMembers('itemized', currentMembers, nextAssignments, ownerPays));
  };

  const handleOwnerPaysChange = (nextOwnerPays: boolean) => {
    setOwnerPays(nextOwnerPays);
    setValidationMessage('');
    setMembers((currentMembers) => recalculateMembers(splitMethod, currentMembers, assignments, nextOwnerPays));
  };

  const totalSplitAmount = members.reduce((sum, member) => sum + member.amount, 0);
  const effectiveTotalAmount = splitMethod === 'custom' && customAmountMode === 'collect_exact'
    ? totalSplitAmount
    : totalAmount;
  const totalPercentage = getPayerMembers(members, ownerPays).reduce((sum, member) => sum + member.percentage, 0);
  const amountDelta = effectiveTotalAmount - totalSplitAmount;
  const roundedAmountDelta = Math.round(amountDelta * 100) / 100;
  const visibleMembers = ownerPays ? members : members.filter((member) => member.id !== 'owner');
  const getAssignableQuantity = (memberId: string, itemId: string) => {
    const targetItem = invoiceItems.find((item) => item.id === itemId);

    if (!targetItem) {
      return 0;
    }

    const assignedByOthers = visibleMembers.reduce((sum, member) => {
      if (member.id === memberId) {
        return sum;
      }

      return sum + (assignments[member.id]?.[itemId] ?? 0);
    }, 0);

    return Math.max(0, targetItem.quantity - assignedByOthers);
  };
  const itemAssignmentSummary = invoiceItems.map((item) => {
    const assignedQty = visibleMembers.reduce(
      (sum, member) => sum + (assignments[member.id]?.[item.id] ?? 0),
      0
    );
    return {
      ...item,
      assignedQty,
      remainingQty: item.quantity - assignedQty,
    };
  });
  const hasInvalidItemAssignments = itemAssignmentSummary.some((item) => item.remainingQty !== 0);
  const hasActivePayers = visibleMembers.length > 0;
  const hasValidSplitTotal = Math.abs(roundedAmountDelta) < 0.01;
  const hasValidPercentage = splitMethod !== 'percentage' || Math.abs(100 - totalPercentage) < 0.01;

  const currentValidationMessage = !hasActivePayers
    ? 'Select at least one payer for this bill.'
    : !hasValidSplitTotal
    ? `Allocated sub-bills total $${totalSplitAmount.toFixed(2)} and must match $${effectiveTotalAmount.toFixed(2)}.`
    : !hasValidPercentage
    ? `Percent split must equal 100%. Current total is ${totalPercentage.toFixed(1)}%.`
    : splitMethod === 'itemized' && hasInvalidItemAssignments
    ? 'Every item quantity must be fully assigned before sending the bill.'
    : '';

  useEffect(() => {
    saveSplitItDraft({
      ...loadSplitItDraft(),
      groupName: mergedState.groupName,
      members: participants,
      invitationMethod: mergedState.invitationMethod,
      billingMode: mergedState.billingMode,
      billingFrequency: mergedState.billingFrequency,
      billingStartDate: mergedState.billingStartDate,
      billingRule: mergedState.billingRule,
      ownerPays,
      items: invoiceItems,
      totalAmount: effectiveTotalAmount,
      splitMethod,
      customAmountMode,
      splitMembers: members,
      assignments,
    });
  }, [
    assignments,
    invoiceItems,
    members,
    mergedState.groupName,
    mergedState.invitationMethod,
    participants,
    splitMethod,
    effectiveTotalAmount,
    ownerPays,
    customAmountMode,
  ]);

  const handleSendForReview = async () => {
    if (currentValidationMessage) {
      setValidationMessage(currentValidationMessage);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const normalizedMembers = members.map((member) => ({
      id: member.id === 'owner' ? `owner-${today}` : member.id,
      name: member.name,
      amount: Number(member.amount.toFixed(2)),
      status: member.id === 'owner' ? 'paid' : 'pending' as const,
      isYou: member.id === 'owner',
    }));
    const nextGroupId =
      routeState?.mode === 'revision' && groupId && groupId !== 'new'
        ? groupId
        : Date.now().toString();
    const nextGroup: Group = {
      id: nextGroupId,
      name: mergedState.groupName || 'New bill group',
      members: normalizedMembers.length,
      totalAmount: Number(effectiveTotalAmount.toFixed(2)),
      status: 'pending',
      date: today,
      yourShare: 0,
      paid: false,
      role: 'owner',
      billingMode: mergedState.billingMode,
      ownerPays,
      createdBy: 'You',
      createdDate: today,
      ownerCollectionAmount: Number(
        normalizedMembers
          .filter((member) => !member.isYou && member.status !== 'paid')
          .reduce((sum, member) => sum + member.amount, 0)
          .toFixed(2)
      ),
      membersList: normalizedMembers,
      activities: [
        {
          id: `${nextGroupId}-activity-${Date.now()}`,
          date: today,
          description:
            routeState?.mode === 'revision'
              ? 'You updated the bill and resent the split for review'
              : isRecurring
              ? 'You created a recurring bill group and sent the current cycle for review'
              : 'You created a new bill group and sent it for review',
          amount: Number(effectiveTotalAmount.toFixed(2)),
          status: 'pending',
        },
      ],
      review: {
        splitBy: 'You',
        items: invoiceItems.map((item) => ({
          name: item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name,
          price: Number((item.price * item.quantity).toFixed(2)),
        })),
        rejectionReason: undefined,
      },
    };

    if (isRecurring) {
      const cycleMembers = normalizedMembers
        .filter((member) => !member.isYou)
        .map((member) => ({
          id: `${nextGroupId}-cycle-${member.id}`,
          name: member.name,
          amount: member.amount,
          status: member.status,
          source: 'current' as const,
        }));
      const collectedAmount = cycleMembers
        .filter((member) => member.status === 'paid')
        .reduce((sum, member) => sum + member.amount, 0);
      const cycleOutstanding = cycleMembers
        .filter((member) => member.status !== 'paid')
        .reduce((sum, member) => sum + member.amount, 0);
      const activeCycleId = `${nextGroupId}-cycle-current`;

      nextGroup.recurring = {
        frequency: mergedState.billingFrequency ?? 'monthly',
        startDate: mergedState.billingStartDate ?? today,
        rule: mergedState.billingRule ?? 'Recurring cycle',
        nextCycleDate: getNextCycleDate(mergedState.billingStartDate ?? today, mergedState.billingFrequency),
        activeCycleId,
        unpaidCarryoverAmount: 0,
        cycles: [
          {
            id: activeCycleId,
            label: formatCycleLabel(new Date(mergedState.billingStartDate ?? today), mergedState.billingFrequency),
            dueDate: mergedState.billingStartDate ?? today,
            status: cycleOutstanding === 0 ? 'completed' : collectedAmount > 0 ? 'partial' : 'due',
            totalAmount: Number(effectiveTotalAmount.toFixed(2)),
            collectedAmount: Number(collectedAmount.toFixed(2)),
            outstandingAmount: Number(cycleOutstanding.toFixed(2)),
            members: cycleMembers,
          },
        ],
      };
    }

    setIsSubmitting(true);

    if (routeState?.mode === 'revision' && groupId && groupId !== 'new') {
      await patchGroup(groupId, (currentGroup) => ({
        ...currentGroup,
        ...nextGroup,
        role: currentGroup.role,
        yourShare: currentGroup.role === 'participant'
          ? nextGroup.membersList.find((member) => member.isYou)?.amount ?? currentGroup.yourShare
          : 0,
        paid: currentGroup.role === 'participant' ? false : currentGroup.paid,
      }));
    } else {
      await createOrUpdateGroup(nextGroup);
    }

    clearSplitItDraft();
    setValidationMessage('');
    setIsSubmitting(false);
    navigate(`/splitit/group/${nextGroupId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">
              {routeState?.mode === 'revision' ? 'Edit Split' : 'Split Bill'}
            </h1>
            <div className="w-10" />
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 text-center">
            <p className="text-white/70 text-sm mb-2">{mergedState.groupName ?? 'Bill Group'}</p>
            <p className="text-4xl font-bold text-white mb-4">${effectiveTotalAmount.toFixed(2)}</p>
            <div className="flex items-center justify-center gap-2 text-white/70">
              <Users className="w-4 h-4" />
              <span className="text-sm">{ownerPays ? members.length : visibleMembers.length} payers</span>
              <span className="text-white/40">•</span>
              <span className="text-sm">{mergedState.invitationMethod === 'qr' ? 'QR invite' : 'Direct invite'}</span>
            </div>
            {isRecurring && (
              <p className="mt-3 text-xs text-white/70">
                {mergedState.billingRule || 'Recurring cycle'}{mergedState.billingStartDate ? ` • starts ${mergedState.billingStartDate}` : ''}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/70 text-xs mb-1">Invoice Items</p>
              <p className="text-white font-semibold">
                {splitMethod === 'custom' && customAmountMode === 'collect_exact'
                  ? 'Derived from member amounts'
                  : `${invoiceItems.length} lines`}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white/70 text-xs mb-1">Invitation</p>
              <p className="text-white font-semibold">{mergedState.invitationMethod === 'qr' ? 'QR code' : 'Contact invite'}</p>
            </div>
          </div>

          {routeState?.rejectionReason && (
            <div className="bg-red-500/15 border border-red-300/30 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-white mb-1">Reason for revision</p>
              <p className="text-xs text-white/80">{routeState.rejectionReason}</p>
            </div>
          )}

          {isRecurring && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-white">Recurring collection</p>
              <p className="text-xs text-white/70 mt-1">
                Best with fixed member charges. Custom amount is recommended for daily, weekly, or monthly collections.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 bg-white/10 backdrop-blur rounded-3xl p-2 mb-4">
            <button
              onClick={() => handleOwnerPaysChange(true)}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                ownerPays ? 'bg-white text-[#1e3a5f]' : 'text-white/75'
              }`}
            >
              Include me
            </button>
            <button
              onClick={() => handleOwnerPaysChange(false)}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                !ownerPays ? 'bg-white text-[#1e3a5f]' : 'text-white/75'
              }`}
            >
              Host only
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white/10 backdrop-blur rounded-3xl p-2 mb-4">
            <button
              onClick={() => handleSplitMethodChange('equal')}
              disabled={isRecurring}
              className={`py-3 px-3 rounded-2xl text-xs font-medium transition-all ${splitMethod === 'equal' ? 'bg-white text-[#1e3a5f]' : 'text-white/75'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                <span>Equal</span>
              </div>
            </button>
            <button
              onClick={() => handleSplitMethodChange('custom')}
              className={`py-3 px-3 rounded-2xl text-xs font-medium transition-all ${splitMethod === 'custom' ? 'bg-white text-[#1e3a5f]' : 'text-white/75'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Custom</span>
              </div>
            </button>
            <button
              onClick={() => handleSplitMethodChange('percentage')}
              disabled={isRecurring}
              className={`py-3 px-3 rounded-2xl text-xs font-medium transition-all ${splitMethod === 'percentage' ? 'bg-white text-[#1e3a5f]' : 'text-white/75'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Percent className="w-4 h-4" />
                <span>Percent</span>
              </div>
            </button>
            <button
              onClick={() => handleSplitMethodChange('shares')}
              disabled={isRecurring}
              className={`py-3 px-3 rounded-2xl text-xs font-medium transition-all ${splitMethod === 'shares' ? 'bg-white text-[#1e3a5f]' : 'text-white/75'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <PieChart className="w-4 h-4" />
                <span>Shares</span>
              </div>
            </button>
            <button
              onClick={() => handleSplitMethodChange('itemized')}
              disabled={isRecurring}
              className={`col-span-2 py-3 px-3 rounded-2xl text-xs font-medium transition-all ${splitMethod === 'itemized' ? 'bg-white text-[#1e3a5f]' : 'text-white/75'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Package2 className="w-4 h-4" />
                <span>Itemized Assignment</span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-t-3xl px-4 py-6 overflow-y-auto">
          <div className="mb-5 p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                {splitMethod === 'equal' && <Users className="w-5 h-5 text-slate-700" />}
                {splitMethod === 'custom' && <ScanLine className="w-5 h-5 text-slate-700" />}
                {splitMethod === 'percentage' && <Percent className="w-5 h-5 text-slate-700" />}
                {splitMethod === 'shares' && <Grip className="w-5 h-5 text-slate-700" />}
                {splitMethod === 'itemized' && <Package2 className="w-5 h-5 text-slate-700" />}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {splitMethod === 'equal' && 'Split equally across all participants'}
                  {splitMethod === 'custom' && (isRecurring ? 'Set recurring amount per participant' : 'Set exact amount per participant')}
                  {splitMethod === 'percentage' && 'Allocate by percentage of the total bill'}
                  {splitMethod === 'shares' && 'Allocate by weighted share units'}
                  {splitMethod === 'itemized' && 'Assign invoice items and quantities to each participant'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {splitMethod === 'equal' && 'Everyone pays the same amount.'}
                  {splitMethod === 'custom' && (isRecurring ? 'Best for subscriptions where you know each member charge.' : 'Useful when people consumed different totals.')}
                  {splitMethod === 'percentage' && 'Great for proportional cost-sharing by responsibility.'}
                  {splitMethod === 'shares' && 'Useful when some members should pay 2x or 3x more than others.'}
                  {splitMethod === 'itemized' && 'Best when each person ordered different dishes or different quantities.'}
                </p>
              </div>
            </div>
          </div>

          {(validationMessage || currentValidationMessage) && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">
                {validationMessage || currentValidationMessage}
              </p>
            </div>
          )}

          {splitMethod === 'custom' && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCustomAmountMode('from_total')}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    customAmountMode === 'from_total'
                      ? 'bg-white text-[#1e3a5f] shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Known total
                </button>
                <button
                  onClick={() => setCustomAmountMode('collect_exact')}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    customAmountMode === 'collect_exact'
                      ? 'bg-white text-[#1e3a5f] shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Amount per person
                </button>
              </div>
            </div>
          )}

          <h3 className="text-sm font-semibold text-gray-500 mb-4">AMOUNT PER PERSON</h3>

          <div className="space-y-3">
            {visibleMembers.map((member) => (
              <div key={member.id} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{member.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">
                        {member.amount > 0 ? `$${member.amount.toFixed(2)}` : '$0.00'} assigned
                      </p>
                    </div>
                  </div>

                  {splitMethod === 'equal' && (
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#2d4a6f]">${member.amount.toFixed(2)}</p>
                    </div>
                  )}

                  {splitMethod === 'custom' && (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={member.amount}
                        onChange={(e) => handleCustomAmountChange(member.id, parseFloat(e.target.value) || 0)}
                        className="w-28 pl-8 pr-3 py-2 bg-white rounded-lg outline-none border border-gray-200 focus:border-emerald-500 text-right font-bold"
                      />
                    </div>
                  )}

                  {splitMethod === 'percentage' && (
                    <div className="w-28">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={Number(member.percentage.toFixed(1))}
                          onChange={(e) => handlePercentageChange(member.id, parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white rounded-lg outline-none border border-gray-200 focus:border-emerald-500 text-right font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                  )}

                  {splitMethod === 'shares' && (
                    <div className="w-24">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={member.shareUnits}
                        onChange={(e) => handleShareUnitChange(member.id, parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-white rounded-lg outline-none border border-gray-200 focus:border-emerald-500 text-right font-bold"
                      />
                    </div>
                  )}

                  {splitMethod === 'itemized' && (
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#2d4a6f]">${member.amount.toFixed(2)}</p>
                    </div>
                  )}
                </div>

	                {splitMethod === 'itemized' && (
	                  <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
	                    <div className="grid grid-cols-[1.3fr_.7fr_.6fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
	                      <span>Item</span>
	                      <span className="text-right">Unit</span>
	                      <span className="text-right">Qty</span>
	                    </div>
	                    <div className="divide-y divide-slate-100">
	                    {invoiceItems.map((item) => {
	                      const assignedQty = assignments[member.id]?.[item.id] ?? 0;
	                      const maxAssignableQty = getAssignableQuantity(member.id, item.id);
	                      const remainingForOthers = Math.max(0, maxAssignableQty - assignedQty);
	                      const itemLineTotal = assignedQty * item.price;
	                      return (
	                        <div
	                          key={`${member.id}-${item.id}`}
	                          className="grid grid-cols-[1.3fr_.7fr_.6fr] gap-3 items-center px-4 py-3"
	                        >
	                          <div>
	                            <p className="text-sm font-medium text-slate-900">{item.name}</p>
	                            <p className="text-xs text-slate-500">
	                              Max {maxAssignableQty} of {item.quantity}
	                              {remainingForOthers > 0 ? ` • ${remainingForOthers} left` : ''}
	                              {assignedQty > 0 ? ` • Line $${itemLineTotal.toFixed(2)}` : ''}
	                            </p>
	                          </div>
	                          <div className="text-right">
	                            <p className="text-sm font-medium text-slate-900">${item.price.toFixed(2)}</p>
	                          </div>
	                          <div className="w-20 ml-auto">
	                            <input
	                              type="number"
	                              min="0"
	                              max={maxAssignableQty}
	                              step="1"
	                              value={assignedQty}
	                              onChange={(e) => handleAssignmentChange(member.id, item.id, parseInt(e.target.value, 10))}
	                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
	                            />
	                          </div>
	                        </div>
	                      );
	                    })}
	                    </div>
	                  </div>
	                )}

                <div className="pt-3 border-t border-gray-200">
	                  <div className="flex items-center justify-between text-xs">
	                    <span className="text-gray-500">
	                      {splitMethod === 'percentage' && `${member.percentage.toFixed(1)}% of total`}
	                      {splitMethod === 'shares' && `${member.shareUnits} share unit${member.shareUnits !== 1 ? 's' : ''}`}
	                      {splitMethod === 'itemized' && (member.items.length > 0 ? `${member.items.length} assigned item${member.items.length !== 1 ? 's' : ''}` : 'No items assigned yet')}
	                      {splitMethod === 'custom' && (customAmountMode === 'collect_exact' ? 'Collected as entered' : 'Ready for approval')}
	                      {splitMethod === 'equal' && 'Ready for approval'}
	                    </span>
	                    <div className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-3 h-3" />
                      <span>Ready to send</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

	          {splitMethod === 'itemized' && (
	            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
	              <div className="mb-3 flex items-center justify-between">
	                <h4 className="text-sm font-semibold text-amber-900">Assignment Summary</h4>
	                <span className="text-xs font-medium text-amber-700">Match every item to the bill</span>
	              </div>
	              <div className="space-y-2">
	                {itemAssignmentSummary.map((item) => (
	                  <div key={`summary-${item.id}`} className="rounded-xl bg-white/70 px-3 py-3">
	                    <div className="mb-2 flex items-center justify-between text-sm">
	                      <span className="font-medium text-slate-900">{item.name}</span>
	                      <span className={item.remainingQty === 0 ? 'font-semibold text-emerald-600' : item.remainingQty > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-red-600'}>
	                        {item.assignedQty}/{item.quantity}
	                      </span>
	                    </div>
	                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
	                      <div
	                        className={`h-full rounded-full ${
	                          item.remainingQty === 0
	                            ? 'bg-emerald-500'
	                            : item.remainingQty > 0
	                            ? 'bg-amber-400'
	                            : 'bg-red-500'
	                        }`}
	                        style={{ width: `${Math.min((item.assignedQty / item.quantity) * 100, 100)}%` }}
	                      />
	                    </div>
	                  </div>
	                ))}
	              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Split Amount</span>
              <span className="font-bold text-gray-900">${totalSplitAmount.toFixed(2)}</span>
            </div>

            {splitMethod === 'custom' && customAmountMode === 'collect_exact' && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Derived Bill Total</span>
                <span className="font-bold text-emerald-600">${effectiveTotalAmount.toFixed(2)}</span>
              </div>
            )}

            {splitMethod === 'percentage' && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Percentage</span>
                <span className={`font-bold ${Math.abs(100 - totalPercentage) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalPercentage.toFixed(1)}%
                </span>
              </div>
            )}

            {splitMethod !== 'equal' && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Remaining</span>
                <span className={`font-bold ${Math.abs(amountDelta) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${amountDelta.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleSendForReview}
            disabled={
              isSubmitting || Boolean(currentValidationMessage)
            }
            className="w-full py-4 bg-emerald-500 text-white rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
          >
            {isSubmitting ? 'Saving...' : routeState?.mode === 'revision' ? 'Resend Updated Split' : 'Send for Review & Approval'}
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Participants will receive the split through {mergedState.invitationMethod === 'qr' ? 'your QR code flow' : 'direct invitation'}.
          </p>
        </div>
      </div>
    </div>
  );
}
