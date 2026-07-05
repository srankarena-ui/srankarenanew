// A profile's identity is username + a numeric discriminator (Riot-style),
// e.g. "Hydro#214912". Usernames may repeat; the tag is unique.

export function formatTag(username?: string | null, discriminator?: string | null): string {
  if (!username) return "";
  return discriminator ? `${username}#${discriminator}` : username;
}

// URL-safe form of the tag, e.g. "Hydro-958338". Usernames never contain "-"
// (validated as ^[a-zA-Z0-9_]+$), so the last "-" always separates it cleanly.
export function formatProfileSlug(username?: string | null, discriminator?: string | null): string {
  if (!username) return "";
  return discriminator ? `${username}-${discriminator}` : username;
}
