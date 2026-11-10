/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  await knex('exam_settings').del();
  await knex('questions').del();
  await knex('exams').del();

  const [examId] = await knex('exams').insert({
    title: 'Node.js 基础测试',
    description: '测试 Node.js 基础知识掌握情况',
    duration: 60,
    status: 'published',
    created_by: 2,
  }).returning('id');

  const id = examId.id || examId;

  await knex('questions').insert([
    {
      exam_id: id,
      type: 'choice',
      content: 'Node.js 使用的 JavaScript 引擎是？',
      options: JSON.stringify(['A. SpiderMonkey', 'B. V8', 'C. JavaScriptCore', 'D. Chakra']),
      answer: 'B',
      score: 10,
      sort_order: 1,
    },
    {
      exam_id: id,
      type: 'choice',
      content: '以下哪个不是 Node.js 的内置模块？',
      options: JSON.stringify(['A. fs', 'B. http', 'C. express', 'D. path']),
      answer: 'C',
      score: 10,
      sort_order: 2,
    },
    {
      exam_id: id,
      type: 'judge',
      content: 'Node.js 是单线程的。',
      options: JSON.stringify(['A. 正确', 'B. 错误']),
      answer: 'A',
      score: 10,
      sort_order: 3,
    },
    {
      exam_id: id,
      type: 'choice',
      content: 'npm 的全称是？',
      options: JSON.stringify(['A. Node Package Manager', 'B. Node Program Module', 'C. New Package Manager', 'D. Node Project Manager']),
      answer: 'A',
      score: 10,
      sort_order: 4,
    },
    {
      exam_id: id,
      type: 'fill',
      content: 'Node.js 中读取文件的异步方法是 fs._______()',
      options: null,
      answer: 'readFile',
      score: 10,
      sort_order: 5,
    },
  ]);

  await knex('exam_settings').insert({
    exam_id: id,
    max_tab_switches: 5,
    allow_copy_paste: false,
    fullscreen_required: false,
    ip_limit: true,
    auto_submit_on_cheat: false,
  });
};
