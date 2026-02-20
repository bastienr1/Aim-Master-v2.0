import { useEffect, useState } from 'react';

interface SkipToastProps {
  visible: boolean;
  onDone: () => void;
}

const TOAST_DURATION = 2000;

export function SkipToast({ visible, onDone }: SkipToastProps) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });

      const t = setTimeout(() => {
        setShow(false);
        setTimeout(() => {
          setMounted(false);
          onDone();
        }, 300);
      }, TOAST_DURATION);

      return () => clearTimeout(t);
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible, onDone]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[60] pointer-events-none" style={{ transform: 'translateX(-50%)' }}>
      <div
        className="px-4 py-2.5 rounded-lg transition-all duration-300 ease-out whitespace-nowrap"
        style={{
          backgroundColor: '#1C2B36',
          border: '1px solid rgba(255,255,255,0.06)',
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        <p className="text-[13px] font-['Inter'] text-[#9CA8B3]">
          No worries. Check-ins unlock personalized insights over time.
        </p>
      </div>
    </div>
  );
}
