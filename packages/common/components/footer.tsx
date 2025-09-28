import Link from 'next/link';

export const Footer = () => {
    const links = [
        {
            href: 'https://github.com/Aditya190803/chatbot',
            label: 'Star us on GitHub',
        },
        {
            href: 'https://github.com/Aditya190803/chatbot',
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
        <div className="flex w-full flex-row items-center justify-center gap-4 p-3">
            {links.map(link => (
                <Link
                    key={link.label}
                    href={link.href}
                    className="text-muted-foreground text-xs opacity-50 hover:opacity-100"
                >
                    {link.label}
                </Link>
            ))}
        </div>
    );
};
