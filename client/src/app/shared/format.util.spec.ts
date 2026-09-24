import { formatCount } from './format.util';

describe('formatCount', () => {
  it('formats counters the YouTube way', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1000)).toBe('1K');
    expect(formatCount(1200)).toBe('1.2K');
    expect(formatCount(1500000)).toBe('1.5M');
  });

  it('falls back to 0 for missing values', () => {
    expect(formatCount(undefined as unknown as number)).toBe('0');
    expect(formatCount(null as unknown as number)).toBe('0');
  });
});
