import { runProcess } from '../lib/process';

interface BuildOptions {
  dir: string;
  imageRef: string;
  onLog: (message: string) => void;
}

export async function buildImage({ dir, imageRef, onLog }: BuildOptions) {
  const { exitCode, output } = await runProcess({
    command: ['railpack', 'build', '--name', imageRef, dir],
    onLog,
  });

  if (exitCode !== 0) {
    throw new Error(
      output || `Railpack build failed with exit code ${exitCode}`
    );
  }
}
