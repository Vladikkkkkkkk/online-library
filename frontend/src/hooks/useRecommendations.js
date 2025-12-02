import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../api/recommendations';

/**
 * Hook to get book recommendations for authenticated user
 * @param {number} limit - Number of recommendations to fetch
 * @param {boolean} enabled - Whether the query should run
 */
export const useRecommendations = (limit = 10, enabled = true) => {
  return useQuery({
    queryKey: ['recommendations', limit],
    queryFn: () => recommendationsApi.getRecommendations(limit),
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes - recommendations don't change often
    retry: 1,
  });
};

