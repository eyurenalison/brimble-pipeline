interface RunProcessOptions {
  command: string[];
  cwd?: string;
  onLog?: (message: string) => void;
}

async function streamLines(
  stream: ReadableStream<Uint8Array> | null,
  onLine: (line: string) => void
) {
  if (!stream) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim()) {
        onLine(line);
      }
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    onLine(buffer);
  }
}

export async function runProcess({ command, cwd, onLog }: RunProcessOptions) {
  const proc = Bun.spawn(command, {
    cwd,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  const output: string[] = [];
  const collect = (message: string) => {
    output.push(message);
    onLog?.(message);
  };

  await Promise.all([
    streamLines(proc.stdout, collect),
    streamLines(proc.stderr, collect),
  ]);

  const exitCode = await proc.exited;

  return {
    exitCode,
    output: output.join('\n').trim(),
  };
}
