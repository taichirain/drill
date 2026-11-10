// Run against an isolated PostgreSQL database: node --test tests/integration/session-consistency.node.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Fastify = require('fastify');
const db = require('../../src/db');
const { signAccessToken } = require('../../src/services/jwt');

test('concurrent save and submit leave score consistent with the final answer', async () => {
  const app = Fastify();
  try {
    await db.migrate.latest({ directory: path.resolve(__dirname, '../../src/db/migrations') });
    await app.register(require('../../src/routes/exam'));
    const [user] = await db('users').insert({ username: `test-${Date.now()}`, password: 'x', name: 'test' }).returning('*');
    const [exam] = await db('exams').insert({ title: 'test', duration: 30, created_by: user.id }).returning('*');
    const [question] = await db('questions').insert({ exam_id: exam.id, type: 'choice', content: 'q', answer: 'yes', score: 5 }).returning('*');
    const [session] = await db('exam_sessions').insert({ exam_id: exam.id, user_id: user.id }).returning('*');
    const headers = { authorization: `Bearer ${signAccessToken({ id: user.id })}` };
    const [save, submit] = await Promise.all([
      app.inject({ method: 'POST', url: `/api/exams/${exam.id}/answer`, headers, payload: { questionId: question.id, answer: 'yes' } }),
      app.inject({ method: 'POST', url: `/api/exams/${exam.id}/submit`, headers }),
    ]);
    assert.equal(submit.statusCode, 200);
    assert.ok([200, 400].includes(save.statusCode));
    const finalSession = await db('exam_sessions').where('id', session.id).first();
    const finalAnswer = await db('answers').where('session_id', session.id).first();
    assert.equal(Number(finalSession.score), finalAnswer ? 5 : 0);
    if (finalAnswer) assert.equal(Number(finalAnswer.score), 5);
    const late = await app.inject({ method: 'POST', url: `/api/exams/${exam.id}/answer`, headers, payload: { questionId: question.id, answer: 'no' } });
    assert.equal(late.statusCode, 400);
  } finally {
    await app.close();
    await db.destroy();
  }
});
