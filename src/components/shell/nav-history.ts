// How many in-app navigations this tab has made since the app loaded (client only). A full page load starts at
// zero, so "back" knows whether the previous history entry is a page of this app or something else (another site,
// a fresh tab opened from a link). FocusOnNavigate counts; BackLink reads.
let inAppNavigations = 0;

export function countNavigation(): void {
  inAppNavigations += 1;
}

export function hasInAppHistory(): boolean {
  return inAppNavigations > 0;
}
