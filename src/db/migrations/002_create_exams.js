/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('exams', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('description');
    table.integer('duration').notNullable().comment('考试时长（分钟）');
    table.timestamp('start_time');
    table.timestamp('end_time');
    table.enum('status', ['draft', 'published', 'ongoing', 'finished']).defaultTo('draft');
    table.integer('created_by').unsigned().references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('exams');
};
