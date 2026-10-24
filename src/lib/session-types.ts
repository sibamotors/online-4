/** The logged-in user as the browser sees it (never contains secrets). */
export type LocalUser = {
  username: string;
  displayName: string;
  role: string;
  /** Has admin powers: the system admin or a level-2 admin. */
  isAdmin: boolean;
  /** The system admin only (can manage other admins, import backups). */
  isSuperAdmin?: boolean;
  /** A level-2 admin (below the system admin). */
  isDeputy?: boolean;
  pinEnabled?: boolean;
  mustChangePassword?: boolean;
  /** Changes whenever the profile picture changes (null = no picture). */
  avatarVersion?: number | null;
  /** Last time the user's browser pinged the server (ISO), for the "online" dot. */
  lastSeenAt?: string | null;
};
