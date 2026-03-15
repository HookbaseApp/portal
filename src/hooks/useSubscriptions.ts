import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHookbase } from '../context/HookbaseContext';
import type { CreateSubscriptionInput, Subscription } from '../types';

const SUBSCRIPTIONS_KEY = ['portal', 'subscriptions'] as const;

export function useSubscriptions(endpointId?: string) {
  const { api } = useHookbase();
  const queryClient = useQueryClient();

  const queryKey = endpointId
    ? [...SUBSCRIPTIONS_KEY, { endpointId }]
    : SUBSCRIPTIONS_KEY;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.getSubscriptions(endpointId);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSubscriptionInput) => api.createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });

  // Create a map of subscribed event type IDs for easy lookup
  const subscribedEventTypeIds = new Set(
    (query.data ?? []).map((sub) => sub.eventTypeId)
  );

  return {
    subscriptions: query.data ?? [],
    subscribedEventTypeIds,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    createSubscription: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    deleteSubscription: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    // Convenience method to toggle subscription
    toggleSubscription: async (eventTypeId: string, endpointId: string) => {
      const existing = (query.data ?? []).find(
        (sub) => sub.eventTypeId === eventTypeId && sub.endpointId === endpointId
      );

      if (existing) {
        await deleteMutation.mutateAsync(existing.id);
      } else {
        await createMutation.mutateAsync({ endpointId, eventTypeId });
      }
    },
  };
}
