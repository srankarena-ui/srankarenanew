// A profile's identity is username + a numeric discriminator (Riot-style),
// e.g. "Hydro#214912". Usernames may repeat; the tag is unique.

export function formatTag(username?: string | null, discriminator?: string | null): string {
  if (!username) return "";
  return discriminator ? `${username}#${discriminator}` : username;
}
