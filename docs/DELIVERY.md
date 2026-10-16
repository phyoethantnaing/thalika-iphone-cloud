# ပေးအပ်မှုနှင့် စမ်းသပ်ရလဒ်

Delivery date: **2026-10-16**. Source branch: `cloud-iphone`.
Upstream base: `cf00a0c8eb269efb1796c26f152372325465eba6`.
Final source identity: run `git rev-parse HEAD`; the downloadable delivery report
records the final commit SHA. [Changed files](CHANGES.md) lists every source change.

## ပါဝင်သော application

- မူရင်း VoxCPM2 2.0.3 / 11-argument Gradio interface၊ Burmese normalization၊
  pronunciation approval/lexicon၊ deterministic seeds၊ chunk QA/mastering နှင့်
  48 kHz mono 24-bit PCM WAV pipeline ကိုထိန်းထားသည်။ Gemini rewrite နှင့်
  optional Electron shell ဆက်ပါဝင်သည်။
- iPhone bottom tabs၊ safe areas၊ bundled Myanmar Unicode font၊ Files-style
  uploads၊ consented profiles၊ script revisions၊ audio preview/download/share၊
  installable PWA နှင့် public offline notice ပါဝင်သည်။
- Private persistent job spool၊ idempotent submissions၊ browser reopen recovery၊
  cooperative cancellation၊ owner sessions/CSRF၊ upload/path validation၊ quotas
  နှင့် confirmed-item cleanup ပါဝင်သည်။
- သီးခြား CPU control plane၊ official Runpod REST adapter၊ verified model readiness၊
  duplicate provisioning suppression၊ safe stop reservation၊ cost estimates နှင့်
  opt-in idle stop ပါဝင်သည်။ Provider dashboard ကို fallback အဖြစ်သုံးနိုင်သည်။
- Prebuilt CPU/GPU Docker targets၊ pinned dependencies၊ manual image workflow၊
  volume initialization၊ readiness၊ lifecycle၊ backup/restore scripts ပါဝင်သည်။

## တကယ်ပြီးဆုံးသော စမ်းသပ်မှုများ

These results were executed during this implementation session, before packaging.
They are not claims of a live production deployment.

| Check | Observed result |
| --- | --- |
| `npm run lint` | Passed TypeScript checks |
| `npm test` | 10 tests passed |
| `npm run build` | Next.js 16.4.1 production build passed |
| `npm run test:e2e` | 6 passed: 3 mobile Chromium, 3 iPhone-profile WebKit |
| Browser contracts | Auth/CSRF, portrait/landscape overflow, uploads, consent, profile/script persistence, idempotency, close/reopen job recovery, audio playback/pause/seek, WAV header/download and byte ranges, settings, manifest/icons/SW passed |
| CPU container | Build and actual non-root smoke test passed: health, owner login, Secure/HttpOnly/SameSite cookies, CSRF and private Studio API isolation |
| GPU container | Build, `pip check`, Torch/Torchaudio/TorchCodec/Gradio/VoxCPM imports and Python 11-argument Gradio contract checks passed |
| Python / shell | Python compilation and startup/operator shell syntax checks passed |
| Production dependency audit | `npm audit --omit=dev`: zero advisories at audit time |
| Full development audit | Seven advisory records remain in the Tailwind 3 build-tool chain; see [security notes](SECURITY.md) |
| Delivery privacy checks | Tracked source/history checked for private env files, audio and model weights; none included |

Browser generation and the Python contract check use explicit synthetic inference
test doubles. The Python check constructs the actual Gradio interface and tests
the original audio conversion contract; it does not load the real model weights.
Playwright WebKit is a Linux browser engine, not a physical iPhone Safari test.
The final browser run used temporary Linux WebKit library support through the
optional `THALIKA_WEBKIT_EXECUTABLE` setting. Standard CI uses Playwright's supported
`npx playwright install --with-deps chromium webkit` setup.

Validated build identities (local validation images, **not published releases**):

```text
control: sha256:ea254b5fd29a2dadae3c89709423e64466e1829aa789c4387060dd4af4865fae
gpu:     sha256:f260ddc99a0ae79e1625aebcb4a9df1037209542434f1347569a6a5c9cb6792c
```

The GPU validation image and transient build/browser artifacts were cleaned to
recover constrained workspace disk. A subsequent GPU runtime inspection could not
run because the VFS daemon needed another large filesystem copy; it is not counted
as a passed check. The GPU image build/import/contract checks above did complete.
Final CSS containment improvements were separately production-built and browser
tested. Rebuild the final source commit and publish your own immutable registry
digest before deployment; these local validation IDs are not downloadable tags.

## မပြီးသေးသော external acceptance

**Real GPU၊ real VoxCPM2 speech quality နှင့် physical iPhone acceptance ကို
မစမ်းသပ်ရသေးပါ။** Paid provisioning ခွင့်ပြုချက်/credentials မရှိသဖြင့် Runpod
resources မဖန်တီးထားပါ။ Model first-load/cached-restart latency၊ actual CUDA device၊
real Burmese voice quality၊ provider stop/resume/replacement and billing တို့ကို
[release checklist](TESTING.md) အတိုင်း စစ်ရန်ကျန်သည်။ Startup seconds ကို မတီထွင်ထားပါ။
iCloud picker၊ actual Share Sheet နှင့် iOS suspension ကို device ပေါ်တွင်စစ်ပါ။
GitHub Actions နှင့် registry publication ကိုလည်း run မလုပ်ထားပါ။

## GitHub delivery အခြေအနေ

Authenticated account: **phyoethantnaing**.
Requested destination: `https://github.com/phyoethantnaing/thalika-iphone-cloud`.
The destination was not resolvable during verification. Repository creation was
retried and GitHub returned:

```text
GraphQL: Resource not accessible by integration (createRepository)
```

**Repository ဖန်တီးခြင်းနှင့် push မအောင်မြင်သေးပါ။** Unrelated repositories များကို
မသုံးထားပါ။ Upstream push URL ကို `DISABLED_UPSTREAM_PUSH` အဖြစ်ပိတ်ထားသည်။
Complete local repository၊ tracked-source ZIP နှင့် verified Git bundle ကို
fallback အဖြစ်ပေးထားသည်။

သင့် account မှ [empty private repository](https://github.com/new) တစ်ခုကို
`thalika-iphone-cloud` အမည်ဖြင့်ဖန်တီးပြီး connected GitHub app access ပေးပါ။
ထို့နောက် [GitHub delivery commands](OPERATIONS.my.md#github-delivery-ကိုဆက်လုပ်ရန်)
အတိုင်း `cloud-iphone` ကို push လုပ်ပြီး `git ls-remote` SHA နှင့် local SHA
တူကြောင်းစစ်ပါ။ Existing unrelated content ရှိပါက overwrite/force-push မလုပ်ပါနှင့်။

## စတင်အသုံးပြုရန် ကျန်သော လုပ်ဆောင်ချက်များ

1. [Myanmar README](../README.md) အတိုင်း owner credentials ကို private file တွင်
   တစ်ကြိမ်ဖန်တီးပါ။ Local development ကို cloud provisioning မလုပ်ဘဲစတင်နိုင်သည်။
2. ကိုယ်ပိုင် registry တွင် final commit ၏ control/GPU images ကို build/publish
   လုပ်ပြီး immutable digests မှတ်ပါ။ Account allowance နှင့် build charges ကိုစစ်ပါ။
3. Runpod account/billing၊ လက်ရှိ GPU availability/price နှင့် supported network
   volume location ကိုကိုယ်တိုင်စစ်ပြီးမှ paid resources ဖန်တီးပါ။ အသစ်သော persistent
   directories ကို UID/GID 10001 ရေးနိုင်အောင်တစ်ကြိမ်ပြင်ဆင်ပါ။
4. Provider secrets ထည့်ပြီး GPU template တွင် image digest/volume/port 3000 ကို
   configure လုပ်ပါ။ Port 7860 ကို public မဖွင့်ပါနှင့်။
5. ရှိပြီးသား HTTPS CPU host တွင် optional controller deploy လုပ်ပါ၊ သို့မဟုတ်
   Runpod dashboard မှ start/stop လုပ်ပါ။ Extra hosting မဖြစ်မနေမလိုပါ။
6. [Real-GPU and iPhone acceptance](TESTING.md) ပြီးမှ daily use စတင်ပါ။
   Active jobs ပြီးဆုံးပြီးနောက် stop state ကို provider တွင်အတည်ပြုပါ။
7. [Backup/recovery guide](OPERATIONS.my.md) အတိုင်း encrypted off-provider backup
   ထားပါ။ Persistent storage ကို app ကအလိုအလျောက်မဖျက်ပါ။

## ဆက်လက်ကုန်ကျနိုင်သော အမျိုးအစားများ

Running GPU compute၊ network/Pod volume storage၊ transfer/gateway၊ optional control
host/domain/HTTPS၊ registry/Actions usage နှင့် optional Gemini usage ကိုသီးခြား
စစ်ရမည်။ Fixed price သို့မဟုတ် stopped session အားလုံးအခမဲ့ဟု မအာမခံပါ။
App rate ရရှိမှသာ estimate ပြသည်; provider invoice ကိုအတည်ယူပါ။
Idle stop သည် opt-in ဖြစ်ပြီး ready runtime ကိုမဆက်သွယ်နိုင်လျှင် မပိတ်ပါ။
Failed startup နှင့် network failure ဖြစ်ချိန်တွင် provider dashboard ကိုကိုယ်တိုင်
စစ်ရန်လိုသည်။ Budget warning သည် hard billing cap မဟုတ်ပါ။
