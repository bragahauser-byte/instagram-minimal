import { createRoot } from 'react-dom/client';
import { SettingsRepository, detectPlatform, extensionArea } from '@im/core';
import { MinimalApp, type AppEnv } from '@im/ui';
import '../../../packages/shared-ui/src/ui.css';
import { api } from './browser';
import { getExtensionStatus, requestInstagramAccess } from './status';

export const DOCS_URL = 'https://bragahauser-byte.github.io/instagram-minimal/#docs';

export function mount(layout: AppEnv['layout']) {
  const repo = new SettingsRepository(extensionArea(api));
  const env: AppEnv = {
    layout,
    platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
    docsUrl: DOCS_URL,
    getStatus: getExtensionStatus,
    requestAccess: requestInstagramAccess,
    initialRoute: location.hash === '#welcome' ? 'welcome' : undefined,
  };
  document.documentElement.classList.add('im-root');
  createRoot(document.getElementById('root')!).render(<MinimalApp repo={repo} env={env} />);
}
