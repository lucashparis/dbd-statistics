export interface BanView {
  id: string;
  userId: string;
  name: string | null;
  nick: string | null;
  reason: string;
  createdAt: string;
  // Null while the ban is active; set once an admin lifts it.
  liftedAt: string | null;
  bannedBy: string | null;
}

export interface BannableUser {
  userId: string;
  nick: string;
  name: string | null;
  imageUrl: string | null;
  isBanned: boolean;
}
