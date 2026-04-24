export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'running'
  | 'failed';

export interface Deployment {
  id: string;
  name: string;
  source_type: 'git' | 'upload';
  source_ref: string;
  status: DeploymentStatus;
  image_tag: string | null;
  container_id: string | null;
  url: string | null;
  created_at: number;
  updated_at: number;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

interface DeploymentListResponse {
  deployments: Deployment[];
}

const API_URL = import.meta.env.VITE_API_URL ?? '';

function apiPath(path: string) {
  if (!API_URL) {
    return path;
  }

  return `${API_URL.replace(/\/$/, '')}${path}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = data as ApiErrorResponse | null;
    throw new Error(apiError?.error ?? `Request failed: ${response.status}`);
  }

  return data as T;
}

export async function listDeployments() {
  const response = await fetch(apiPath('/api/deployments'));
  const data = await parseResponse<DeploymentListResponse>(response);
  return data.deployments;
}

export async function createGitDeployment(sourceRef: string) {
  const response = await fetch(apiPath('/api/deployments'), {
    body: JSON.stringify({
      source_ref: sourceRef,
      source_type: 'git',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  return parseResponse<Deployment>(response);
}

export async function createUploadDeployment(file: File) {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(apiPath('/api/deployments'), {
    body: form,
    method: 'POST',
  });

  return parseResponse<Deployment>(response);
}

export function logsUrl(deploymentId: string) {
  return apiPath(`/api/deployments/${deploymentId}/logs`);
}
