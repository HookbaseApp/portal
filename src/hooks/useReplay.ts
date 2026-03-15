import { useState, useCallback } from 'react';
import { useHookbase } from './useHookbase';

export function useReplay() {
  const { api } = useHookbase();
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayError, setReplayError] = useState<Error | null>(null);

  const replayMessage = useCallback(async (messageId: string) => {
    setIsReplaying(true);
    setReplayError(null);

    try {
      const result = await api.replayMessage(messageId);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Replay failed');
      setReplayError(error);
      throw error;
    } finally {
      setIsReplaying(false);
    }
  }, [api]);

  const replayFailedForEndpoint = useCallback(async (endpointId: string) => {
    setIsReplaying(true);
    setReplayError(null);

    try {
      const result = await api.replayFailedForEndpoint(endpointId);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Bulk replay failed');
      setReplayError(error);
      throw error;
    } finally {
      setIsReplaying(false);
    }
  }, [api]);

  return {
    replayMessage,
    replayFailedForEndpoint,
    isReplaying,
    replayError,
  };
}
