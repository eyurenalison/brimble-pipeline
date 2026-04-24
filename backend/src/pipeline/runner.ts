import { runProcess } from '../lib/process';

const DOCKER_NETWORK = process.env.DOCKER_NETWORK ?? 'brimble-net';
const APP_CONTAINER_PORT = process.env.APP_CONTAINER_PORT ?? '3000';

interface RunOptions {
  id: string;
  imageRef: string;
  onLog: (message: string) => void;
}

export function containerNameForDeployment(id: string) {
  return `brimble-${id}`;
}

export async function runContainer({
  id,
  imageRef,
  onLog,
}: RunOptions): Promise<string> {
  const containerName = containerNameForDeployment(id);

  await runProcess({
    command: ['docker', 'rm', '-f', containerName],
  });

  const { exitCode, output } = await runProcess({
    command: [
      'docker',
      'run',
      '-d',
      '--name',
      containerName,
      '--network',
      DOCKER_NETWORK,
      '-e',
      `PORT=${APP_CONTAINER_PORT}`,
      '--restart',
      'unless-stopped',
      imageRef,
    ],
  });

  if (exitCode !== 0) {
    throw new Error(output || 'Docker run failed');
  }

  const containerId = output.split(/\r?\n/).at(-1)?.trim();

  if (!containerId) {
    throw new Error('Docker did not return a container id');
  }

  onLog(`Container started: ${containerId.slice(0, 12)}`);

  return containerId;
}
