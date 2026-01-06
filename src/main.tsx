import "./packages/adwaita"
import "./packages/inaudible.ui"
import "./packages/inaudible.view/components/duration-display";

import { init as initView} from "./packages/inaudible.view/app";
import { init as initContainer } from "./container";


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered:', reg))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
    await initContainer();
    initView();
});
