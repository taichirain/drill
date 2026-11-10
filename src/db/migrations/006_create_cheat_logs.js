/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('cheat_logs', (table) => {
    table.increments('id').primary();
    table.integer('session_id').unsigned().notNullable().references('id').inTable('exam_sessions').onDelete('CASCADE');
    table.string('event_type', 100).notNullable();
    table.text('detail');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cheat_logs');
};
