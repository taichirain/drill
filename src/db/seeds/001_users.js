const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  await knex('users').del();

  const salt = bcrypt.genSaltSync(10);

  await knex('users').insert([
    { username: 'admin', password: bcrypt.hashSync('admin123', salt), name: '管理员', role: 'admin' },
    { username: 'teacher1', password: bcrypt.hashSync('teacher123', salt), name: '张老师', role: 'teacher' },
    { username: 'student1', password: bcrypt.hashSync('student123', salt), name: '李同学', role: 'student' },
    { username: 'student2', password: bcrypt.hashSync('student123', salt), name: '王同学', role: 'student' },
    { username: 'student3', password: bcrypt.hashSync('student123', salt), name: '赵同学', role: 'student' },
  ]);
};
