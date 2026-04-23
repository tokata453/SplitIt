import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, ChevronRight, Home as HomeIcon, Users, CreditCard, Grid2x2, Split, Wallet, ScanLine, Smartphone, ReceiptText, ScrollText, ArrowUpRight, Star, AlertTriangle, X } from 'lucide-react';
import { fetchHomeSummary, onGroupsChanged } from '../utils/splitItApi';
import { getTotalOwed, getUnpaidCount } from '../utils/splitItData';
import { fetchIncomingRequests, fetchSentRequests } from '../features/splitit/api';
import { SplitIncomingRequest, SplitRequest } from '../features/splitit/types';

function getOwnerPendingAmount(requests: SplitRequest[]) {
  return requests.reduce((total, request) => {
    return total + request.notifications
      .filter((notification) => notification.status !== 'viewed')
      .reduce((requestTotal, notification) => requestTotal + notification.amount, 0);
  }, 0);
}

function getParticipantOweAmount(requests: SplitIncomingRequest[]) {
  return requests.reduce((total, request) => {
    if (request.status === 'pending_review' || request.status === 'payment_due') {
      return total + request.yourAmount;
    }

    return total;
  }, 0);
}

export function Home() {
  const navigate = useNavigate();
  const [showSplitItAlert, setShowSplitItAlert] = useState(false);
  const [summary, setSummary] = useState({
    totalOwed: getTotalOwed(),
    unpaidCount: getUnpaidCount(),
  });
  const [billSummary, setBillSummary] = useState({
    ownerPending: 0,
    participantOwe: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      const nextSummary = await fetchHomeSummary();
      if (!isMounted) return;
      setSummary(nextSummary);
    };

    void loadSummary();

    const unsubscribe = onGroupsChanged(() => {
      void loadSummary();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBillSummary = async () => {
      const [sentRequests, incomingRequests] = await Promise.all([
        fetchSentRequests(),
        fetchIncomingRequests(),
      ]);

      if (!isMounted) return;

      setBillSummary({
        ownerPending: getOwnerPendingAmount(sentRequests),
        participantOwe: getParticipantOweAmount(incomingRequests),
      });
    };

    void loadBillSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalOwed = summary.totalOwed;
  const unpaidCount = summary.unpaidCount;
  const hasUnpaidBills = unpaidCount > 0;

  useEffect(() => {
    if (!hasUnpaidBills) {
      setShowSplitItAlert(false);
      return;
    }

    setShowSplitItAlert(true);
  }, [hasUnpaidBills]);

  const handleDismissAlert = () => {
    setShowSplitItAlert(false);
  };

  const handleOpenSplitIt = () => {
    setShowSplitItAlert(false);
    navigate('/splitit/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      {showSplitItAlert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 pointer-events-none">
          <div className="w-full bg-red-50 border border-red-200 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto">
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900">
                  {unpaidCount} unpaid {unpaidCount === 1 ? 'bill' : 'bills'} • ${totalOwed.toFixed(2)}
                </p>
                <p className="text-xs text-red-700 truncate">
                  Review your pending SplitIt payments.
                </p>
              </div>
              <button
                onClick={handleDismissAlert}
                className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 hover:bg-red-200 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pb-3 flex gap-2">
              <button
                onClick={handleDismissAlert}
                className="flex-1 py-2 bg-red-100 text-red-800 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleOpenSplitIt}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                View SplitIt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-transparent rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-transparent rounded-full"><img src='https://play-lh.googleusercontent.com/1EZF8Qyofhne2zbJBwCLQl95dN-UA7qVIsF32g1trC2NXsI979C-QYFpj-TWhgfx3X8' /></div>
              </div>
              <span className="text-white font-semibold text-lg">SATHAPHANA</span>
            </div>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-white" />
              <div className="w-5 h-5 bg-red-500 rounded"><img src='https://play-lh.googleusercontent.com/Q27JPO0Plka8m3_-h2yw3Xu22Wedt3NJcxl1NPgMlaI6VRNcmSEPArvAcmnK1_TpmMBUlTsxjS1ycy0rRDFrmA=w240-h480-rw'/></div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Good Morning, រស្មី​សោភ័ណ្ឌ</p>
                  <p className="text-xs text-gray-400">View Profile</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">$3,450</p>
                <p className="text-sm text-gray-600">៛៣,៨០០,០០០</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <div className="flex item-center gap-1 text-blue-900">
                    <Star className="w-5 h-5 " />
                    <p className="text-xs">Sathaphana Star</p>
                  </div>
                  <button className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                    Redeem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <h3 className="text-white font-semibold mb-3">Financial Services</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white/90 backdrop-blur rounded-2xl p-4 flex flex-col items-center justify-center h-24 shadow-md hover:shadow-lg transition-shadow">
              <ArrowUpRight className="w-6 h-6 text-blue-900 mb-2" />
              <span className="text-sm font-medium text-blue-900">Transfer</span>
            </button>
            <button className="bg-white/90 backdrop-blur rounded-2xl p-4 flex flex-col items-center justify-center h-24 shadow-md hover:shadow-lg transition-shadow">
              <ReceiptText className="w-6 h-6 text-blue-900 mb-2" />
              <span className="text-sm font-medium text-blue-900">Bill Payment</span>
            </button>
            <button className="bg-white/90 backdrop-blur rounded-2xl p-4 flex flex-col items-center justify-center h-24 shadow-md hover:shadow-lg transition-shadow">
              <Smartphone className="w-6 h-6 text-blue-900 mb-2" />
              <span className="text-sm font-medium text-blue-900">Mobile Top Up</span>
            </button>
            <button className="bg-white/90 backdrop-blur rounded-2xl p-4 flex flex-col items-center justify-center h-24 shadow-md hover:shadow-lg transition-shadow">
              <ScrollText className="w-6 h-6 text-blue-900 mb-2" />
              <span className="text-sm font-medium text-blue-900">Apply</span>
            </button>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="w-full rounded-[28px] bg-white/95 p-4 shadow-lg relative">
            {hasUnpaidBills && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                <span className="text-white text-xs font-bold">{unpaidCount}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Split className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="text-left">
                  <p className="text-slate-900 font-bold text-lg">SplitIt</p>
                  <p className="text-slate-500 text-sm">Shared bill control center</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {hasUnpaidBills ? 'Action needed' : 'Updated'}
              </span>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">To receive</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">${billSummary.ownerPending.toFixed(2)}</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">You owe</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">${billSummary.participantOwe.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/splitit/dashboard')}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#173b63] px-4 py-3.5 text-sm font-semibold text-white"
              >
                Open dashboard
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/splitit/create')}
                className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 mb-24 pb-4">
          <div className='flex justify-between item-center mb-3'>
            <h2 className="text-white font-semibold">Promotions</h2>
            <p className='text-white pr-2'>More</p>
          </div>
          <div className="rounded-2xl shadow overflow-hidden">
            <img
              src="https://www.sathapana.com.kh/uploads/2680b0b25b3f44c32c1d61d26cc821ae66bf1bd6/Sathapana-Credit-Card-Program-EN.jpg"
              alt="Sathapana Credit Card"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur rounded-t-3xl px-6 py-4 shadow-2xl z-40">
          <div className="flex items-center justify-around">
            <button className="flex-1 flex flex-col items-center gap-1">
              <HomeIcon className="w-6 h-6 text-[#1e3a5f]" />
              <span className="text-xs text-[#1e3a5f] font-medium">Home</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-1">
              <Wallet className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Accounts</span>
            </button>
            <button className="flex-1 flex flex-col items-center -mt-8">
              <div className="w-14 h-14 bg-[#1e3a5f] rounded-full flex items-center justify-center shadow-lg ring-4 ring-white">
                <ScanLine className="w-7 h-7 text-white" />
              </div>
            </button>
            <button className="flex-1 flex flex-col items-center gap-1">
              <CreditCard className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Card</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-1">
              <Grid2x2 className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
