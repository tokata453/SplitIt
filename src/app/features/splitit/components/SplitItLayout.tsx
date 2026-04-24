import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

interface SplitItLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
  backTo?: string;
  variant?: 'brand' | 'light';
}

export function SplitItLayout({
  title,
  subtitle,
  children,
  footer,
  headerRight,
  backTo = '/splitit',
  variant = 'brand',
}: SplitItLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLight = variant === 'light';

  const handleBack = () => {
    if (location.pathname === '/splitit/create' || location.pathname === '/splitit/dashboard') {
      navigate('/');
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(backTo);
  };

  return (
    <div className={isLight ? 'min-h-screen bg-white text-slate-900' : 'min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f] text-slate-900'}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className={isLight ? 'border-b border-slate-100 bg-white px-4 pb-4 pt-12' : 'px-4 pb-5 pt-12'}>
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={handleBack}
              className={isLight ? 'flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-200' : 'flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15'}
            >
              <ArrowLeft className={isLight ? 'h-5 w-5 text-slate-700' : 'h-5 w-5 text-white'} />
            </button>
            <h1 className={isLight ? 'text-xl font-semibold text-slate-900' : 'text-xl font-semibold text-white'}>SplitIt</h1>
            <div className="flex h-10 min-w-10 items-center justify-end">
              {headerRight ?? <div className="h-10 w-10" />}
            </div>
          </div>
          <h2 className={isLight ? 'text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900' : 'text-[1.8rem] font-semibold tracking-[-0.03em] text-white'}>{title}</h2>
          {subtitle ? <p className={isLight ? 'mt-2 text-sm leading-6 text-slate-500' : 'mt-2 text-sm leading-6 text-white/70'}>{subtitle}</p> : null}
        </div>

        <div className={isLight ? 'flex-1 bg-white px-4 py-5 pb-32' : 'flex-1 rounded-t-[32px] bg-[#f7f8fa] px-4 py-5 pb-32'}>
          <div className="space-y-4">{children}</div>
        </div>
      </div>

      {footer ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-md">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}
