# Thalika — iPhone Cloud Edition

မြန်မာစာမှ သင့်အသံဖြင့် WAV ထုတ်နိုင်သော private voice studio ဖြစ်ပါသည်။ မူရင်း **VoxCPM2 2.0.3** engine၊ Burmese normalization၊ pronunciation lexicon၊ stable seed၊ chunk quality checks နှင့် **48 kHz mono 24-bit PCM WAV** pipeline ကို ဆက်လက်အသုံးပြုထားပါသည်။ Gemini script rewrite နှင့် optional Electron shell လည်း ပါဝင်ပါသည်။

မူရင်း: [San Lin Htike / Thalika](https://github.com/sanlinhtik3/thalika-voice-clone) · [Apache-2.0](LICENSE) · [NOTICE](NOTICE)။ မူရင်းရေးသားသူနှင့် မသက်ဆိုင်သော ပြင်ဆင်ထားသည့် edition ဖြစ်ပါသည်။ Model weights နှင့် dependencies များ၏ သီးခြား license စည်းကမ်းများကိုလည်း လိုက်နာပါ။

**လက်ရှိအခြေအနေ:** source code၊ owner authentication၊ iPhone/PWA interface၊ persistent jobs၊ Docker targets နှင့် Runpod lifecycle adapter တို့ ပါဝင်သည်။ စမ်းသပ်ရလဒ်နှင့် မပြီးသေးသော real-GPU / physical-iPhone checks ကို [TESTING.md](docs/TESTING.md) တွင် ဖော်ပြထားသည်။ Cloud deployment၊ GPU ငှားရမ်းခြင်းနှင့် image publication ကို အလိုအလျောက် မလုပ်ထားပါ။

## အသုံးပြုပုံ

1. iPhone Safari ဖြင့် သင့် **control service** URL ကိုဖွင့်ပြီး owner password ဖြင့်ဝင်ပါ။ Control service မတပ်ဆင်ထားပါက [Runpod dashboard](https://console.runpod.io/pods) ကိုသုံးပါ။
2. လက်ရှိ GPU စျေးနှုန်းကို Runpod တွင်စစ်ပြီး **Start GPU** နှိပ်ပါ။ GPU စျေးနှုန်းနှင့် ရရှိနိုင်မှုကို app က ကြိုတင်အာမမခံပါ။
3. **GPU Provisioning → Loading VoxCPM2 → Warming Up Model → Ready** အထိစောင့်ပါ။ ပထမဆုံး image/weights download သည် ကြာနိုင်ပါသည်။ Model health check တကယ်အောင်မြင်မှ Ready ဖြစ်ပါသည်။
4. **Open Studio** နှိပ်ပြီး Studio host တွင်လည်း ဝင်ပါ။ သီးခြား hostname ဖြစ်သောကြောင့် control service cookie ကို အလိုအလျောက် မမျှဝေပါ။
5. Studio တွင် **Files / Browse / iCloud Drive** မှ WAV သို့မဟုတ် M4A reference clip ရွေးပါ။ Upload ကို browser က ဖတ်ပြီး အရည်အသွေးစစ်သည်။ Profile သိမ်းလျှင် server သို့ တင်ပို့ပြီး private persistent storage တွင်သိမ်းပါသည်။
6. 6–30 seconds၊ တစ်ယောက်တည်းပြောသော၊ music မပါသည့် အသံကို အကြံပြုသည်။ အများဆုံး 10 MiB နှင့် 50 seconds ဖြစ်သည်။ Safari မဖတ်နိုင်သည့် format ဖြစ်ပါက WAV/M4A အဖြစ် export ပြန်လုပ်ပါ။
7. သင့်အသံဖြစ်ကြောင်း သို့မဟုတ် အသံပိုင်ရှင်၏ ခွင့်ပြုချက်ရရှိကြောင်း အတည်ပြုပါ။ Profile သိမ်းရာနှင့် cloning ပြုလုပ်ရာတွင် consent သီးခြားလိုပါသည်။ AI output သည် မူရင်းလူ၏အသံနှင့် တစ်ထပ်တည်းဖြစ်မည်ဟု အာမမခံပါ။
8. မြန်မာစာထည့်ပါ။ Pronunciation preview ကိုဖတ်ပြီး approve လုပ်ပါ။ လိုအပ်ပါက lexicon ပြင်ပါ။ Script ပြောင်းလျှင် approve ပြန်လုပ်ရပါမည်။
9. **Generate Local Audio** နှိပ်ပါ။ ဤနာမည်မှ “Local” သည် GPU container အတွင်းရှိ မူရင်း VoxCPM2 service ကို ဆိုလိုသည်။ အသံကို iPhone ပေါ်တွင်တွက်ချက်ခြင်း မဟုတ်ပါ။
10. Safari tab ပိတ်သော်လည်း GPU ဖွင့်ထားလျှင် လက်ခံထားသော job ဆက်လုပ်မည်။ **History** ကိုပြန်ဖွင့်ပြီး progress/results ကြည့်နိုင်သည်။
11. Preview၊ seek၊ pause/resume၊ **Download WAV** သို့မဟုတ် **Share / Save to Files** ကိုသုံးပါ။ Safari Share Sheet သည် device/browser support ပေါ်မူတည်သည်။
12. ပြီးလျှင် control service မှ **Stop GPU** နှိပ်ပြီး provider state **Stopped / EXITED** ဖြစ်ကြောင်း အတည်ပြုပါ။ Browser ပိတ်ခြင်းသည် GPU ပိတ်ခြင်း မဟုတ်ပါ။

Bottom tabs: **Studio · Scripts · History · Voices · Settings**။ Scripts တွင် Gemini rewrite၊ saved script ပြန်ဖွင့်/ပြင်ဆင်ခြင်းနှင့် revision အသစ်သိမ်းခြင်း ပါသည်။ Voices တွင် consented references၊ Settings → Storage တွင် quota နှင့် cleanup review ရှိသည်။

## iPhone Home Screen တွင် တပ်ဆင်ခြင်း

Safari → Share → **Add to Home Screen** → Add ကိုနှိပ်ပါ။ Manifest၊ Apple touch icon နှင့် safe-area support ပါဝင်သည်။ GPU Pod ကို အသစ်ပြောင်းလျှင် proxy URL လည်းပြောင်းသဖြင့် shortcut အသစ်လိုနိုင်သည်။ တည်ငြိမ်သော control service URL ကို Home Screen တွင်သိမ်းထားခြင်းကို အကြံပြုသည်။

Offline တွင် public notice သာပြနိုင်သည်။ Private scripts/audio များကို service worker cache မလုပ်ပါ။ **GPU ပိတ်ထားချိန် သို့မဟုတ် offline တွင် AI inference မရပါ။**

## တစ်ကြိမ်တည်း ပြင်ဆင်ရမည့်အရာများ

လိုအပ်ချက်များ: GitHub account၊ Docker build host (အနည်းဆုံး 40–60 GB free disk အကြံပြု)၊ Runpod account၊ billing ကိုကိုယ်တိုင်ပြင်ဆင်ထားခြင်း၊ HTTPS control host ရှိလျှင် optional control service။ Source ကို clone လုပ်မည့် destination သည် သင်ပိုင် repo ဖြစ်ရမည်။ Upstream author ထံ push မလုပ်ပါနှင့်။

### ၁။ Local source နှင့် owner credentials

Node.js **22.22.0**၊ Python **3.11** ကို အကြံပြုသည်။

```bash
git clone https://github.com/YOUR_ACCOUNT/thalika-iphone-cloud.git
cd thalika-iphone-cloud
npm ci --ignore-scripts
npm run setup:owner
```

`setup:owner` က `.env.local` နှင့် `.env.local.owner-password` ကို permission `0600` ဖြင့်ရေးသည်။ Password ကို terminal output မထုတ်ပါ။ Password file ကို သင့် password manager ထဲသို့ သိမ်းပါ။ Existing file ကို overwrite မလုပ်ပါ။ `.env.example` မှ optional settings များကိုသာ private file ထဲသို့ ပေါင်းထည့်ပါ။ Real credential ပါသော file မည်သည့်အရာကိုမျှ Git ထဲမတင်ပါနှင့်။

Local run:

```bash
npm run dev
# သီးခြား terminal: Python 3.10–3.12 နှင့် local GPU/CPU inference
bash scripts/voxcpm-local.sh
```

`http://localhost:3000` တွင်ဝင်ပါ။ Cloud image သည် local launcher ကိုမသုံးသဖြင့် session တိုင်း pip install ပြန်မလုပ်ပါ။ Local desktop အတွက် `npm run desktop` ကိုဆက်သုံးနိုင်သည်။ Local GPU မရှိလျှင် inference နှေးနိုင်ပါသည်။

### ၂။ Production image တည်ဆောက်ခြင်း

```bash
npm run lint
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e

# ကိုယ်ပိုင် registry သို့ တည်ဆောက်/တင်ပို့ရန်
export IMAGE_REPOSITORY=ghcr.io/YOUR_ACCOUNT/thalika-iphone-cloud
export IMAGE_TAG=release-1
bash scripts/build-image.sh
# registry login ကို အရင်လုံခြုံစွာလုပ်ထားပြီးမှ
PUSH_IMAGE=1 bash scripts/build-image.sh
```

Targets နှစ်ခုရှိသည်: `control` (CPU) နှင့် `gpu` (CUDA)။ Python 3.11.14၊ Torch/Torchaudio 2.8.0၊ CUDA 12.8 wheel stack၊ TorchCodec 0.7.0၊ Gradio 6.8.0၊ VoxCPM2 2.0.3 ကို pin လုပ်ထားသည်။ Transitive versions သည် `local-server/requirements.lock` တွင်ရှိသည်။ Docker build က dependency/ABI imports စစ်ပေးသည်။ CUDA 12.8 နှင့်ကိုက်ညီသော host driver ကို provider တွင်ရွေးပါ။

GitHub → Actions → **Build validated containers** workflow ကို ကိုယ်တိုင် run နိုင်သည်။ Publish ကို default ပိတ်ထားသည်။ GH Actions minutes၊ GHCR private storage/transfer allowance နှင့် charges ကိုစစ်ပြီးမှ publish ဖွင့်ပါ။ Tag တစ်ခုတည်းထက် build ကပြန်ပေးသော **image digest** ဖြင့် deploy လုပ်ပါ။ GHCR image private ဖြစ်ပါက Runpod ၏ Container Registry Auth တွင် `read:packages` permission သာရှိသော registry credential ကိုသိမ်းပြီး template နှင့်ချိတ်ပါ။ Public image လုပ်မည်ဆိုလျှင် ကိုယ်တိုင်ရွေးချယ်ပါ။ Real secrets သို့မဟုတ် audio/weights များ image ထဲမပါရပါ။

### ၃။ Runpod account နှင့် persistent storage

[Runpod](https://www.runpod.io/) တွင် account ဖွင့်ပါ။ Billing/payment ကိုကိုယ်တိုင်ပြင်ဆင်ပြီး လက်ရှိစျေးနှုန်းများကိုစစ်ပါ။ ဤ repo က balance ဖြည့်ခြင်း သို့မဟုတ် paid resources အလိုအလျောက်ဖန်တီးခြင်း မလုပ်ပါ။

Runpod → Storage တွင် **Network Volume** တစ်ခုဖန်တီးပါ။ Models၊ user data၊ backup headroom အတွက် capacity ကိုရွေးပါ။ 30–50 GB ဖြင့်စတင်စဉ်းစားနိုင်သော်လည်း သင်သိမ်းမည့်အသံအရေအတွက်ပေါ်မူတည်သည်။

**Network volumes သည် supported Secure Cloud data centers တွင်သာရပါသည်။** Volume location နှင့် GPU availability ကိုအတူစစ်ပါ။ RTX A5000 24GB / RTX 3090 24GB သည် compatible CUDA host ရှိလျှင် စဉ်းစားနိုင်သောရွေးချယ်စရာများသာဖြစ်သည်။ ပုံသေစျေးနှုန်းနှင့် stock ကိုအာမမခံပါ။ GPU count **1**၊ on-demand (non-spot) ကို ဦးစားပေးပါ။

Network volume ကို **Pod ဖန်တီးချိန်** တွင်ချိတ်ရသည်။ Live Pod မှ detach လုပ်၍မရပါ။ `/workspace` တွင် mount ဖြစ်ပြီး volume disk ကိုအစားထိုးသည်။ Volume ကို အသစ်သော Pod တွင်ပြန်သုံးနိုင်သော်လည်း ယခင် Pod attachment ကို provider dashboard မှ လုံခြုံစွာပြီးဆုံးစေရန်လိုသည်။

Persistent directories:

```text
/workspace/persistent/models   HF / Torch / ModelScope caches
/workspace/persistent/data     profiles, scripts, jobs, queue, WAV, history, lexicon
/workspace/persistent/config   Gemini settings, preferences / separate control state
```

အသစ်ဖန်တီးထားသည့် mount တွင် UID/GID **10001:10001** ရေးနိုင်ရန် one-time admin setup လိုနိုင်သည်။ `scripts/init-volume.sh` ကို mount ရှိသည့် host/container တွင် root administrator အဖြစ်သုံးပါ။ Existing root ကိုတွေ့ပါက script သည် ရပ်ပြီး မည်သည့် user data ကိုမျှမပြောင်းပါ။ Runpod တွင် volume permissions မကိုက်ပါက terminal/admin setup ဖြင့် အသစ်ဖြစ်သော directories များကိုသာ ပြင်ပါ။ `chmod 777` သို့မဟုတ် existing data ကို recursive chown မလုပ်ပါနှင့်။

### ၄။ Secrets နှင့် Pod template

Runpod secret management တွင် အောက်ပါ secret values ကို သီးခြားထည့်ပါ:

- `OWNER_PASSWORD_HASH`: setup command မှ salted hash
- `SESSION_SECRET`: setup command မှ session secret
- `RUNTIME_TOKEN`: control ↔ GPU အတွက် အနည်းဆုံး 32 characters token
- `GEMINI_API_KEY`: rewrite လိုမှသာ optional
- `HF_TOKEN`: gated/private Hugging Face access လိုမှသာ optional

Provider dashboard မှ template ဖန်တီးရာတွင် [template example](deploy/runpod-template.example.json) ကိုကြည့်ပါ။ Image digest ကို ကိုယ်တိုင်ဖြည့်ရမည်။ Secret names ကို သင့် Runpod secret names နှင့်ကိုက်ညီစေပါ။ Provider template secret reference syntax ကို [official docs](https://docs.runpod.io/pods/templates/secrets) နှင့်စစ်ပါ။ **RUNPOD_API_KEY ကို GPU Pod ထဲမထည့်ပါနှင့်။**

Public port သည် **3000/http တစ်ခုတည်း** ဖြစ်ရမည်။ **7860 ကို မဖွင့်ပါနှင့်**။ Gradio သည် loopback only ဖြစ်သည်။ Docker image default ENTRYPOINT ကိုမပြောင်းပါနှင့်။ Node နှင့် model supervisor က prebuilt dependencies ကိုတိုက်ရိုက်သုံးသည်။ Runpod ၏ injected `RUNPOD_POD_ID` ရှိလျှင် HTTPS `APP_ORIGIN` ကို supervisor က official proxy URL အဖြစ်သတ်မှတ်ပေးသည်။ Custom domain သုံးလျှင် `APP_ORIGIN=https://...` ကိုအတိအကျထည့်ပါ။

Ready ဖြစ်လာလျှင် `https://POD_ID-3000.proxy.runpod.net` ကို Safari တွင်ဖွင့်နိုင်သည်။ Model cache မရှိသေးလျှင် ပထမဆုံး download ဖြစ်မည်။ Cache ရှိပြီးသောနောက် session အသစ်တွင် software/pip install ပြန်မလုပ်ဘဲ cached weights ကိုဖတ်သည်။ Image pull၊ storage attach၊ model load၊ warmup ကြောင့် startup ကြာချိန် အပြောင်းအလဲရှိသည်။

### ၅။ သီးခြား control service — optional

အမြဲရရှိနိုင်သော HTTPS CPU host ရှိပါက `control` image ကို deploy လုပ်ပါ။ GPU Pod ထဲတွင်သာ control service ထားခြင်း မပြုပါနှင့်။ ထိုသို့ထားလျှင် Pod ပိတ်ပြီးနောက် ပြန်ဖွင့်မရပါ။ Existing host မရှိလျှင် အပို host လစဉ်ကုန်ကျနိုင်သည်။ ဤ project က control host ကိုသင့်အစားမဝယ်ပါ။

`deploy/compose.control.yml` သည် existing host အတွက် example ဖြစ်သည်။ **Runpod Pod ထဲတွင် Docker Compose run ရန် မဟုတ်ပါ။** HTTPS reverse proxy မှ `127.0.0.1:3001` သို့ချိတ်ပါ။ Private `.env.control` တွင်:

```dotenv
THALIKA_ROLE=control
THALIKA_CLOUD=1
APP_ORIGIN=https://control.example.com
THALIKA_DATA_DIR=/workspace/persistent/data
THALIKA_CONFIG_DIR=/workspace/persistent/config
THALIKA_INSTALLATION_ID=owner1
IDLE_TIMEOUT_MINUTES=20
AUTO_STOP_ENABLED=0
SESSION_BUDGET_USD=2
ALLOW_GPU_PROVISIONING=0
```

အောက်ပါ credentials/IDs ကို private environment မှထည့်ပါ: `OWNER_PASSWORD_HASH`, `SESSION_SECRET`, `RUNTIME_TOKEN`, `RUNPOD_API_KEY`, `RUNPOD_POD_ID` (existing managed Pod ရှိလျှင်), `RUNPOD_TEMPLATE_ID`, `RUNPOD_NETWORK_VOLUME_ID`, `RUNPOD_DATA_CENTER_ID`။ Studio နှင့် controller တို့၏ RUNTIME_TOKEN တူရမည်။ Controller disk သည် GPU volume နှင့် သီးခြားဖြစ်ရမည်။

Default အနေဖြင့် provisioning မဖွင့်ထားပါ။ ငွေကုန်ကျမှုကိုသဘောတူပြီး GPU template၊ volume နှင့် data center စစ်ပြီးမှ `ALLOW_GPU_PROVISIONING=1` လုပ်ပါ။ **Start GPU** သည် matching existing Pod ရှိပါက resume၊ မရှိမှသာ create လုပ်သည်။ Provider request မသေချာပါက ထပ်မဖန်တီးဘဲ reconciliation လိုကြောင်းပြသည်။

Zero-additional-control-host fallback: Safari မှ [Runpod dashboard](https://console.runpod.io/pods) တွင် Start / Stop ကိုသုံးပါ။ Storage နှင့် provider ကိုယ်တိုင်၏ charges များ ဆက်ရှိနိုင်သည်။

## နောက်တစ်ကြိမ် GPU သုံးရာတွင်

1. Control service သို့မဟုတ် Runpod dashboard ဖွင့်ပါ။
2. Existing Pod ကို Start / Resume လုပ်ပါ။ GPU ပြန်ရမည်ဟု အာမမခံပါ။
3. Readiness အောင်မြင်သည်အထိစောင့်ပြီး Open Studio နှိပ်ပါ။
4. Saved voices၊ scripts၊ history နှင့် model cache အားလုံး တူညီသော persistent mount မှပြန်ပေါ်လာမည်။
5. Session ပြီးလျှင် active jobs ပြီးဆုံးမှ Stop လုပ်ပါ။

GPU မရလျှင် [recovery guide](docs/OPERATIONS.my.md) ကိုလိုက်နာပါ။ Network volume ကိုမဖျက်ပါနှင့်။

## ကုန်ကျစရိတ်ကို ကာကွယ်ခြင်း

Dashboard သည် real provider Pod rate နှင့် session time မှ estimate တွက်သည်။ စျေးနှုန်းမရလျှင် **Unavailable** ပြသည်။ GPU utilization/VRAM မရပါက အတုမပြပါ။ Provider invoice သာ အတည်ဖြစ်သည်။ အောက်ပါအမျိုးအစားများကို သီးခြားစဉ်းစားပါ:

| အမျိုးအစား | ပိတ်ပြီးနောက် |
| --- | --- |
| GPU compute / Pod running rate | Stop state ကို provider တွင် verify လုပ်ပါ |
| Network volume storage | Pod ပိတ်/terminate လုပ်သော်လည်း ဆက်ကုန်နိုင်သည် |
| Pod volume disk | Stopped အခြေအနေတွင်လည်း သီးခြားစျေးဖြင့်ကုန်နိုင်သည် |
| Container disk / transfer / gateway | Provider policy နှင့် usage ပေါ်မူတည်သည် |
| Control host / HTTPS / domain | သင့်ရွေးချယ်ထားသော host ပေါ်မူတည်သည် |
| GH Actions / registry storage / transfer | သင့် account allowance ပေါ်မူတည်သည် |
| Gemini rewrite | API plan/usage ပေါ်မူတည်သည် |

Idle warning default သည် 20 minutes ဖြစ်သည်။ Safe automatic stop ကိုလိုမှ controller တွင် `AUTO_STOP_ENABLED=1` လုပ်ပါ။ Active jobs ရှိလျှင် မပိတ်ပါ။ Runtime/model readiness ကိုမသိနိုင်လျှင် အလိုအလျောက်မပိတ်သဖြင့် failed startup compute ကို dashboard မှကိုယ်တိုင်စစ်ပြီးပိတ်ရသည်။ Notification သည် app အတွင်းဖြစ်သည်; iOS background push alarm အာမမခံပါ။ Budget warning သည် hard spending cap မဟုတ်ပါ။

Storage balance မရှိတော့လျှင် provider က data ကိုနောက်ဆုံးဖျက်နိုင်သဖြင့် balance notifications နှင့် off-provider backup ကို ကိုယ်တိုင်ပြင်ဆင်ပါ။ **Stopped GPU သည် အားလုံးအခမဲ့ဖြစ်သွားခြင်း မဟုတ်ပါ။**

## Backup၊ update နှင့် recovery

[အသေးစိတ် Myanmar လမ်းညွှန်](docs/OPERATIONS.my.md) တွင်:

- no-GPU replacement နှင့် network volume ပြန်သုံးခြင်း
- stopped/resumed/terminated/new Pod ကွာခြားချက်
- stalled startup နှင့် stale control lock recovery
- backup verification နှင့် empty-directory restoration
- immutable image update နှင့် rollback
- operator CLI lifecycle/readiness scripts
- GitHub push မရလျှင် local Git bundle မှဆက်လုပ်ရန်

[Architecture](docs/ARCHITECTURE.md)၊ [Upstream audit](docs/AUDIT.md)၊ [Testing](docs/TESTING.md) နှင့် [Original README](docs/UPSTREAM_README.md) ကိုလည်းကြည့်နိုင်သည်။
