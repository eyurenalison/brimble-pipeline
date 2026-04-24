import { EventEmitter } from 'node:events';
import type { DeploymentLogLevel } from '../types';

const bus = new EventEmitter();
bus.setMaxListeners(200);

export interface LogEvent {
  level: DeploymentLogLevel;
  message: string;
  created_at: number;
}

export function emitLog(
  deploymentId: string,
  level: DeploymentLogLevel,
  message: string
) {
  bus.emit(`logs:${deploymentId}`, {
    created_at: Date.now(),
    level,
    message,
  } satisfies LogEvent);
}

export function subscribeToLogs(
  deploymentId: string,
  callback: (event: LogEvent) => void | Promise<void>
) {
  const eventName = `logs:${deploymentId}`;

  bus.on(eventName, callback);

  return () => {
    bus.off(eventName, callback);
  };
}
