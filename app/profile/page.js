import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const [profileRes, listingsRes, walletRes, followersRes, followingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', user.id),
        supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    const initialData = {
        user,
        profile: profileRes.data,
        wallet: walletRes.data,
        stats: {
            listings: listingsRes.count || 0,
            reviews: profileRes.data?.average_rating || 0,
            followers: followersRes.count || 0,
            following: followingRes.count || 0,
        },
    };

    return <ProfileClient initialData={initialData} />;
}

