import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gemini Image Studio',
  description: 'Generate and edit images with AI',
};

export default function ImageStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}