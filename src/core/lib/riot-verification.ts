import type { RiotVerificationChallenge } from "@/core/types";

// Low profile icon IDs are a stable default pool and can be swapped later
// if the project decides to use a curated set.
export const RIOT_VERIFICATION_TARGET_ICON_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29,
] as const;

function hashVerificationSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function getRiotVerificationTargetIconId(challenge: Pick<RiotVerificationChallenge, "created_at" | "initial_profile_icon_id" | "puuid" | "user_id">) {
  const availableTargets = RIOT_VERIFICATION_TARGET_ICON_IDS.filter(
    (iconId) => iconId !== challenge.initial_profile_icon_id,
  );

  if (availableTargets.length === 0) {
    return challenge.initial_profile_icon_id;
  }

  const seed = `${challenge.user_id}:${challenge.puuid}:${challenge.created_at}:${challenge.initial_profile_icon_id}`;
  const targetIndex = hashVerificationSeed(seed) % availableTargets.length;
  return availableTargets[targetIndex];
}