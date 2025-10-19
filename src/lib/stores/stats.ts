import { create } from 'zustand';
import { api } from '../utils/tauri';
import type {
  ReviewStatistics,
  HourlyReviewDistribution,
  DailyReviewStats,
  ReadingStatistics,
  StudyTimeStats,
  ForecastDay,
  DailyStudyTime,
} from '../types';

export type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface StatsState {
  isLoading: boolean;
  error: string | null;
  dateRange: DateRange;
  selectedFolders: string[];

  reviewStats: ReviewStatistics | null;
  hourlyDistribution: HourlyReviewDistribution[];
  dailyReviewStats: DailyReviewStats[];
  readingStats: ReadingStatistics | null;
  studyTimeStats: StudyTimeStats | null;

  loadStats: (range: DateRange) => Promise<void>;
  setDateRange: (range: DateRange) => void;
  setSelectedFolders: (folders: string[]) => void;

  getProjectionData: () => ForecastDay[];
  getStudyTimeData: () => DailyStudyTime[];
  getAccuracyData: () => DailyReviewStats[];
  getDifficultyHeatmap: () => HourlyReviewDistribution[];
}

const calculateStartDate = (range: DateRange): string => {
  const now = new Date();
  const start = new Date();

  switch (range) {
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      start.setFullYear(2000);
      break;
  }

  return start.toISOString();
};

const calculateEndDate = (): string => {
  return new Date().toISOString();
};

export const useStatsStore = create<StatsState>((set, get) => ({
  isLoading: false,
  error: null,
  dateRange: 'month',
  selectedFolders: [],

  reviewStats: null,
  hourlyDistribution: [],
  dailyReviewStats: [],
  readingStats: null,
  studyTimeStats: null,

  loadStats: async (range: DateRange) => {
    console.log('[StatsStore] loadStats called with range:', range);
    set({ isLoading: true, error: null });
    try {
      const startDate = calculateStartDate(range);
      const endDate = calculateEndDate();

      console.log('[StatsStore] Date range calculated:', { startDate, endDate });

      const [reviewStats, hourlyDistribution, dailyReviewStats, readingStats, studyTimeStats] =
        await Promise.all([
          api.statistics.getReviewStatistics(startDate, endDate),
          api.statistics.getDifficultyByHour(startDate, endDate),
          api.statistics.getDailyReviewStats(startDate, endDate),
          api.statistics.getReadingStats(startDate, endDate),
          api.statistics.getStudyTimeStats(startDate, endDate),
        ]);

      console.log('[StatsStore] API data received:', {
        reviewStats,
        hourlyDistribution,
        dailyReviewStats,
        readingStats,
        readingStatsByFolder: readingStats?.byFolder,
        readingStatsByFolderLength: readingStats?.byFolder?.length,
        studyTimeStats,
      });

      set({
        dateRange: range,
        reviewStats,
        hourlyDistribution,
        dailyReviewStats,
        readingStats,
        studyTimeStats,
        isLoading: false,
      });

      console.log('[StatsStore] State updated successfully');
    } catch (error) {
      console.error('Failed to load statistics:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load statistics',
        isLoading: false,
      });
    }
  },

  setDateRange: (range: DateRange) => {
    set({ dateRange: range });
    get().loadStats(range);
  },

  setSelectedFolders: (folders: string[]) => {
    set({ selectedFolders: folders });
  },

  getProjectionData: () => {
    const state = get();
    return state.reviewStats?.forecastNext7Days || [];
  },

  getStudyTimeData: () => {
    const state = get();
    return state.studyTimeStats?.byDate || [];
  },

  getAccuracyData: () => {
    const state = get();
    return state.dailyReviewStats || [];
  },

  getDifficultyHeatmap: () => {
    const state = get();
    return state.hourlyDistribution || [];
  },
}));
