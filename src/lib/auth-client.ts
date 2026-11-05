import { createAuthClient } from 'better-auth/svelte';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	plugins: [usernameClient()]
});

// Email/password methods live in the core client. In v1.7.15 they follow the
// endpoint paths: forgotPassword is `requestPasswordReset` (/request-password-reset)
// and completing a reset is `resetPassword` (/reset-password).
export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } = authClient;