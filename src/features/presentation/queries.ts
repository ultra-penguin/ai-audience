"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, shouldRetryQuery, type AnalysisStage, type CreatePresentationRequest } from "@/shared/api";
import { createMockClient } from "@/mocks/mock-client";

export const presentationKeys = {
  all: ["presentations"] as const,
  status: (id: string) => [...presentationKeys.all, id, "status"] as const,
  result: (id: string) => [...presentationKeys.all, id, "result"] as const,
};

const TERMINAL_STAGES: AnalysisStage[] = ["completed", "failed"];
const POLL_INTERVAL_MS = 1500;
const DEMO_IDS = new Set(["sample", "demo-empty", "demo-failed"]);
const demoApi = createMockClient();
const clientFor = (id: string) => (DEMO_IDS.has(id) ? demoApi : api);

/** Upload the recording, then kick off analysis. Resolves with the presentation id. */
export function useSubmitPresentation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: CreatePresentationRequest) => {
      const { presentationId } = await api.createPresentation(req);
      const status = await api.startAnalysis(presentationId);
      queryClient.setQueryData(presentationKeys.status(presentationId), status);
      return presentationId;
    },
  });
}

export function useRetryAnalysis(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clientFor(id).startAnalysis(id),
    onSuccess: (status) => queryClient.setQueryData(presentationKeys.status(id), status),
  });
}

export function useAnalysisStatus(id: string) {
  return useQuery({
    queryKey: presentationKeys.status(id),
    queryFn: () => clientFor(id).getAnalysisStatus(id),
    refetchInterval: (query) => {
      const stage = query.state.data?.stage;
      if (query.state.error) return false;
      return stage && TERMINAL_STAGES.includes(stage) ? false : POLL_INTERVAL_MS;
    },
    retry: shouldRetryQuery,
  });
}

export function useAnalysisResult(id: string) {
  return useQuery({
    queryKey: presentationKeys.result(id),
    queryFn: () => clientFor(id).getResult(id),
    staleTime: Infinity,
    retry: shouldRetryQuery,
  });
}
