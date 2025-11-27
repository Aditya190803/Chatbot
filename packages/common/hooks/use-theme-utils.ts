'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Enhanced theme hook with additional utilities
 */
export function useEnhancedTheme() {
    const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted ? resolvedTheme === 'dark' : false;
    const isLight = mounted ? resolvedTheme === 'light' : false;
    const isSystem = mounted ? theme === 'system' : false;

    const toggleTheme = useCallback(() => {
        if (resolvedTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    }, [resolvedTheme, setTheme]);

    const cycleTheme = useCallback(() => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    }, [theme, setTheme]);

    return {
        theme: theme as ThemeMode | undefined,
        resolvedTheme: resolvedTheme as 'light' | 'dark' | undefined,
        systemTheme: systemTheme as 'light' | 'dark' | undefined,
        setTheme,
        toggleTheme,
        cycleTheme,
        isDark,
        isLight,
        isSystem,
        mounted,
    };
}

/**
 * Hook to detect system theme preference
 */
export function useSystemTheme() {
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const updateTheme = () => {
            setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
        };

        updateTheme();
        mediaQuery.addEventListener('change', updateTheme);
        
        return () => mediaQuery.removeEventListener('change', updateTheme);
    }, []);

    return systemTheme;
}

/**
 * Hook to add smooth theme transitions
 * Returns a class name to apply to the root element
 */
export function useThemeTransition() {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        setIsTransitioning(true);
        const timeout = setTimeout(() => setIsTransitioning(false), 300);
        return () => clearTimeout(timeout);
    }, [resolvedTheme]);

    return {
        isTransitioning,
        transitionClass: isTransitioning ? 'theme-transitioning' : '',
    };
}

/**
 * Get contrast-safe colors based on current theme
 */
export function useContrastColors() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return {
            text: {
                primary: 'hsl(var(--foreground))',
                secondary: 'hsl(var(--muted-foreground))',
                muted: 'hsl(var(--muted-foreground))',
            },
            background: {
                primary: 'hsl(var(--background))',
                secondary: 'hsl(var(--muted))',
                accent: 'hsl(var(--accent))',
            },
            border: 'hsl(var(--border))',
        };
    }

    const isDark = resolvedTheme === 'dark';

    return {
        text: {
            // Ensure 4.5:1 contrast ratio for normal text
            primary: isDark ? 'hsl(0 0% 98%)' : 'hsl(240 10% 3.9%)',
            // Ensure 3:1 contrast ratio for large text
            secondary: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)',
            muted: isDark ? 'hsl(240 5% 50%)' : 'hsl(240 3.8% 60%)',
        },
        background: {
            primary: isDark ? 'hsl(240 10% 3.9%)' : 'hsl(0 0% 100%)',
            secondary: isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 4.8% 95.9%)',
            accent: isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 4.8% 95.9%)',
        },
        border: isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)',
    };
}

/**
 * CSS variables for theme transition
 */
export const themeTransitionStyles = `
.theme-transitioning,
.theme-transitioning *,
.theme-transitioning *::before,
.theme-transitioning *::after {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.2s ease !important;
  transition-delay: 0s !important;
}
`;

/**
 * Theme-aware color utilities
 */
export const themeColors = {
    // Status colors with good contrast in both themes
    success: {
        light: 'hsl(142 76% 36%)',
        dark: 'hsl(142 69% 58%)',
    },
    warning: {
        light: 'hsl(38 92% 50%)',
        dark: 'hsl(38 92% 70%)',
    },
    error: {
        light: 'hsl(0 84% 60%)',
        dark: 'hsl(0 84% 75%)',
    },
    info: {
        light: 'hsl(221 83% 53%)',
        dark: 'hsl(217 91% 75%)',
    },
} as const;

/**
 * Get theme-appropriate status color
 */
export function useStatusColor(status: 'success' | 'warning' | 'error' | 'info') {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return themeColors[status].light;
    }

    return resolvedTheme === 'dark' ? themeColors[status].dark : themeColors[status].light;
}
