import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CampusesClient from './CampusesClient';

export default async function AdminCampusesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch campus locations
    const { data: campuses, error } = await supabase
        .from('campus_locations')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching campus locations:', error);
    }

    return (
        <div className="space-y-8 pb-12">
            <CampusesClient initialCampuses={campuses || []} />
        </div>
    );
}
