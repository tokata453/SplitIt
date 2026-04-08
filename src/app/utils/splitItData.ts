// Shared scenario data for the SplitIt feature
export type GroupRole = 'owner' | 'participant';
export type GroupStatus = 'active' | 'completed' | 'pending';
export type MemberStatus = 'paid' | 'pending' | 'approved' | 'rejected';
export type BillingMode = 'one_time' | 'recurring';
export type RecurringCycleStatus = 'upcoming' | 'due' | 'partial' | 'completed' | 'overdue';
export type RecurringCycleSource = 'current' | 'carryover';

export interface GroupMember {
  id: string;
  name: string;
  amount: number;
  status: MemberStatus;
  isYou?: boolean;
  note?: string;
}

export interface GroupActivity {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'rejected';
}

export interface ReviewItem {
  name: string;
  price: number;
}

export interface RecurringCycleMember {
  id: string;
  name: string;
  amount: number;
  status: MemberStatus;
  isYou?: boolean;
  source: RecurringCycleSource;
}

export interface RecurringCycle {
  id: string;
  label: string;
  dueDate: string;
  status: RecurringCycleStatus;
  totalAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  members: RecurringCycleMember[];
}

export interface RecurringGroup {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: string;
  rule: string;
  nextCycleDate: string;
  activeCycleId: string;
  unpaidCarryoverAmount: number;
  cycles: RecurringCycle[];
}

export interface Group {
  id: string;
  name: string;
  members: number;
  totalAmount: number;
  status: GroupStatus;
  date: string;
  yourShare: number;
  paid: boolean;
  role: GroupRole;
  billingMode?: BillingMode;
  ownerPays?: boolean;
  createdBy: string;
  createdDate: string;
  ownerCollectionAmount?: number;
  membersList: GroupMember[];
  activities: GroupActivity[];
  recurring?: RecurringGroup;
  review: {
    splitBy: string;
    items: ReviewItem[];
    rejectionReason?: string;
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function validateGroupBilling(group: Group) {
  const subBillTotal = roundCurrency(
    group.membersList.reduce((sum, member) => sum + member.amount, 0)
  );
  const totalAmount = roundCurrency(group.totalAmount);
  const difference = roundCurrency(totalAmount - subBillTotal);

  return {
    isValid: Math.abs(difference) < 0.01,
    subBillTotal,
    totalAmount,
    difference,
  };
}

const SPLITIT_GROUPS_KEY = 'splitit-groups';
const SPLITIT_GROUPS_EVENT = 'splitit-groups-updated';
const SPLITIT_GROUPS_VERSION_KEY = 'splitit-groups-version';
const SPLITIT_GROUPS_VERSION = '2026-04-08-v3';

export const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Dinner at Royal Palace',
    members: 4,
    totalAmount: 120,
    status: 'pending',
    date: '2026-04-05',
    yourShare: 30,
    paid: false,
    role: 'participant',
    createdBy: 'Sothea Ung',
    createdDate: '2026-04-05',
    membersList: [
      { id: '1', name: 'Sophea Chan', amount: 30, status: 'pending' },
      { id: '2', name: 'Dara Kim', amount: 30, status: 'approved' },
      { id: '3', name: 'Sothea Ung', amount: 30, status: 'paid' },
      { id: '4', name: 'You', amount: 30, status: 'pending', isYou: true },
    ],
    activities: [
      { id: '1-1', date: '2026-04-05', description: 'Bill created by Sothea Ung', amount: 120, status: 'pending' },
      { id: '1-2', date: '2026-04-05', description: 'Dara Kim approved assigned items', amount: 30, status: 'pending' },
    ],
    review: {
      splitBy: 'Sothea Ung',
      items: [
        { name: 'Caesar Salad', price: 12 },
        { name: 'Soft Drink', price: 3 },
        { name: 'Share of Appetizers', price: 15 },
      ],
    },
  },
  {
    id: '2',
    name: 'Weekend Trip to Siem Reap',
    members: 6,
    totalAmount: 450,
    status: 'active',
    date: '2026-04-04',
    yourShare: 0,
    paid: false,
    role: 'owner',
    ownerPays: true,
    createdBy: 'You',
    createdDate: '2026-04-04',
    ownerCollectionAmount: 300,
    membersList: [
      { id: '2-1', name: 'You', amount: 150, status: 'paid', isYou: true },
      { id: '2-2', name: 'Sokly Nhem', amount: 75, status: 'paid' },
      { id: '2-3', name: 'Pisey Keo', amount: 75, status: 'approved' },
      { id: '2-4', name: 'Dara Kim', amount: 50, status: 'pending' },
      { id: '2-5', name: 'Malis Pov', amount: 50, status: 'pending' },
      { id: '2-6', name: 'Vanna Sok', amount: 50, status: 'pending' },
    ],
    activities: [
      { id: '2-1', date: '2026-04-04', description: 'You uploaded hotel, fuel, and food receipts', amount: 450, status: 'pending' },
      { id: '2-2', date: '2026-04-05', description: 'Sokly Nhem completed payment', amount: 75, status: 'paid' },
      { id: '2-3', date: '2026-04-05', description: 'Pisey Keo approved share and is awaiting payment', amount: 75, status: 'pending' },
    ],
    review: {
      splitBy: 'You',
      items: [
        { name: 'Hotel booking', price: 220 },
        { name: 'Van rental', price: 140 },
        { name: 'Shared meals', price: 90 },
      ],
    },
  },
  {
    id: '3',
    name: 'Coffee Meeting',
    members: 3,
    totalAmount: 18,
    status: 'active',
    date: '2026-04-06',
    yourShare: 6,
    paid: true,
    role: 'participant',
    createdBy: 'Sophea Chan',
    createdDate: '2026-04-06',
    membersList: [
      { id: '3-1', name: 'Sophea Chan', amount: 6, status: 'paid' },
      { id: '3-2', name: 'You', amount: 6, status: 'paid', isYou: true },
      { id: '3-3', name: 'Rattana Ly', amount: 6, status: 'approved' },
    ],
    activities: [
      { id: '3-1', date: '2026-04-06', description: 'You paid your coffee share', amount: 6, status: 'paid' },
    ],
    review: {
      splitBy: 'Sophea Chan',
      items: [
        { name: 'Latte', price: 3.5 },
        { name: 'Croissant', price: 2.5 },
      ],
    },
  },
  {
    id: '4',
    name: 'Gym Membership Split',
    members: 5,
    totalAmount: 200,
    status: 'pending',
    date: '2026-04-07',
    yourShare: 40,
    paid: false,
    role: 'participant',
    createdBy: 'Rithy Nov',
    createdDate: '2026-04-07',
    membersList: [
      { id: '4-1', name: 'Rithy Nov', amount: 40, status: 'paid' },
      { id: '4-2', name: 'You', amount: 40, status: 'pending', isYou: true },
      { id: '4-3', name: 'Dina Chea', amount: 40, status: 'pending' },
      { id: '4-4', name: 'Tola Seng', amount: 40, status: 'approved' },
      { id: '4-5', name: 'Mony Roth', amount: 40, status: 'pending' },
    ],
    activities: [
      { id: '4-1', date: '2026-04-07', description: 'Monthly membership invoice uploaded', amount: 200, status: 'pending' },
    ],
    review: {
      splitBy: 'Rithy Nov',
      items: [
        { name: 'Monthly gym pass', price: 35 },
        { name: 'Locker fee', price: 5 },
      ],
    },
  },
  {
    id: '5',
    name: 'Birthday Party @ Mekong',
    members: 8,
    totalAmount: 320,
    status: 'active',
    date: '2026-04-03',
    yourShare: 0,
    paid: false,
    role: 'owner',
    ownerPays: false,
    createdBy: 'You',
    createdDate: '2026-04-03',
    ownerCollectionAmount: 180,
    membersList: [
      { id: '5-1', name: 'You', amount: 0, status: 'paid', isYou: true, note: 'Host only. This bill is covered by participants.' },
      { id: '5-2', name: 'Sothea Ung', amount: 50, status: 'paid' },
      { id: '5-3', name: 'Dara Kim', amount: 50, status: 'approved' },
      { id: '5-4', name: 'Pich Sreynang', amount: 45, status: 'pending' },
      { id: '5-5', name: 'Malis Pov', amount: 45, status: 'paid' },
      { id: '5-6', name: 'Piseth Yim', amount: 45, status: 'pending' },
      { id: '5-7', name: 'Rina Lorn', amount: 45, status: 'pending' },
      { id: '5-8', name: 'Vuthy Orm', amount: 40, status: 'approved' },
    ],
    activities: [
      { id: '5-1', date: '2026-04-03', description: 'You hosted the party and assigned the full bill to participants only', amount: 320, status: 'pending' },
      { id: '5-2', date: '2026-04-04', description: 'Sothea Ung paid via bank transfer', amount: 40, status: 'paid' },
      { id: '5-3', date: '2026-04-04', description: 'Malis Pov paid cash share', amount: 30, status: 'paid' },
    ],
    review: {
      splitBy: 'You',
      items: [
        { name: 'Dinner buffet', price: 240 },
        { name: 'Birthday cake', price: 50 },
        { name: 'Decorations', price: 30 },
      ],
    },
  },
  {
    id: '6',
    name: 'Groceries Shopping',
    members: 4,
    totalAmount: 85,
    status: 'active',
    date: '2026-04-02',
    yourShare: 21.25,
    paid: true,
    role: 'participant',
    createdBy: 'Vanna Sok',
    createdDate: '2026-04-02',
    membersList: [
      { id: '6-1', name: 'Vanna Sok', amount: 21.25, status: 'paid' },
      { id: '6-2', name: 'You', amount: 21.25, status: 'paid', isYou: true },
      { id: '6-3', name: 'Rattana Ly', amount: 21.25, status: 'paid' },
      { id: '6-4', name: 'Sophea Chan', amount: 21.25, status: 'paid' },
    ],
    activities: [
      { id: '6-1', date: '2026-04-02', description: 'All grocery shares settled', amount: 85, status: 'paid' },
    ],
    review: {
      splitBy: 'Vanna Sok',
      items: [
        { name: 'Vegetables', price: 8.25 },
        { name: 'Dairy items', price: 7 },
        { name: 'Snacks', price: 6 },
      ],
    },
  },
  {
    id: '7',
    name: 'Movie Night',
    members: 3,
    totalAmount: 45,
    status: 'completed',
    date: '2026-03-28',
    yourShare: 15,
    paid: true,
    role: 'participant',
    createdBy: 'Dara Kim',
    createdDate: '2026-03-28',
    membersList: [
      { id: '7-1', name: 'Dara Kim', amount: 15, status: 'paid' },
      { id: '7-2', name: 'You', amount: 15, status: 'paid', isYou: true },
      { id: '7-3', name: 'Pisey Keo', amount: 15, status: 'paid' },
    ],
    activities: [
      { id: '7-1', date: '2026-03-28', description: 'Cinema tickets fully settled', amount: 45, status: 'paid' },
    ],
    review: {
      splitBy: 'Dara Kim',
      items: [
        { name: 'Movie ticket', price: 10 },
        { name: 'Popcorn combo', price: 5 },
      ],
    },
  },
  {
    id: '8',
    name: 'Karaoke Night',
    members: 7,
    totalAmount: 175,
    status: 'completed',
    date: '2026-03-25',
    yourShare: 0,
    paid: false,
    role: 'owner',
    ownerPays: false,
    createdBy: 'You',
    createdDate: '2026-03-25',
    ownerCollectionAmount: 0,
    membersList: [
      { id: '8-1', name: 'You', amount: 0, status: 'paid', isYou: true, note: 'Organizer only. Participants cover the room and drinks.' },
      { id: '8-2', name: 'Rattana Ly', amount: 30, status: 'paid' },
      { id: '8-3', name: 'Sophea Chan', amount: 30, status: 'paid' },
      { id: '8-4', name: 'Dina Chea', amount: 30, status: 'paid' },
      { id: '8-5', name: 'Tola Seng', amount: 30, status: 'paid' },
      { id: '8-6', name: 'Piseth Yim', amount: 25, status: 'paid' },
      { id: '8-7', name: 'Vanna Sok', amount: 30, status: 'paid' },
    ],
    activities: [
      { id: '8-1', date: '2026-03-25', description: 'All participants completed payment', amount: 175, status: 'paid' },
    ],
    review: {
      splitBy: 'You',
      items: [
        { name: 'Room booking', price: 120 },
        { name: 'Drinks package', price: 55 },
      ],
    },
  },
  {
    id: '9',
    name: 'Beach Trip Expenses',
    members: 5,
    totalAmount: 280,
    status: 'completed',
    date: '2026-03-20',
    yourShare: 56,
    paid: true,
    role: 'participant',
    createdBy: 'Malis Pov',
    createdDate: '2026-03-20',
    membersList: [
      { id: '9-1', name: 'Malis Pov', amount: 56, status: 'paid' },
      { id: '9-2', name: 'You', amount: 56, status: 'paid', isYou: true },
      { id: '9-3', name: 'Sokly Nhem', amount: 56, status: 'paid' },
      { id: '9-4', name: 'Dara Kim', amount: 56, status: 'paid' },
      { id: '9-5', name: 'Rina Lorn', amount: 56, status: 'paid' },
    ],
    activities: [
      { id: '9-1', date: '2026-03-20', description: 'Fuel, food, and bungalow costs settled', amount: 280, status: 'paid' },
    ],
    review: {
      splitBy: 'Malis Pov',
      items: [
        { name: 'Fuel contribution', price: 18 },
        { name: 'Lunch share', price: 16 },
        { name: 'Bungalow stay', price: 22 },
      ],
    },
  },
  {
    id: '10',
    name: 'Pizza Party',
    members: 6,
    totalAmount: 72,
    status: 'completed',
    date: '2026-03-15',
    yourShare: 0,
    paid: false,
    role: 'owner',
    ownerPays: false,
    createdBy: 'You',
    createdDate: '2026-03-15',
    ownerCollectionAmount: 0,
    membersList: [
      { id: '10-1', name: 'You', amount: 0, status: 'paid', isYou: true, note: 'Team lead only. Lunch cost is split across attendees.' },
      { id: '10-2', name: 'Sothea Ung', amount: 14, status: 'paid' },
      { id: '10-3', name: 'Rattana Ly', amount: 14, status: 'paid' },
      { id: '10-4', name: 'Piseth Yim', amount: 14, status: 'paid' },
      { id: '10-5', name: 'Dina Chea', amount: 15, status: 'paid' },
      { id: '10-6', name: 'Vuthy Orm', amount: 15, status: 'paid' },
    ],
    activities: [
      { id: '10-1', date: '2026-03-15', description: 'Pizza order settled by all six members', amount: 72, status: 'paid' },
    ],
    review: {
      splitBy: 'You',
      items: [
        { name: 'Large pepperoni pizza', price: 24 },
        { name: 'Large seafood pizza', price: 28 },
        { name: 'Soft drinks', price: 20 },
      ],
    },
  },
  {
    id: '11',
    name: 'Team Lunch Delivery',
    members: 5,
    totalAmount: 95,
    status: 'active',
    date: '2026-04-07',
    yourShare: 19,
    paid: false,
    role: 'participant',
    createdBy: 'Pisey Keo',
    createdDate: '2026-04-07',
    membersList: [
      { id: '11-1', name: 'Pisey Keo', amount: 19, status: 'paid' },
      { id: '11-2', name: 'You', amount: 19, status: 'approved', isYou: true },
      { id: '11-3', name: 'Sophea Chan', amount: 19, status: 'pending' },
      { id: '11-4', name: 'Malis Pov', amount: 19, status: 'pending' },
      { id: '11-5', name: 'Tola Seng', amount: 19, status: 'paid' },
    ],
    activities: [
      { id: '11-1', date: '2026-04-07', description: 'You approved your lunch split and are ready to pay', amount: 19, status: 'pending' },
    ],
    review: {
      splitBy: 'Pisey Keo',
      items: [
        { name: 'Chicken rice bowl', price: 11 },
        { name: 'Iced coffee', price: 3 },
        { name: 'Delivery fee share', price: 5 },
      ],
    },
  },
  {
    id: '11b',
    name: 'Riverside Dinner Split',
    members: 5,
    totalAmount: 140,
    status: 'pending',
    date: '2026-04-08',
    yourShare: 28,
    paid: false,
    role: 'participant',
    createdBy: 'Pisey Keo',
    createdDate: '2026-04-08',
    membersList: [
      { id: '11b-1', name: 'Pisey Keo', amount: 28, status: 'paid' },
      { id: '11b-2', name: 'You', amount: 28, status: 'approved', isYou: true },
      { id: '11b-3', name: 'Sophea Chan', amount: 32, status: 'rejected', note: 'Seafood platter should not be included in my share.' },
      { id: '11b-4', name: 'Malis Pov', amount: 26, status: 'pending' },
      { id: '11b-5', name: 'Tola Seng', amount: 26, status: 'pending' },
    ],
    activities: [
      { id: '11b-1', date: '2026-04-08', description: 'Sophea Chan rejected the current split and requested a revision', amount: 32, status: 'rejected' },
      { id: '11b-2', date: '2026-04-08', description: 'You already reviewed your share and are waiting for the updated split', amount: 28, status: 'pending' },
    ],
    review: {
      splitBy: 'Pisey Keo',
      items: [
        { name: 'Grilled beef share', price: 14 },
        { name: 'Rice and sides', price: 8 },
        { name: 'Drink share', price: 6 },
      ],
      rejectionReason: 'Seafood platter should only be assigned to the people who ordered it.',
    },
  },
  {
    id: '12',
    name: 'Office Snacks Restock',
    members: 4,
    totalAmount: 64,
    status: 'active',
    date: '2026-04-01',
    yourShare: 0,
    paid: false,
    role: 'owner',
    ownerPays: false,
    createdBy: 'You',
    createdDate: '2026-04-01',
    ownerCollectionAmount: 42,
    membersList: [
      { id: '12-1', name: 'You', amount: 0, status: 'paid', isYou: true, note: 'Coordinator only. Team members cover the restock cost.' },
      { id: '12-2', name: 'Dara Kim', amount: 22, status: 'paid' },
      { id: '12-3', name: 'Sophea Chan', amount: 21, status: 'pending' },
      { id: '12-4', name: 'Piseth Yim', amount: 21, status: 'pending' },
    ],
    activities: [
      { id: '12-1', date: '2026-04-01', description: 'You fronted snack and drink purchases and split the full amount across participants', amount: 64, status: 'pending' },
      { id: '12-2', date: '2026-04-02', description: 'Dara Kim reimbursed their share', amount: 22, status: 'paid' },
    ],
    review: {
      splitBy: 'You',
      items: [
        { name: 'Coffee pods', price: 24 },
        { name: 'Sparkling water', price: 18 },
        { name: 'Assorted biscuits', price: 22 },
      ],
    },
  },
  {
    id: '13',
    name: 'Seafood BBQ Night',
    members: 5,
    totalAmount: 210,
    status: 'pending',
    date: '2026-04-07',
    yourShare: 48,
    paid: false,
    role: 'participant',
    createdBy: 'Sokly Nhem',
    createdDate: '2026-04-07',
    membersList: [
      { id: '13-1', name: 'Sokly Nhem', amount: 42, status: 'paid' },
      { id: '13-2', name: 'You', amount: 48, status: 'rejected', isYou: true, note: 'Assigned grilled squid and beer bucket that you did not order.' },
      { id: '13-3', name: 'Dara Kim', amount: 40, status: 'approved' },
      { id: '13-4', name: 'Sophea Chan', amount: 40, status: 'pending' },
      { id: '13-5', name: 'Rina Lorn', amount: 40, status: 'pending' },
    ],
    activities: [
      { id: '13-1', date: '2026-04-07', description: 'You rejected your assigned share due to incorrect items', amount: 48, status: 'rejected' },
      { id: '13-2', date: '2026-04-07', description: 'Owner is reviewing your rejection and preparing a revised split', amount: 210, status: 'pending' },
    ],
    review: {
      splitBy: 'Sokly Nhem',
      items: [
        { name: 'BBQ pork set', price: 18 },
        { name: 'Shared vegetables', price: 8 },
        { name: 'Mismatched grilled squid', price: 22 },
      ],
      rejectionReason: 'I did not order the grilled squid platter or share the beer bucket.',
    },
  },
  {
    id: '14',
    name: 'Co-working Space Day Pass',
    members: 4,
    totalAmount: 96,
    status: 'active',
    date: '2026-04-06',
    yourShare: 0,
    paid: false,
    role: 'owner',
    ownerPays: false,
    createdBy: 'You',
    createdDate: '2026-04-06',
    ownerCollectionAmount: 64,
    membersList: [
      { id: '14-1', name: 'You', amount: 0, status: 'paid', isYou: true, note: 'Host only. Participants split the workspace charges.' },
      { id: '14-2', name: 'Piseth Yim', amount: 32, status: 'paid' },
      { id: '14-3', name: 'Malis Pov', amount: 32, status: 'rejected', note: 'Asked to remove printer fee from their portion.' },
      { id: '14-4', name: 'Dina Chea', amount: 32, status: 'pending' },
    ],
    activities: [
      { id: '14-1', date: '2026-04-06', description: 'Malis Pov rejected the printer surcharge on their bill', amount: 24, status: 'rejected' },
      { id: '14-2', date: '2026-04-06', description: 'You need to revise the split before sending another reminder', amount: 96, status: 'pending' },
    ],
    review: {
      splitBy: 'You',
      items: [
        { name: 'Day pass', price: 20 },
        { name: 'Coffee add-on', price: 2 },
        { name: 'Printer fee', price: 2 },
      ],
      rejectionReason: 'Printer fee should only apply to the people who used it.',
    },
  },
  {
    id: '15',
    name: 'Netflix Family Plan',
    members: 5,
    totalAmount: 24,
    status: 'active',
    date: '2026-04-08',
    yourShare: 0,
    paid: false,
    role: 'owner',
    billingMode: 'recurring',
    ownerPays: false,
    createdBy: 'You',
    createdDate: '2026-02-01',
    ownerCollectionAmount: 18,
    membersList: [
      { id: '15-1', name: 'You', amount: 0, status: 'paid', isYou: true, note: 'Subscription owner only. Family members reimburse each cycle.' },
      { id: '15-2', name: 'Dara Kim', amount: 6, status: 'pending' },
      { id: '15-3', name: 'Sophea Chan', amount: 6, status: 'paid' },
      { id: '15-4', name: 'Piseth Yim', amount: 6, status: 'approved' },
      { id: '15-5', name: 'Malis Pov', amount: 6, status: 'paid' },
    ],
    activities: [
      { id: '15-1', date: '2026-04-08', description: 'April cycle opened for family plan collection', amount: 24, status: 'pending' },
      { id: '15-2', date: '2026-03-08', description: 'Dara Kim still has an unpaid balance from March', amount: 6, status: 'pending' },
    ],
    recurring: {
      frequency: 'monthly',
      startDate: '2026-02-01',
      rule: 'Every 8th of month',
      nextCycleDate: '2026-05-08',
      activeCycleId: '15-cycle-apr',
      unpaidCarryoverAmount: 6,
      cycles: [
        {
          id: '15-cycle-apr',
          label: 'April 2026',
          dueDate: '2026-04-08',
          status: 'partial',
          totalAmount: 24,
          collectedAmount: 12,
          outstandingAmount: 12,
          members: [
            { id: '15c1-1', name: 'Dara Kim', amount: 6, status: 'pending', source: 'current' },
            { id: '15c1-2', name: 'Sophea Chan', amount: 6, status: 'paid', source: 'current' },
            { id: '15c1-3', name: 'Piseth Yim', amount: 6, status: 'approved', source: 'current' },
            { id: '15c1-4', name: 'Malis Pov', amount: 6, status: 'paid', source: 'current' },
          ],
        },
        {
          id: '15-cycle-mar',
          label: 'March 2026',
          dueDate: '2026-03-08',
          status: 'overdue',
          totalAmount: 24,
          collectedAmount: 18,
          outstandingAmount: 6,
          members: [
            { id: '15c2-1', name: 'Dara Kim', amount: 6, status: 'pending', source: 'carryover' },
            { id: '15c2-2', name: 'Sophea Chan', amount: 6, status: 'paid', source: 'current' },
            { id: '15c2-3', name: 'Piseth Yim', amount: 6, status: 'paid', source: 'current' },
            { id: '15c2-4', name: 'Malis Pov', amount: 6, status: 'paid', source: 'current' },
          ],
        },
      ],
    },
    review: {
      splitBy: 'You',
      items: [
        { name: 'Netflix Premium subscription', price: 24 },
      ],
    },
  },
  {
    id: '16',
    name: 'Office Snacks Weekly',
    members: 4,
    totalAmount: 20,
    status: 'active',
    date: '2026-04-08',
    yourShare: 5,
    paid: false,
    role: 'participant',
    billingMode: 'recurring',
    createdBy: 'Rattana Ly',
    createdDate: '2026-03-18',
    membersList: [
      { id: '16-1', name: 'Rattana Ly', amount: 5, status: 'paid' },
      { id: '16-2', name: 'You', amount: 5, status: 'pending', isYou: true, note: 'You still have one unpaid carryover from last week.' },
      { id: '16-3', name: 'Dina Chea', amount: 5, status: 'approved' },
      { id: '16-4', name: 'Sokly Nhem', amount: 5, status: 'paid' },
    ],
    activities: [
      { id: '16-1', date: '2026-04-08', description: 'This week\'s snack cycle is ready for review', amount: 20, status: 'pending' },
      { id: '16-2', date: '2026-04-01', description: 'Your prior weekly snack share remains unpaid', amount: 5, status: 'pending' },
    ],
    recurring: {
      frequency: 'weekly',
      startDate: '2026-03-18',
      rule: 'Every Wednesday',
      nextCycleDate: '2026-04-15',
      activeCycleId: '16-cycle-apr-08',
      unpaidCarryoverAmount: 5,
      cycles: [
        {
          id: '16-cycle-apr-08',
          label: 'Week of Apr 8',
          dueDate: '2026-04-08',
          status: 'due',
          totalAmount: 20,
          collectedAmount: 10,
          outstandingAmount: 10,
          members: [
            { id: '16c1-1', name: 'Rattana Ly', amount: 5, status: 'paid', source: 'current' },
            { id: '16c1-2', name: 'You', amount: 5, status: 'pending', isYou: true, source: 'current' },
            { id: '16c1-3', name: 'Dina Chea', amount: 5, status: 'approved', source: 'current' },
            { id: '16c1-4', name: 'Sokly Nhem', amount: 5, status: 'paid', source: 'current' },
          ],
        },
        {
          id: '16-cycle-apr-01',
          label: 'Week of Apr 1',
          dueDate: '2026-04-01',
          status: 'overdue',
          totalAmount: 20,
          collectedAmount: 15,
          outstandingAmount: 5,
          members: [
            { id: '16c2-1', name: 'Rattana Ly', amount: 5, status: 'paid', source: 'current' },
            { id: '16c2-2', name: 'You', amount: 5, status: 'pending', isYou: true, source: 'carryover' },
            { id: '16c2-3', name: 'Dina Chea', amount: 5, status: 'paid', source: 'current' },
            { id: '16c2-4', name: 'Sokly Nhem', amount: 5, status: 'paid', source: 'current' },
          ],
        },
      ],
    },
    review: {
      splitBy: 'Rattana Ly',
      items: [
        { name: 'Fruit basket', price: 8 },
        { name: 'Cold brew bottles', price: 6 },
        { name: 'Mixed snacks', price: 6 },
      ],
    },
  },
];

function emitGroupsUpdate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SPLITIT_GROUPS_EVENT));
}

function seedGroupsStorage() {
  if (typeof window === 'undefined') return mockGroups;

  window.localStorage.setItem(SPLITIT_GROUPS_KEY, JSON.stringify(mockGroups));
  window.localStorage.setItem(SPLITIT_GROUPS_VERSION_KEY, SPLITIT_GROUPS_VERSION);
  return mockGroups;
}

export function getGroups() {
  if (typeof window === 'undefined') return mockGroups;

  try {
    const storedGroups = window.localStorage.getItem(SPLITIT_GROUPS_KEY);
    const storedVersion = window.localStorage.getItem(SPLITIT_GROUPS_VERSION_KEY);
    return storedGroups && storedVersion === SPLITIT_GROUPS_VERSION
      ? (JSON.parse(storedGroups) as Group[])
      : seedGroupsStorage();
  } catch {
    return seedGroupsStorage();
  }
}

export function saveGroups(groups: Group[]) {
  if (typeof window === 'undefined') return;

  const invalidGroup = groups.find((group) => !validateGroupBilling(group).isValid);
  if (invalidGroup) {
    const validation = validateGroupBilling(invalidGroup);
    throw new Error(
      `Invalid bill total for group "${invalidGroup.name}": sub-bills ${validation.subBillTotal.toFixed(2)} do not match total ${validation.totalAmount.toFixed(2)}.`
    );
  }

  window.localStorage.setItem(SPLITIT_GROUPS_KEY, JSON.stringify(groups));
  window.localStorage.setItem(SPLITIT_GROUPS_VERSION_KEY, SPLITIT_GROUPS_VERSION);
  emitGroupsUpdate();
}

export function subscribeToGroups(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handleUpdate = () => callback();
  window.addEventListener(SPLITIT_GROUPS_EVENT, handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener(SPLITIT_GROUPS_EVENT, handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

export function upsertGroup(group: Group) {
  const groups = getGroups();
  const existingIndex = groups.findIndex((item) => item.id === group.id);

  if (existingIndex >= 0) {
    const nextGroups = [...groups];
    nextGroups[existingIndex] = group;
    saveGroups(nextGroups);
    return group;
  }

  saveGroups([group, ...groups]);
  return group;
}

export function updateGroup(groupId: string, updater: (group: Group) => Group) {
  const groups = getGroups();
  const nextGroups = groups.map((group) => (group.id === groupId ? updater(group) : group));
  saveGroups(nextGroups);
  return nextGroups.find((group) => group.id === groupId);
}

export function getGroupById(groupId?: string) {
  return getGroups().find((group) => group.id === groupId);
}

export function getUnpaidBills() {
  return getGroups().filter((group) => group.role === 'participant' && group.status !== 'completed' && !group.paid);
}

export function getTotalOwed() {
  return getUnpaidBills().reduce((sum, group) => sum + group.yourShare, 0);
}

export function getUnpaidCount() {
  return getUnpaidBills().length;
}
