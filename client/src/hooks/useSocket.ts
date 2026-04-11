import { useEffect } from 'react';
import { useSocketStore } from '../store/socketStore';

export function useSocket() {
  const { connect, disconnect, connected } = useSocketStore();

  useEffect(() => {
    connect();

    // When the laptop wakes from sleep, the TCP connection is dead.
    // Force a fresh reconnect when the tab becomes visible again.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const { socket } = useSocketStore.getState();
        if (socket && !socket.connected) {
          socket.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      disconnect();
    };
  }, []);

  return { connected };
}
