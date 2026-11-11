/** The open G doubles as a rising route through three landscape contours. */
export function GradScapeMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M37 11.5A18 18 0 1 0 41 29H25"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="square"
      />
      <path
        d="M18 16.5A10 10 0 0 0 17.5 32M23 19A5.5 5.5 0 0 0 21 26"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M32 8H42V18" stroke="currentColor" strokeWidth="5" />
      <path d="M29 21L41 9" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}
export function Brand() {
  return (
    <>
      <GradScapeMark className="brand-mark" />
      <span className="brand-word">
        Grad<span>Scape</span>
        <i aria-hidden="true">✳</i>
      </span>
    </>
  );
}

export function IntakeIllustration() {
  return (
    <div className="intake-illustration" aria-hidden="true">
      <svg className="contour-art" viewBox="0 0 460 250" fill="none">
        <path d="M-15 220C100 220 14 15 170 25C318 35 186 270 380 205C440 185 420 100 500 115" />
        <path d="M-15 235C115 235 29 30 170 40C303 50 201 285 395 220C455 200 435 115 515 130" />
        <path d="M-15 250C130 250 44 45 170 55C288 65 216 300 410 235C470 215 450 130 530 145" />
        <path d="M-15 265C145 265 59 60 170 70C273 80 231 315 425 250" />
      </svg>
      <div className="intake-ticket">
        <div className="ticket-top">
          <span>THE INTAKE EDIT</span>
          <ArrowGlyph />
        </div>
        <div className="ticket-year">
          20<span>27</span>
          <i>↗</i>
        </div>
        <div className="ticket-months">
          <span>
            FEB <b>○</b>
          </span>
          <span>
            MAR <b>●</b>
          </span>
          <span>
            JUL <b>○</b>
          </span>
        </div>
        <div className="ticket-bottom">
          <span>COURSE → CAMPUS → YOU</span>
          <span>001 / NZ</span>
        </div>
      </div>
      <div className="edition-stamp">
        <span>NEW ZEALAND</span>
        <b>
          START
          <br />
          HERE ↗
        </b>
        <span>THE FIRST EDITION</span>
      </div>
    </div>
  );
}
function ArrowGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 16L16 4M5 4H16V15" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
