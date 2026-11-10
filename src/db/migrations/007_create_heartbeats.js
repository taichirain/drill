/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('heartbeats', (table) => {
    table.increments('id').primary();
    table.integer('session_id').unsigned().notNullable().references('id').inTable('exam_sessions').onDelete('CASCADE');
    table.string('client_ip', 100);
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('heartbeats');
};
