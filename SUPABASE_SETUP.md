# Enable recoverable Notes

The app's local vault is password-encrypted. Existing local notes need their old
password once to be read and migrated. A forgotten password cannot decrypt them.

## 1. Create the protected notes table

1. Open your Supabase project.
2. Go to **SQL Editor** → **New query**.
3. Paste and run [`supabase/schema.sql`](supabase/schema.sql).

The policies in this file ensure that an authenticated user can access only rows
whose `owner_id` is their own Supabase user ID.

## 2. Send an OTP instead of a Sign in link

1. Go to **Authentication** → **Email Templates** → **Magic Link**.
2. Replace the message content with:

```html
<h2>Your Notes verification code</h2>
<p>Enter this code in MarkWay:</p>
<h1>{{ .Token }}</h1>
<p>This code expires soon. Do not share it.</p>
```

3. Save the template. Do not use `{{ .ConfirmationURL }}` in this template;
   that variable creates the Sign in link.

## 3. Configure email delivery

1. Go to **Project Settings** → **Auth** → **SMTP Settings**.
2. Configure a production sender such as Resend, Brevo, or SendGrid.
3. In **Authentication** → **URL Configuration**, add your local and production
   app URLs, for example `http://localhost:5173` and your deployed HTTPS URL.

## 4. Migrate existing local notes

1. Unlock the existing Notes vault using its old password.
2. Verify the user's email OTP.
3. Upload each unlocked note to `private_notes` for the authenticated user.
4. Confirm the notes load from Supabase before deleting any local copy.

After migration, password reset can authenticate the user by email OTP and load
the same notes from Supabase. Never add a Supabase `service_role` key to `.env`
or browser code; the public anon/publishable key is sufficient with RLS.
