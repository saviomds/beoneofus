/**
 * Returns the best available avatar URL for the current user.
 * Priority: BeOneOfUs uploaded image → Google Auth photo → other OAuth provider photo → null
 * Callers should render a username initial when this returns null.
 */
export function getAvatarSrc(profile, session) {
  return (
    profile?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    session?.user?.user_metadata?.avatar_url ||
    null
  );
}
