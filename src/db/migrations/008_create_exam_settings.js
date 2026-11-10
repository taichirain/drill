/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('exam_settings', (table) => {
    table.integer('exam_id').unsigned().primary().references('id').inTable('exams').onDelete('CASCADE');
    table.integer('max_tab_switches').defaultTo(5);
    table.boolean('allow_copy_paste').defaultTo(false);
    table.boolean('fullscreen_required').defaultTo(false);
    table.boolean('ip_limit').defaultTo(true);
    table.boolean('auto_submit_on_cheat').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('exam_settings');
};
