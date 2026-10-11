import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TabbedDialog } from '@/components/TabbedDialog';

function Field({ label }: { label: string }) {
  const [value, setValue] = useState('');
  return <input aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} />;
}

function Harness() {
  const [tab, setTab] = useState<'a' | 'b'>('a');
  return (
    <TabbedDialog<'a' | 'b'>
      open onOpenChange={() => undefined} title="Settings" value={tab} onValueChange={setTab}
      tabs={[
        { value: 'a', label: 'Tab A', content: <Field label="field a" /> },
        { value: 'b', label: 'Tab B', content: <Field label="field b" /> },
      ]}
    />
  );
}

describe('TabbedDialog', () => {
  it('切换分页再切回来，未保存的输入还在', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('field a'), 'draft');
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
    expect(screen.getByLabelText('field b')).toBeVisible();
    await userEvent.click(screen.getByRole('tab', { name: 'Tab A' }));
    expect(screen.getByLabelText('field a')).toHaveValue('draft');
  });
  it('只有当前分页可见', async () => {
    render(<Harness />);
    expect(screen.getByLabelText('field a')).toBeVisible();
    expect(screen.queryByLabelText('field b')).not.toBeVisible();
  });
});
