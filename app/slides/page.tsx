import { Header } from '@/components/header';

export default function Slides() {
  return (
    <>
      <Header />
      <main className="page landing-page">
        <p className="eyebrow">DEEPFAKE DETECTION · RESOURCES</p>
        <h1>Slides</h1>
        <section className="panel narrow">
          <p>Download the presentation as a PowerPoint file (33 MB).</p>
          <a
            className="primary inline"
            href="/api/slides/download"
            download="UQ_Deepfake_Slide.pptx"
          >
            Download slides (.pptx)
          </a>
        </section>
      </main>
    </>
  );
}
