import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('TravelMind root element is missing.');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

declare global {
  interface WindowEventMap {
    'travelmind:navigate': CustomEvent<'home' | 'requirements' | 'sdlc' | 'guide'>;
  }
}
