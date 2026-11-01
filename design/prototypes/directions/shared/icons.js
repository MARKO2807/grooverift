/* GrooveRift step 3.5: simple stroke icons drawn for the prototypes (24 px grid, currentColor).
   Placeholders until the icon set is chosen in step 3.6. Always decorative: the accessible name comes from text. */
(function () {
  const P = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    home: '<path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    hub: '<path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4 3.5V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M9 10h6M9 13h4"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17 14.2a5.5 5.5 0 0 1 3.5 4.8"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    alert: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10v4M12 16.8v.2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.2"/>',
    edit: '<path d="M5 19h4L19 9l-4-4L5 15z"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
    comment: '<path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4 3.5V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    share: '<path d="M12 4v11M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/>',
    external: '<path d="M8 16L16 8M9.5 8H16v6.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    send: '<path d="M4 12l16-7-6 16-3-6.5z"/>'
  };
  window.GR_ICON = (name, cls) =>
    `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
})();
