import ProductDetailsSkeleton from './ProductDetailsSkeleton';

/**
 * Loading skeleton for the /marketplace/[id] product details page.
 * Perfectly mirrors the ProductDetailsClient layout to eliminate CLS.
 */
export default function Loading() {
    return <ProductDetailsSkeleton />;
}
