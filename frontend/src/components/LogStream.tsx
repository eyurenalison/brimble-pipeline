import { useEffect, useRef } from 'react';
import { type LogEntry, useLogStream } from '../hooks/useLogStream';

interface LogStreamProps {
  deploymentId: string;
}

const lineClass: Record<LogEntry['level'], string> = {
  error: 'text-red-300',
  info: 'text-white',
  system: 'text-cyan-300',
};

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}

export function LogStream({ deploymentId }: LogStreamProps) {
  const { connected, error, logs } = useLogStream(deploymentId);
  const preRef = useRef<HTMLPreElement | null>(null);
  const shouldStickToBottom = useRef(true);

  useEffect(() => {
    const element = preRef.current;

    if (!element || !shouldStickToBottom.current) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  });

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-zinc-800 border-b px-3 py-2">
        <span className="font-mono text-xs text-zinc-400">
          {connected ? 'streaming' : 'logs'}
        </span>
        {error ? <span className="text-red-300 text-xs">{error}</span> : null}
      </div>
      <pre
        className="h-72 overflow-y-auto p-3 font-mono text-xs leading-5"
        onScroll={(event) => {
          const element = event.currentTarget;
          const distanceFromBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight;
          shouldStickToBottom.current = distanceFromBottom < 32;
        }}
        ref={preRef}
      >
        {logs.length > 0 ? (
          logs.map((log) => (
            <div
              className={lineClass[log.level]}
              key={
                log.id ??
                `${log.created_at}-${log.level}-${log.message.slice(0, 48)}`
              }
            >
              <span className="text-zinc-500">
                {formatTimestamp(log.created_at)}
              </span>{' '}
              {log.message}
            </div>
          ))
        ) : (
          <span className="text-zinc-500">Waiting for logs...</span>
        )}
      </pre>
    </div>
  );
}
