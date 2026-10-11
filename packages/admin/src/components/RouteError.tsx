import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';

/**
 * 路由级错误边界：页面渲染抛错，或重新部署后旧标签页加载不到新的分包时显示。
 * 重新加载会拿到最新的 index.html 和分包。
 */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  useEffect(() => console.error(error), [error]);
  return (
    <div role="alert" className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-base text-subtle">{t('common.unexpectedError')}</p>
        <Button size="touch" onClick={() => location.reload()}>{t('common.reload')}</Button>
      </div>
    </div>
  );
}

/** 首屏等待登录检查和分包加载时的占位：只铺底色，避免白屏闪烁 */
export function RouteFallback() {
  return <div className="min-h-screen bg-background" />;
}
