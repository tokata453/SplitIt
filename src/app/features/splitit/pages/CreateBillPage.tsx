import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  BellRing,
  Flashlight,
  FlashlightOff,
  ImageUp,
  LoaderCircle,
  Phone,
  QrCode,
  ScanLine,
  Search,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  fetchTransactionHistory,
  findParticipantByPhone,
  findParticipantByQrPayload,
  getPreviousSplitParticipantIds,
  searchParticipants,
} from '../api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitItTransaction, SplitItUser } from '../types';
import { formatCurrency, formatDate, getUsersByIds } from '../utils';

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
  const {
    draft,
    calculation,
    setAmountInput,
    setCurrency,
    selectTransaction,
    toggleParticipant,
    setReminderSettings,
    addPhoneInvite,
    removePhoneInvite,
  } = useSplitIt();
  const location = useLocation();
  const [transactions, setTransactions] = useState<SplitItTransaction[]>([]);
  const [results, setResults] = useState<SplitItUser[]>([]);
  const [search, setSearch] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [isLensOpen, setIsLensOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState('Opening camera...');
  const [scanSupported, setScanSupported] = useState(true);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [phoneInviteStatus, setPhoneInviteStatus] = useState('');
  const splitPayment = (location.state as {
    splitPayment?: {
      amount?: number;
      merchant?: string;
      reference?: string;
      transactionId?: string;
      paidAt?: string;
    };
  } | null)?.splitPayment;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const qrUploadInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorShape | null>(null);
  const isScanningRef = useRef(false);
  const isProcessingScanRef = useRef(false);
  const initializedSplitPaymentRef = useRef(false);

  const amountValidationMessage = calculation.totalAmount <= 0 ? `Enter an amount greater than ${formatCurrency(0, draft.currency)}.` : '';
  const participantValidationMessage = !draft.participantIds.length && !draft.phoneInvites.length ? 'Add at least one participant or phone invite to send this request.' : '';
  const blockingMessage = amountValidationMessage || participantValidationMessage;
  const previousParticipantIds = getPreviousSplitParticipantIds();
  const selectedParticipants = getUsersByIds(draft.participantIds);
  const selectedTransaction = transactions.find((transaction) => transaction.id === draft.selectedTransactionId);
  const isReadyToReview = !blockingMessage;
  const reminderOptions = [
    { id: 'none', label: 'Off' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
  ] as const;
  const participantGroups = [
    { id: 'recent', label: 'Recent group', participantIds: previousParticipantIds.slice(0, 4) },
    { id: 'dining', label: 'Dining friends', participantIds: ['u-1', 'u-2', 'u-3'] },
    { id: 'team', label: 'Work team', participantIds: ['u-6', 'u-7', 'u-8'] },
  ].filter((group) => group.participantIds.length);
  const inlineParticipantRows = search.trim() ? results : [];

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      const response = await fetchTransactionHistory();
      if (!cancelled) {
        setTransactions(response);
      }
    };

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!splitPayment || initializedSplitPaymentRef.current) {
      return;
    }

    initializedSplitPaymentRef.current = true;

    if (splitPayment.transactionId) {
      selectTransaction(splitPayment.transactionId);
      return;
    }

    if (typeof splitPayment.amount === 'number') {
      setAmountInput(splitPayment.amount.toFixed(2));
    }
  }, [selectTransaction, setAmountInput, splitPayment]);

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

  const handleAddGroup = (participantIds: string[]) => {
    participantIds.forEach((participantId) => {
      if (!draft.participantIds.includes(participantId)) {
        toggleParticipant(participantId);
      }
    });
  };

  const handlePhoneInvite = async (phoneValue = search) => {
    const phone = phoneValue.trim();

    if (!phone) {
      setPhoneInviteStatus('Enter a phone number first.');
      return;
    }

    setPhoneInviteStatus('Checking Sathapana Mobile account...');
    const participant = await findParticipantByPhone(phone);

    if (participant) {
      if (!draft.participantIds.includes(participant.id)) {
        toggleParticipant(participant.id);
      }

      setPhoneInviteStatus(`${participant.name} uses Sathapana Mobile and was added to the split.`);
      return;
    }

    addPhoneInvite({
      id: `phone-invite-${Date.now()}`,
      phone,
      message: `Rasmey Sophorn invited you to SplitIt. Download Sathapana Mobile to review and pay your bill share.`,
      status: 'sms_ready',
    });
    setPhoneInviteStatus('No Sathapana Mobile account found. SMS invite will be sent with the app download link.');
  };

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
      <section className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2d4a6f]/55">Bill setup</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {splitPayment ? 'Paid bill ready to split' : 'Amount and source'}
            </h2>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3">
          <div className="flex items-end gap-2 border-b border-slate-200">
            <div className="pb-1 text-2xl font-semibold tracking-[-0.05em] text-slate-400">
              {draft.currency === 'USD' ? '$' : '៛'}
            </div>
            <input
              id="bill-amount"
              inputMode="decimal"
              value={draft.amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0.00"
              className="h-12 w-full bg-transparent px-0 text-3xl font-semibold tracking-[-0.05em] text-slate-800 outline-none"
            />
          </div>
        </div>

        {splitPayment ? (
          <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">{splitPayment.merchant ?? 'QR payment'}</p>
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Paid ref {splitPayment.reference ?? 'Payment reference'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bill reference</span>
            <select
              value={draft.selectedTransactionId ?? ''}
              onChange={(event) => selectTransaction(event.target.value || undefined)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-slate-800 outline-none"
            >
              <option value="">Manual bill</option>
              {transactions.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.merchant} · {formatCurrency(transaction.amount, transaction.currency)}
                </option>
              ))}
            </select>
          </label>
        )}

        {!splitPayment && selectedTransaction ? (
          <p className="mt-2 text-xs text-slate-500">
            Linked to {formatDate(selectedTransaction.postedAt)} · {selectedTransaction.category}
          </p>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-[#d7e2ee] bg-white p-4 shadow-[0_10px_28px_rgba(45,74,111,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2d4a6f]/55">Participants</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">People to split with</h2>
          </div>
          <span className="rounded-full bg-[#edf3f8] px-3 py-1 text-sm font-semibold text-[#173b63]">
            {selectedParticipants.length + draft.phoneInvites.length}
          </span>
        </div>

        {(selectedParticipants.length || draft.phoneInvites.length) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedParticipants.map((participant) => (
              <button
                key={participant.id}
                type="button"
                onClick={() => toggleParticipant(participant.id)}
                className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {participant.name} ×
              </button>
            ))}
            {draft.phoneInvites.map((invite) => (
              <button
                key={invite.id}
                type="button"
                onClick={() => removePhoneInvite(invite.id)}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
              >
                <Phone className="h-3.5 w-3.5" />
                {invite.phone} ×
              </button>
            ))}
          </div>
        ) : null}

        {participantGroups.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick add</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {participantGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleAddGroup(group.participantIds)}
                  className="shrink-0 rounded-2xl bg-[#edf3f8] px-4 py-3 text-sm font-semibold text-[#173b63]"
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2 rounded-[22px] border border-slate-200 bg-[#f7f9fc] px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setQrStatus('');
            }}
            placeholder="Search name, account, or phone"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setIsLensOpen(true)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-slate-500"
            aria-label="Use QR add"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {searching ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Searching...</div>
          ) : inlineParticipantRows.length ? (
            inlineParticipantRows.map((participant) => (
              <ParticipantRow
                key={participant.id}
                participant={participant}
                isSelected={draft.participantIds.includes(participant.id)}
                onToggle={() => toggleParticipant(participant.id)}
                statusLabel={
                  previousParticipantIds.includes(participant.id)
                    ? 'Previous'
                    : undefined
                }
              />
            ))
          ) : search ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
              <p>No Sathapana Mobile account found for this search.</p>
              <button
                type="button"
                onClick={() => void handlePhoneInvite()}
                className="mt-3 rounded-xl bg-[#173b63] px-3 py-2 text-sm font-semibold text-white"
              >
                Send SMS invite
              </button>
            </div>
          ) : null}
        </div>

        {phoneInviteStatus ? <p className="mt-3 text-sm text-slate-500">{phoneInviteStatus}</p> : null}
        {qrStatus ? <p className="mt-3 text-sm text-slate-500">{qrStatus}</p> : null}
      </section>

      <section className="rounded-[28px] border border-[#d7e2ee] bg-white p-4 shadow-[0_10px_28px_rgba(45,74,111,0.08)]">
        <div className="flex items-start gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf3f8] text-[#173b63]">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Reminder</p>
              <p className="mt-1 text-sm text-slate-500">Default follow-up for unpaid participants.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-1">
          {reminderOptions.map((option) => {
            const isActive = option.id === 'none'
              ? !draft.reminderSettings.enabled
              : draft.reminderSettings.enabled && draft.reminderSettings.frequency === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setReminderSettings(
                    option.id === 'none'
                      ? { enabled: false, frequency: draft.reminderSettings.frequency }
                      : { enabled: true, frequency: option.id },
                  );
                }}
                className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-white text-[#173b63] shadow-sm' : 'text-slate-500'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

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
