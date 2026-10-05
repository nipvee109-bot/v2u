/** T005 behavioral auth tests. Mocks do not verify real Google OAuth. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url);
const { createSessionController } = await jiti.import('../src/auth/sessionController.ts');
const { completeOAuthRedirect, supabaseBackendFromClient } = await jiti.import('../src/backend/supabase.ts');
const { assertSafeFrontendEnv } = await jiti.import('../src/backend/supabaseEnv.ts');
const { can } = await jiti.import('../src/auth/permissions.ts');
let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}\n     ${e.stack}`); failed++; }
}
const identity = uid => ({ uid, displayName: uid, email: `${uid}@example.invalid`, photoURL: null });
const profile = (uid, status = 'ACTIVE') => ({ ...identity(uid), role: 'STUDENT', status });
const tick = () => new Promise(r => setTimeout(r, 5));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
function fixture(overrides = {}) {
  const writes = [], reads = [], snapshots = [];
  const backend = { touchOwnProfile: async u => { writes.push(u.uid); return profile(u.uid); }, getProfile: async uid => { reads.push(uid); return profile(uid); }, signOut: async () => {}, signInWithGoogle: async () => ({ok:true,redirecting:true}), ...overrides };
  const controller = createSessionController(backend, s => snapshots.push(s));
  return { backend, controller, writes, reads, snapshots, get state() { return snapshots.at(-1); } };
}
for (const name of ['initial session', 'returning persisted session', 'session restore']) await test(`${name} loads the stored STUDENT profile`, async () => {
  const f=fixture(); await f.controller.authChanged(identity('A'),'INITIAL_SESSION');
  assert.equal(f.state.status,'signed-in'); assert.equal(f.state.profile.role,'STUDENT'); assert.deepEqual(f.writes,['A']);
});
await test('guest and logout keep a null profile; logout invalidates identity', async () => {
  const f=fixture(); await f.controller.authChanged(null); assert.equal(f.state.status,'signed-out');
  await f.controller.authChanged(identity('A'),'SIGNED_IN'); await f.controller.signOut();
  assert.equal(f.state.status,'signed-out'); assert.equal(f.state.profile,null);
});
await test('slow A cannot restore state after sign-out', async () => {
  const slow=deferred(); const f=fixture({touchOwnProfile:()=>slow.promise});
  const old=f.controller.authChanged(identity('A'),'SIGNED_IN'); await tick();
  await f.controller.signOut(); slow.resolve(profile('A')); await old;
  assert.equal(f.state.status,'signed-out'); assert.equal(f.state.profile,null);
});
await test('slow A cannot overwrite switched B', async () => {
  const slow=deferred(); const f=fixture({touchOwnProfile:u=>u.uid==='A'?slow.promise:Promise.resolve(profile('B'))});
  const old=f.controller.authChanged(identity('A'),'SIGNED_IN'); await tick();
  await f.controller.authChanged(identity('B'),'SIGNED_IN'); slow.resolve(profile('A')); await old;
  assert.equal(f.state.status,'signed-in'); assert.equal(f.state.profile.uid,'B');
});
await test('older sign-out completion cannot overwrite B or leave its logout button disabled', async () => {
  const slow=deferred();const f=fixture({signOut:()=>slow.promise});await f.controller.authChanged(identity('A'));
  const out=f.controller.signOut();await f.controller.authChanged(identity('B'),'SIGNED_IN');slow.resolve();await out;
  assert.equal(f.state.profile.uid,'B');assert.equal(f.state.status,'signed-in');assert.equal(f.state.signingOut,false);
});
await test('stale A profile failure cannot change newer signed-out status', async () => {
  const slow=deferred(); const f=fixture({touchOwnProfile:()=>slow.promise});
  const old=f.controller.authChanged(identity('A')); await tick(); await f.controller.authChanged(null,'SIGNED_OUT');
  slow.reject(new Error('backend')); await old; assert.equal(f.state.status,'signed-out'); assert.equal(f.state.error,null);
});
await test('refresh results and errors cannot overwrite a new identity', async () => {
  const slow=deferred(); const f=fixture({getProfile:()=>slow.promise});
  await f.controller.authChanged(identity('A')); const refresh=f.controller.refreshProfile(); await tick();
  await f.controller.authChanged(identity('B'),'SIGNED_IN'); slow.reject(new Error('network')); await refresh;
  assert.equal(f.state.profile.uid,'B'); assert.equal(f.state.status,'signed-in'); assert.equal(f.state.error,null);
});
await test('refresh result after logout cannot resurrect A', async () => {
  const slow=deferred(); const f=fixture({getProfile:()=>slow.promise}); await f.controller.authChanged(identity('A'));
  const refresh=f.controller.refreshProfile(); await tick(); await f.controller.signOut(); slow.resolve(profile('A')); await refresh;
  assert.equal(f.state.status,'signed-out'); assert.equal(f.state.profile,null);
});
await test('missing profile is distinct and retry works without an existing profile', async () => {
  let missing=true;
  const f=fixture({touchOwnProfile:async()=>{throw Error('missing');},getProfile:async()=>missing?null:profile('A')});
  await f.controller.authChanged(identity('A')); assert.equal(f.state.status,'error'); assert.equal(f.state.errorKind,'missing-profile');
  missing=false; await f.controller.refreshProfile(); assert.equal(f.state.status,'signed-in'); assert.equal(f.state.profile.uid,'A');
});
await test('network/backend profile failure is distinct and retry recovers', async () => {
  let fail=true; const f=fixture({touchOwnProfile:async()=>{throw Error('backend');},getProfile:async()=>{if(fail)throw Error('network');return profile('A');}});
  await f.controller.authChanged(identity('A')); assert.equal(f.state.errorKind,'profile-load');
  fail=false; await f.controller.refreshProfile(); assert.equal(f.state.status,'signed-in');
});
await test('sign-out works from missing-profile and backend error states', async () => {
  for(const missing of [true,false]) {
    let calls=0; const f=fixture({touchOwnProfile:async()=>{throw Error('no');},getProfile:async()=>{if(missing)return null;throw Error('network');},signOut:async()=>{calls++;}});
    await f.controller.authChanged(identity('A')); await f.controller.signOut();
    assert.equal(calls,1); assert.equal(f.state.status,'signed-out'); assert.equal(f.state.profile,null);
  }
});
await test('failed logout shows recoverable auth error without leaking a profile', async () => {
  const f=fixture({signOut:async()=>{throw Error('network');}}); await f.controller.authChanged(identity('A')); await f.controller.signOut();
  assert.equal(f.state.errorKind,'auth'); assert.equal(f.state.status,'error'); assert.equal(f.state.profile,null);
  await f.controller.refreshProfile(); assert.equal(f.state.status,'signed-in');
});
await test('TOKEN_REFRESHED and unrelated events never write last_login_at; repeated SIGNED_IN is deduplicated', async () => {
  const f=fixture(); await f.controller.authChanged(identity('A'));
  await f.controller.authChanged(identity('A'),'TOKEN_REFRESHED'); await f.controller.authChanged(identity('A'),'SIGNED_IN');
  await f.controller.authChanged(identity('A'),'USER_UPDATED'); await f.controller.refreshProfile();
  assert.deepEqual(f.writes,['A']); assert.deepEqual(f.reads,['A','A']);
});
await test('TOKEN_REFRESHED during profile load does not cancel the initial result', async () => {
  const slow=deferred(); const f=fixture({touchOwnProfile:()=>slow.promise}); const load=f.controller.authChanged(identity('A'));
  await tick(); await f.controller.authChanged(identity('A'),'TOKEN_REFRESHED'); slow.resolve(profile('A')); await load;
  assert.equal(f.state.status,'signed-in');
});
await test('duplicate sign-in clicks make one redirect request and keep pending state', async () => {
  let calls=0; const slow=deferred(); const f=fixture({signInWithGoogle:()=>{calls++;return slow.promise;}});
  const a=f.controller.signIn(),b=f.controller.signIn(); assert.equal(calls,1); assert.equal(f.state.signingIn,true);
  slow.resolve({ok:true,redirecting:true}); await Promise.all([a,b]); await f.controller.signIn(); assert.equal(calls,1); assert.equal(f.state.signingIn,true);
});
await test('cancelled OAuth, offline and generic auth failure stay signed-out and allow retry', async () => {
  for(const reason of ['cancelled','error']) {
    const f=fixture({signInWithGoogle:async()=>({ok:false,reason})}); await f.controller.authChanged(null);
    await f.controller.signIn(); assert.equal(f.state.status,'signed-out'); assert.equal(f.state.signingIn,false); assert(f.state.error);
    await f.controller.signIn(false); assert.match(f.state.error,/อินเทอร์เน็ต/);
  }
});
await test('suspended/disabled profiles load by read fallback and STUDENT cannot enter /admin', async () => {
  for(const status of ['ACTIVE','SUSPENDED','DISABLED']) {
    const f=fixture({touchOwnProfile:async()=>{throw Error('inactive');},getProfile:async()=>profile('A',status)});
    await f.controller.authChanged(identity('A')); assert.equal(f.state.status,'signed-in'); assert.equal(f.state.profile.status,status);
    assert.equal(can(f.state.profile,'admin.access'),false);
  }
});
await test('disposed controller cannot apply late profile results', async () => {
  const slow=deferred(); const f=fixture({touchOwnProfile:()=>slow.promise}); const old=f.controller.authChanged(identity('A')); await tick();
  f.controller.dispose(); const count=f.snapshots.length; slow.resolve(profile('A')); await old; assert.equal(f.snapshots.length,count);
});
async function callback(href, exchange) {
  const urls=[]; const history={state:{app:true},replaceState:(state,_title,url)=>{assert.deepEqual(state,{app:true});urls.push(url);}};
  const result=await completeOAuthRedirect({exchangeCodeForSession:exchange}, {href},history); return {result,urls};
}
await test('cancelled OAuth in query/hash is cleaned and preserves application path/query', async () => {
  for(const href of ['http://localhost/me?tab=account&error=access_denied&error_description=cancelled#normal','http://localhost/admin?tab=auth#error=access_denied&error_code=401']) {
    const r=await callback(href,()=>{throw Error('must not exchange');}); assert.equal(r.result.reason,'cancelled');
    assert(!r.urls[0].includes('error')); assert(r.urls[0].startsWith(href.includes('/admin')?'/admin?tab=auth':'/me?tab=account'));
  }
});
await test('invalid/expired PKCE callback cleans code and never creates false signed-in state or redirects externally', async () => {
  for(const exchange of [async()=>({data:{session:null},error:Error('expired')}),async()=>({data:{session:null},error:null}),async()=>{throw Error('network');}]) {
    const r=await callback('http://localhost/me?code=expired&tab=account&redirect=https://evil.invalid#anchor',exchange);
    assert.equal(r.result.reason,'callback'); assert.equal(r.urls[0],'/me?tab=account&redirect=https%3A%2F%2Fevil.invalid#anchor');
    const f=fixture(); f.controller.redirectError(r.result); await f.controller.authChanged(null);
    assert.equal(f.state.status,'signed-out'); assert.equal(f.state.profile,null); assert.match(f.state.error,/หมดอายุ/);
  }
});
await test('successful PKCE consumes code once; ordinary paths are untouched', async () => {
  let calls=0; const r=await callback('http://localhost/admin?code=valid&view=mine#anchor',async code=>{calls++;assert.equal(code,'valid');return {data:{session:{user:{id:'A'}}},error:null};});
  assert.equal(r.result,null); assert.deepEqual(r.urls,['/admin?view=mine#anchor']); assert.equal(calls,1);
  const ordinary=await callback('http://localhost/me?view=mine#anchor',()=>{throw Error('unused');}); assert.equal(ordinary.result,null); assert.deepEqual(ordinary.urls,[]);
});
await test('Supabase adapter forwards auth event synchronously and unsubscribes', async () => {
  let listener, removed=false; const sb={auth:{onAuthStateChange:cb=>{listener=cb;return {data:{subscription:{unsubscribe:()=>{removed=true;}}}};}}};
  const be=supabaseBackendFromClient(sb); const events=[]; const stop=be.onAuthChanged((u,event)=>events.push([u?.uid??null,event]));
  listener('SIGNED_IN',{user:{id:'A'}}); listener('TOKEN_REFRESHED',{user:{id:'A'}}); listener('SIGNED_OUT',null);
  assert.deepEqual(events,[['A','SIGNED_IN'],['A','TOKEN_REFRESHED'],[null,'SIGNED_OUT']]); stop(); assert(removed);
});
await test('auth operations preserve all real learner store state and persisted data', async () => {
  const saved=new Map(); globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  globalThis.window={localStorage:globalThis.localStorage,addEventListener(){},removeEventListener(){}};
  const {useStore}=await jiti.import('../src/store/useStore.ts');
  const sentinels={studentProfile:{displayName:'learner',target:'university'},hasCompletedOnboarding:true,diagnostic:{attempts:[{id:'d1'}]},lessons:[{id:'progress'}],reviewQueue:[{id:'review'}],learningSessionsHistory:[{id:'evidence'}]};
  useStore.setState(sentinels); await new Promise(r=>setTimeout(r,250));
  const before=JSON.stringify(useStore.getState()),persisted=JSON.stringify([...saved]);
  const f=fixture(); await f.controller.authChanged(null); await f.controller.authChanged(identity('A')); await f.controller.refreshProfile(); await f.controller.signOut();
  assert.equal(JSON.stringify(useStore.getState()),before); assert.equal(JSON.stringify([...saved]),persisted);
});
const jwt=role=>`e30.${Buffer.from(JSON.stringify({role})).toString('base64url')}.test`;
await test('real Supabase SDK restores a persisted session and emits INITIAL_SESSION after reload without network auth', async () => {
  const {createClient}=await import('@supabase/supabase-js');
  const saved=new Map();
  const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  const session={access_token:jwt('authenticated'),refresh_token:'fake-test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,
    expires_in:3600,token_type:'bearer',user:{id:'A',email:'a@example.invalid',user_metadata:{},app_metadata:{},aud:'authenticated'}};
  saved.set('t005-session',JSON.stringify(session));
  for(let reload=0;reload<2;reload++) {
    const sb=createClient('https://auth.example.invalid',jwt('anon'),{auth:{storage,storageKey:'t005-session',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async()=>{throw Error('unexpected network auth');}}});
    const be=supabaseBackendFromClient(sb);const f=fixture();const ready=deferred();const events=[];
    const stop=be.onAuthChanged((u,event)=>{events.push(event);f.controller.authChanged(u,event).then(()=>{if(f.state?.status==='signed-in')ready.resolve();});});
    try {
      const timeout=setTimeout(()=>ready.reject(new Error('session restore timed out')),2000);
      try { await ready.promise; } finally { clearTimeout(timeout); }
      assert(events.includes('INITIAL_SESSION'));assert.equal(f.state.profile.uid,'A');assert.equal(f.state.status,'signed-in');
      assert.equal(JSON.parse(saved.get('t005-session')).user.id,'A');
    } finally {stop();f.controller.dispose();await sb.auth.stopAutoRefresh();}
  }
});
await test('build guard accepts public anon/publishable keys and rejects only unsafe variable names without values', () => {
  assertSafeFrontendEnv({VITE_SUPABASE_ANON_KEY:jwt('anon'),VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'});
  for(const value of [jwt('service_role'),'sb_secret_FAKE_T005_CANARY']) {
    assert.throws(()=>assertSafeFrontendEnv({VITE_SUPABASE_ALT:value}),e=>e.message.includes('VITE_SUPABASE_ALT')&&!e.message.includes(value));
  }
});
await test('actual Vite build refuses secret process env and mode env before creating browser output', () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'t005-build-'));
  const envDir=path.join(tmp,'env');fs.mkdirSync(envDir);
  const values=[jwt('service_role'),'sb_secret_FAKE_T005_BUILD_CANARY'];
  try {
    for(const value of values) {
      const out=path.join(tmp,`out-${values.indexOf(value)}`);
      const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',out],{env:{...process.env,VITE_SUPABASE_UNUSED_KEY:value},encoding:'utf8'});
      assert.notEqual(result.status,0); const log=result.stdout+result.stderr;
      assert(log.includes('Unsafe frontend environment variable: VITE_SUPABASE_UNUSED_KEY'));assert(!log.includes(value));assert(!fs.existsSync(out));
    }
    // Real Vite loadEnv is checked with a mode-specific env file in an isolated
    // root. The normal config is loaded explicitly; no repository .env is edited.
    fs.writeFileSync(path.join(envDir,'.env.production'),'VITE_SUPABASE_PUBLISHABLE_KEY=sb_secret_FAKE_ENV_FILE_CANARY\n');
    const result=spawnSync(process.execPath,[path.resolve('node_modules/vite/bin/vite.js'),'build',envDir,'--config',path.resolve('vite.config.ts'),'--outDir',path.join(tmp,'file-output')],{cwd:envDir,env:process.env,encoding:'utf8'});
    assert.notEqual(result.status,0); assert.match(result.stdout+result.stderr,/Unsafe frontend environment variable: VITE_SUPABASE_PUBLISHABLE_KEY/);
    assert(!(result.stdout+result.stderr).includes('sb_secret_FAKE_ENV_FILE_CANARY'));
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
console.log(`\nTotal: ${passed+failed} | Passed: ${passed} | Failed: ${failed}`);
if(failed)process.exitCode=1;
