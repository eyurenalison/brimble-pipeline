import { randomBytes } from 'node:crypto';
import { appendLog, updateDeployment } from '../db/client';
import { stopContainer } from '../lib/docker';
import { emitLog } from '../lib/events';
import type { DeploymentLogLevel } from '../types';
import { buildImage } from './builder';
import { addCaddyRoute } from './caddy';
import { runContainer } from './runner';
import { fetchSource } from './source';

function imageSafeName(name: string) {
  const safe = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]/g, '-')
    .replaceAll(/^[._-]+|[._-]+$/g, '');

  return safe || 'app';
}

export async function runPipeline(id: string) {
  let containerId: string | null = null;

  const log = (level: DeploymentLogLevel, message: string) => {
    appendLog(id, level, message);
    emitLog(id, level, message);
  };

  try {
    updateDeployment(id, { status: 'building' });
    log('system', 'Fetching source...');
    const { dir, name } = await fetchSource(id);

    const tag = randomBytes(4).toString('hex');
    const imageRef = `brimble/${imageSafeName(name)}:${tag}`;
    log('system', `Building image ${imageRef}...`);
    await buildImage({
      dir,
      imageRef,
      onLog: (message) => log('info', message),
    });
    updateDeployment(id, { image_tag: imageRef });

    updateDeployment(id, { status: 'deploying' });
    log('system', 'Starting container...');
    containerId = await runContainer({
      id,
      imageRef,
      onLog: (message) => log('info', message),
    });
    updateDeployment(id, { container_id: containerId });

    log('system', 'Configuring ingress...');
    const url = await addCaddyRoute(id);
    updateDeployment(id, { status: 'running', url });

    log('system', `Deployment live at ${url}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (containerId) {
      try {
        await stopContainer(containerId);
        log(
          'system',
          `Stopped container after failure: ${containerId.slice(0, 12)}`
        );
      } catch (cleanupError) {
        const cleanupMessage =
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError);
        log('error', `Cleanup failed: ${cleanupMessage}`);
      }
    }

    log('error', `Pipeline failed: ${message}`);
    updateDeployment(id, { status: 'failed' });
  }
}
