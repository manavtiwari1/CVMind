// A college invitation's token waits in sessionStorage while the student signs in (OAuth sign-in
// leaves the page); after sign-in App sends them back to /college-invite
export const COLLEGE_INVITE_KEY = 'cvmind_college_invite';

export function pendingCollegeInvite(): string | null {
  try {
    return sessionStorage.getItem(COLLEGE_INVITE_KEY);
  } catch {
    return null;
  }
}
