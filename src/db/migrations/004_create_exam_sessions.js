/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('exam_sessions', (table) => {
    table.increments('id').primary();
    table.integer('exam_id').unsigned().notNullable().references('id').inTable('exams');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.timestamp('start_time').defaultTo(knex.fn.now());
    table.timestamp('submit_time');
    table.decimal('score', 5, 2);
    table.enum('status', ['in_progress', 'submitted', 'graded']).defaultTo('in_progress');
    table.unique(['exam_id', 'user_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('exam_sessions');
};
