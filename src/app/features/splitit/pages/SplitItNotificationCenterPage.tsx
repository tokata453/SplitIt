import {
  BatteryFull,
  Camera,
  Flashlight,
  SignalHigh,
  Wifi,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

type DemoNotification = {
  id: string;
  message: string;
  timeAgo: string;
  to: string;
};

type NotificationGroup = {
  id: string;
  label?: string;
  items: DemoNotification[];
};

function LockScreenNotificationCard({
  notification,
}: {
  notification: DemoNotification;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(notification.to)}
      className="relative w-full rounded-[28px] border border-white/15 bg-white/28 px-4 py-3 text-left shadow-[0_16px_44px_rgba(0,0,0,0.16)] backdrop-blur-[28px] transition"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-white/88 shadow-sm">
          <img
            src="https://play-lh.googleusercontent.com/1EZF8Qyofhne2zbJBwCLQl95dN-UA7qVIsF32g1trC2NXsI979C-QYFpj-TWhgfx3X8"
            alt="Sathapana logo"
            className="h-9 w-9 rounded-[14px] object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-800/65">
              Sathapana Bank
            </p>
            <span className="shrink-0 pt-0.5 text-[0.88rem] font-medium text-slate-700/58">
              {notification.timeAgo}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-[0.98rem] font-medium leading-[1.28] text-slate-900/95">
            {notification.message}
          </p>
        </div>
      </div>
    </button>
  );
}

export function SplitItNotificationCenterPage() {
  const navigate = useNavigate();

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    []
  );

  const timeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    []
  );

  const notificationGroups: NotificationGroup[] = [
    {
      id: 'recent',
      items: [
        {
          id: 'notif-reminder-unpaid',
          message: 'SplitIt reminder: 2 unpaid bills are still waiting. Review and pay your share before the due time.',
          timeAgo: '2m ago',
          to: '/splitit/dashboard',
        },
        {
          id: 'notif-owner-shared',
          message: 'Rasmey Sophorn shared a new SplitIt bill with you for Lucky Supermarket. Review your amount before payment.',
          timeAgo: '8m ago',
          to: '/splitit/dashboard/participant/incoming-1002',
        },
        {
          id: 'notif-owner-received',
          message: 'Dara Kim paid your SplitIt request for Malis Restaurant. Check the bill detail to see who is still pending.',
          timeAgo: '19m ago',
          to: '/splitit/dashboard/owner/sent-1001',
        },
      ],
    },
    {
      id: 'earlier',
      label: 'Earlier Notifications',
      items: [
        {
          id: 'notif-reminder-updated',
          message: 'Reminder setting updated: SplitIt will now alert pending participants every day for your current bill.',
          timeAgo: '42m ago',
          to: '/splitit/dashboard/owner/sent-1003',
        },
        {
          id: 'notif-request-sent',
          message: 'Your SplitIt request was sent successfully. 3 participants were notified and can now review the bill.',
          timeAgo: '1h ago',
          to: '/splitit/requests',
        },
      ],
    },
  ];
  return (
    <div className="relative h-dvh overflow-hidden bg-[#0049ba] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(255,255,255,0.25),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(86,220,180,0.34),transparent_24%),radial-gradient(circle_at_78%_72%,rgba(29,72,255,0.62),transparent_30%),radial-gradient(circle_at_34%_92%,rgba(255,214,10,0.84),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.05))]" />
      <div className="absolute -left-24 top-20 h-96 w-96 rounded-full border border-white/10 bg-white/8 blur-3xl" />
      <div className="absolute -right-20 top-64 h-[28rem] w-[28rem] rounded-full bg-[#244cff] blur-[2px]" />
      <div className="absolute -bottom-28 left-10 h-[24rem] w-[24rem] rounded-full bg-[#ffd420]" />

      <div className="relative mx-auto flex h-dvh max-w-md flex-col px-4 pb-6 pt-6">
        <div className="flex items-center justify-between text-sm font-medium text-white/95">
        <div className="flex items-center gap-3">
            <span>Sathapana</span>
          </div>

          <div className="flex items-center gap-2">
            <SignalHigh className="h-4 w-4" />
            <Wifi className="h-4 w-4" />
            <BatteryFull className="h-5 w-5" />
          </div>
        </div>

        <div className="pt-8 text-center">
          <p className="text-[1.8rem] font-medium tracking-[-0.03em] text-white/78">{dateLabel}</p>
          <p className="mt-1 text-[5.7rem] font-light leading-none tracking-[-0.08em] text-white/96">
            {timeLabel}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h1 className="text-[2rem] font-normal tracking-[-0.04em] text-white/96">Notification Center</h1>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/22 text-white/90 backdrop-blur-xl"
            aria-label="Close notification center"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto overscroll-contain pb-4">
          <div className="space-y-5">
            {notificationGroups.map((group) => (
              <section key={group.id}>
                {group.label ? (
                  <p className="mb-2 px-1 text-[0.95rem] font-medium tracking-[-0.01em] text-white/72">
                    {group.label}
                  </p>
                ) : null}

                <div className="space-y-3">
                  {group.items.map((notification) => (
                    <LockScreenNotificationCard
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between px-4 pb-2 pt-4">
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-black/28 backdrop-blur-xl"
            aria-label="Flashlight"
          >
            <Flashlight className="h-6 w-6 text-white" />
          </button>
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-black/28 backdrop-blur-xl"
            aria-label="Camera"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="mx-auto mt-5 h-1.5 w-36 rounded-full bg-white/90" />
      </div>
    </div>
  );
}
