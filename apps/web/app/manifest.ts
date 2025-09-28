import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'llmchat.co',
        short_name: 'llmchat.co',
        description:
            'llmchat.co is a modern AI chat client that allows you to chat with AI in a more intuitive way.',
        start_url: '/',
        display: 'standalone',
        background_color: 'hsl(60 20% 99%)',
        theme_color: 'hsl(60 1% 10%)'
    };
}
