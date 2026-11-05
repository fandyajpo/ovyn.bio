import { createAuthClient } from 'better-auth/svelte';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	plugins: [usernameClient()]
});

// Password recovery lives in the core client (email/password is enabled server-side).
export const { signIn, signUp, signOut, useSession, forgotPassword, resetPassword } = authClient;