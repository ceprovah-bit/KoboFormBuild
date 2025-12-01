import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: Hide loader after React has rendered
// This assumes the loader is a sibling of the root div.
setTimeout(() => {
    const loader = document.getElementById('app-loader');
    if(loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300); // remove from DOM after transition
    }
}, 100);
