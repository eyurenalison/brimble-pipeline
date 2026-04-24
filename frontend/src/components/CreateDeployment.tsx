import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import {
  createGitDeployment,
  createUploadDeployment,
  type Deployment,
} from '../api/client';

type Mode = 'git' | 'upload';

export function CreateDeployment() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('git');
  const [gitUrl, setGitUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'git') {
        return createGitDeployment(gitUrl.trim());
      }

      if (!file) {
        throw new Error('Choose a file to upload');
      }

      return createUploadDeployment(file);
    },
    onSuccess: (deployment: Deployment) => {
      setGitUrl('');
      setFile(null);
      queryClient.setQueryData<Deployment[]>(['deployments'], (current) =>
        current ? [deployment, ...current] : [deployment]
      );
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  const canSubmit =
    mutation.isPending ||
    (mode === 'git' && gitUrl.trim().length === 0) ||
    (mode === 'upload' && !file);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <form
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-950">
            New deployment
          </h2>
          <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100 p-1">
            <button
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                mode === 'git'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-600'
              }`}
              onClick={() => setMode('git')}
              type="button"
            >
              Git URL
            </button>
            <button
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                mode === 'upload'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-600'
              }`}
              onClick={() => setMode('upload')}
              type="button"
            >
              Upload
            </button>
          </div>
        </div>

        {mode === 'git' ? (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">
              Repository URL
            </span>
            <input
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setGitUrl(event.target.value)}
              placeholder="https://github.com/org/app.git"
              type="url"
              value={gitUrl}
            />
          </label>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">
              Source archive or file
            </span>
            <input
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
        )}

        {mutation.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {mutation.error.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={canSubmit}
            type="submit"
          >
            {mutation.isPending ? 'Creating...' : 'Deploy'}
          </button>
        </div>
      </div>
    </form>
  );
}
