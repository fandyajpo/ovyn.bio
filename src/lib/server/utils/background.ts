type WaitUntil = (promise: Promise<unknown>) => void;

/**
 * Keeps a non-critical write (an analytics counter, for example) off the
 * response path. On Vercel the request carries `waitUntil`, which runs the work
 * after the response is sent; elsewhere the promise is awaited so it still
 * finishes, and a failure is logged instead of failing the page.
 */
export async function runInBackground(event: { platform: unknown }, work: Promise<unknown>): Promise<void> {
	const handled = work.catch((err) => {
		console.error('Background task failed', err);
	});

	const context = (event.platform as { context?: { waitUntil?: WaitUntil } } | undefined)?.context;
	if (typeof context?.waitUntil === 'function') {
		context.waitUntil(handled);
		return;
	}

	await handled;
}
