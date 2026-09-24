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

// 1536 -> "1.5 KB", 1048576 -> "1 MB", used for file sizes
export const formatSize = (bytes: number): string => {
  const value = Number(bytes) || 0;

  if (value >= 1024 * 1024 * 1024) {
    return `${withOneDecimal(value / (1024 * 1024 * 1024))} GB`;
  }

  if (value >= 1024 * 1024) {
    return `${withOneDecimal(value / (1024 * 1024))} MB`;
  }

  if (value >= 1024) {
    return `${withOneDecimal(value / 1024)} KB`;
  }

  return `${value} B`;
};

const withOneDecimal = (value: number): string => value.toFixed(1).replace(/\.0$/, '');
