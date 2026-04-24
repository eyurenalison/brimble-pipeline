import { containerNameForDeployment } from './runner';

const CADDY_ADMIN = process.env.CADDY_ADMIN_URL ?? 'http://caddy:2019';
const BASE_DOMAIN = process.env.APP_BASE_DOMAIN ?? 'localhost';
const APP_CONTAINER_PORT = process.env.APP_CONTAINER_PORT ?? '3000';

interface CaddyRoute {
  match?: Array<{
    path?: string[];
  }>;
  handle?: Array<{
    handler?: string;
    upstreams?: Array<{
      dial?: string;
    }>;
  }>;
}

function deploymentPath(deploymentId: string) {
  return `/${deploymentId}`;
}

function routeMatchesDeployment(route: CaddyRoute, deploymentId: string) {
  const path = deploymentPath(deploymentId);
  return route.match?.some((matcher) => matcher.path?.includes(path)) ?? false;
}

function isFrontendFallbackRoute(route: CaddyRoute) {
  return (
    route.handle?.some(
      (handler) =>
        handler.handler === 'reverse_proxy' &&
        handler.upstreams?.some((upstream) => upstream.dial === 'frontend:80')
    ) ?? false
  );
}

async function caddyRequest(path: string, init?: RequestInit) {
  const res = await fetch(`${CADDY_ADMIN}${path}`, init);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Caddy admin API error (${res.status}): ${body}`);
  }

  return res;
}

async function getRoutes(): Promise<CaddyRoute[]> {
  const res = await caddyRequest('/config/apps/http/servers/srv0/routes');
  return (await res.json()) as CaddyRoute[];
}

export async function addCaddyRoute(deploymentId: string): Promise<string> {
  const path = deploymentPath(deploymentId);
  const containerName = containerNameForDeployment(deploymentId);
  const route = {
    match: [{ path: [`${path}/*`, path] }],
    handle: [
      {
        handler: 'rewrite',
        strip_path_prefix: path,
      },
      {
        handler: 'reverse_proxy',
        upstreams: [{ dial: `${containerName}:${APP_CONTAINER_PORT}` }],
      },
    ],
  };

  const routes = (await getRoutes()).filter(
    (existingRoute) => !routeMatchesDeployment(existingRoute, deploymentId)
  );
  const fallbackIndex = routes.findIndex(isFrontendFallbackRoute);

  if (fallbackIndex === -1) {
    routes.push(route);
  } else {
    routes.splice(fallbackIndex, 0, route);
  }

  await caddyRequest('/config/apps/http/servers/srv0/routes', {
    body: JSON.stringify(routes),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });

  return `http://${BASE_DOMAIN}${path}`;
}

export async function removeCaddyRoute(deploymentId: string) {
  const routes = await getRoutes();
  const updated = routes.filter(
    (route) => !routeMatchesDeployment(route, deploymentId)
  );

  if (updated.length === routes.length) {
    return;
  }

  await caddyRequest('/config/apps/http/servers/srv0/routes', {
    body: JSON.stringify(updated),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });
}
