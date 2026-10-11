// 占位：后续任务实现
import { useTranslation } from 'react-i18next';
import { PageBody, PageHeader } from '@/components/layout/PageHeader';

export default function OverviewPage() {
  const { t } = useTranslation();
  return (
    <PageBody>
      <PageHeader title={t('overview.title')} />
    </PageBody>
  );
}
