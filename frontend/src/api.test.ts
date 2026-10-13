import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignInError, signIn } from './api.ts';

test('sends trimmed username and unchanged password, and returns only a confirmed session', async () => {
  const expected = { token: 'test-token', user: { id: 'student-1', name: 'A Student', department: 'Computer Science', roll_number: 'TEST01', erp_verified: true } };
  const request = (async (url, options) => {
    assert.equal(url, '/api/auth/erp-login');
    assert.equal(options?.method, 'POST');
    assert.deepEqual(JSON.parse(options?.body as string), { username: 'student', password: ' test password ' });
    assert.ok(options?.signal);
    return Response.json(expected);
  }) as typeof fetch;
  assert.deepEqual(await signIn(' student ', ' test password ', request), expected);
});

for (const [status, kind] of [[401, 'credentials'], [400, 'credentials'], [403, 'account'], [409, 'account'], [429, 'service'], [503, 'service']] as const) {
  test(`maps HTTP ${status} to a useful ${kind} state without exposing server internals`, async () => {
    const request = (async () => Response.json({ error: 'internal server detail' }, { status })) as typeof fetch;
    await assert.rejects(signIn('student', 'test', request), (error: unknown) => {
      assert.ok(error instanceof SignInError);
      assert.equal(error.kind, kind);
      assert.ok(!error.message.includes('internal server detail'));
      return true;
    });
  });
}

test('rejects malformed successful responses rather than showing a false signed-in state', async () => {
  for (const response of [Response.json({ user: { name: 'Student' } }), new Response('<html>proxy failure</html>')]) {
    const request = (async () => response) as typeof fetch;
    await assert.rejects(signIn('student', 'test', request), (error: unknown) => error instanceof SignInError && error.kind === 'service');
  }
});

test('distinguishes network and timeout failures', async () => {
  for (const [failure, kind] of [[new TypeError('Failed to fetch'), 'network'], [new DOMException('Aborted', 'AbortError'), 'service']] as const) {
    const request = (async () => { throw failure; }) as typeof fetch;
    await assert.rejects(signIn('student', 'test', request), (error: unknown) => error instanceof SignInError && error.kind === kind);
  }
});
