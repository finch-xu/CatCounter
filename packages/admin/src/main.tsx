import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from '@/components/ui/sonner';
import './i18n';
import './index.css';
import { queryClient } from './queries';
import { router } from './router';

// 字体样式表有两百多条按字符分片的 @font-face，体积不小：单独成包、异步加载，不挡首屏；
// 加载完成前先用系统字体显示
void import('lxgw-wenkai-screen-web/lxgwwenkaiscreen/result.css');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" />
    </QueryClientProvider>
  </StrictMode>,
);
