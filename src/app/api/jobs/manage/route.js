import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabase(cookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

async function getUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// GET /api/jobs/manage — user's jobs with applicant counts
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabase(cookieStore);
    const user = await getUser(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [jobsRes, appsRes, profileRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, company, department, status, type, location, salary, tags, description, requirements, experience_level, views, featured, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('job_applications')
        .select('job_id, status'),
      supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single(),
    ]);

    if (jobsRes.error) throw jobsRes.error;

    const allApps = appsRes.data || [];
    const posterName = profileRes.data?.full_name || profileRes.data?.username || 'You';

    const jobs = (jobsRes.data || []).map((job) => {
      const apps = allApps.filter((a) => Number(a.job_id) === Number(job.id));
      return {
        ...job,
        applicants:  apps.length,
        shortlisted: apps.filter((a) => ['reviewing', 'interview', 'offered'].includes(a.status)).length,
        rejected:    apps.filter((a) => a.status === 'rejected').length,
        skills:      job.tags || [],
        posted_by:   posterName,
      };
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error('[jobs/manage GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/jobs/manage — create a job
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabase(cookieStore);
    const user = await getUser(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, company, department, type, location, salary, description, requirements, skills, status, experience_level, image_url, featured } = body;

    if (!title?.trim())   return NextResponse.json({ error: 'title is required' },   { status: 400 });
    if (!company?.trim()) return NextResponse.json({ error: 'company is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        title:            title.trim(),
        company:          company.trim(),
        department:       department?.trim() || null,
        type:             type || 'Full-time',
        location:         location?.trim() || null,
        salary:           salary?.trim() || null,
        description:      description?.trim() || null,
        requirements:     Array.isArray(requirements) ? requirements : [],
        tags:             Array.isArray(skills) ? skills : [],
        status:           status || 'draft',
        experience_level: experience_level || 'Mid-level',
        image_url:        image_url?.trim() || null,
        featured:         featured || false,
        user_id:          user.id,
        views:            0,
      })
      .select()
      .single();

    if (error) throw error;

    const { data: prof } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();

    return NextResponse.json({
      job: {
        ...data,
        skills:      data.tags || [],
        applicants:  0,
        shortlisted: 0,
        rejected:    0,
        posted_by:   prof?.full_name || prof?.username || 'You',
      },
    });
  } catch (err) {
    console.error('[jobs/manage POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/jobs/manage?id=X — update a job
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabase(cookieStore);
    const user = await getUser(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const body = await request.json();
    const { title, company, department, type, location, salary, description, requirements, skills, status, experience_level, image_url, featured } = body;

    const updates = {};
    if (title        !== undefined) updates.title            = title.trim();
    if (company      !== undefined) updates.company          = company.trim();
    if (department   !== undefined) updates.department       = department?.trim() || null;
    if (type         !== undefined) updates.type             = type;
    if (location     !== undefined) updates.location         = location?.trim() || null;
    if (salary       !== undefined) updates.salary           = salary?.trim() || null;
    if (description  !== undefined) updates.description      = description?.trim() || null;
    if (requirements !== undefined) updates.requirements     = Array.isArray(requirements) ? requirements : [];
    if (skills       !== undefined) updates.tags             = Array.isArray(skills) ? skills : [];
    if (status       !== undefined) updates.status           = status;
    if (experience_level !== undefined) updates.experience_level = experience_level;
    if (image_url    !== undefined) updates.image_url        = image_url?.trim() || null;
    if (featured     !== undefined) updates.featured         = featured;

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ job: { ...data, skills: data.tags || [] } });
  } catch (err) {
    console.error('[jobs/manage PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/jobs/manage?id=X — delete a job
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabase(cookieStore);
    const user = await getUser(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[jobs/manage DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
