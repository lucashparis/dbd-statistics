export interface ChangelogEntry {
  id: string;
  feature: string;
  date: string;
  description: string;
  requestedBy: string;
  requestedByUserId?: string;
}
