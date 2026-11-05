import { MAIL_FROM, RESEND_API_KEY } from '$app/env/private';

/** Discord accounts without an email use this placeholder domain. */
const PLACEHOLDER_EMAIL_DOMAIN = '@oauth.ovyn.me';

export function isPlaceholderEmail(email: string): boolean {
	return email.endsWith(PLACEHOLDER_EMAIL_DOMAIN);
}

type SendEmailInput = {
	to: string;
	subject: string;
	text: string;
	html: string;
};

/**
 * Sends transactional mail through Resend. Without RESEND_API_KEY the call
 * degrades to a log entry, so verification and password reset never break
 * sign-up or sign-in while mail is not configured yet.
 * https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
	if (isPlaceholderEmail(input.to)) return;
	if (!RESEND_API_KEY || !MAIL_FROM) {
		console.warn(`Mail not configured - skipped "${input.subject}" to ${input.to}`);
		return;
	}

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: MAIL_FROM,
			to: input.to,
			subject: input.subject,
			text: input.text,
			html: input.html
		})
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`Resend rejected the message (${res.status}): ${detail}`);
	}
}
/** Minimal HTML escaping for anything user-controlled inside a template. */
function escapeHtml(value: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};
	return value.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

export type EmailTemplate = {
	subject: string;
	text: string;
	html: string;
};

/**
 * Password-reset mail in ovyn's look: dark surface, lime accent, lowercase
 * mono eyebrows. Plain-HTML/inline-style tables so it survives email clients;
 * the plain-text version carries the same link.
 */
export function passwordResetEmail(input: { name: string; url: string }): EmailTemplate {
	const name = escapeHtml(input.name?.trim() || 'there');
	const url = escapeHtml(input.url);

	const subject = 'Reset your ovyn password';
	const text = [
		`Hey ${input.name?.trim() || 'there'}, back into your corner?`,
		'',
		'Someone (hopefully you) asked to reset the password for this email on ovyn.',
		'Pick a new one within 1 hour:',
		'',
		input.url,
		'',
		"Didn't ask for this? Ignore this email and your password stays as it was.",
		'',
		'— ovyn · make your corner of the internet'
	].join('\n');

	const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#09090b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Back into your corner - reset your ovyn password within the hour.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#131316;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#fafafa;">ovyn<span style="color:#bef264;">.</span></div>
          <div style="margin-top:6px;font-family:'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:0.18em;color:#737373;">password reset</div>
        </td></tr>
        <tr><td style="padding:22px 32px 6px;">
          <h1 style="margin:0;font-family:-apple-system,'Segoe UI',sans-serif;font-size:19px;font-weight:600;color:#fafafa;">Hey ${name}, back into your corner?</h1>
          <p style="margin:12px 0 0;font-family:-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#a3a3a3;">Someone (hopefully you) asked to reset the password for this email on ovyn. Hit the button below and pick a new one.</p>
        </td></tr>
        <tr><td align="center" style="padding:20px 32px 4px;">
          <a href="${url}" style="display:inline-block;background-color:#bef264;color:#0a0a0a;font-family:-apple-system,'Segoe UI',sans-serif;font-size:14px;font-weight:600;padding:13px 26px;border-radius:10px;text-decoration:none;">Reset your password</a>
        </td></tr>
        <tr><td style="padding:16px 32px 26px;">
          <p style="margin:0 0 8px;font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:#737373;">The link only works for 1 hour. If the button misbehaves, paste this into your browser:</p>
          <p style="margin:0;word-break:break-all;font-family:'SFMono-Regular',Menlo,monospace;font-size:11px;"><a href="${url}" style="color:#bef264;text-decoration:none;">${url}</a></p>
        </td></tr>
        <tr><td style="padding:20px 32px 26px;border-top:1px solid #27272a;">
          <p style="margin:0;font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:#737373;">Didn't ask for this? Ignore this email and your password stays exactly as it was.</p>
          <p style="margin:14px 0 0;font-family:'SFMono-Regular',Menlo,monospace;font-size:10px;letter-spacing:0.14em;color:#525252;">make your corner of the internet &middot; ovyn</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

	return { subject, text, html };
}