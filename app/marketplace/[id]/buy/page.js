import { createClient } from '../../../../utils/supabase/server';
import CheckoutClient from './CheckoutClient';
import { redirect } from 'next/navigation';

export default async function CheckoutPage({ params }) {
    // Await params for Next.js 15 compatibility
    const { id } = await params;
    const supabase = await createClient();

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?next=/marketplace/${id}/buy`);
    }

    // 2. Fetch Product & Seller
    let product = null;
    let error = null;

    try {
        const { data: prodData, error: prodError } = await supabase
            .from('products')
            .select(`
                *,
                seller:profiles!products_seller_id_fkey (
                    display_name,
                    email,
                    is_verified,
                    average_rating,
                    total_reviews
                )
            `)
            .eq('id', id)
            .single();

        if (prodData && !prodError) {
            product = prodData;
        } else {
            // Fallback for demo products that might not exist in DB
            console.log("Fetching fallback product for", id);
            product = {
                id: id,
                title: "Sample Product - Statistics 101 Textbook",
                price: 45,
                category: "Textbooks",
                image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000",
                buyer_id: null,
                seller_id: "sample-seller",
                seller: {
                    display_name: 'Alex Johnson',
                    is_verified: true
                }
            };
        }
    } catch (err) {
        console.error("Error fetching product:", err);
    }

    if (!product) {
        return <div>Product not found</div>;
    }

    // 3. Fetch Wallet Balance
    let walletBalance = 0.00;
    try {
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single();

        if (wallet) {
            walletBalance = wallet.balance;
        } else {
            // Mock balance for now if user has no wallet record yet
            // or if the table doesn't exist in this environment yet
            walletBalance = 150.00;
        }
    } catch (err) {
        // Table might not exist, ignore
        console.log("Wallet fetch error (expected if table missing):", err.message);
        walletBalance = 52.00; // Mock default from design
    }

    return <CheckoutClient product={product} user={user} walletBalance={walletBalance} />;
}
