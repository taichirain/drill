/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('answers', (table) => {
    table.increments('id').primary();
    table.integer('session_id').unsigned().notNullable().references('id').inTable('exam_sessions').onDelete('CASCADE');
    table.integer('question_id').unsigned().notNullable().references('id').inTable('questions');
    table.text('user_answer');
    table.decimal('score', 5, 2);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['session_id', 'question_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('answers');
};
