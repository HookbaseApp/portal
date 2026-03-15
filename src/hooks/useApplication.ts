import { useQuery } from '@tanstack/react-query';
import { useHookbase } from '../context/HookbaseContext';

const APPLICATION_KEY = ['portal', 'application'] as const;

export function useApplication() {
  const { api } = useHookbase();

  const query = useQuery({
    queryKey: APPLICATION_KEY,
    queryFn: async () => {
      const response = await api.getApplication();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Application info doesn't change often
  });

  return {
    application: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
