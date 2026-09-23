"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorderStore, type RecorderErrorKind } from "./recorder-store";

export const MAX_RECORDING_MS = 20 * 60 * 1000;
export const MIN_RECORDING_SEC = 10;

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function detectSupport(): RecorderErrorKind | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) return "insecure";
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
  return null;
}

function pickMimeType(): string | undefined {
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported?.(type));
}

function classifyError(error: unknown): RecorderErrorKind {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission_denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no_device";
  if (name === "NotReadableError" || name === "AbortError") return "device_busy";
  return "unknown";
}

/**
 * Owns the getUserMedia → MediaRecorder lifecycle and writes UI state to the
 * recorder store. Returns imperative controls plus a live input level (0–1)
 * that is only used to confirm the microphone is picking up sound.
 */
export function useMediaRecorder() {
  const store = useRecorderStore;
  const [level, setLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const hitLimitRef = useRef(false);
  const mountedRef = useRef(false);

  const elapsedNow = () =>
    accumulatedRef.current + (segmentStartRef.current === null ? 0 : performance.now() - segmentStartRef.current);

  const stopMeters = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (tickRef.current !== null) clearInterval(tickRef.current);
    rafRef.current = null;
    tickRef.current = null;
    setLevel(0);
  }, []);

  const releaseDevices = useCallback(() => {
    stopMeters();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
  }, [stopMeters]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    accumulatedRef.current = elapsedNow();
    segmentStartRef.current = null;
    recorder.stop();
  }, []);

  const startMeters = useCallback(
    (stream: MediaStream) => {
      tickRef.current = window.setInterval(() => {
        const ms = elapsedNow();
        store.getState().setElapsed(ms);
        if (ms >= MAX_RECORDING_MS) {
          hitLimitRef.current = true;
          stop();
        }
      }, 250);

      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        const data = new Uint8Array(analyser.fftSize);
        let last = 0;
        const loop = (t: number) => {
          if (t - last > 80) {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (const v of data) sum += ((v - 128) / 128) ** 2;
            setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
            last = t;
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch {
        // Level meter is optional; recording still works without it.
      }
    },
    [stop, store],
  );

  const start = useCallback(async () => {
    const unsupported = detectSupport();
    if (unsupported) {
      store.getState().setError(unsupported);
      return;
    }

    store.getState().reset();
    store.getState().setStatus("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      if (mountedRef.current) store.getState().setError(classifyError(error));
      return;
    }
    // The user may have navigated away while the permission prompt was open.
    if (!mountedRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      store.getState().reset();
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      store.getState().setError("unsupported");
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    accumulatedRef.current = 0;
    hitLimitRef.current = false;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      releaseDevices();
      store.getState().setElapsed(accumulatedRef.current);
      store.getState().setRecording(
        { blob, url: URL.createObjectURL(blob), mimeType: type, durationSec: accumulatedRef.current / 1000 },
        hitLimitRef.current,
      );
    };
    // A track can end if the device is unplugged or permission revoked mid-take.
    stream.getAudioTracks()[0]?.addEventListener("ended", () => stop());

    recorder.start(1000);
    segmentStartRef.current = performance.now();
    store.getState().setStatus("recording");
    startMeters(stream);
  }, [releaseDevices, startMeters, stop, store]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "recording") return;
    recorder.pause();
    accumulatedRef.current = elapsedNow();
    segmentStartRef.current = null;
    store.getState().setElapsed(accumulatedRef.current);
    store.getState().setStatus("paused");
  }, [store]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "paused") return;
    recorder.resume();
    segmentStartRef.current = performance.now();
    store.getState().setStatus("recording");
  }, [store]);

  // Leaving the page mid-take discards it and releases the microphone.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      const { status, reset } = store.getState();
      if (status === "recording" || status === "paused" || status === "requesting") reset();
      releaseDevices();
    };
  }, [releaseDevices, store]);

  return { start, pause, resume, stop, level };
}
