'use client';

import { useEffect, useState } from 'react';

const coarsePointerQuery = '(pointer: coarse)';
const smallViewportQuery = '(max-width: 768px)';

const getInitialValue = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    const coarseMatch = window.matchMedia?.(coarsePointerQuery).matches;
    const viewportMatch = window.matchMedia?.(smallViewportQuery).matches;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
    );

    return Boolean(coarseMatch || viewportMatch || uaMatch);
};

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState<boolean>(getInitialValue);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }

        const coarseMedia = window.matchMedia(coarsePointerQuery);
        const viewportMedia = window.matchMedia(smallViewportQuery);

        const update = () => {
            const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            );
            setIsMobile(Boolean(coarseMedia.matches || viewportMedia.matches || uaMatch));
        };

        update();

        coarseMedia.addEventListener('change', update);
        viewportMedia.addEventListener('change', update);

        return () => {
            coarseMedia.removeEventListener('change', update);
            viewportMedia.removeEventListener('change', update);
        };
    }, []);

    return isMobile;
};
