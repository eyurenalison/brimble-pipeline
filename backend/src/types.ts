export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'running'
  | 'failed';

export type DeploymentSourceType = 'git' | 'upload';

export type DeploymentLogLevel = 'info' | 'error' | 'system';

export interface Deployment {
  id: string;
  name: string;
  source_type: DeploymentSourceType;
  source_ref: string;
  status: DeploymentStatus;
  image_tag: string | null;
  container_id: string | null;
  url: string | null;
  created_at: number;
  updated_at: number;
}

export interface DeploymentLog {
  id: number;
  deployment_id: string;
  level: DeploymentLogLevel;
  message: string;
  created_at: number;
}

export type NewDeployment = Pick<
  Deployment,
  'id' | 'name' | 'source_type' | 'source_ref'
>;

export type DeploymentUpdate = Partial<
  Pick<Deployment, 'status' | 'image_tag' | 'container_id' | 'url'>
>;
