/**
 * sitemap.js — Next.js App Router sitemap generation.
 *
 * Static pages are listed directly.
 * Dynamic product pages are fetched from Supabase at build/revalidation time.
 *
 * Revalidates every 12 hours so new listings appear in the sitemap promptly
 * without hammering the database on every request.
 */
import { createClient } from '@supabase/supabase-js';

export const revalidate = 43200; // 12 hours

export default async function sitemap() {
    const baseUrl = 'https://www.kart.cx';

    // Static public pages
    const staticPages = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${baseUrl}/marketplace/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${baseUrl}/safety`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ];

    // Dynamic product listing pages
    let productPages = [];
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ldenazbzeidskjbqjxwe.supabase.co';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: products } = await supabase
            .from('products')
            .select('id, updated_at')
            .eq('status', 'Active')
            .order('updated_at', { ascending: false })
            .limit(50000); // Support indexing of up to 50,000 active listings

        if (products) {
            productPages = products.map((p) => ({
                url: `${baseUrl}/marketplace/${p.id}`,
                lastModified: new Date(p.updated_at || new Date()),
                changeFrequency: 'daily',
                priority: 0.8,
            }));
        }
    } catch (err) {
        // Non-fatal: sitemap still works without product pages
        console.error('Sitemap: failed to fetch product pages:', err);
    }

    return [...staticPages, ...productPages];
}
