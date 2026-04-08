import { useNavigate, useParams, useLocation } from 'react-router';
import { ArrowLeft, Camera, Plus, X, DollarSign, Package2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  BillingFrequency,
  BillingMode,
  DraftContact as Contact,
  DraftInvoiceItem as InvoiceItem,
  InvitationMethod,
  loadSplitItDraft,
  saveSplitItDraft,
} from '../utils/splitItDraft';

interface InvoiceEntryState {
  groupName?: string;
  members?: Contact[];
  invitationMethod?: InvitationMethod;
  billingMode?: BillingMode;
  billingFrequency?: BillingFrequency;
  billingStartDate?: string;
  billingRule?: string;
  billCategory?: string;
  dueDate?: string;
  billNote?: string;
  items?: InvoiceItem[];
  rejectionReason?: string;
  mode?: 'create' | 'revision';
}

export function InvoiceEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId } = useParams();
  const routeState = (location.state as InvoiceEntryState | null) ?? null;
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
    items: routeState?.items ?? draft?.items,
  };
  const isRecurring = mergedState.billingMode === 'recurring';

  const [items, setItems] = useState<InvoiceItem[]>(mergedState.items ?? []);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [showAddItem, setShowAddItem] = useState(false);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const handleAddItem = () => {
    const parsedPrice = parseFloat(itemPrice);
    const parsedQuantity = parseInt(itemQuantity, 10);

    if (itemName && parsedPrice > 0 && parsedQuantity > 0) {
      const newItem: InvoiceItem = {
        id: Date.now().toString(),
        name: itemName,
        price: parsedPrice,
        quantity: parsedQuantity,
      };
      setItems([...items, newItem]);
      setItemName('');
      setItemPrice('');
      setItemQuantity('1');
      setShowAddItem(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleItemChange = (itemId: string, field: 'price' | 'quantity', value: number) => {
    setItems(items.map((item) => (
      item.id === itemId
        ? {
            ...item,
            [field]: field === 'quantity' ? Math.max(1, Math.floor(value || 1)) : Math.max(0, value || 0),
          }
        : item
    )));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    saveSplitItDraft({
      ...loadSplitItDraft(),
      groupName: mergedState.groupName,
      members: mergedState.members,
      invitationMethod: mergedState.invitationMethod,
      billingMode: mergedState.billingMode,
      billingFrequency: mergedState.billingFrequency,
      billingStartDate: mergedState.billingStartDate,
      billingRule: mergedState.billingRule,
      items,
      totalAmount,
    });
  }, [
    items,
    totalAmount,
    mergedState.groupName,
    mergedState.members,
    mergedState.invitationMethod,
    mergedState.billingMode,
    mergedState.billingFrequency,
    mergedState.billingStartDate,
    mergedState.billingRule,
  ]);

  const handleContinue = () => {
    navigate(`/splitit/group/${groupId}/split`, {
      state: {
        items,
        totalAmount,
        groupName: mergedState.groupName,
        members: mergedState.members,
        invitationMethod: mergedState.invitationMethod,
        billingMode: mergedState.billingMode,
        billingFrequency: mergedState.billingFrequency,
        billingStartDate: mergedState.billingStartDate,
        billingRule: mergedState.billingRule,
        billCategory: routeState?.billCategory,
        dueDate: routeState?.dueDate,
        billNote: routeState?.billNote,
        rejectionReason: routeState?.rejectionReason,
        mode: routeState?.mode,
      },
    });
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
              {routeState?.mode === 'revision' ? 'Recheck Invoice' : isRecurring ? 'Charge Setup' : 'Add Invoice'}
            </h1>
            <div className="w-10" />
          </div>

          {mergedState.groupName && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{mergedState.groupName}</p>
                  <p className="text-xs text-white/70">
                    {mergedState.members?.length ?? 0} participants • {mergedState.invitationMethod === 'qr' ? 'QR code invitation' : 'Direct invitation'}
                  </p>
                  {isRecurring && (
                    <p className="text-[11px] text-white/60 mt-1">
                      {mergedState.billingRule || 'Recurring'}{mergedState.billingStartDate ? ` • starts ${mergedState.billingStartDate}` : ''}
                    </p>
                  )}
                  {(routeState.billCategory || routeState.dueDate) && (
                    <p className="text-[11px] text-white/60 mt-1">
                      {routeState.billCategory ? `${routeState.billCategory}` : 'General'}{routeState.dueDate ? ` • due ${routeState.dueDate}` : ''}
                    </p>
                  )}
                </div>
                <div className="px-3 py-1 bg-white/15 rounded-full">
                  <span className="text-xs text-white font-medium">
                    {routeState.mode === 'revision' ? 'Revision mode' : 'Owner setup'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {routeState?.rejectionReason && (
            <div className="bg-red-500/15 border border-red-300/30 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-white mb-1">Rejection feedback</p>
              <p className="text-xs text-white/80">{routeState.rejectionReason}</p>
            </div>
          )}

          {routeState?.billNote && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-white mb-1">Group Note</p>
              <p className="text-xs text-white/75">{routeState.billNote}</p>
            </div>
          )}

          <button className="w-full bg-white/10 backdrop-blur rounded-2xl p-4 mb-4 hover:bg-white/20 transition-colors">
            <div className="flex items-center justify-center gap-3">
              <Camera className="w-6 h-6 text-white" />
              <div className="text-left">
                <p className="text-white font-semibold">{isRecurring ? 'Import Current Cycle' : 'Scan Receipt'}</p>
                <p className="text-white/70 text-xs">
                  {isRecurring ? 'Optional for subscription cycles that vary each period' : 'Automatically detect items, qty, and prices'}
                </p>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/70 text-sm">or add manually</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
        </div>

        <div className="flex-1 bg-white rounded-t-3xl px-4 py-6 overflow-y-auto">
          <div className="mb-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {isRecurring ? 'Receipt items are optional' : 'Invoice is optional'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isRecurring
                ? 'For recurring groups, you can skip receipt items and set fixed member charges in the next step.'
                : 'You can continue without adding receipt items and define the split manually in the next step.'}
            </p>
          </div>

          {items.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500">BILL ITEMS</h3>
                <span className="text-xs text-gray-500">{totalItems} units total</span>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          Line total: ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Qty</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value, 10))}
                          className="w-full px-4 py-3 bg-white rounded-xl outline-none border border-gray-200 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Unit Price ($)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                            className="w-full pl-8 pr-4 py-3 bg-white rounded-xl outline-none border border-gray-200 focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Total Amount</span>
                  <span className="text-2xl font-bold text-emerald-600">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {showAddItem ? (
            <div className="bg-blue-50 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">Add New Item</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Item Name</label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g., Pizza Margherita"
                    className="w-full px-4 py-3 bg-white rounded-xl outline-none border border-gray-200 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none border border-gray-200 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Unit Price ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl outline-none border border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                <button
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                  <button
                    onClick={handleAddItem}
                    disabled={!itemName || !itemPrice || !itemQuantity}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:bg-gray-300"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          )}

          {items.length === 0 && !showAddItem && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package2 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No Items Yet</h3>
              <p className="text-sm text-gray-500">
                {isRecurring
                  ? 'Skip this step if you already know what each participant should pay this cycle.'
                  : 'Add items with quantity and unit price, or skip this step and split manually.'}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
          >
            {items.length > 0
              ? (isRecurring ? 'Continue to Member Charges' : 'Continue to Split Bill')
              : (isRecurring ? 'Continue to Member Charges' : 'Continue to Manual Split')}
          </button>
        </div>
      </div>
    </div>
  );
}
