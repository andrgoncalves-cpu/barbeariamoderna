import { supabaseAdmin } from './supabase';

/**
 * Garante que existe um registo de cliente para este telefone (cria se não existir)
 * e devolve se este telefone está isento de pré-pagamento.
 */
export async function getOrCreateCustomer(phone: string, name: string, email: string) {
  const supabase = supabaseAdmin();

  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .single();

  if (existing) {
    // Atualiza nome/email se mudaram
    if (existing.name !== name || existing.email !== email) {
      await supabase.from('customers').update({ name, email }).eq('phone', phone);
    }
    return existing;
  }

  const { data: created } = await supabase
    .from('customers')
    .insert({ phone, name, email })
    .select()
    .single();

  return created;
}

export async function isPhoneExempt(phone: string): Promise<boolean> {
  const supabase = supabaseAdmin();

  const { data: customer } = await supabase
    .from('customers')
    .select('completed_count, no_show_flag, override')
    .eq('phone', phone)
    .single();

  if (!customer) return false; // cliente novo -> paga

  if (customer.override === 'always_pay') return false;
  if (customer.override === 'always_exempt') return true;
  if (customer.no_show_flag) return false; // falta sem aviso -> nunca mais isento automaticamente

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'loyalty_free_after')
    .single();
  const threshold = Number(setting?.value ?? 3);

  return customer.completed_count >= threshold;
}

/** Chamar quando uma marcação é confirmada como CUMPRIDA (compareceu). */
export async function markBookingCompleted(phone: string) {
  const supabase = supabaseAdmin();
  const { data: customer } = await supabase
    .from('customers')
    .select('completed_count')
    .eq('phone', phone)
    .single();

  const current = customer?.completed_count ?? 0;
  await supabase
    .from('customers')
    .update({ completed_count: current + 1 })
    .eq('phone', phone);
}

/** Chamar quando o cliente falta SEM avisar — bloqueia isenção para sempre. */
export async function markNoShow(phone: string) {
  const supabase = supabaseAdmin();
  await supabase.from('customers').update({ no_show_flag: true }).eq('phone', phone);
}
