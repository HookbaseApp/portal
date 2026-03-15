import { useQuery } from '@tanstack/react-query';
import { useHookbase } from '../context/HookbaseContext';
import type { MessagesQuery, OutboundMessage } from '../types';

const MESSAGES_KEY = ['portal', 'messages'] as const;

export interface UseMessagesOptions extends MessagesQuery {
  /**
   * Auto-refresh interval in milliseconds
   * Set to 0 to disable auto-refresh
   * @default 0
   */
  refreshInterval?: number;
}

export function useMessages(options: UseMessagesOptions = {}) {
  const { api } = useHookbase();
  const { refreshInterval = 0, ...queryParams } = options;

  const query = useQuery({
    queryKey: [...MESSAGES_KEY, queryParams],
    queryFn: async () => {
      return api.getMessages(queryParams);
    },
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  return {
    messages: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

export function useMessage(id: string) {
  const { api } = useHookbase();

  return useQuery({
    queryKey: [...MESSAGES_KEY, id],
    queryFn: async () => {
      const response = await api.getMessage(id);
      return response.data;
    },
    enabled: !!id,
  });
}
