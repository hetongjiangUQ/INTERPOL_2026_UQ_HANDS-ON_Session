'use client';
import {SignOut} from './sign-out';
import { usePathname } from 'next/navigation';
import { useWorkshop } from './workshop-provider';
import { PARTICIPANT_FEATURES as features } from '@/lib/participant-features';
export function Header({ instructor = false }: { instructor?: boolean }) {
  const { snapshot } = useWorkshop();
  const pathname = usePathname();
  const c = snapshot?.config;
  return (
    <header className="topbar">
      <a className="brand brand-logos" href="/" aria-label="UQ and UQ Cyber — home">
        <img className="uq-logo" src="/branding/uq-logo.png" alt="The University of Queensland Australia" />
        <img className="uq-cyber-logo" src="/branding/uq-cyber-logo.png" alt="UQ Cyber" />
      </a>
      {pathname !== '/' && pathname !== '/slides' && <nav aria-label="Main navigation">
        <a href="/hands-on" className="lab-nav-button" aria-current={pathname === '/hands-on' ? 'page' : undefined}>Detection lab</a>
        {features.watermark && c?.watermark.enabled && (
          <a href="/steganography" className="lab-nav-button" aria-current={pathname?.replace(/\/$/, '') === '/steganography' ? 'page' : undefined}>Watermark lab</a>
        )}
        {instructor && (
          <a href="/admin" className="instructor-link">
            Instructor
          </a>
        )}
      </nav>}
      {!instructor && pathname !== '/' && pathname !== '/slides' && <SignOut/>}
    </header>
  );
}
