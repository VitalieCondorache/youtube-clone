// Formats counters the YouTube way: 999 -> "999", 1200 -> "1.2K", 1500000 -> "1.5M"
export const formatCount = (value: number): string => {
  const count = Number(value) || 0;

  if (count >= 1000000) {
    return `${withOneDecimal(count / 1000000)}M`;
  }

  if (count >= 1000) {
    return `${withOneDecimal(count / 1000)}K`;
  }

  return `${count}`;
};

const withOneDecimal = (value: number): string => value.toFixed(1).replace(/\.0$/, '');
