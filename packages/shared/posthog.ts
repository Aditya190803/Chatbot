import { PostHog } from 'posthog-node';
import { v4 as uuidv4 } from 'uuid';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const client = POSTHOG_KEY ? new PostHog(POSTHOG_KEY, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
}) : null;

export enum EVENT_TYPES {
    WORKFLOW_SUMMARY = 'workflow_summary',
}

export type PostHogEvent = {
    event: EVENT_TYPES;
    userId: string;
    properties: Record<string, any>;
};

export const posthog = {
    capture: (event: PostHogEvent) => {
        if (!client) {
            console.log('PostHog not configured, skipping event capture:', event.event);
            return;
        }
        client.capture({
            distinctId: event?.userId || uuidv4(),
            event: event.event,
            properties: event.properties,
        });
    },
    flush: () => {
        if (!client) {
            return;
        }
        client.flush();
    },
};
