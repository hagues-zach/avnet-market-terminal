import { TEST_PROFILES, type BriefProfile } from "./profile";

// Whose brief the page shows. Until SSO exists there are no users, so the brief
// is built for one of the test profiles, chosen with a picker that only shows in
// development (or with BRIEF_TEST_PROFILES=on, for the password-gated demo).
//
// Phase B5 seam: on the Avnet machine, replace the body of currentBriefProfile
// with a lookup of the signed-in user's row in brief_profiles (Oracle, row-level
// security keyed on the SSO subject), and drop the picker. Nothing else changes:
// the page and the audio route both go through this function. Server-only.

export function testProfilesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.BRIEF_TEST_PROFILES === "on";
}

export interface CurrentProfile {
  /** null: no profile for this visitor (production without SSO, or not onboarded yet). */
  profile: BriefProfile | null;
  /** The test profiles to choose from, when the dev-only picker shows. */
  choices: { id: string; role: string }[] | null;
}

/** The brief profile for this request. `requested` is the picker's choice (?brief=…), honored only for test profiles. */
export async function currentBriefProfile(requested?: string): Promise<CurrentProfile> {
  if (!testProfilesEnabled()) return { profile: null, choices: null };
  const profile = TEST_PROFILES.find((p) => p.id === requested) ?? TEST_PROFILES[0];
  return { profile, choices: TEST_PROFILES.map((p) => ({ id: p.id, role: p.role })) };
}
