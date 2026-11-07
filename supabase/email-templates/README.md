# Supabase email templates

Paste each file into Supabase → Authentication → Emails → Templates (the "Message body" field):

| File | Template | Subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirm your email for Power BI Exercises |
| `magic-link.html` | Magic Link | Your Power BI Exercises sign-in link |
| `invite-user.html` | Invite user | You're invited to Power BI Exercises |
| `change-email.html` | Change Email Address | Confirm your new email for Power BI Exercises |

`{{ .SiteURL }}`, `{{ .TokenHash }}`, `{{ .RedirectTo }}` and `{{ .NewEmail }}` are filled in by Supabase.

The links point at our own domain (`https://powerbiexercise.com/auth/confirm?token_hash=…&type=…&next=…`), not at the
Supabase project URL. `src/pages/AuthConfirmPage.tsx` verifies the token with `verifyOtp` and continues to `next`.
This needs Site URL = `https://powerbiexercise.com` in Authentication → URL Configuration.
