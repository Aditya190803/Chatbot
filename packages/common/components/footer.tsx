import Link from 'next/link';

export const Footer = () => {
    const links = [
        {
            href: 'https://github.com/Aditya190803/chatbot',
            label: 'Star us on GitHub',
        },
        {
            href: '/changelog',
            label: 'Changelog',
        },
        {
            href: 'mailto:aditya.mer@somaiya.edu',
            label: 'Feedback',
        },
        {
            href: '/terms',
            label: 'Terms',
        },
        {
            href: '/privacy',
            label: 'Privacy',
        },
    ];
    return (
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-4 p-3 text-center">
            {links.map(link => (
                <Link
                    key={link.label}
                    href={link.href}
                    className="text-muted-foreground text-xs opacity-50 hover:opacity-100 whitespace-nowrap"
                >
                    {link.label}
                </Link>
            ))}
        </div>
    );
};
