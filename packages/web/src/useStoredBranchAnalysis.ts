import { useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface StoredAnalysisClient<T> {
  label: string;
  read: (callId: string, branchId: string, signal: AbortSignal) => Promise<T>;
  analyze: (callId: string, branchId: string, signal: AbortSignal) => Promise<T>;
  getRevision?: (data: T) => string | null;
}

export interface StoredBranchAnalysis<T> {
  data: T | null;
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  analyzedRevision: string | null;
  analyze: () => Promise<void>;
}

export function useStoredBranchAnalysis<T>(
  callId: string,
  branchId: string,
  enabled: boolean,
  client: StoredAnalysisClient<T>,
  revision: string | null = null,
): StoredBranchAnalysis<T> {
  const scope = useRef<AbortController | null>(null);
  const busy = useRef(true);
  const [state, setState] = useState({
    data: null as T | null,
    loading: true,
    analyzing: false,
    error: null as string | null,
    analyzedRevision: null as string | null,
  });

  function errorMessage(error: unknown) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 503)) {
      return `${client.label} analysis is unavailable for this practice right now.`;
    }
    if (error instanceof ApiError && error.status === 400) return error.message;
    return `Could not complete ${client.label.toLowerCase()} analysis. Try again.`;
  }

  // Load the saved result and its analyzed transcript, without starting new analysis.
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    scope.current = controller;
    busy.current = true;
    async function load() {
      try {
        const data = await client.read(callId, branchId, controller.signal);
        if (controller.signal.aborted) return;
        setState({
          data,
          loading: false,
          analyzing: false,
          error: null,
          analyzedRevision: client.getRevision?.(data) ?? null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          analyzing: false,
          analyzedRevision: null,
          error:
            error instanceof ApiError && error.status === 404
              ? null
              : `Could not load saved ${client.label.toLowerCase()}. Try analyzing this practice.`,
        });
      } finally {
        if (!controller.signal.aborted) busy.current = false;
      }
    }
    void load();
    return () => {
      controller.abort();
      scope.current = null;
    };
  }, [callId, branchId, enabled, client]);

  // Analyze the stored transcript once; ignore results after this scope is aborted.
  async function analyze() {
    const controller = scope.current;
    if (!enabled || !controller || controller.signal.aborted || busy.current) return;
    busy.current = true;
    setState((current) => ({ ...current, analyzing: true, error: null }));
    try {
      const data = await client.analyze(callId, branchId, controller.signal);
      if (controller.signal.aborted) return;
      setState({
        data,
        loading: false,
        analyzing: false,
        error: null,
        analyzedRevision: client.getRevision?.(data) ?? revision,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((current) => ({ ...current, analyzing: false, error: errorMessage(error) }));
    } finally {
      if (!controller.signal.aborted) busy.current = false;
    }
  }

  return { ...state, analyze };
}
