import { useState, useCallback } from 'react';
import { useHookbase } from './useHookbase';
import type { TestDeliveryResult } from '../types';

export function useTestEndpoint() {
  const { api } = useHookbase();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestDeliveryResult | null>(null);
  const [testError, setTestError] = useState<Error | null>(null);

  const testEndpoint = useCallback(async (endpointId: string, eventType?: string) => {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const result = await api.testEndpoint(endpointId, eventType);
      setTestResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Test failed');
      setTestError(error);
      throw error;
    } finally {
      setIsTesting(false);
    }
  }, [api]);

  const clearResult = useCallback(() => {
    setTestResult(null);
    setTestError(null);
  }, []);

  return {
    testEndpoint,
    isTesting,
    testResult,
    testError,
    clearResult,
  };
}
