import Plausible from 'plausible-tracker';

const plausibleTracker = Plausible({
  domain: 'llmchat.co',
});

const plausible = {
  trackPageview: () => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      plausibleTracker.trackPageview();
    }
  },
  trackEvent: (eventName: string, options?: any) => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      plausibleTracker.trackEvent(eventName, options);
    }
  },
};

export { plausible };
