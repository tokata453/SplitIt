import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, ChevronRight, Home as HomeIcon, Users, CreditCard, Grid2x2, Split, Wallet, ScanLine, Smartphone, ReceiptText, ScrollText, ArrowUpRight, Star } from 'lucide-react';
import { fetchHomeSummary, onGroupsChanged } from '../utils/splitItApi';
import { getTotalOwed, getUnpaidCount } from '../utils/splitItData';

function formatTimeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function Home() {
  const navigate = useNavigate();
  const [showSplitItAlert, setShowSplitItAlert] = useState(false);
  const [summary, setSummary] = useState({
    totalOwed: getTotalOwed(),
    unpaidCount: getUnpaidCount(),
  });
  const [alertStartedAt, setAlertStartedAt] = useState(() => new Date());

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

  const totalOwed = summary.totalOwed;
  const unpaidCount = summary.unpaidCount;
  const hasUnpaidBills = unpaidCount > 0;

  useEffect(() => {
    if (!hasUnpaidBills) {
      setShowSplitItAlert(false);
      return;
    }

    setShowSplitItAlert(true);
    setAlertStartedAt(new Date());
  }, [hasUnpaidBills]);

  useEffect(() => {
    if (!showSplitItAlert) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSplitItAlert(false);
    }, 10000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSplitItAlert]);

  const handleOpenSplitIt = () => {
    setShowSplitItAlert(false);
    navigate('/splitit/notifications');
  };

  const handleScanToPay = () => {
    navigate('/splitit/payment-success', {
      state: {
        amount: 96,
        merchant: 'Malis Restaurant',
        reference: 'QR-20260423-0008',
        transactionId: 'txn-1004',
        paidAt: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]">
      {showSplitItAlert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 pointer-events-none">
          <button
            type="button"
            onClick={handleOpenSplitIt}
            className="pointer-events-auto w-full overflow-hidden rounded-[24px] border border-white/80 bg-white/95 px-4 py-4 text-left shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                <img
                  src="https://play-lh.googleusercontent.com/1EZF8Qyofhne2zbJBwCLQl95dN-UA7qVIsF32g1trC2NXsI979C-QYFpj-TWhgfx3X8"
                  alt="Sathapana logo"
                  className="h-9 w-9 rounded-xl object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">Sathapana Bank</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      SplitIt reminder: {unpaidCount} unpaid {unpaidCount === 1 ? 'bill' : 'bills'} waiting. You owe ${totalOwed.toFixed(2)}.
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-xs font-medium text-slate-400">
                    {formatTimeAgo(alertStartedAt)}
                  </span>
                </div>
              </div>
            </div>
          </button>
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
                  <p className="text-sm text-gray-600">Good Morning, ស៊ុយ បញ្ញាសិទ្ធិ</p>
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
          <button
            type="button"
            onClick={() => navigate('/splitit/dashboard')}
            className="relative w-full rounded-[24px] bg-gradient-to-r from-[#10c587] via-[#0fb689] to-[#0aa39f] px-4 py-3 text-left shadow-[0_14px_28px_rgba(7,22,58,0.18)]"
          >
            {hasUnpaidBills && (
              <div className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full border-[3px] border-white bg-[#ff3b30] px-1 shadow-md">
                <span className="text-xs font-bold leading-none text-white">{unpaidCount}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px] bg-white/18 backdrop-blur-sm">
                  <Split className="h-7 w-7 text-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-[1.2rem] font-bold tracking-[-0.03em] text-white">SplitIt</p>
                  </div>
                  <p className="mt-1 text-sm font-medium text-white/88">Shared bill control center</p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between gap-4 pr-1">
                <span className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/90">
                  New
                </span>
                <ChevronRight className="h-6 w-6 text-white/90" />
              </div>
            </div>
          </button>
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
            <button
              type="button"
              onClick={() => navigate('/splitit/notifications')}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <HomeIcon className="w-6 h-6 text-[#1e3a5f]" />
              <span className="text-xs text-[#1e3a5f] font-medium">Home</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-1">
              <Wallet className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Accounts</span>
            </button>
            <button
              type="button"
              onClick={handleScanToPay}
              className="flex-1 flex flex-col items-center -mt-8"
              aria-label="Scan QR to pay"
            >
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
