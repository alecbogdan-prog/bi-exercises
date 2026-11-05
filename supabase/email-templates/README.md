# Supabase email templates

Paste each file into Supabase → Authentication → Emails → Templates (the "Message body" field):

| File | Template | Subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirm your email for Power BI Exercises |
| `magic-link.html` | Magic Link | Your Power BI Exercises sign-in link |
| `change-email.html` | Change Email Address | Confirm your new email for Power BI Exercises |

`{{ .ConfirmationURL }}` and `{{ .NewEmail }}` are filled in by Supabase.
