import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getDeployment, getLogs } from '../db/client';
import { apiError } from '../lib/api-error';
import { subscribeToLogs } from '../lib/events';
import type { DeploymentLogLevel } from '../types';

const logs = new Hono();

function isTerminalStatus(status: string) {
  return status === 'running' || status === 'failed';
}

function isTerminalLog(level: DeploymentLogLevel, message: string) {
  return (
    level === 'error' ||
    message.startsWith('Deployment live at ') ||
    message.startsWith('Pipeline failed:')
  );
}

logs.get('/:id/logs', (c) => {
  const id = c.req.param('id');
  const deployment = getDeployment(id);

  if (!deployment) {
    return c.json(apiError('NOT_FOUND', 'Deployment not found'), 404);
  }

  return streamSSE(c, async (stream) => {
    const history = getLogs(id);

    for (const log of history) {
      await stream.writeSSE({ data: JSON.stringify(log) });
    }

    const currentDeployment = getDeployment(id);
    const hasTerminalLog = history.some((log) =>
      isTerminalLog(log.level, log.message)
    );

    if (
      hasTerminalLog ||
      !currentDeployment ||
      isTerminalStatus(currentDeployment.status)
    ) {
      return;
    }

    let closed = false;
    let unsubscribe: (() => void) | undefined;
    let ping: Timer | undefined;

    const close = () => {
      if (closed) {
        return;
      }

      closed = true;
      unsubscribe?.();

      if (ping) {
        clearInterval(ping);
      }
    };

    unsubscribe = subscribeToLogs(id, async (event) => {
      if (closed) {
        return;
      }

      await stream.writeSSE({ data: JSON.stringify(event) });

      if (isTerminalLog(event.level, event.message)) {
        close();
      }
    });

    ping = setInterval(() => {
      stream.writeSSE({ data: '', event: 'ping' }).catch(() => {
        close();
      });
    }, 20_000);

    stream.onAbort(close);

    await new Promise<void>((resolve) => {
      stream.onAbort(resolve);

      const complete = setInterval(() => {
        if (closed) {
          clearInterval(complete);
          resolve();
        }
      }, 100);
    });

    close();
  });
});

export default logs;
