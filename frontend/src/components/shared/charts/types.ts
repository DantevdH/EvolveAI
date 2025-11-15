export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface ChartDimensions {
  width: number;
  height: number;
  padding: number;
}

export const getChartDimensions = (screenWidth: number, padding: number = 40): ChartDimensions => {
  return {
    width: screenWidth - padding * 2,
    height: 200,
    padding,
  };
};

export const filterDataByPeriod = <T extends { date?: string; week?: string }>(
  data: T[],
  selectedPeriod: TimePeriod
): T[] => {
  if (!data || data.length === 0) return [];
  if (selectedPeriod === 'ALL') return data;

  const now = new Date();
  let cutoffDate: Date;

  switch (selectedPeriod) {
    case '1M':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3M':
      cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6M':
      cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1Y':
      cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return data;
  }

  return data.filter(item => {
    const dateStr = item.date || item.week;
    if (!dateStr) return false;
    return new Date(dateStr) >= cutoffDate;
  });
};

