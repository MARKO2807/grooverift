"use client";

import "./globals.css";

/**
 * SYS-02 when even the root layout failed: no message catalogue is available here, so the page carries both
 * languages (Croatian first, Master Prompt §2). No technical details.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="hr">
      <body>
        <div className="bare-shell">
          <main id="main" className="screen">
            <div className="sys-na">
              <h1>Nešto je pošlo po zlu</h1>
              <p className="lead">Stranica se nije učitala. Nije do tebe.</p>
              <p className="lead" lang="en">
                Something went wrong. The page did not load. It&apos;s not you.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => reset()}>
                Pokušaj ponovno <span lang="en">/ Try again</span>
              </button>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
