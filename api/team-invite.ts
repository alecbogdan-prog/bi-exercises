import { admin, json, siteUrl, teamOwnedBy, userFrom } from './_lib.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_REQUEST = 50;

/**
 * POST /api/team-invite { emails: string[] } (team owner only)
 * Adds colleagues to the owner's team, up to the number of paid seats, and emails new people a sign-in invite.
 * People who already have an account get access the next time they open the site.
 */
export async function POST(req: Request): Promise<Response> {
  const user = await userFrom(req);
  if (!user) return json({ error: 'Please log in first.' }, 401);
  const team = await teamOwnedBy(user.id);
  if (!team) return json({ error: 'Only the team manager can invite people.' }, 403);
  if (!['active', 'trialing', 'past_due'].includes(team.status)) return json({ error: 'This team plan is not active.' }, 409);

  const body = (await req.json().catch(() => ({}))) as { emails?: unknown };
  const raw = Array.isArray(body.emails) ? body.emails : [];
  const emails = [...new Set(raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean))].slice(0, MAX_PER_REQUEST);
  if (!emails.length) return json({ error: 'Add at least one email address.' }, 400);

  const db = admin();
  const { data: members, error } = await db.from('team_members').select('email').eq('team_id', team.id);
  if (error) throw error;
  const existing = new Set((members ?? []).map((m) => String(m.email).toLowerCase()));
  let free = team.seats - existing.size;

  const results: { email: string; status: 'invited' | 'already_member' | 'invalid' | 'no_seats' | 'error'; message?: string }[] = [];
  for (const email of emails) {
    if (!EMAIL.test(email)) {
      results.push({ email, status: 'invalid' });
      continue;
    }
    if (existing.has(email)) {
      results.push({ email, status: 'already_member' });
      continue;
    }
    if (free <= 0) {
      results.push({ email, status: 'no_seats' });
      continue;
    }
    const { error: insertError } = await db.from('team_members').insert({ team_id: team.id, email, role: 'member' });
    if (insertError) {
      results.push({ email, status: 'error', message: insertError.message });
      continue;
    }
    existing.add(email);
    free -= 1;
    // New people get an email with a sign-in link; existing users are linked when they next sign in.
    const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl(req)}/team` });
    const alreadyRegistered = inviteError && /already|registered|exists/i.test(inviteError.message);
    results.push(inviteError && !alreadyRegistered ? { email, status: 'invited', message: `Added, but the invite email failed: ${inviteError.message}` } : { email, status: 'invited' });
  }
  return json({ results, seats: team.seats, used: existing.size });
}
