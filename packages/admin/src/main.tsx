import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="grid h-full place-items-center font-serif text-2xl">CatCounter</div>
  </StrictMode>,
);
