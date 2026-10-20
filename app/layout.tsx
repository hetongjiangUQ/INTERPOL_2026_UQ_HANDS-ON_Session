import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import {WorkshopProvider} from '@/components/workshop-provider';
import {ParticipantAccessGate} from '@/components/participant-access-gate';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Evidence Lab | Deepfake training', description: 'Deepfake detection quizzes: inspect media and compare detector results.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ParticipantAccessGate>
          <WorkshopProvider>{children}</WorkshopProvider>
        </ParticipantAccessGate>
      </body>
    </html>
  );
}

