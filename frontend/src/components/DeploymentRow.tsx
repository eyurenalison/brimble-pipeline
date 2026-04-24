import { useState } from 'react';
import type { Deployment, DeploymentStatus } from '../api/client';
import { LogStream } from './LogStream';

interface DeploymentRowProps {
  deployment: Deployment;
}

const statusClass: Record<DeploymentStatus, string> = {
  building: 'bg-yellow-100 text-yellow-700 animate-pulse',
  deploying: 'bg-blue-100 text-blue-700 animate-pulse',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-zinc-200 text-zinc-600',
  running: 'bg-green-100 text-green-700',
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(timestamp);
}

export function DeploymentRow({ deployment }: DeploymentRowProps) {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <article className="px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium text-zinc-950">
              {deployment.name}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[deployment.status]}`}
            >
              {deployment.status}
            </span>
          </div>
          <div className="mt-2 grid gap-1 text-sm text-zinc-600">
            <p className="truncate">
              <span className="font-medium text-zinc-700">Source:</span>{' '}
              {deployment.source_ref}
            </p>
            <p>
              <span className="font-medium text-zinc-700">Created:</span>{' '}
              {formatTime(deployment.created_at)}
            </p>
            {deployment.image_tag ? (
              <p className="truncate font-mono text-xs text-zinc-700">
                {deployment.image_tag}
              </p>
            ) : null}
            {deployment.status === 'running' && deployment.url ? (
              <a
                className="w-fit text-sm font-medium text-brand hover:underline"
                href={deployment.url}
                rel="noreferrer"
                target="_blank"
              >
                {deployment.url}
              </a>
            ) : null}
          </div>
        </div>

        <button
          className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          onClick={() => setShowLogs((current) => !current)}
          type="button"
        >
          {showLogs ? 'Hide logs' : 'Logs'}
        </button>
      </div>

      {showLogs ? (
        <div className="mt-4">
          <LogStream deploymentId={deployment.id} />
        </div>
      ) : null}
    </article>
  );
}
