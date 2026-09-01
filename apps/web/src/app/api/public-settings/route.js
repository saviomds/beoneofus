import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public endpoint — returns ONLY non-sensitive platform flags. No auth required.
export const dynamic = 'force-dynamic';

const PUBLIC_KEYS = [
  'maintenance_mode',
  'maintenance_message',
  'registration_open',
  'platform_name',
  'platform_version',
  'premium_enabled',
  'show_onboarding',
  'require_email_verification',
];

export async function GET() {
  try {
    const supa = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data } = await supa
      .from('platform_settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS);

    const settings = {};
    for (const row of data || []) settings[row.key] = row.value;

    return NextResponse.json(
      {
        maintenanceMode:          settings.maintenance_mode           ?? false,
        maintenanceMessage:       settings.maintenance_message        ?? 'We\'ll be back shortly.',
        registrationOpen:         settings.registration_open         ?? true,
        premiumEnabled:           settings.premium_enabled            ?? true,
        platformName:             settings.platform_name              ?? 'BeOneOfUs',
        platformVersion:          settings.platform_version           ?? '1.0.0',
        showOnboarding:           settings.show_onboarding            ?? true,
        requireEmailVerification: settings.require_email_verification ?? true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  } catch {
    // On error return safe defaults so the platform keeps running
    return NextResponse.json({
      maintenanceMode:          false,
      maintenanceMessage:       '',
      registrationOpen:         true,
      premiumEnabled:           true,
      platformName:             'BeOneOfUs',
      platformVersion:          '1.0.0',
      showOnboarding:           true,
      requireEmailVerification: true,
    });
  }
}
