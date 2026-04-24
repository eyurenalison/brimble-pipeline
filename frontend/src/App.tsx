import { CreateDeployment } from './components/CreateDeployment';
import { DeploymentList } from './components/DeploymentList';

export function App() {
  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="border-zinc-200 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-brand">Brimble Pipeline</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              Deployments
            </h1>
          </div>
          <div className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-600">
            Railpack · Docker · Caddy
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6">
        <CreateDeployment />
        <DeploymentList />
      </section>
    </main>
  );
}
