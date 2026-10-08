import type { Knex } from 'knex';

interface RiskCategorySeed {
  code: string;
  name: string;
  is_system: boolean;
  sort_order: number;
  is_active: boolean;
}

// `schedule_slippage` is also inserted by the migration (AC-SCH-21) — repeated here
// so `knex seed:run` is self-contained after a fresh migration + seed cycle.
export const SEEDED_RISK_CATEGORIES: RiskCategorySeed[] = [
  { code: 'schedule_slippage', name: 'Schedule slippage', is_system: true,  sort_order: 1,  is_active: true },
  { code: 'weather',           name: 'Weather',           is_system: false, sort_order: 10, is_active: true },
  { code: 'labour',            name: 'Labour',            is_system: false, sort_order: 20, is_active: true },
  { code: 'materials_supply',  name: 'Materials / supply',is_system: false, sort_order: 30, is_active: true },
  { code: 'equipment',         name: 'Equipment',         is_system: false, sort_order: 40, is_active: true },
  { code: 'safety',            name: 'Safety / HSE',      is_system: false, sort_order: 50, is_active: true },
  { code: 'quality',           name: 'Quality',           is_system: false, sort_order: 60, is_active: true },
  { code: 'client',            name: 'Client',            is_system: false, sort_order: 70, is_active: true },
  { code: 'design_change',     name: 'Design / change',   is_system: false, sort_order: 80, is_active: true },
  { code: 'permits_regulatory',name: 'Permits / regulatory', is_system: false, sort_order: 90, is_active: true },
  { code: 'security',          name: 'Security',          is_system: false, sort_order: 100, is_active: true },
];

export async function seed(knex: Knex): Promise<void> {
  await knex('risk_category')
    .insert(SEEDED_RISK_CATEGORIES)
    .onConflict('code')
    .merge({
      name: knex.raw('EXCLUDED.name'),
      sort_order: knex.raw('EXCLUDED.sort_order'),
      is_active: knex.raw('EXCLUDED.is_active'),
      // Deliberately not merging is_system — the migration-seeded system flag is authoritative.
    });
}
