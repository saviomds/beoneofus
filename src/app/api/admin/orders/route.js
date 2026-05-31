import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// GET /api/admin/orders — fetch all shop orders with buyer info
// Middleware already enforces is_admin check before this handler runs.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const limit  = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

  let query = supabaseAdmin
    .from('shop_orders')
    .select('*, buyer:profiles!shop_orders_user_id_fkey(id, username, email, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('admin/orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}

// PATCH /api/admin/orders — update an order's status or tracking
export async function PATCH(request) {
  try {
    const { orderId, status, tracking, eta } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const updates = {};
    if (status)   updates.status   = status;
    if (tracking) updates.tracking = tracking;
    if (eta)      updates.eta      = eta;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('shop_orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('admin/orders PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
