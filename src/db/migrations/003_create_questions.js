/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('questions', (table) => {
    table.increments('id').primary();
    table.integer('exam_id').unsigned().notNullable().references('id').inTable('exams').onDelete('CASCADE');
    table.enum('type', ['choice', 'multi_choice', 'judge', 'fill', 'essay']).notNullable();
    table.text('content').notNullable();
    table.jsonb('options');
    table.text('answer');
    table.decimal('score', 5, 2).defaultTo(0);
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('questions');
};
