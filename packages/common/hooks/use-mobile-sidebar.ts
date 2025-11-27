'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SwipeGestureOptions {
    threshold?: number;
    velocityThreshold?: number;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    enabled?: boolean;
}

interface SwipeState {
    startX: number;
    startY: number;
    startTime: number;
    currentX: number;
    isSwiping: boolean;
}

/**
 * Hook for detecting swipe gestures on mobile
 */
export function useSwipeGesture({
    threshold = 50,
    velocityThreshold = 0.3,
    onSwipeLeft,
    onSwipeRight,
    enabled = true,
}: SwipeGestureOptions = {}) {
    const swipeRef = useRef<HTMLElement | null>(null);
    const stateRef = useRef<SwipeState>({
        startX: 0,
        startY: 0,
        startTime: 0,
        currentX: 0,
        isSwiping: false,
    });

    const [swipeProgress, setSwipeProgress] = useState(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (!enabled) return;
        
        const touch = e.touches[0];
        stateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now(),
            currentX: touch.clientX,
            isSwiping: true,
        };
    }, [enabled]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!enabled || !stateRef.current.isSwiping) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - stateRef.current.startX;
        const deltaY = touch.clientY - stateRef.current.startY;

        // If vertical movement is greater, cancel swipe detection
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            stateRef.current.isSwiping = false;
            setSwipeProgress(0);
            return;
        }

        stateRef.current.currentX = touch.clientX;
        
        // Calculate progress for visual feedback (0 to 1 for right, 0 to -1 for left)
        const progress = Math.max(-1, Math.min(1, deltaX / threshold));
        setSwipeProgress(progress);
    }, [enabled, threshold]);

    const handleTouchEnd = useCallback(() => {
        if (!enabled || !stateRef.current.isSwiping) {
            setSwipeProgress(0);
            return;
        }

        const state = stateRef.current;
        const deltaX = state.currentX - state.startX;
        const deltaTime = Date.now() - state.startTime;
        const velocity = Math.abs(deltaX) / deltaTime;

        // Check if swipe meets threshold requirements
        const meetsThreshold = Math.abs(deltaX) >= threshold || velocity >= velocityThreshold;

        if (meetsThreshold) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        }

        stateRef.current.isSwiping = false;
        setSwipeProgress(0);
    }, [enabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight]);

    useEffect(() => {
        const element = swipeRef.current;
        if (!element || !enabled) return;

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('touchend', handleTouchEnd);
        element.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

    return {
        swipeRef,
        swipeProgress,
        isSwiping: stateRef.current.isSwiping,
    };
}

export interface MobileSidebarOptions {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    edgeWidth?: number;
}

/**
 * Hook for mobile sidebar with edge swipe to open and content swipe to close
 */
export function useMobileSidebar({
    isOpen,
    onOpen,
    onClose,
    edgeWidth = 20,
}: MobileSidebarOptions) {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sidebarRef = useRef<HTMLDivElement | null>(null);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Edge swipe to open sidebar
    useEffect(() => {
        if (!isMobile || isOpen) return;

        let startX = 0;
        let startY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            // Only detect swipes starting from the left edge
            if (touch.clientX <= edgeWidth) {
                startX = touch.clientX;
                startY = touch.clientY;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (startX === 0) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;

            // Horizontal swipe with enough distance
            if (deltaX > 50 && Math.abs(deltaY) < 50) {
                onOpen();
            }

            startX = 0;
            startY = 0;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isMobile, isOpen, onOpen, edgeWidth]);

    // Swipe within sidebar to close
    const { swipeRef, swipeProgress } = useSwipeGesture({
        threshold: 50,
        onSwipeLeft: onClose,
        enabled: isMobile && isOpen,
    });

    // Set sidebar ref when mounted
    const setSidebarRef = useCallback((el: HTMLDivElement | null) => {
        sidebarRef.current = el;
        swipeRef.current = el;
    }, [swipeRef]);

    // Close on backdrop tap
    const handleBackdropClick = useCallback(() => {
        if (isOpen) {
            onClose();
        }
    }, [isOpen, onClose]);

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (!isMobile) return;

        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobile, isOpen]);

    return {
        isMobile,
        containerRef,
        sidebarRef: setSidebarRef,
        swipeProgress,
        handleBackdropClick,
    };
}

/**
 * Calculate touch target size based on viewport
 * Returns minimum touch target size (44px on mobile, smaller on desktop)
 */
export function useTouchTargetSize() {
    const [targetSize, setTargetSize] = useState(44);

    useEffect(() => {
        const updateSize = () => {
            // 44px is Apple's recommended minimum touch target
            setTargetSize(window.innerWidth < 768 ? 44 : 32);
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    return targetSize;
}

/**
 * Hook to detect if user prefers reduced motion
 */
export function usePrefersReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
}
