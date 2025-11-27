'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SpeechRecognitionAlternativeLike = {
    transcript?: string;
};

type SpeechRecognitionResultLike = SpeechRecognitionAlternativeLike[] & {
    isFinal: boolean;
};

type SpeechRecognitionEventLike = {
    resultIndex: number;
    results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionErrorEventLike = {
    error: string;
};

type BrowserSpeechRecognition = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort?: () => void;
    onstart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechRecognitionResultPayload = {
    transcript: string;
    isFinal: boolean;
};

type UseSpeechToTextOptions = {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
    onResult?: (result: SpeechRecognitionResultPayload) => void;
};

type UseSpeechToTextReturn = {
    supported: boolean;
    listening: boolean;
    interimTranscript: string;
    error: string | null;
    initialized: boolean;
    start: () => void;
    stop: () => void;
    toggle: () => void;
};

const DEFAULT_LANG = 'en-US';

type SpeechRecognitionWindow = Window & typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | undefined => {
    if (typeof window === 'undefined') {
        return undefined;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognitionCtor =
        speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    return SpeechRecognitionCtor ?? undefined;
};

export const useSpeechToText = (
    options: UseSpeechToTextOptions = {}
): UseSpeechToTextReturn => {
    const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
    const onResultRef = useRef<UseSpeechToTextOptions['onResult']>(options.onResult);

    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    const lang = options.lang ?? DEFAULT_LANG;
    const interimResults = options.interimResults ?? true;
    const continuous = options.continuous ?? false;

    useEffect(() => {
        onResultRef.current = options.onResult;
    }, [options.onResult]);

    useEffect(() => {
        const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
        if (!SpeechRecognitionCtor) {
            setSupported(false);
            setInitialized(true);
            return;
        }

        setSupported(true);
        setInitialized(true);
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = lang;
        recognition.interimResults = interimResults;
        recognition.continuous = continuous;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setListening(true);
            setError(null);
        };

        recognition.onend = () => {
            setListening(false);
            setInterimTranscript('');
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
            const message =
                event.error === 'not-allowed'
                    ? 'Microphone access was denied.'
                    : event.error === 'service-not-allowed'
                      ? 'Speech recognition service is unavailable.'
                      : event.error === 'no-speech'
                        ? 'No speech was detected. Try again.'
                        : event.error === 'audio-capture'
                          ? 'No microphone was found or could not be accessed.'
                          : `Speech recognition error: ${event.error}`;

            setError(message);
            setListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const result = event.results[i];
                const transcript = result?.[0]?.transcript?.trim();
                if (!transcript) continue;

                if (result.isFinal) {
                    final += `${transcript} `;
                } else {
                    interim += `${transcript} `;
                }
            }

            const normalizedInterim = interim.trim();
            const normalizedFinal = final.trim();

            setInterimTranscript(normalizedInterim);

            if (normalizedFinal.length) {
                onResultRef.current?.({ transcript: normalizedFinal, isFinal: true });
            } else if (normalizedInterim.length) {
                onResultRef.current?.({ transcript: normalizedInterim, isFinal: false });
            }
        };

        recognitionRef.current = recognition;

        return () => {
            recognitionRef.current = null;
            recognition.onstart = null;
            recognition.onend = null;
            recognition.onerror = null;
            recognition.onresult = null;
            recognition.stop();
        };
    }, [lang, interimResults, continuous]);

    const start = useCallback(() => {
        if (!initialized || !supported || listening) {
            return;
        }

        const recognition = recognitionRef.current;
        if (!recognition) {
            return;
        }

        try {
            setError(null);
            recognition.start();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to start speech recognition.';
            setError(message);
            setListening(false);
        }
    }, [initialized, supported, listening]);

    const stop = useCallback(() => {
        const recognition = recognitionRef.current;
        if (!recognition || !listening) {
            setListening(false);
            setInterimTranscript('');
            return;
        }

        try {
            recognition.stop();
        } catch (err) {
            // Silently fail - recognition may already be stopped
        }
        setListening(false);
        setInterimTranscript('');
    }, [listening]);

    const toggle = useCallback(() => {
        if (listening) {
            stop();
        } else {
            start();
        }
    }, [listening, start, stop]);

    return useMemo(
        () => ({
            supported,
            listening,
            interimTranscript,
            error,
            initialized,
            start,
            stop,
            toggle,
        }),
        [supported, listening, interimTranscript, error, initialized, start, stop, toggle]
    );
};

``