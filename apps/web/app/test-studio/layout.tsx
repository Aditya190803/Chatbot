import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gemini Image Studio Test',
  description: 'Test the image generation functionality',
};

export default function TestStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}