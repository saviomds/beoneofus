import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAuth } from '../../../lib/requireAuth';
import { computeOrderTotal } from '../../../lib/shopCatalog';

// GET /api/orders — fetch the logged-in user's shop orders
export async function GET(request) {
  const { user, error: authErr, status } = await requireAuth(request);
  if (authErr) return NextResponse.json({ error: authErr }, { status });

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}

// POST /api/orders — create a new shop order
export async function POST(request) {
  const { user, error: authErr, status } = await requireAuth(request);
  if (authErr) return NextResponse.json({ error: authErr }, { status });

  try {
    const { items, address } = await request.json();

    // SECURITY: the total is recomputed from the server-side price list — the
    // client-supplied `total` (and any client-supplied line prices) are ignored.
    // This blocks a crafted request from recording an arbitrary / zero total.
    const priced = computeOrderTotal(items);
    if (!priced.ok) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }
    const total = priced.total;

    const tracking = 'TRK-' + Math.random().toString(36).slice(2, 10).toUpperCase();

    const { data, error } = await supabaseAdmin
      .from('shop_orders')
      .insert({
        user_id: user.id,
        items,
        total,
        address: address || null,
        tracking,
        status: 'processing',
        discreet: true,
      })
      .select()
      .single();

    if (error) {
      console.error('orders POST error:', error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    console.error('orders POST exception:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
