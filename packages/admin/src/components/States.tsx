import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-subtle">{message || t('common.loadFailed')}</p>
      <Button variant="outline" size="touch" onClick={onRetry}>{t('common.retry')}</Button>
    </div>
  );
}

export function EmptyState({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('py-10 text-center text-muted-foreground', className)}>{children}</div>;
}
