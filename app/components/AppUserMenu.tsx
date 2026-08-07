type AppUserMenuProps = {
  user: {
    displayName: string;
    email: string;
  };
};

function initialsFor(displayName: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "TB";
}

export function AppUserMenu({ user }: AppUserMenuProps) {
  const initials = initialsFor(user.displayName);

  return (
    <details className="app-user-menu">
      <summary aria-label={`Open account menu for ${user.displayName}`}>
        <span aria-hidden="true" className="app-user-avatar">{initials}</span>
        <span className="app-user-menu-summary">
          <strong>{user.displayName}</strong>
          <small>{user.email}</small>
        </span>
        <span aria-hidden="true" className="app-user-menu-caret" />
      </summary>
      <div className="app-user-menu-popover">
        <div className="app-user-menu-identity">
          <span aria-hidden="true" className="app-user-avatar app-user-avatar-light">{initials}</span>
          <span>
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </span>
        </div>
        <nav aria-label="Account actions">
          {/* Full navigation clears any previous account held by the auth UI client cache. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/account/settings">Settings</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/auth/sign-out">Sign out</a>
        </nav>
      </div>
    </details>
  );
}
