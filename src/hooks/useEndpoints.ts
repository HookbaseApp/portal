import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHookbase } from '../context/HookbaseContext';
import type { CreateEndpointInput, UpdateEndpointInput, Endpoint, EndpointWithSecret } from '../types';

const ENDPOINTS_KEY = ['portal', 'endpoints'] as const;

export function useEndpoints() {
  const { api } = useHookbase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ENDPOINTS_KEY,
    queryFn: async () => {
      const response = await api.getEndpoints();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEndpointInput) => api.createEndpoint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEndpointInput }) =>
      api.updateEndpoint(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEndpoint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY });
    },
  });

  const rotateSecretMutation = useMutation({
    mutationFn: (id: string) => api.rotateEndpointSecret(id),
  });

  return {
    endpoints: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    createEndpoint: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateEndpoint: (id: string, data: UpdateEndpointInput) =>
      updateMutation.mutateAsync({ id, data }),
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteEndpoint: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    rotateSecret: rotateSecretMutation.mutateAsync,
    isRotating: rotateSecretMutation.isPending,
  };
}

export function useEndpoint(id: string) {
  const { api } = useHookbase();

  return useQuery({
    queryKey: [...ENDPOINTS_KEY, id],
    queryFn: async () => {
      const response = await api.getEndpoint(id);
      return response.data;
    },
    enabled: !!id,
  });
}
