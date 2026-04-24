import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { setupDefaultInterceptors } from '@/core/http/interceptors';
import { rehydrateAuth } from '@/core/auth/session';
import { useSettingsStore } from '@/stores/settings';
import { MOCK_ENABLED } from '@/utils/constants';
import { createLogger } from '@/core/logger';
import './App.css';

const log = createLogger('bootstrap');

setupDefaultInterceptors();

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

async function bootstrap() {
  log.info('Application starting', { mock: MOCK_ENABLED });

  if (MOCK_ENABLED) {
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
    log.info('MSW mock worker started');
  }

  await useSettingsStore.persist.rehydrate();
  log.info('Settings store rehydrated');

  await rehydrateAuth();
  log.info('Auth store rehydrated');

  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );

  log.info('Application rendered');
}

void bootstrap();
