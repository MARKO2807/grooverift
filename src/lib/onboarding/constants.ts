// Names shared by the auth hooks, the cookie helpers and the tests (no server-only import here).
export const INVITE_COOKIE = "gr_invite";
export const ADULT_COOKIE = "gr_join_adult";
export const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24; // the link can simply be opened again after a day
