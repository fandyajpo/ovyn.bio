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