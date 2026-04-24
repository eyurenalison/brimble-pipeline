import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createDeployment,
  getDeployment,
  listDeployments,
  updateDeployment,
} from '../db/client';
import { apiError } from '../lib/api-error';
import { stopContainer } from '../lib/docker';
import { removeCaddyRoute } from '../pipeline/caddy';
import { runPipeline } from '../pipeline/index';
import type { NewDeployment } from '../types';

const deployments = new Hono();

const createSchema = z.discriminatedUnion('source_type', [
  z.object({
    source_type: z.literal('git'),
    source_ref: z.url(),
  }),
  z.object({
    source_type: z.literal('upload'),
  }),
]);

function deploymentNameFromGitUrl(sourceRef: string, fallback: string) {
  return (
    sourceRef
      .split('/')
      .pop()
      ?.replace(/\.git$/, '') || fallback
  );
}

interface UploadPart {
  name?: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

function isUploadPart(value: unknown): value is UploadPart {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  );
}

function safeUploadFilename(name: string | undefined) {
  if (!name) {
    return 'upload';
  }

  const filename = path.basename(name).replaceAll(/[^a-zA-Z0-9._-]/g, '-');
  return filename || 'upload';
}

async function saveUpload(id: string, file: UploadPart) {
  const uploadDir = path.join('tmp', 'uploads', id);
  await mkdir(uploadDir, { recursive: true });

  const filename = safeUploadFilename(file.name);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return filePath;
}

deployments.post('/', async (c) => {
  const id = crypto.randomUUID();
  const contentType = c.req.header('content-type') ?? '';
  let data: NewDeployment;

  if (contentType.includes('multipart/form-data')) {
    const form = await c.req.formData();
    const file = form.get('file');

    if (!isUploadPart(file)) {
      return c.json(apiError('MISSING_FILE', 'Missing file'), 400);
    }

    await saveUpload(id, file);

    data = {
      id,
      name: `upload-${id.slice(0, 8)}`,
      source_type: 'upload',
      source_ref: id,
    };
  } else {
    let json: unknown;

    try {
      json = await c.req.json();
    } catch {
      return c.json(
        apiError('BAD_REQUEST', 'Request body must be valid JSON'),
        400
      );
    }

    const parsed = createSchema.safeParse(json);

    if (!parsed.success) {
      return c.json(
        apiError('VALIDATION_ERROR', 'Invalid body', parsed.error.flatten()),
        400
      );
    }

    if (parsed.data.source_type === 'upload') {
      return c.json(
        apiError(
          'VALIDATION_ERROR',
          'Upload deployments must use multipart/form-data'
        ),
        400
      );
    }

    data = {
      id,
      name: deploymentNameFromGitUrl(parsed.data.source_ref, id),
      source_type: 'git',
      source_ref: parsed.data.source_ref,
    };
  }

  createDeployment(data);
  runPipeline(id).catch((error) => {
    console.error(error);
  });

  return c.json(getDeployment(id), 201);
});

deployments.get('/', (c) => c.json({ deployments: listDeployments() }));

deployments.get('/:id', (c) => {
  const deployment = getDeployment(c.req.param('id'));

  if (!deployment) {
    return c.json(apiError('NOT_FOUND', 'Deployment not found'), 404);
  }

  return c.json(deployment);
});

deployments.delete('/:id', async (c) => {
  const deployment = getDeployment(c.req.param('id'));

  if (!deployment) {
    return c.json(apiError('NOT_FOUND', 'Deployment not found'), 404);
  }

  if (deployment.container_id) {
    await stopContainer(deployment.container_id);
  }

  if (deployment.url) {
    await removeCaddyRoute(deployment.id);
  }

  updateDeployment(deployment.id, { status: 'failed' });

  return c.json({ ok: true });
});

deployments.post('/:id/redeploy', (c) => {
  const deployment = getDeployment(c.req.param('id'));

  if (!deployment) {
    return c.json(apiError('NOT_FOUND', 'Deployment not found'), 404);
  }

  return c.json(
    apiError('NOT_IMPLEMENTED', 'Redeploy is a bonus feature for Phase 8'),
    501
  );
});

export default deployments;
