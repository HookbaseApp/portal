import { useQuery } from '@tanstack/react-query';
import { useHookbase } from '../context/HookbaseContext';
import type { EventType } from '../types';

const EVENT_TYPES_KEY = ['portal', 'event-types'] as const;

export function useEventTypes() {
  const { api } = useHookbase();

  const query = useQuery({
    queryKey: EVENT_TYPES_KEY,
    queryFn: async () => {
      const response = await api.getEventTypes();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Event types don't change often
  });

  // Group event types by category
  const groupedByCategory = (query.data ?? []).reduce<Record<string, EventType[]>>(
    (acc, eventType) => {
      const category = eventType.category ?? 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(eventType);
      return acc;
    },
    {}
  );

  return {
    eventTypes: query.data ?? [],
    groupedByCategory,
    categories: Object.keys(groupedByCategory).sort(),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
