import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DeltaChip } from '@/components/DeltaChip';
import { i18n } from '@/i18n';

describe('DeltaChip', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });

  it('无法比较时不渲染', () => {
    const { container } = render(<DeltaChip value={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('上涨用正向配色，下跌用危险色，数值取绝对值', () => {
    const { rerender } = render(<DeltaChip value={0.106} />);
    expect(screen.getByText('10.6%').parentElement).toHaveClass('text-positive');
    rerender(<DeltaChip value={-0.25} />);
    expect(screen.getByText('25.0%').parentElement).toHaveClass('text-destructive');
  });

  it('持平（0%）是中性的，不显示成上涨', () => {
    render(<DeltaChip value={0} />);
    const chip = screen.getByText('0.0%').parentElement!;
    expect(chip).not.toHaveClass('text-positive');
    expect(chip).not.toHaveClass('text-destructive');
  });

  it('带说明时是一个可聚焦的按钮：读屏能读到完整含义，点一下（触屏）也能看到说明', async () => {
    render(<DeltaChip value={0.106} prefix="7d" title="Last 7 days vs previous 7" />);
    const chip = screen.getByRole('button', { name: /Last 7 days vs previous 7/ });
    expect(chip).toHaveAccessibleName(expect.stringContaining('10.6%'));
    await userEvent.click(chip);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Last 7 days vs previous 7');
  });
});
