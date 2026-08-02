"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { strings } from "@/lib/i18n";

// ─────────────────────────────────────────────────────────────────────
// Minimal, self-contained types for the Web Speech Recognition API.
// Deliberately NOT relying on lib.dom.d.ts to already declare these —
// SpeechRecognition typings have historically been inconsistent across
// TypeScript versions (unlike SpeechSynthesis, which is more mature and
// consistently typed). These are scoped under unique local names so
// there's no risk of colliding with anything the DOM lib does provide.
// ─────────────────────────────────────────────────────────────────────

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Only one microphone session anywhere on the page at a time — the browser
// itself generally can't run two at once anyway, and starting a new one
// should cleanly stop whatever was previously listening rather than error.
let activeSession: { id: string; stop: () => void } | null = null;

export type RecognitionStatus = "idle" | "listening" | "done" | "error";

export interface UseSpeechRecognitionResult {
  /** False if this browser has no Speech Recognition API at all. */
  isSupported: boolean;
  status: RecognitionStatus;
  /** Finalized recognized text. */
  transcript: string;
  /** Live partial text while still listening — for a real-time "Listening..." display. */
  interimTranscript: string;
  /** A short, human-readable reason when status is "error". */
  error: string | null;
  /** Begins listening. Only ever call this from a direct user gesture (e.g. an onClick) — mobile Safari requires it. */
  start: () => void;
  /** Stops listening early, keeping whatever was already recognized. */
  stop: () => void;
  /** Clears transcript/error and returns to "idle" — used for "Try again." */
  reset: () => void;
}

function describeError(code: string): string {
  switch (code) {
    case "not-supported":
      return strings.voice.recognitionNotSupported;
    case "not-allowed":
    case "permission-denied":
      return strings.voice.micBlocked;
    case "no-speech":
      return strings.voice.noSpeechDetected;
    case "audio-capture":
      return strings.voice.noMicrophone;
    case "network":
      return strings.voice.networkIssue;
    case "aborted":
      return strings.voice.listeningStopped;
    default:
      return strings.voice.genericRecognitionError;
  }
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const instanceId = useId();
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const isSupported = getSpeechRecognitionCtor() !== null;

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setStatus("idle");
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(describeError("not-supported"));
      setStatus("error");
      return;
    }

    // Stop whatever else might currently be listening (a different
    // AudioButton-style widget elsewhere on the page), then claim the mic.
    if (activeSession && activeSession.id !== instanceId) {
      activeSession.stop();
    }

    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setStatus("listening");

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false; // stop automatically once the person pauses
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) finalChunk += alt.transcript;
        else interimChunk += alt.transcript;
      }
      if (finalChunk) {
        setTranscript((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk).trim());
      }
      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event) => {
      // "aborted" fires when we deliberately stop() a session (e.g. a
      // newer one taking over, or the user backing out) — not a real error.
      if (event.error === "aborted") return;
      setError(describeError(event.error));
      setStatus("error");
    };

    recognition.onend = () => {
      setInterimTranscript("");
      if (activeSession?.id === instanceId) activeSession = null;
      // Only move to "done"/"error" if nothing already flagged an error —
      // functional form avoids depending on a stale `transcript` closure.
      setStatus((current) => (current === "error" ? current : "done"));
    };

    recognitionRef.current = recognition;
    activeSession = { id: instanceId, stop: () => recognition.stop() };
    recognition.start();
  }, [instanceId]);

  // Clean up on unmount — don't leave a recognizer running if the
  // component using this hook disappears mid-listen.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (activeSession?.id === instanceId) activeSession = null;
    };
  }, [instanceId]);

  return { isSupported, status, transcript, interimTranscript, error, start, stop, reset };
}
