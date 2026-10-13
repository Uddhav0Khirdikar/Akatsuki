import React from 'react';

/**
 * Authentic Ninja Era Artifacts & Shinobi Assets
 * Replaces modern UI controls with feudal Shinobi weaponry, sealing scrolls, and artifacts.
 */

// 1. Wooden Scroll Spindle Rod (Makimono roller with antique brass ferrules & silk tassels)
export function ScrollRod({ position = 'top' }: { position?: 'top' | 'bottom' }) {
  return (
    <div className={`scroll-rod scroll-rod-${position}`} aria-hidden="true">
      <div className="rod-finial rod-finial-left" />
      <div className="rod-core">
        <div className="rod-grain" />
        <div className="rod-band rod-band-left" />
        <div className="rod-band rod-band-right" />
      </div>
      <div className="rod-finial rod-finial-right" />
      <div className="rod-tassel rod-tassel-left" />
      <div className="rod-tassel rod-tassel-right" />
    </div>
  );
}

// 2. Shinobi Rogue Forehead Protector Plate (Nukenin Hitai-ate with etched rogue slash)
export function ShinobiHeadband({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size * 1.5}
      height={size}
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shinobi-headband ${className}`}
      aria-hidden="true"
    >
      {/* Curved steel plate */}
      <rect x="2" y="3" width="32" height="18" rx="3" fill="#1f1c24" stroke="#a38292" strokeWidth="1.2" />
      <rect x="4" y="5" width="28" height="14" rx="2" fill="#141118" stroke="#e53955" strokeWidth="0.6" strokeOpacity="0.4" />
      {/* Rivets */}
      <circle cx="5" cy="7" r="1" fill="#c49dae" />
      <circle cx="31" cy="7" r="1" fill="#c49dae" />
      <circle cx="5" cy="17" r="1" fill="#c49dae" />
      <circle cx="31" cy="17" r="1" fill="#c49dae" />
      {/* Spiral leaf village insignia with deep rogue scratch */}
      <path d="M18 8c-3 0-5 2-5 4 0 3 3 4 5 4 1.5 0 2.5-.5 3-1.5" stroke="#e04060" strokeWidth="1.2" strokeLinecap="round" />
      {/* Deep horizontal rogue slash (Akatsuki defector mark) */}
      <line x1="8" y1="12" x2="28" y2="12" stroke="#ff2a4b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 3. Shinobi Steel Kunai Dagger
export function KunaiIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`kunai-icon ${className}`}
      aria-hidden="true"
    >
      {/* Blade */}
      <path d="M12 2L15 8L13 14H11L9 8L12 2Z" fill="#2d222b" stroke="#e04b68" strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="13" stroke="#f68b9f" strokeWidth="0.8" opacity="0.6" />
      {/* Handle with wrapped cloth */}
      <rect x="11" y="14" width="2" height="5" fill="#e53955" />
      <line x1="10.5" y1="15" x2="13.5" y2="15" stroke="#fce7ec" strokeWidth="0.6" />
      <line x1="10.5" y1="17" x2="13.5" y2="17" stroke="#fce7ec" strokeWidth="0.6" />
      {/* Pommel ring */}
      <circle cx="12" cy="20.5" r="2" fill="none" stroke="#d6405c" strokeWidth="1.2" />
    </svg>
  );
}

// 4. Shinobi 4-Point Shuriken Star
export function ShurikenIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shuriken-icon ${className}`}
      aria-hidden="true"
    >
      <path
        d="M12 2L14 9L21 7L15 12L22 17L15 15L12 22L9 15L2 17L9 12L3 7L10 9L12 2Z"
        fill="#211a24"
        stroke="#e53955"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="#0c0910" stroke="#f68b9f" strokeWidth="1" />
    </svg>
  );
}

// 5. Sharingan Eye / Dojutsu Vision (Replaces modern eye toggle)
export function SharinganEye({ active = false, size = 18 }: { active?: boolean; size?: number }) {
  if (active) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="sharingan-eye active-sharingan"
        aria-hidden="true"
      >
        {/* Eye contour */}
        <path d="M2 12C4.5 7 8.5 4 12 4C15.5 4 19.5 7 22 12C19.5 17 15.5 20 12 20C8.5 20 4.5 17 2 12Z" stroke="#ff385c" strokeWidth="1.4" />
        {/* Crimson Sharingan Iris */}
        <circle cx="12" cy="12" r="5.5" fill="#d01438" stroke="#ff4d6d" strokeWidth="1" />
        {/* Pupil */}
        <circle cx="12" cy="12" r="1.8" fill="#120408" />
        {/* 3 Tomoe marks */}
        <circle cx="12" cy="8.2" r="0.9" fill="#120408" />
        <circle cx="8.8" cy="13.8" r="0.9" fill="#120408" />
        <circle cx="15.2" cy="13.8" r="0.9" fill="#120408" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="sharingan-eye dormant-eye"
      aria-hidden="true"
    >
      <path d="M2 12C4.5 7 8.5 4 12 4C15.5 4 19.5 7 22 12C19.5 17 15.5 20 12 20C8.5 20 4.5 17 2 12Z" stroke="#79677e" strokeWidth="1.2" />
      <line x1="3" y1="3" x2="21" y2="21" stroke="#e04060" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// 6. Fuinjutsu Sealing Talisman Tag (Ancient Ofuda with calligraphy '封' seal)
export function SealingTag({ text = '封印' }: { text?: string }) {
  return (
    <div className="sealing-ofuda" aria-hidden="true">
      <div className="ofuda-header">
        <span className="ofuda-flame">▲</span>
        <span className="ofuda-kanji">{text}</span>
        <span className="ofuda-flame">▼</span>
      </div>
    </div>
  );
}

// 7. Akatsuki Blood Contract Seal Stamp (Hanko seal: 暁)
export function HankoBloodSeal({ size = 38 }: { size?: number }) {
  return (
    <div className="hanko-blood-seal" style={{ width: size, height: size }} aria-hidden="true">
      <span>暁</span>
    </div>
  );
}

// 8. Sealing Array Runes (Fuinjutsu border markings)
export function ScrollBorders() {
  return (
    <div className="scroll-fuin-borders" aria-hidden="true">
      <div className="fuin-side fuin-left">
        <span>封</span>
        <span>印</span>
        <span>術</span>
        <span>式</span>
        <span>朱</span>
        <span>雀</span>
        <span>零</span>
      </div>
      <div className="fuin-side fuin-right">
        <span>北</span>
        <span>斗</span>
        <span>三</span>
        <span>台</span>
        <span>玉</span>
        <span>女</span>
        <span>青</span>
      </div>
    </div>
  );
}

// 9. Miniature Rolled Makimono Scroll (for navigation / links)
export function MakimonoScrollIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="makimono-icon"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#201524" stroke="#e04060" strokeWidth="1.2" />
      <line x1="7" y1="6" x2="7" y2="18" stroke="#a47a8c" strokeWidth="1" strokeDasharray="2 1" />
      <line x1="17" y1="6" x2="17" y2="18" stroke="#a47a8c" strokeWidth="1" strokeDasharray="2 1" />
      <circle cx="12" cy="12" r="2" fill="#d92248" />
    </svg>
  );
}

// 10. Chakra / Shuriken Spinner for Pending State
export function ChakraSpinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="chakra-spinner"
      aria-hidden="true"
    >
      <path
        d="M12 2L14 9L21 7L15 12L22 17L15 15L12 22L9 15L2 17L9 12L3 7L10 9L12 2Z"
        fill="#ff2a55"
        stroke="#ffaac0"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="#1b0c16" stroke="#fff" strokeWidth="0.8" />
    </svg>
  );
}
