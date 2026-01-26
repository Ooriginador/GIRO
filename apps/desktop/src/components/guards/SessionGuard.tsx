import { createLogger } from '@/lib/logger';
const log = createLogger('Session');
import { useAuthStore } from '@/stores/auth-store';
import { type FC, type ReactNode, useCallback, useEffect } from 'react';

interface SessionGuardProps {
  children: ReactNode;
  timeoutMinutes?: number;
}

export const SessionGuard: FC<SessionGuardProps> = ({ children, timeoutMinutes = 15 }) => {
  const { isAuthenticated, lastActivity, updateActivity, logout } = useAuthStore();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const handleActivity = useCallback(() => {
    if (isAuthenticated) {
      updateActivity();
    }
  }, [isAuthenticated, updateActivity]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    const throttledHandleActivity = () => {
      // Basic throttle to avoid excessive state updates
      const now = Date.now();
      if (now - lastActivity > 1000) {
        handleActivity();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledHandleActivity);
    });

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > timeoutMs) {
        log.debug('Session timed out due to inactivity');
        logout();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledHandleActivity);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, timeoutMs, logout, handleActivity]);

  return <>{children}</>;
};
