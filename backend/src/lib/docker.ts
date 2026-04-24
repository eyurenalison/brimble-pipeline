import { runProcess } from './process';

export async function stopContainer(containerId: string) {
  const { exitCode, output } = await runProcess({
    command: ['docker', 'rm', '-f', containerId],
  });

  if (exitCode !== 0) {
    throw new Error(output || `Failed to stop container ${containerId}`);
  }
}
