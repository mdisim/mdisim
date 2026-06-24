'use server'

import { createClient } from '@/lib/supabase/server'
import type { Tender, TenderBidder, TenderBid, TenderStatus, BidderStatus } from '@/lib/types'

export async function getTenders(projectId: string): Promise<Tender[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('qb_tenders')
    .select('*, bidders:qb_tender_bidders(*, bids:qb_tender_bids(*))')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Tender[]
}

export async function getTender(id: string): Promise<Tender | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('qb_tenders')
    .select('*, bidders:qb_tender_bidders(*, bids:qb_tender_bids(*))')
    .eq('id', id)
    .single()
  return (data as Tender) ?? null
}

export async function createTender(fields: {
  project_id: string
  title: string
  description?: string
  tender_number?: string
  issue_date?: string
  closing_date?: string
}): Promise<{ data?: Tender; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qb_tenders')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as Tender }
}

export async function updateTender(
  id: string,
  fields: Partial<Pick<Tender, 'title' | 'description' | 'tender_number' | 'issue_date' | 'closing_date' | 'status' | 'awarded_bidder_id' | 'notes'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('qb_tenders').update(fields).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deleteTender(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('qb_tenders').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function createBidder(fields: {
  tender_id: string
  name: string
  company?: string
  email?: string
  phone?: string
}): Promise<{ data?: TenderBidder; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qb_tender_bidders')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as TenderBidder }
}

export async function updateBidder(
  id: string,
  fields: Partial<Pick<TenderBidder, 'name' | 'company' | 'email' | 'phone' | 'submission_date' | 'status' | 'notes'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('qb_tender_bidders').update(fields).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deleteBidder(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('qb_tender_bidders').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function createBid(fields: {
  tender_id: string
  bidder_id: string
  boq_item_id?: string
  description: string
  unit: string
  quantity: number
  unit_rate: number
}): Promise<{ data?: TenderBid; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qb_tender_bids')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as TenderBid }
}

export async function updateBid(
  id: string,
  fields: Partial<Pick<TenderBid, 'description' | 'unit' | 'quantity' | 'unit_rate' | 'notes'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('qb_tender_bids').update(fields).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deleteBid(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('qb_tender_bids').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function bulkCreateBids(
  tenderId: string,
  bidderId: string,
  bids: { boq_item_id?: string; description: string; unit: string; quantity: number; unit_rate: number }[]
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient()
  const rows = bids.map(b => ({ tender_id: tenderId, bidder_id: bidderId, ...b }))
  const { error } = await supabase.from('qb_tender_bids').insert(rows)
  if (error) return { count: 0, error: error.message }
  return { count: rows.length }
}

export async function awardTender(tenderId: string, bidderId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error: e1 } = await supabase
    .from('qb_tender_bidders')
    .update({ status: 'awarded' as BidderStatus })
    .eq('id', bidderId)
  if (e1) return { error: e1.message }
  const { error: e2 } = await supabase
    .from('qb_tenders')
    .update({ status: 'awarded' as TenderStatus, awarded_bidder_id: bidderId })
    .eq('id', tenderId)
  if (e2) return { error: e2.message }
  return {}
}
