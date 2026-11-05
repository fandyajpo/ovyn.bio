import { createAuthClient } from 'better-auth/svelte';
import { usernameClient } from 'better-auth/client/plugins';
// Type-only import: teaches the client which server methods exist (e.g.
// forgotPassword/resetPassword from emailAndPassword) without bundling
// any server code into the browser.
import type { auth } from '#lib/server/auth';

export const authClient = createAuthClient<typeof auth>({
	plugins: [usernameClient()]
});

// Password recovery lives in the core client (email/password is enabled server-side).
export const { signIn, signUp, signOut, useSession, forgotPassword, resetPassword } = authClient;