import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  Deployment,
  DeploymentLog,
  DeploymentLogLevel,
  DeploymentUpdate,
  NewDeployment,
} from '../types';

const databaseUrl = process.env.DATABASE_URL ?? './data/deployments.db';
const databaseDir = path.dirname(databaseUrl);

if (databaseDir !== '.' && !existsSync(databaseDir)) {
  mkdirSync(databaseDir, { recursive: true });
}

const db = new Database(databaseUrl, { create: true });

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

const deploymentUpdateColumns = new Set<keyof DeploymentUpdate>([
  'status',
  'image_tag',
  'container_id',
  'url',
]);

export async function runMigrations() {
  const dir = path.join(import.meta.dir, 'migrations');
  const files = (await readdir(dir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await readFile(path.join(dir, file), 'utf8');
    db.exec(sql);
  }
}

export function createDeployment(data: NewDeployment) {
  const now = Date.now();

  db.query(`
    INSERT INTO deployments (id, name, source_type, source_ref, status, created_at, updated_at)
    VALUES ($id, $name, $source_type, $source_ref, 'pending', $now, $now)
  `).run({
    $id: data.id,
    $name: data.name,
    $source_type: data.source_type,
    $source_ref: data.source_ref,
    $now: now,
  });
}

export function updateDeployment(id: string, fields: DeploymentUpdate) {
  const entries = Object.entries(fields).filter(([key]) =>
    deploymentUpdateColumns.has(key as keyof DeploymentUpdate)
  );

  if (entries.length === 0) {
    return;
  }

  const sets = entries.map(([key]) => `${key} = $${key}`).join(', ');
  const params = Object.fromEntries(
    entries.map(([key, value]) => [`$${key}`, value])
  );

  db.query(
    `UPDATE deployments SET ${sets}, updated_at = $now WHERE id = $id`
  ).run({
    ...params,
    $id: id,
    $now: Date.now(),
  });
}

export function listDeployments(): Deployment[] {
  return db
    .query('SELECT * FROM deployments ORDER BY created_at DESC')
    .all() as Deployment[];
}

export function getDeployment(id: string): Deployment | null {
  return db
    .query('SELECT * FROM deployments WHERE id = $id')
    .get({ $id: id }) as Deployment | null;
}

export function appendLog(
  deploymentId: string,
  level: DeploymentLogLevel,
  message: string
) {
  db.query(`
    INSERT INTO deployment_logs (deployment_id, level, message, created_at)
    VALUES ($deployment_id, $level, $message, $now)
  `).run({
    $deployment_id: deploymentId,
    $level: level,
    $message: message,
    $now: Date.now(),
  });
}

export function getLogs(deploymentId: string): DeploymentLog[] {
  return db
    .query(
      'SELECT * FROM deployment_logs WHERE deployment_id = $id ORDER BY created_at ASC'
    )
    .all({ $id: deploymentId }) as DeploymentLog[];
}

export { db };
