// Inline SVG icons (stroke style). Used by the site and the admin dashboard.
const P = {
  tooth: '<path d="M7 3c-2.5 0-4 2-4 4.5 0 2 .8 3.5 1.5 5 .8 1.8 1 4 1.4 6.2.3 1.6.8 2.3 1.6 2.3 1.2 0 1.5-1.6 1.9-3.6.3-1.6.8-2.9 2.6-2.9s2.3 1.3 2.6 2.9c.4 2 .7 3.6 1.9 3.6.8 0 1.3-.7 1.6-2.3.4-2.2.6-4.4 1.4-6.2.7-1.5 1.5-3 1.5-5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.4 2.3 4 2.3s3-.8 4-2.3"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  implant: '<path d="M8 3h8l-1 5H9z"/><path d="M9.5 8h5"/><path d="M10 10.5h4M10 13h4M10.5 15.5h3M11 18h2"/><path d="M12 18v3"/>',
  braces: '<path d="M3 9c3 2 6 3 9 3s6-1 9-3"/><rect x="5" y="10" width="3" height="4" rx="1"/><rect x="10.5" y="11" width="3" height="4" rx="1"/><rect x="16" y="10" width="3" height="4" rx="1"/><path d="M3 12c3 2 6 3 9 3s6-1 9-3"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z"/>',
  child: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0112 0v3"/>',
  xray: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9c0 3 1 6 4 6s4-3 4-6"/><path d="M12 9v6"/>',
  scalpel: '<path d="M4 20l9-9 3 3-9 9z"/><path d="M13 11l6-6a2 2 0 013 3l-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  chat: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.6-1.7"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/>',
  arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0114 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 015 5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>',
  quote: '<path d="M10 7H6a2 2 0 00-2 2v3a2 2 0 002 2h2v1a3 3 0 01-3 3M20 7h-4a2 2 0 00-2 2v3a2 2 0 002 2h2v1a3 3 0 01-3 3"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5"/><path d="M14 3c.5 2.5 2.5 4.5 5 4.5"/>',
  snapchat: '<path d="M12 3c3 0 5 2.2 5 5v3l2 .5-1.5 1.5c.5 1.5 2 2.5 3.5 3-1.2.8-2.7.8-3.5 1.5-.5 1-1 1.5-2.5 1.2-1.3-.3-2 .8-3 .8s-1.7-1.1-3-.8C7.5 19 7 18.5 6.5 17.5 5.7 16.8 4.2 16.8 3 16c1.5-.5 3-1.5 3.5-3L5 11.5 7 11V8c0-2.8 2-5 5-5z"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
  whatsapp: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4.2-1.1z"/><path d="M9 8.5c0 3 2.5 6.5 6.5 6.5l1-1.5-2-1-1 1c-1-.5-2.5-2-3-3l1-1-1-2z"/>',
};

export const ICON_NAMES = ['tooth', 'sparkle', 'smile', 'implant', 'braces', 'shield', 'crown', 'heart', 'child', 'xray', 'scalpel'];

export function icon(name, cls = '') {
  const body = P[name] || P.tooth;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
