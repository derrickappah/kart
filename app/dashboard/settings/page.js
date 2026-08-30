import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';
import { formatToInternationalPhone } from '@/utils/phoneUtils';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile data and support settings in parallel
  const [{ data: profile }, { data: supportSetting }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('platform_settings').select('value').eq('key', 'whatsapp_support_number').maybeSingle(),
  ]);

  let whatsappSupportNumber = '+233500502158';
  try {
    if (supportSetting?.value) {
      const parsed = JSON.parse(supportSetting.value);
      whatsappSupportNumber = formatToInternationalPhone(String(parsed)) || '+233500502158';
    }
  } catch (e) {
    // use default
  }

  return (
    <SettingsClient initialProfile={profile} initialUser={user} whatsappSupportNumber={whatsappSupportNumber} />
  );
}
