import { useQuery } from '@tanstack/react-query';
import { listDeployments } from '../api/client';
import { DeploymentRow } from './DeploymentRow';

export function DeploymentList() {
  const { data, error, isLoading } = useQuery({
    queryFn: listDeployments,
    queryKey: ['deployments'],
    refetchInterval: 3_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Loading deployments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error.message}
      </div>
    );
  }

  const deployments = data ?? [];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-zinc-200 border-b px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-950">Deployments</h2>
        <span className="text-sm text-zinc-500">{deployments.length}</span>
      </div>
      <div className="divide-y divide-zinc-200">
        {deployments.length > 0 ? (
          deployments.map((deployment) => (
            <DeploymentRow deployment={deployment} key={deployment.id} />
          ))
        ) : (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">
            No deployments yet.
          </div>
        )}
      </div>
    </section>
  );
}
