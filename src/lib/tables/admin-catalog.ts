import {
	columnFilteringFeature,
	createColumnHelper,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_includesString,
	rowPaginationFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	tableFeatures
} from '@tanstack/svelte-table';
import { formatDay } from '#lib/utils/date';

/** The admin catalog row, as returned by `listAdminProducts`. */
export type CatalogRow = {
	product: {
		id: string;
		name: string;
		description: string | null;
		price: number;
		active: boolean;
		category: 'plan' | 'cosmetic';
		durationDays: number | null;
		updatedAt: Date | string;
	};
	cosmetic: {
		kind: 'frame' | 'wallpaper' | 'badge';
		pointsPrice: number | null;
		stockLimit: number | null;
		dropEndsAt: Date | string | null;
	} | null;
};

const KIND_LABEL = { frame: 'Avatar frame', wallpaper: 'Wallpaper', badge: 'Badge' } as const;

export function typeLabel(row: CatalogRow) {
	if (row.product.category === 'plan') return 'Premium monthly';
	return row.cosmetic ? KIND_LABEL[row.cosmetic.kind] : 'Cosmetic';
}

export function availability(row: CatalogRow) {
	if (row.product.category === 'plan') return '30 days of access';
	if (!row.cosmetic) return 'Details missing';
	const parts = [
		row.cosmetic.stockLimit === null ? 'Unlimited stock' : `${row.cosmetic.stockLimit} in stock`
	];
	if (row.cosmetic.pointsPrice !== null) parts.push(`${row.cosmetic.pointsPrice} points`);
	if (row.cosmetic.dropEndsAt) parts.push(`ends ${formatDay(row.cosmetic.dropEndsAt)}`);
	return parts.join(' · ');
}

/**
 * Static feature set: sorting, filtering and pagination are done in the browser
 * because the admin catalog is a small, fully loaded collection.
 */
export const catalogTableFeatures = tableFeatures({
	columnFilteringFeature,
	rowSortingFeature,
	rowPaginationFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: { includesString: filterFn_includesString },
	sortFns: { alphanumeric: sortFn_alphanumeric }
});

const columnHelper = createColumnHelper<typeof catalogTableFeatures, CatalogRow>();

/** Headless column definitions: the page keeps all of the markup and styling. */
export const catalogColumns = [
	columnHelper.accessor((row) => row.product.name, {
		id: 'product',
		header: 'Product',
		filterFn: 'includesString',
		sortFn: 'alphanumeric'
	}),
	columnHelper.accessor((row) => typeLabel(row), {
		id: 'type',
		header: 'Type',
		sortFn: 'alphanumeric'
	}),
	columnHelper.accessor((row) => row.product.price, {
		id: 'price',
		header: 'Price',
		enableSorting: false
	}),
	columnHelper.accessor((row) => availability(row), {
		id: 'availability',
		header: 'Availability',
		enableSorting: false
	}),
	columnHelper.accessor((row) => (row.product.active ? 'active' : 'inactive'), {
		id: 'status',
		header: 'Status',
		sortFn: 'alphanumeric'
	}),
	columnHelper.accessor((row) => row.product.updatedAt, {
		id: 'updated',
		header: 'Updated',
		enableSorting: false
	})
];
