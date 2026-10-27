import { Header } from '@/components/header';

export default function Home() {
  return (
    <>
      <Header />
      <main className="page landing-page">
        <p className="eyebrow">DEEPFAKE DETECTION · RESOURCES</p>
        <h1>Explore the session</h1>
        <p className="lede">Choose where you would like to start.</p>
        <div className="landing-options">
          <a className="landing-option" href="/hands-on">
            <span className="landing-option-title">Hands-on session website</span>
            <span>Explore the quizzes and inspection tools</span>
          </a>
          <a className="landing-option" href="/slides">
            <span className="landing-option-title">Slides</span>
            <span>Download the presentation</span>
          </a>
        </div>
        <div className="landing-resources">
          <p>
            Source code:{' '}
            <a
              href="https://github.com/hetongjiangUQ/INTERPOL_2026_UQ_HANDS-ON_Session"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
          </p>
          <p>
            Contact: <a href="mailto:hetong.jiang@uq.edu.au">hetong.jiang@uq.edu.au</a>
          </p>
        </div>
      </main>
    </>
  );
}
