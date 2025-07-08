'use client';

import { createRoot } from 'react-dom/client';
import ConfirmWithInput from './ConfirmWithInput';

export function confirmWithInput() {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleConfirm = (input) => {
      cleanup();
      resolve(input);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    const cleanup = () => {
      root.unmount();
      container.remove();
    };

    root.render(
      <ConfirmWithInput
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  });
}
