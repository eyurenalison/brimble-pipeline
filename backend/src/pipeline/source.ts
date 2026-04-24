import { access, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { getDeployment } from '../db/client';
import { runProcess } from '../lib/process';

function deploymentNameFromGitUrl(sourceRef: string, fallback: string) {
  return (
    sourceRef
      .split('/')
      .pop()
      ?.replace(/\.git$/, '') || fallback
  );
}

export async function fetchSource(id: string): Promise<{
  dir: string;
  name: string;
}> {
  const deployment = getDeployment(id);

  if (!deployment) {
    throw new Error(`Deployment ${id} not found`);
  }

  if (deployment.source_type === 'git') {
    const dir = path.join('tmp', 'builds', id);
    await rm(dir, { force: true, recursive: true });
    await mkdir(path.dirname(dir), { recursive: true });

    const { exitCode, output } = await runProcess({
      command: ['git', 'clone', '--depth=1', deployment.source_ref, dir],
    });

    if (exitCode !== 0) {
      throw new Error(output || 'Git clone failed');
    }

    return {
      dir,
      name: deploymentNameFromGitUrl(deployment.source_ref, id),
    };
  }

  const dir = path.join('tmp', 'uploads', id);

  try {
    await access(dir);
  } catch {
    throw new Error(`Upload source not found for deployment ${id}`);
  }

  return {
    dir,
    name: deployment.name,
  };
}
