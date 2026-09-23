"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError, type AnalysisStage, type CreatePresentationRequest } from "@/shared/api";

export const presentationKeys = {
  all: ["presentations"] as const,
  status: (id: string) => [...presentationKeys.all, id, "status"] as const,
  result: (id: string) => [...presentationKeys.all, id, "result"] as const,
};

const TERMINAL_STAGES: AnalysisStage[] = ["completed", "failed"];
const POLL_INTERVAL_MS = 1500;

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
    mutationFn: () => api.startAnalysis(id),
    onSuccess: (status) => queryClient.setQueryData(presentationKeys.status(id), status),
  });
}

export function useAnalysisStatus(id: string) {
  return useQuery({
    queryKey: presentationKeys.status(id),
    queryFn: () => api.getAnalysisStatus(id),
    refetchInterval: (query) => {
      const stage = query.state.data?.stage;
      if (query.state.error) return false;
      return stage && TERMINAL_STAGES.includes(stage) ? false : POLL_INTERVAL_MS;
    },
    retry: (count, error) => !(isApiError(error) && error.code === "not_found") && count < 2,
  });
}

export function useAnalysisResult(id: string) {
  return useQuery({
    queryKey: presentationKeys.result(id),
    queryFn: () => api.getResult(id),
    staleTime: Infinity,
    retry: (count, error) => !(isApiError(error) && error.code === "not_found") && count < 2,
  });
}
