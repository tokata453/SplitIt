import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Camera, Flashlight, FlashlightOff, ImageUp, LoaderCircle, QrCode, ScanLine, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { fetchParticipantSuggestions, findParticipantByQrPayload, getPreviousSplitParticipantIds, searchParticipants } from '../api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { SectionCard } from '../components/SectionCard';
import { SplitItLayout } from '../components/SplitItLayout';
import { useSplitIt } from '../context';
import { SplitItUser } from '../types';
import { getUsersByIds } from '../utils';

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
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition ${
        isSelected ? 'border-[#0f3d57] bg-[#eaf4f8]' : 'border-slate-200 bg-white'
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
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                {statusLabel}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">{participant.accountId} • {participant.bank}</p>
        </div>
      </div>
      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? 'bg-[#0f3d57] text-white' : 'bg-slate-100 text-slate-500'}`}>
        {isSelected ? 'Added' : 'Add'}
      </div>
    </button>
  );
}

export function ParticipantPickerPage() {
  const navigate = useNavigate();
  const { draft, toggleParticipant } = useSplitIt();
  const [suggestions, setSuggestions] = useState<SplitItUser[]>([]);
  const [results, setResults] = useState<SplitItUser[]>([]);
  const [search, setSearch] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [searching, setSearching] = useState(false);
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
  const previousParticipantIds = getPreviousSplitParticipantIds();
  const selectedParticipants = getUsersByIds(draft.participantIds);
  const recentParticipantId = suggestions[0]?.id;
  const visibleSuggestions = Array.from(
    new Map(
      [...selectedParticipants, ...suggestions].map((participant) => [participant.id, participant])
    ).values()
  );

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
          video: {
            facingMode: { ideal: 'environment' },
          },
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

  const handleQrLookup = async () => {
    if (!search.trim()) {
      setQrStatus('Enter or paste an account payload to use QR add.');
      return;
    }

    setQrStatus('Looking up account...');
    const participant = await findParticipantByQrPayload(search);

    if (!participant) {
      setQrStatus('No participant found for that QR/account payload.');
      return;
    }

    if (!draft.participantIds.includes(participant.id)) {
      toggleParticipant(participant.id);
    }

    setQrStatus(`${participant.name} added from QR/account lookup.`);
  };

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

  return (
    <SplitItLayout
      title="Pick participants"
      subtitle="Suggestions come from recent transaction history, with search and QR add as backup paths."
      footer={
        <button
          onClick={() => navigate('/splitit/review')}
          disabled={!draft.participantIds.length}
          className="w-full rounded-xl bg-[#2d4a6f] px-4 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Review request
        </button>
      }
    >
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
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Simulated detected QR
              </p>
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
                  {isUploadingQr ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageUp className="h-4 w-4" />
                  )}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Add participants</h2>
          {draft.participantIds.length ? (
            <div className="rounded-full bg-[#0f3d57] px-3 py-1 text-sm font-semibold text-white">
              {draft.participantIds.length}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-2">
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

        <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {searching ? (
            <div className="rounded-[22px] bg-slate-50 px-4 py-5 text-sm text-slate-500">Searching participants...</div>
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
              <div key={index} className="h-16 animate-pulse rounded-[22px] bg-slate-100" />
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
      </section>

      {!draft.participantIds.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add at least one participant to continue.
        </div>
      ) : null}
    </SplitItLayout>
  );
}
