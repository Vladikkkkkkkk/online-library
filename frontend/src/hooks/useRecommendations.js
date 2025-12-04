import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../api/recommendations';


export const useRecommendations = (limit = 10, enabled = true) => {
  return useQuery({
    queryKey: ['recommendations', limit],
    queryFn: () => recommendationsApi.getRecommendations(limit),
    enabled,
    staleTime: 30 * 60 * 1000, 
    retry: 1,
  });
};

