import { test, expect } from "@playwright/test";
import { fixtureWav } from "../fake-inference.mjs";

test("API protection, CSRF and private audio", async ({ request }) => {
  expect((await request.get('/api/history')).status()).toBe(401);
  expect((await request.get('/api/voice-profiles')).status()).toBe(401);
  expect((await request.get('/api/audio/private.wav')).status()).toBe(401);
  expect((await request.get('/api/internal/runtime')).status()).toBe(401);
  expect((await request.post('/api/auth/login',{headers:{Origin:'https://attacker.example'},data:{password:'e2e-test-only-password'}})).status()).toBe(403);
});

test("iPhone layout, Files upload, profiles, script revisions, durable generation and PCM download", async ({ page, context }) => {
  const scriptTitle = `Phone test ${test.info().project.name}`;
  const profileName = `Consented test voice ${test.info().project.name}`;
  await page.goto('/login');
  await page.getByLabel('Owner password').fill('e2e-test-only-password');
  await page.getByRole('button',{name:'ဝင်ရောက်မည်'}).click();
  await expect(page).toHaveURL(/settings/);
  for (const route of ['/', '/script','/history','/voices','/settings','/storage']) {
    await page.goto(route); await expect(page.getByRole('navigation', {name:'Main navigation'})).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    if (!fits) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].map(el => ({tag:el.tagName, classes:el.className, right:el.getBoundingClientRect().right, width:el.getBoundingClientRect().width})).filter(el => el.right > innerWidth+1).slice(-15)));
    expect(fits, `Horizontal overflow at ${route}`).toBe(true);
    const nav = page.getByRole('navigation',{name:'Main navigation'});
    await expect(nav).toBeVisible();
    expect(await nav.locator('a').count()).toBe(5);
  }
  await page.goto('/script');
  await page.getByText(/Saved scripts ·/).click();
  await page.getByLabel('Script title',{exact:true}).fill(scriptTitle);
  await page.getByLabel('Edit saved script').fill('This is a short voice test.');
  await page.getByRole('button',{name:'Save script revision'}).click();
  await expect(page.getByText('Saved as a new revision; earlier scripts are preserved.')).toBeVisible();
  await page.getByRole('button',{name:'Open in Studio',exact:true}).click();
  await expect(page).toHaveURL(/\/$/);
  await page.locator('input[type=file]').setInputFiles({name:'iphone-reference.wav',mimeType:'audio/wav',buffer:fixtureWav(8)});
  await expect(page.locator('audio[aria-label="Reference preview"]')).toBeVisible();
  await page.getByPlaceholder('Voice profile name').fill(profileName);
  await page.getByText('I have permission to save this voice sample and transcript in private server storage.').click();
  await page.getByRole('button',{name:'Save Voice Profile',exact:true}).click();
  await expect(page.locator('audio[aria-label="Saved voice preview"]')).toBeVisible();
  await page.getByText('I own this voice or have the speaker’s permission to clone it.').click();
  const button=page.getByRole('button',{name:/Generate Local Audio/});
  await expect(button).toBeEnabled();
  const requestPromise = page.waitForResponse(r=>r.url().endsWith('/api/generate') && r.request().method()==='POST');
  await button.click();
  const response=await requestPromise; expect(response.status()).toBe(202);
  const started=await response.json();
  const duplicate = await context.request.post('/api/generate', { headers: { Origin:'http://127.0.0.1:3100', 'Idempotency-Key': response.request().headers()['idempotency-key'] }, data: response.request().postDataJSON() });
  expect(duplicate.status()).toBe(202); expect((await duplicate.json()).jobId).toBe(started.jobId);
  // Close Safari tab while the accepted server job is running, then reopen History.
  await page.close();
  const reopened=await context.newPage(); await reopened.goto('/history');
  await expect(reopened.getByText(scriptTitle,{exact:true})).toBeVisible();
  await expect.poll(async()=>{const r=await context.request.get(`/api/history/${started.jobId}`); return (await r.json()).status;},{timeout:60_000}).toBe('completed');
  await reopened.reload();
  const player = reopened.locator('audio').first();
  await expect.poll(() => player.evaluate((audio: HTMLAudioElement) => audio.duration)).toBeGreaterThan(0);
  await reopened.getByRole('button', {name:'Play audio',exact:true}).first().click();
  await expect.poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(false);
  await reopened.getByRole('button', {name:'Pause audio',exact:true}).first().click();
  await player.evaluate((audio: HTMLAudioElement) => { audio.currentTime = .5; });
  await expect.poll(() => player.evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(.4);
  const result=await (await context.request.get(`/api/history/${started.jobId}`)).json();
  const audio=await context.request.get(result.audioUrl+'?download=1'); expect(audio.headers()['content-type']).toBe('audio/wav'); expect(audio.headers()['content-disposition']).toContain('attachment');
  const wav=await audio.body(); expect(wav.toString('ascii',0,4)).toBe('RIFF'); expect(wav.toString('ascii',8,12)).toBe('WAVE'); expect(wav.readUInt16LE(34)).toBe(24); expect(wav.readUInt32LE(24)).toBe(48000);
  const range=await context.request.get(result.audioUrl,{headers:{Range:'bytes=0-43'}}); expect(range.status()).toBe(206); expect((await range.body()).length).toBe(44);
  const badRange=await context.request.get(result.audioUrl,{headers:{Range:'bytes=999999999-'}}); expect(badRange.status()).toBe(416);
  await reopened.goto('/voices'); await expect(reopened.getByRole('heading',{name:profileName})).toBeVisible();
  const prefs=await context.request.get('/api/settings/preferences'); expect(prefs.status()).toBe(200);
  await reopened.setViewportSize({width:844,height:390});
  expect(await reopened.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await reopened.screenshot({path:`test-results/${test.info().project.name}-landscape.png`,fullPage:true});
});

test("PWA manifest and conservative offline shell", async ({ request }) => {
  const manifest=await (await request.get('/manifest.webmanifest')).json(); expect(manifest.display).toBe('standalone'); expect(manifest.icons.length).toBe(2);
  const sw=await (await request.get('/sw.js')).text(); expect(sw).toContain("cache.add('/offline.html')"); expect(sw).not.toContain('cache.put');
  const icon=await request.get('/icons/apple-touch-icon.png'); expect(icon.status()).toBe(200);
});
