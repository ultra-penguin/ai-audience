"use client";

import { create } from "zustand";

/** Client-only recording state. Server data lives in TanStack Query. */
export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "stopped" | "error";

export type RecorderErrorKind = "unsupported" | "insecure" | "permission_denied" | "no_device" | "device_busy" | "unknown";

export type Recording = {
  blob: Blob;
  url: string;
  mimeType: string;
  durationSec: number;
};

type RecorderState = {
  status: RecorderStatus;
  error: RecorderErrorKind | null;
  elapsedMs: number;
  title: string;
  recording: Recording | null;
  /** True when the recording was stopped automatically at the length limit. */
  hitLimit: boolean;

  setStatus: (status: RecorderStatus) => void;
  setError: (error: RecorderErrorKind) => void;
  setElapsed: (ms: number) => void;
  setTitle: (title: string) => void;
  setRecording: (recording: Recording, hitLimit?: boolean) => void;
  reset: () => void;
};

const initial = {
  status: "idle" as RecorderStatus,
  error: null,
  elapsedMs: 0,
  recording: null,
  hitLimit: false,
};

export const useRecorderStore = create<RecorderState>()((set, get) => ({
  ...initial,
  title: "",

  setStatus: (status) => set({ status, error: status === "error" ? get().error : null }),
  setError: (error) => set({ status: "error", error }),
  setElapsed: (elapsedMs) => set({ elapsedMs }),
  setTitle: (title) => set({ title }),
  setRecording: (recording, hitLimit = false) => {
    const previous = get().recording;
    if (previous && previous.url !== recording.url) URL.revokeObjectURL(previous.url);
    set({ recording, status: "stopped", hitLimit });
  },
  /** Discard the current take. The title is kept so a re-record doesn't lose it. */
  reset: () => {
    const previous = get().recording;
    if (previous) URL.revokeObjectURL(previous.url);
    set({ ...initial });
  },
}));
