import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

interface SplitItLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  backTo?: string;
}

export function SplitItLayout({ title, subtitle, children, footer, backTo = '/splitit' }: SplitItLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.pathname === '/splitit/create') {
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
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="px-4 pb-5 pt-12">
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">SplitIt</h1>
            <div className="h-10 w-10" />
          </div>
          <h2 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-white">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-white/70">{subtitle}</p> : null}
        </div>

        <div className="flex-1 rounded-t-[32px] bg-[#f7f8fa] px-4 py-5 pb-32">
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
