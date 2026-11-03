export type PageHelp = { title: string; summary: string; tips: string[] };

const PAGES: { match: string; help: PageHelp }[] = [
	{
		match: '/account/analytics',
		help: {
			title: 'Analytics',
			summary: 'Who stopped by your page, counted once per signed-in visitor per day.',
			tips: [
				'Views from signed-out visitors are not counted, so the number is people, not bots.',
				'Private visitors are never identified, only counted.',
				'The window is the last 30 days.'
			]
		}
	},
	{
		match: '/account/badges',
		help: {
			title: 'Badges',
			summary: 'The small marks that sit next to your name on your page.',
			tips: ['Badges come from cosmetics you own and equip in profile settings.', 'Every badge is optional, so you can show none.']
		}
	},
	{
		match: '/account/settings',
		help: {
			title: 'Account settings',
			summary: 'Your sign-in details, notifications and the account-level switches.',
			tips: ['Notification preferences are per device.', 'Changing your username also changes your page link.']
		}
	},
	{
		match: '/account',
		help: {
			title: 'Your overview',
			summary: 'The home base: your page, your circle, your plan and the shortcuts you use most.',
			tips: [
				'Copy your link from here and share it anywhere.',
				'The sidebar keeps the same sections on every screen.',
				'Platform admins see the admin entry here, never in the public navigation.'
			]
		}
	},
	{
		match: '/customize',
		help: {
			title: 'Customize your page',
			summary: 'Colours, background, cover, audio and cursor for your public page.',
			tips: [
				'Uploads are optimised in your browser before they are stored.',
				'Replacing a file deletes the old one, so nothing piles up.',
				'Uploads never autoplay: visitors choose when to play audio.'
			]
		}
	},
	{
		match: '/links',
		help: {
			title: 'Links',
			summary: 'The buttons that appear under your bio, in the order you set.',
			tips: ['Pick a platform and paste your profile link.', 'Any link you added can be edited or removed later.', 'Drag the handle to reorder your links.', 'Email and crypto addresses are supported.', 'Links are checked before they go public.']
		}
	},
	{
		match: '/templates',
		help: {
			title: 'Templates',
			summary: 'Page layouts built from blocks, which you can apply to your own page.',
			tips: [
				'Build a layout with headings, text, grids, lists, code and embeds.',
				'Keep it private or share it in the community gallery.',
				'Applying one copies its theme and blocks to your page.'
			]
		}
	},
	{
		match: '/upgrade',
		help: {
			title: 'Plans',
			summary: 'What Free includes, and what Premium adds for Rp 30.000 a month.',
			tips: [
				'Premium runs 30 days per payment and never charges automatically.',
				'Access is worked out on the server from your payment records.',
				'Renewing is manual, whenever you decide to.'
			]
		}
	},
	{
		match: '/settings/profile',
		help: {
			title: 'Profile details',
			summary: 'The name, username, bio, picture and visibility of your page.',
			tips: [
				'Your username is your public link, so pick one you like.',
				'A private page keeps everything hidden from visitors.',
				'The picture here is the one shown everywhere on ovyn.',
				'Frames, wallpapers and badges are chosen from dropdowns.'
			]
		}
	},
	{
		match: '/dashboard',
		help: {
			title: 'Activity',
			summary: 'Check in, collect points and see what is waiting on your account.',
			tips: ['One check-in per day, counted in UTC.', 'Every seventh day in a row adds a bonus.', 'Points redeem cosmetics in the shop.']
		}
	},
	{
		match: '/guild',
		help: {
			title: 'Your circle',
			summary: 'One circle per account: the people you keep close on ovyn.',
			tips: ['You can create a circle or join a public one.', 'Owners manage settings, officers manage members.', 'Leaving needs a different owner if you run it.']
		}
	},
	{
		match: '/discover',
		help: {
			title: 'Discover',
			summary: 'Public circles you can browse and join.',
			tips: ['Private circles need an invitation.', 'Join with one click if you are not in a circle yet.', 'Search by name to narrow the list.']
		}
	},
	{
		match: '/shop',
		help: {
			title: 'Shop',
			summary: 'Cosmetics: frames, wallpapers and badges for your page.',
			tips: ['Buy with a payment or redeem with points.', 'Owned items are equipped from profile settings.', 'Limited drops have a stock cap and a closing date.']
		}
	},
	{
		match: '/billing',
		help: {
			title: 'Billing',
			summary: 'Your orders, payment codes and payment history.',
			tips: ['Payments are confirmed by DOKU, never by the browser.', 'Open an order to see its virtual account number.', 'History keeps every past order.']
		}
	},
	{
		match: '/admin',
		help: {
			title: 'Admin',
			summary: 'Platform tools: catalog, orders, plans and analytics.',
			tips: ['Only accounts listed in the admin settings can open this area.', 'Products are deactivated rather than deleted.', 'Plan changes here override what an account actually bought.']
		}
	},
	{
		match: '/help',
		help: {
			title: 'Help',
			summary: 'Short answers about how ovyn works.',
			tips: ['The question mark on any page explains that page.', 'Still stuck? Reach out from the account menu.']
		}
	}
];

/** The longest matching page wins, so nested pages can have their own help. */
export function helpForPath(pathname: string): PageHelp | null {
	const entry = [...PAGES]
		.sort((a, b) => b.match.length - a.match.length)
		.find((page) => pathname === page.match || pathname.startsWith(`${page.match}/`));
	return entry?.help ?? null;
}
