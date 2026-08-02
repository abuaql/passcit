"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type PlaybackRate = 0.75 | 1 | 1.25;

export const PLAYBACK_RATES: PlaybackRate[] = [0.75, 1, 1.25];

const RATE_STORAGE_KEY = "passcit:speech-rate";
const DEFAULT_RATE: PlaybackRate = 1;

interface SpeechState {
  rate: PlaybackRate;
  playingId: string | null;
  voice: SpeechSynthesisVoice | null;
}

// Module-scoped singleton store. Every component that calls useSpeech()
// reads and writes the SAME state via useSyncExternalStore — this is
// what makes "only one audio plays at a time" and "remember the speed
// everywhere" work across potentially dozens of AudioButtons on a page,
// without wrapping the app in a Context provider (which would mean
// touching layout.tsx / navigation, out of scope for this change).
let state: SpeechState = { rate: DEFAULT_RATE, playingId: null, voice: null };
const listeners = new Set<() => void>();

function setState(partial: Partial<SpeechState>) {
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SpeechState {
  return state;
}

// Server has no speechSynthesis at all — always render the same default
// state during SSR, then sync to the real (possibly sessionStorage-backed)
// value after mount. Standard useSyncExternalStore hydration pattern.
function getServerSnapshot(): SpeechState {
  return { rate: DEFAULT_RATE, playingId: null, voice: null };
}

function readStoredRate(): PlaybackRate {
  try {
    const raw = window.sessionStorage.getItem(RATE_STORAGE_KEY);
    if (raw === "0.75" || raw === "1" || raw === "1.25") {
      return Number(raw) as PlaybackRate;
    }
  } catch {
    // sessionStorage can throw in some privacy modes — fall through to default.
  }
  return DEFAULT_RATE;
}

/**
 * Scores a voice for "best available American English voice." Browsers
 * expose wildly different voice lists (Chrome/Android: usually "Google US
 * English"; Safari/iOS: "Samantha" or newer Siri-branded voices; Edge:
 * sometimes high-quality "...Online (Natural)..." neural voices) — so this
 * ranks by signal rather than matching one hardcoded name.
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang?.toLowerCase() ?? "";
  const name = voice.name.toLowerCase();

  let score: number;
  if (lang === "en-us") score = 100;
  else if (lang.startsWith("en")) score = 40; // any other English as a fallback tier
  else return -1; // non-English voices are never picked as "best"

  if (name.includes("natural")) score += 30; // Edge's neural voices
  if (name.includes("google us english")) score += 25;
  if (name.includes("samantha")) score += 25; // macOS/iOS default, well-regarded
  if (name.includes("aria") || name.includes("jenny") || name.includes("guy")) score += 20; // modern Microsoft voices
  if (voice.localService) score += 10; // no network dependency
  if (voice.default) score += 5;

  return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = scoreVoice(voice);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }
  // Nothing scored (e.g. only non-English voices installed) — better to
  // speak in *some* voice than none.
  return best ?? voices[0] ?? null;
}

function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    setState({ voice: pickBestVoice(voices) });
  }
}

let initialized = false;
function ensureInitialized() {
  if (initialized || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  initialized = true;
  state = { ...state, rate: readStoredRate() };
  loadVoices();
  // Chrome/Edge/Android load voices asynchronously — getVoices() often
  // returns [] on the very first call. Safari tends to have them ready
  // immediately, but listening here too is harmless and keeps behavior
  // consistent across browsers.
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

export interface UseSpeechResult {
  /** Speaks `text`, identified by `id`. Cancels any other playback first — only one utterance plays at a time. */
  speak: (text: string, id: string) => void;
  /** Stops playback immediately, if anything is playing. */
  stop: () => void;
  /** Whether the utterance with this specific id is the one currently playing. */
  isPlaying: (id: string) => boolean;
  /** False if this browser has no Web Speech API at all (very rare, but handled). */
  isSupported: boolean;
  rate: PlaybackRate;
  setRate: (rate: PlaybackRate) => void;
}

export function useSpeech(): UseSpeechResult {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureInitialized();
  }, []);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setState({ playingId: null });
  }, [isSupported]);

  const speak = useCallback(
    (text: string, id: string) => {
      if (!isSupported || !text.trim()) return;

      // iOS Safari requires speak() to run synchronously inside a user
      // gesture (the click handler that called us) — no awaits before this.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = snapshot.rate;
      if (snapshot.voice) {
        utterance.voice = snapshot.voice;
        utterance.lang = snapshot.voice.lang;
      } else {
        // Voices haven't finished loading yet (rare, and self-corrects
        // within moments) — the browser's own default voice still speaks.
        utterance.lang = "en-US";
      }

      utterance.onstart = () => setState({ playingId: id });
      // Compare against the id this call owns, not object identity — if a
      // newer speak() already moved playingId elsewhere, don't clobber it
      // when this older utterance's onend/onerror fires afterward.
      utterance.onend = () => {
        if (state.playingId === id) setState({ playingId: null });
      };
      utterance.onerror = () => {
        if (state.playingId === id) setState({ playingId: null });
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, snapshot.rate, snapshot.voice]
  );

  const setRate = useCallback((rate: PlaybackRate) => {
    setState({ rate });
    try {
      window.sessionStorage.setItem(RATE_STORAGE_KEY, String(rate));
    } catch {
      // Non-fatal — the rate just won't persist across a refresh this time.
    }
  }, []);

  const isPlaying = useCallback((id: string) => snapshot.playingId === id, [snapshot.playingId]);

  return { speak, stop, isPlaying, isSupported, rate: snapshot.rate, setRate };
}
