import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHookbase } from './useHookbase';

const MESSAGES_KEY = ['portal', 'messages'] as const;

export function useReplay() {
  const { api } = useHookbase();
  const queryClient = useQueryClient();
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayError, setReplayError] = useState<Error | null>(null);

  const replayMessage = useCallback(async (messageId: string) => {
    setIsReplaying(true);
    setReplayError(null);

    try {
      const result = await api.replayMessage(messageId);
      // The replay is a new message at the top of the history
      queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Replay failed');
      setReplayError(error);
      throw error;
    } finally {
      setIsReplaying(false);
    }
  }, [api, queryClient]);

  const replayFailedForEndpoint = useCallback(async (
    endpointId: string,
    options?: { since?: string; includeUnattempted?: boolean }
  ) => {
    setIsReplaying(true);
    setReplayError(null);

    try {
      const result = await api.replayFailedForEndpoint(endpointId, options);
      // The replay is a new message at the top of the history
      queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Bulk replay failed');
      setReplayError(error);
      throw error;
    } finally {
      setIsReplaying(false);
    }
  }, [api, queryClient]);

  return {
    replayMessage,
    replayFailedForEndpoint,
    isReplaying,
    replayError,
  };
}
