import { createBrowserRouter } from 'react-router';
import { bindUnauthorized, routerOptions, routes } from './routes';

// 路由表和守卫在 routes.tsx 里，这里只负责接到浏览器地址栏上（测试用内存路由走同一份路由表）
export const router = createBrowserRouter(routes, routerOptions);
bindUnauthorized(router);
