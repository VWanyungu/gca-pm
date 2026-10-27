export const SEEDED_WEATHER_CATEGORIES = [
    { name: 'Clear', sort_order: 10, is_active: true },
    { name: 'Partly cloudy', sort_order: 20, is_active: true },
    { name: 'Overcast', sort_order: 30, is_active: true },
    { name: 'Light rain', sort_order: 40, is_active: true },
    { name: 'Heavy rain', sort_order: 50, is_active: true },
    { name: 'Thunderstorm', sort_order: 60, is_active: true },
    { name: 'Fog', sort_order: 70, is_active: true },
    { name: 'Windy', sort_order: 80, is_active: true },
    { name: 'Dust / haze', sort_order: 90, is_active: true },
    { name: 'Extreme heat', sort_order: 100, is_active: true },
];
export async function seed(knex) {
    await knex('weather_category')
        .insert(SEEDED_WEATHER_CATEGORIES)
        .onConflict('name')
        .merge({
        sort_order: knex.raw('EXCLUDED.sort_order'),
        is_active: knex.raw('EXCLUDED.is_active'),
    });
}
