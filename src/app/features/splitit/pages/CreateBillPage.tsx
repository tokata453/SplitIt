import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  Flashlight,
  FlashlightOff,
  History,
  ImageUp,
  LoaderCircle,
  QrCode,
  ScanLine,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  fetchParticipantSuggestions,
  fetchTransactionHistory,
  findParticipantByQrPayload,
  getPreviousSplitParticipantIds,
  searchParticipants,
} from '../api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitItTransaction, SplitItUser } from '../types';
import { formatCurrency, formatDate, getSplitMembers, getUsersByIds } from '../utils';

interface DetectedBarcodeShape {
  rawValue?: string;
}

interface BarcodeDetectorShape {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcodeShape[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): BarcodeDetectorShape;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

function ParticipantRow({
  participant,
  isSelected,
  onToggle,
  statusLabel,
}: {
  participant: SplitItUser;
  isSelected: boolean;
  onToggle: () => void;
  statusLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition ${
        isSelected ? 'border-[#173b63] bg-[#edf3f8]' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
          {participant.initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{participant.name}</p>
            {statusLabel ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                {statusLabel}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">{participant.accountId} • {participant.bank}</p>
        </div>
      </div>
      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? 'bg-[#173b63] text-white' : 'bg-slate-100 text-slate-500'}`}>
        {isSelected ? 'Added' : 'Add'}
      </div>
    </button>
  );
}

export function CreateBillPage() {
  const navigate = useNavigate();
  const { draft, calculation, setAmountInput, setCurrency, selectTransaction, toggleParticipant } = useSplitIt();
  const [transactions, setTransactions] = useState<SplitItTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [suggestions, setSuggestions] = useState<SplitItUser[]>([]);
  const [results, setResults] = useState<SplitItUser[]>([]);
  const [search, setSearch] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [searching, setSearching] = useState(false);
  const [isTransactionPanelOpen, setIsTransactionPanelOpen] = useState(false);
  const [isParticipantPanelOpen, setIsParticipantPanelOpen] = useState(false);
  const [isLensOpen, setIsLensOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState('Opening camera...');
  const [scanSupported, setScanSupported] = useState(true);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const qrUploadInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorShape | null>(null);
  const isScanningRef = useRef(false);
  const isProcessingScanRef = useRef(false);

  const amountValidationMessage = calculation.totalAmount <= 0 ? `Enter an amount greater than ${formatCurrency(0, draft.currency)}.` : '';
  const participantValidationMessage = !draft.participantIds.length ? 'Add at least one participant to send this request.' : '';
  const blockingMessage = amountValidationMessage || participantValidationMessage;
  const suggestedTransactionId = transactions[0]?.id;
  const previousParticipantIds = getPreviousSplitParticipantIds();
  const selectedParticipants = getUsersByIds(draft.participantIds);
  const splitMembers = getSplitMembers(draft);
  const selectedTransaction = transactions.find((transaction) => transaction.id === draft.selectedTransactionId);
  const recentParticipantId = suggestions[0]?.id;
  const isAmountReady = calculation.totalAmount > 0;
  const isParticipantReady = draft.participantIds.length > 0;
  const isReadyToReview = !blockingMessage;
  const visibleSuggestions = Array.from(
    new Map(
      [...selectedParticipants, ...suggestions].map((participant) => [participant.id, participant]),
    ).values(),
  );

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      const response = await fetchTransactionHistory();
      if (!cancelled) {
        setTransactions(response);
        setLoadingTransactions(false);
      }
    };

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      const response = await fetchParticipantSuggestions();
      if (!cancelled) {
        setSuggestions(response);
        setLoadingSuggestions(false);
      }
    };

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }

      setSearching(true);
      const response = await searchParticipants(search);
      if (!cancelled) {
        setResults(response);
        setSearching(false);
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [search]);

  useEffect(() => {
    const stopScanner = () => {
      isScanningRef.current = false;

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setIsTorchOn(false);
      setTorchSupported(false);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startScanner = async () => {
      if (!isLensOpen) {
        stopScanner();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || !window.BarcodeDetector) {
        setScanSupported(false);
        setScanStatus('QR scanning is not supported in this browser.');
        return;
      }

      try {
        setScanSupported(true);
        setScanStatus('Opening camera...');
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (!videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const [videoTrack] = stream.getVideoTracks();
        const capabilities = (videoTrack?.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorchSupported(Boolean(capabilities.torch));
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isScanningRef.current = true;
        setScanStatus('Align a Sathapana QR inside the frame');

        const scanFrame = async () => {
          if (!isScanningRef.current || !videoRef.current || !detectorRef.current) {
            return;
          }

          if (!isProcessingScanRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              isProcessingScanRef.current = true;
              const barcodes = await detectorRef.current.detect(videoRef.current);
              const qrValue = barcodes.find((barcode) => barcode.rawValue?.trim())?.rawValue?.trim();

              if (qrValue) {
                setScanStatus('QR detected. Adding participant...');
                await handleLensSelect(qrValue);
                stopScanner();
                isProcessingScanRef.current = false;
                return;
              }
            } catch {
              setScanStatus('Unable to read this QR yet. Keep it inside the frame.');
            } finally {
              isProcessingScanRef.current = false;
            }
          }

          animationFrameRef.current = window.requestAnimationFrame(() => {
            void scanFrame();
          });
        };

        animationFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      } catch {
        setScanSupported(false);
        setScanStatus('Camera permission is required to scan a QR code.');
      }
    };

    void startScanner();

    return () => {
      stopScanner();
    };
  }, [isLensOpen]);

  const handleLensSelect = async (payload: string) => {
    setSearch(payload);
    setQrStatus('Scanning account...');

    const participant = await findParticipantByQrPayload(payload);

    if (!participant) {
      setQrStatus('No participant found for that scan.');
      return;
    }

    if (!draft.participantIds.includes(participant.id)) {
      toggleParticipant(participant.id);
    }

    setIsLensOpen(false);
    setIsParticipantPanelOpen(true);
    setQrStatus(`${participant.name} added from QR scan.`);
  };

  const toggleTorch = async () => {
    const [videoTrack] = streamRef.current?.getVideoTracks() ?? [];

    if (!videoTrack) {
      return;
    }

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !isTorchOn } as MediaTrackConstraintSet],
      });
      setIsTorchOn((current) => !current);
    } catch {
      setScanStatus('Flash is not available on this device.');
    }
  };

  const ensureDetector = () => {
    if (!window.BarcodeDetector) {
      return null;
    }

    if (!detectorRef.current) {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
    }

    return detectorRef.current;
  };

  const handleQrUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!window.BarcodeDetector) {
      setScanStatus('QR upload scanning is not supported in this browser.');
      event.target.value = '';
      return;
    }

    setIsUploadingQr(true);
    setScanStatus('Scanning uploaded QR image...');

    try {
      const detector = ensureDetector();
      const imageBitmap = await createImageBitmap(file);
      const barcodes = await detector!.detect(imageBitmap);
      imageBitmap.close();

      const qrValue = barcodes.find((barcode) => barcode.rawValue?.trim())?.rawValue?.trim();

      if (!qrValue) {
        setScanStatus('No QR code was found in the uploaded image.');
        return;
      }

      await handleLensSelect(qrValue);
    } catch {
      setScanStatus('Unable to scan that image. Try a clearer QR photo.');
    } finally {
      setIsUploadingQr(false);
      event.target.value = '';
    }
  };

  const selectedParticipantSummary = selectedParticipants.slice(0, 3).map((participant) => participant.name).join(', ');
  const remainingParticipantCount = Math.max(selectedParticipants.length - 3, 0);
  const transactionCountLabel = transactions.length ? `from ${transactions.length} recent transactions available` : 'No recent transactions available';

  return (
    <SplitItLayout
      title="Create bill"
      subtitle="Enter an amount and choose participants."
      footer={
        <button
          onClick={() => navigate('/splitit/review')}
          disabled={Boolean(blockingMessage)}
          className="w-full rounded-2xl bg-[#173b63] px-4 py-4 text-base font-semibold text-white shadow-[0_10px_24px_rgba(23,59,99,0.18)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {isReadyToReview ? 'Review request' : 'Complete setup to continue'}
        </button>
      }
    >
      <section className="overflow-hidden rounded-[28px] border border-[#d7e2ee] bg-white shadow-[0_10px_28px_rgba(45,74,111,0.08)]">
        <div className="border-b border-[#dde6ef] bg-[#fbfcfe] px-5 py-4">
          <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2d4a6f]/55">Step 1</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Enter the bill amount to split</h2>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-[24px] border border-slate-200 bg-[#f7f9fc] p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-500">Bill total</p>
              <div className="flex rounded-2xl bg-[#e7edf4] p-1">
                {(['USD', 'KHR'] as const).map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => setCurrency(currency)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      draft.currency === currency ? 'bg-[#2d4a6f] text-white shadow-sm' : 'text-[#6a7f97]'
                    }`}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-2 border-b border-slate-200">
              <div className="pb-1 text-4xl font-semibold tracking-[-0.05em] text-slate-500">
                {draft.currency === 'USD' ? '$' : '៛'}
              </div>
              <input
                id="bill-amount"
                inputMode="decimal"
                value={draft.amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder="0.00"
                className="h-16 w-full bg-transparent px-0 text-5xl font-semibold tracking-[-0.05em] text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-[#f7f9fc] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selectedTransaction ? 'bg-[#e7edf4] text-[#2d4a6f]' : 'bg-slate-100 text-slate-500'}`}>
                  <History className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{selectedTransaction ? selectedTransaction.merchant : 'Select Amount'}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${selectedTransaction ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {selectedTransaction ? 'Linked' : 'Optional'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedTransaction
                      ? `${formatDate(selectedTransaction.postedAt)} • ${selectedTransaction.category}`
                      : transactionCountLabel}
                  </p>
                </div>
              </div>
              {selectedTransaction ? (
                <p className="text-right text-base font-semibold text-slate-900">
                  {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsTransactionPanelOpen(true)}
                className="inline-flex flex-1 items-center justify-between rounded-2xl bg-[#e7edf4] px-4 py-3 text-sm font-medium text-[#2d4a6f] transition hover:bg-[#dde6ef]"
              >
                <span>{selectedTransaction ? 'Change transaction' : 'Select recent transaction'}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
              {selectedTransaction ? (
                <button
                  type="button"
                  onClick={() => selectTransaction(undefined)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={isTransactionPanelOpen} onOpenChange={setIsTransactionPanelOpen}>
        <DialogContent className="max-h-[88dvh] max-w-md overflow-hidden rounded-[28px] border-0 bg-[#f7f8fa] p-0">
          <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4 text-left">
            <DialogTitle className="text-xl text-slate-900">Transaction history</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Choose a payment to fill the amount.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(88dvh-5.75rem)] space-y-3 overflow-y-auto px-4 py-4">
            {loadingTransactions ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            ) : transactions.length ? (
              transactions.map((transaction) => {
                const isSelected = draft.selectedTransactionId === transaction.id;
                const isSuggested = suggestedTransactionId === transaction.id;

                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => {
                      selectTransaction(isSelected ? undefined : transaction.id);
                      setIsTransactionPanelOpen(false);
                    }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left ${
                      isSelected
                        ? 'border-[#173b63] bg-[#edf3f8]'
                        : isSuggested
                          ? 'border-[#c8d6e5] bg-[#f7fafc]'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{transaction.merchant}</p>
                          {isSuggested ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                              Suggested
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(transaction.postedAt)}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          Suggested participants: {transaction.participantsHint.length || 'None'}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(transaction.amount, transaction.currency)}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
                <History className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-medium text-slate-900">No recent transactions</p>
                <p className="mt-1 text-sm text-slate-500">Manual amount entry is still available on the page.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLensOpen} onOpenChange={setIsLensOpen}>
        <DialogContent className="h-[100dvh] max-w-md overflow-hidden rounded-none border-0 bg-black p-0 text-white shadow-none [&>button:last-child]:hidden">
          <button
            type="button"
            onClick={() => setIsLensOpen(false)}
            className="absolute right-5 top-8 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/28 text-white backdrop-blur-sm"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>

          <DialogHeader className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-5 pb-4 pt-12 text-center">
            <DialogTitle className="text-xl font-semibold text-white">Sathapana Scan</DialogTitle>
            <DialogDescription className="sr-only">Live QR scanner for adding participants.</DialogDescription>
          </DialogHeader>

          <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0.06)_30%,rgba(0,0,0,0.1)_68%,rgba(0,0,0,0.48)_100%)]" />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[36vh] w-[72vw] max-h-[290px] max-w-[290px]">
                <div className="absolute left-0 top-0 h-14 w-14 rounded-tl-[26px] border-l-[6px] border-t-[6px] border-white" />
                <div className="absolute right-0 top-0 h-14 w-14 rounded-tr-[26px] border-r-[6px] border-t-[6px] border-white" />
                <div className="absolute bottom-0 left-0 h-14 w-14 rounded-bl-[26px] border-b-[6px] border-l-[6px] border-white" />
                <div className="absolute bottom-0 right-0 h-14 w-14 rounded-br-[26px] border-b-[6px] border-r-[6px] border-white" />
              </div>
            </div>

            <div className="absolute inset-x-6 bottom-36 rounded-3xl bg-black/45 px-4 py-3 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                {scanSupported ? (
                  <ScanLine className="h-4 w-4 text-white" />
                ) : isUploadingQr ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
                <p className="text-sm font-medium text-white">{scanStatus}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleLensSelect('AC-884-1002')}
              className="absolute left-1/2 top-[66%] w-[72vw] max-w-[290px] -translate-x-1/2 rounded-2xl bg-white/88 px-4 py-2.5 text-left text-slate-900 shadow-lg backdrop-blur-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Simulated detected QR</p>
              <p className="mt-0.5 text-sm font-semibold">AC-884-1002</p>
            </button>

            <div className="absolute inset-x-4 bottom-16 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void toggleTorch()}
                  disabled={!torchSupported}
                  className="flex items-center justify-center gap-2 rounded-full bg-white/14 px-4 py-3 text-sm font-medium text-white backdrop-blur-md disabled:opacity-50"
                >
                  {isTorchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                  {isTorchOn ? 'Flash Off' : 'Flash'}
                </button>
                <button
                  type="button"
                  onClick={() => qrUploadInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-full bg-white/14 px-4 py-3 text-sm font-medium text-white backdrop-blur-md"
                >
                  {isUploadingQr ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                  Upload QR
                </button>
              </div>
              <input
                ref={qrUploadInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void handleQrUpload(event)}
                className="hidden"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="overflow-hidden rounded-[28px] border border-[#d7e2ee] bg-white shadow-[0_10px_28px_rgba(45,74,111,0.08)]">
        <div className="border-b border-[#dde6ef] bg-[#fbfcfe] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2d4a6f]/55">Step 2</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Who is in this split</h2>
              <p className="mt-1 text-sm text-slate-500">
                {draft.includeOwner
                  ? 'The bill is split between you and the selected participants.'
                  : 'The bill is split only among the selected participants.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsParticipantPanelOpen(true)}
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span>{draft.participantIds.length ? 'Manage participants' : 'Add participants'}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-[24px] border border-slate-200 bg-[#f7f9fc] px-4 py-4">
            {selectedParticipants.length ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7edf4] text-[#2d4a6f]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {splitMembers.length} {splitMembers.length === 1 ? 'person' : 'people'} in this split
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {draft.includeOwner
                          ? `You + ${selectedParticipants.length} ${selectedParticipants.length === 1 ? 'participant' : 'participants'}`
                          : `${selectedParticipants.length} ${selectedParticipants.length === 1 ? 'participant' : 'participants'} selected`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {draft.includeOwner ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#eaf2fb] px-3 py-2 text-sm text-[#173b63]">
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-[#173b63]">
                        You
                      </span>
                      <span className="font-medium">Bill owner</span>
                    </div>
                  ) : null}
                  {selectedParticipants.slice(0, 4).map((participant) => (
                    <div key={participant.id} className="inline-flex items-center gap-2 rounded-full bg-[#f6f9fc] px-3 py-2 text-sm text-slate-700">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600">
                        {participant.initials}
                      </span>
                      <span className="font-medium">{participant.name}</span>
                    </div>
                  ))}
                  {selectedParticipants.length > 4 ? (
                    <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">
                      +{selectedParticipants.length - 4} more
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">No participants added yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {draft.includeOwner
                      ? 'You are already included. Add at least one participant to send the request.'
                      : 'Add at least one participant to start the split.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {qrStatus ? <p className="text-sm text-slate-500">{qrStatus}</p> : null}
        </div>
      </section>

      <Dialog open={isParticipantPanelOpen} onOpenChange={setIsParticipantPanelOpen}>
        <DialogContent className="max-h-[88dvh] max-w-md overflow-hidden rounded-[28px] border-0 bg-[#f7f8fa] p-0">
          <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4 text-left">
            <DialogTitle className="text-xl text-slate-900">Participants</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Search by name or account ID, or use QR scan to add someone quickly.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(88dvh-5.75rem)] overflow-y-auto px-4 py-4">
            <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setQrStatus('');
                }}
                placeholder="Search name or account ID"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setIsLensOpen(true)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500"
                aria-label="Use QR add"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {searching ? (
                <div className="rounded-[22px] bg-slate-100 px-4 py-5 text-sm text-slate-500">Searching participants...</div>
              ) : results.length ? (
                results.map((participant) => (
                  <ParticipantRow
                    key={participant.id}
                    participant={participant}
                    isSelected={draft.participantIds.includes(participant.id)}
                    onToggle={() => toggleParticipant(participant.id)}
                  />
                ))
              ) : search ? (
                <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                  No matches found. Try account IDs like <span className="font-medium text-slate-700">AC-884-1001</span>.
                </div>
              ) : loadingSuggestions ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-[22px] bg-slate-200" />
                ))
              ) : (
                visibleSuggestions.map((participant) => (
                  <ParticipantRow
                    key={participant.id}
                    participant={participant}
                    isSelected={draft.participantIds.includes(participant.id)}
                    onToggle={() => toggleParticipant(participant.id)}
                    statusLabel={
                      previousParticipantIds.includes(participant.id) && draft.participantIds.includes(participant.id)
                        ? 'Previous'
                        : !search && participant.id === recentParticipantId
                          ? 'Recent'
                          : undefined
                    }
                  />
                ))
              )}
            </div>

            {qrStatus ? <p className="mt-3 text-sm text-slate-500">{qrStatus}</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      {blockingMessage ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Before review</p>
            <p className="mt-1 text-amber-800">{blockingMessage}</p>
          </div>
        </div>
      ) : null}
    </SplitItLayout>
  );
}
