import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { isTestRun, isLocalMongoUri, assertNotLiveInTests, connectTidb } from '@cvmind/tidb-store';

// On 24 Nov 2026 a test run on a machine with live settings in backend/.env wrote 196 test accounts into the
// live database. These checks keep any test process away from a live TiDB or a remote MongoDB.

const LIVE_TIDB = 'mysql://user:secret@gateway01.example.tidbcloud.com:4000/cvmind';
const TEST_TIDB = 'mysql://user:secret@gateway01.example.tidbcloud.com:4000/cvmind_test';

test('a node --test process knows it is a test run', () => {
  assert.equal(isTestRun(), true);
});

test('a test file run with plain node is a test run too; the server entry is not', () => {
  const store = pathToFileURL(createRequire(import.meta.url).resolve('@cvmind/tidb-store')).href;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvmind-guard-'));
  const probe = (name) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, `import { isTestRun } from '${store}';\nconsole.log(isTestRun());\n`);
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    delete env.NODE_OPTIONS;
    return spawnSync(process.execPath, [file], { env, encoding: 'utf8' }).stdout.trim();
  };
  try {
    assert.equal(probe('admin.test.js'), 'true');
    assert.equal(probe('index.js'), 'false');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('only a *_test TiDB database is allowed in tests', () => {
  assert.throws(() => assertNotLiveInTests('tidb', LIVE_TIDB), { code: 'LIVE_DATABASE_IN_TEST', message: /"cvmind"/ });
  assert.doesNotThrow(() => assertNotLiveInTests('tidb', TEST_TIDB));
});

test('only a MongoDB on this machine is allowed in tests', () => {
  assert.equal(isLocalMongoUri('mongodb://127.0.0.1:51234/cvmind_growth_test'), true);
  assert.equal(isLocalMongoUri('mongodb://user:pw@localhost:27017,[::1]:27018/x?replicaSet=rs'), true);
  assert.equal(isLocalMongoUri('mongodb+srv://user:pw@cluster0.abcde.mongodb.net/cvmind'), false);
  assert.equal(isLocalMongoUri('mongodb://127.0.0.1:27017,db.example.com:27017/x'), false);
  assert.equal(isLocalMongoUri(''), false);
  assert.throws(() => assertNotLiveInTests('mongodb', 'mongodb+srv://u:p@cluster0.abcde.mongodb.net/cvmind'), { code: 'LIVE_DATABASE_IN_TEST' });
  assert.doesNotThrow(() => assertNotLiveInTests('mongodb', 'mongodb://127.0.0.1:51234/x'));
});

test('connecting a test run to the live TiDB fails before any network call', async () => {
  const fakeMongoose = { connection: { readyState: 0 } };
  await assert.rejects(connectTidb(fakeMongoose, { url: LIVE_TIDB }), { code: 'LIVE_DATABASE_IN_TEST' });
  assert.equal(fakeMongoose.connection.readyState, 0);
});
