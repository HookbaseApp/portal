import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useHookbase } from '../context/HookbaseContext';
import type { MessagesQuery } from '../types';

const MESSAGES_KEY = ['portal', 'messages'] as const;

export interface UseMessagesOptions extends MessagesQuery {
  /**
   * Auto-refresh interval in milliseconds
   * Set to 0 to disable auto-refresh
   * @default 0
   */
  refreshInterval?: number;
}

/**
 * One page of delivery history. The API pages by cursor, not offset: pass the returned
 * `nextCursor` back as `cursor` to fetch the next page while `hasMore` is true. There is no total.
 */
export function useMessages(options: UseMessagesOptions = {}) {
  const { api } = useHookbase();
  const { refreshInterval = 0, ...queryParams } = options;

  const query = useQuery({
    queryKey: [...MESSAGES_KEY, 'list', queryParams],
    queryFn: async () => {
      return api.getMessages(queryParams);
    },
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    placeholderData: keepPreviousData,
  });

  return {
    messages: query.data?.data ?? [],
    hasMore: query.data?.pagination?.hasMore ?? false,
    nextCursor: query.data?.pagination?.nextCursor ?? null,
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
    queryKey: [...MESSAGES_KEY, 'detail', id],
    queryFn: async () => {
      const response = await api.getMessage(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/** Delivery attempts of one message, oldest first. Pass `enabled: false` to defer the fetch. */
export function useMessageAttempts(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  const { api } = useHookbase();

  return useQuery({
    queryKey: [...MESSAGES_KEY, 'attempts', id],
    queryFn: async () => {
      const response = await api.getMessageAttempts(id);
      return response.data;
    },
    enabled: !!id && enabled,
  });
}
