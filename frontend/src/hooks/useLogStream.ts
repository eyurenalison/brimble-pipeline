import { useEffect, useRef, useState } from 'react';
import { logsUrl } from '../api/client';

export interface LogEntry {
  id?: number;
  deployment_id?: string;
  level: 'info' | 'error' | 'system';
  message: string;
  created_at: number;
}

export function useLogStream(deploymentId: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setLogs([]);
    setError(null);

    esRef.current?.close();
    const eventSource = new EventSource(logsUrl(deploymentId));
    esRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data) as LogEntry;
        setLogs((current) => [...current, log]);
      } catch {
        // Ignore malformed frames; pings are sent as named events.
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      if (eventSource.readyState !== EventSource.CLOSED) {
        setError('Log stream disconnected');
      }
      eventSource.close();
    };

    return () => {
      setConnected(false);
      eventSource.close();
    };
  }, [deploymentId]);

  return { connected, error, logs };
}
