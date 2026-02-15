'use client';

import { useState } from 'react';

export default function SheetPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');

  const loadSheetRenderer = async () => {
    setStatus('loading');

    try {
      // eslint-disable-next-line no-new-func
      const dynamicImporter = new Function('moduleName', 'return import(moduleName)') as (
        moduleName: string
      ) => Promise<unknown>;

      await dynamicImporter('opensheetmusicdisplay');
      setStatus('ready');
    } catch {
      setStatus('fallback');
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-sand">Sheet Display Placeholder</h1>
      <p className="text-sm text-slate-300">
        OSMD/VexFlow integration is optional and lazy-loaded only when the user requests notation mode.
      </p>

      <div className="panel space-y-3 p-5">
        <button
          type="button"
          onClick={loadSheetRenderer}
          className="rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm text-cyan transition hover:bg-cyan/20"
        >
          Load Sheet Renderer
        </button>

        <p className="text-sm text-slate-200">
          {status === 'idle' && 'Renderer not loaded yet.'}
          {status === 'loading' && 'Loading notation renderer...'}
          {status === 'ready' && 'Renderer package loaded. Wire notation parsing in this mode next.'}
          {status === 'fallback' &&
            'Package not installed in scaffold mode. Add opensheetmusicdisplay or vexflow when needed.'}
        </p>
      </div>
    </section>
  );
}
