'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../app/supabaseClient';

export function usePlatformVersion() {
  const [versionData, setVersionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value, updated_at')
      .eq('key', 'platform_version')
      .maybeSingle()
      .then(({ data }) => {
        setVersionData(data?.value ?? null);
        setLoading(false);
      });
  }, []);

  return { versionData, loading };
}
