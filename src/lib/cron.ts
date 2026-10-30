// Scheduled jobs call their routes with "Authorization: Bearer <CRON_SECRET>".
// With no secret set, every call is refused rather than left open.

export function cronAuthorized(header: string | null, secret = process.env.CRON_SECRET): boolean {
  return !!secret && header === `Bearer ${secret}`;
}
