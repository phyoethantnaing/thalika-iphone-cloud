# စီမံခန့်ခွဲခြင်း၊ backup နှင့် recovery

ဤလုပ်ဆောင်ချက်များသည် သင့် account/billing ကိုအလိုအလျောက်မပြောင်းပါ။ Resource ဖန်တီးခြင်းနှင့် start လုပ်ခြင်းသည် ငွေကုန်နိုင်သည်။ လက်ရှိ Runpod စျေးနှုန်းကိုစစ်ပြီး ကိုယ်တိုင်လုပ်ဆောင်ပါ။ API key ကို shell history ထဲတွင် မရိုက်ပါနှင့်; protected environment / provider secret manager မှပေးပါ။

## Stop / Resume / Terminate / Replacement

| လုပ်ဆောင်ချက် | အကျိုးဆက် |
| --- | --- |
| Stop | GPU ကိုပြန်လွှတ်သည်။ Pod volume disk ရှိပါက Pod မဖျက်မချင်းကျန်နိုင်ပြီး storage charge ရှိသည်။ Container disk ကို persistent ဟုမယူဆပါနှင့်။ |
| Resume / Start | Existing Pod ကိုပြန်စတင်သည်။ GPU capacity မရှိလျှင် မရနိုင်ပါ။ Zero GPU ဖြစ်နိုင်သဖြင့် model Ready ကိုအတည်ပြုပါ။ |
| Terminate | Pod နှင့် Pod-tied data ကိုဖျက်နိုင်သည်။ Network volume သီးခြားဖြစ်သော်လည်း provider UI တွင် ဖျက်မည့် resource ကိုသေချာစစ်ပါ။ |
| New Pod + network volume | Compatible data center တွင် GPU အသစ်နှင့် cached files ပြန်သုံးသည်။ Volume ကို Pod creation အချိန်တွင်ချိတ်ရသည်။ |

App/API သည် Pod termination နှင့် storage deletion ကိုမလုပ်ပေးပါ။ အန္တရာယ်ရှိသောလုပ်ဆောင်ချက်များကို dashboard မှ သီးခြားအတည်ပြုလုပ်ပါ။

## GPU မရခြင်း / startup ပျက်ခြင်း

1. Active job မရှိကြောင်း History မှစစ်ပါ။ Startup failure ဖြစ်ပါက private container logs ကိုစစ်ပါ။
2. Runpod dashboard တွင် GPU count၊ host CUDA/driver compatibility၊ image pull နှင့် volume mount ကိုစစ်ပါ။ Port 3000/http ဖွင့်ထားပြီး 7860 မဖွင့်ထားကြောင်းစစ်ပါ။
3. Volume ရှိ files နှင့် backup ကိုစစ်ပါ။ Volume ID၊ data center ID နှင့် image digest ကိုမှတ်ထားပါ။
4. Same-machine GPU ပြန်မရပါက support migration သို့မဟုတ် network-volume replacement ကိုသုံးပါ။ Community Cloud တွင် detachable network volume ရမည်ဟုမယူဆပါနှင့်။
5. ယခင် Pod ကို terminate လုပ်ရန်လိုပါက **Pod-tied volume data မပျောက်ကြောင်း backup အရင်အတည်ပြုပါ**။ Network volume ကိုမဖျက်ပါနှင့်။
6. Network volume ၏ location ထဲတွင် compatible GPU ရွေး၍ template/prebuilt image နှင့် **Pod အသစ်ဖန်တီးချိန်** တွင် volume ချိတ်ပါ။
7. Controller ကိုရပ်ပါ။ Private config ရှိ `control.json` ကို backup ထားပြီး tracked `podId` ကို Pod အသစ် ID ဖြင့်ပြင်ပါ။ `intent` နှင့် `readyAt` ကိုသာ reset လုပ်ပါ။ `requestedAt` ကိုဖျက်လျှင် နောက် manual startup observation မှ latency တိုင်းနိုင်သည်။ `RUNPOD_POD_ID` ကိုလည်းညှိပါ။
8. Controller ပြန်စပါ။ State ကို provider တွင် verify လုပ်ပြီး Ready အထိစောင့်ပါ။ iPhone Studio shortcut သည် URL အသစ်လိုနိုင်သည်။

Provider POST timeout အပြီး Pod ဖန်တီးပြီးသားဖြစ်နိုင်သည်။ **Create ကိုချက်ချင်းထပ်မလုပ်ပါနှင့်**။ Runpod တွင် installation name `thalika-OWNER_ID` နှင့် matching Pod အရေအတွက်ကိုစစ်ပါ။ Duplicate ရှိပါက operator ကိုယ်တိုင် reconciliation ပြုလုပ်ပြီးမှ `control.json` ကိုပြင်ပါ။

`control.lock` သည် controller တစ်ခုတည်းသာ start/stop လုပ်ရန်ကာကွယ်သည်။ Crash အပြီး stale lock ဖြစ်ပါက controller ကိုအရင်ရပ်၊ provider resources အားလုံးစစ်၊ lock ကို သီးခြားဖယ်ရှားပြီး controller ပြန်စပါ။ App က stale lock ကိုအလိုအလျောက် မဖျက်ပါ။

Startup/model မတက်သောကြောင့် safe stop မရပါက provider dashboard မှ active work မရှိကြောင်းစစ်ပြီး Stop ကိုကိုယ်တိုင်လုပ်ပါ။ Failed startup အတွက် charges ဆက်ရှိနိုင်သည်။ Monitor မရောက်နိုင်သော Pod ကို idle ဟုအတုမယူဆပါ။

## Operator CLI

App control plane ကိုမသုံးဘဲ operator environment မှ official APIs ခေါ်နိုင်သည်။ Commands သည် raw provider env/secrets ကို output မထုတ်ပါ။

```bash
node scripts/runpod.mjs list
node scripts/runpod.mjs status
# RUNPOD_POD_ID သတ်မှတ်ထားပြီး စျေးနှုန်းအတည်ပြုပြီးမှ
node scripts/runpod.mjs resume --approve-charges
# active jobs ကို scoped RUNTIME_TOKEN ဖြင့်စစ်ပြီးမှပိတ်မည်
node scripts/runpod.mjs stop

# Network volume အသစ်: storage charge ရှိသည်။ လိုမှသာတစ်ကြိမ်လုပ်ပါ။
# RUNPOD_VOLUME_GB, RUNPOD_DATA_CENTER_ID လိုသည်
node scripts/runpod.mjs create-volume --approve-charges
# template / volume / data center / installation ID လိုသည်
node scripts/runpod.mjs create-pod --approve-charges

# HTTPS STUDIO_URL, RUNTIME_TOKEN ဖြင့် actual readiness ကိုတိုင်းရန်
node scripts/readiness.mjs
```

Restart သည် active jobs ပြီးအောင်စောင့်ပြီး safe stop → verify EXITED → resume → readiness စစ်ခြင်းဖြစ်သည်။ Software install နှင့် models ကို session တိုင်းပြန်ယူရန်မလိုပါ။ CLI သည် failed POST ကိုအလိုအလျောက် retry မလုပ်ပါ။ Network timeout ပြီးလျှင် dashboard ကိုစစ်ပါ။

## Backup နှင့် restore

Provider storage တစ်ခုတည်းကို backup ဟုမယူဆပါနှင့်။ ပြင်ပ encrypted copy ထားပါ။ Job input spool တွင် private reference audio ပါနိုင်သဖြင့် backup ကို private recording အဖြစ်ကာကွယ်ပါ။

1. Generation အားလုံးပြီးဆုံးအောင်စောင့်ပါ။
2. Backup တင်ချိန်တွင် **Node/model/control writers** အားလုံးကိုရပ်ထားပါ။ GPU မလိုသော admin storage access / provider S3-compatible tool ရှိပါကသုံးနိုင်သည်။ Root ownership ပြောင်းလဲခြင်းမလုပ်ပါနှင့်။
3. Persistent mount ကိုရရှိသော admin host/container တွင်:

```bash
python scripts/backup.py backup /private-backups/thalika-2026-10-15.tar.gz \
  --root /workspace/persistent --confirm-quiescent
python scripts/backup.py verify /private-backups/thalika-2026-10-15.tar.gz
```

`--include-models` ထည့်လျှင် weights/cache ကိုပါသိမ်းသည်။ မထည့်လျှင် data/config သာပါပြီး disaster recovery တွင် models ပြန်ယူရနိုင်သည်။ အမြန်ဆုံးပြန်စရန် models ပါသော backup သီးခြားထားပါ။ Archive သည် plaintext ဖြစ်သောကြောင့် age/GPG သို့မဟုတ် သင်ယုံကြည်သော backup encryption ဖြင့် encrypt လုပ်ပြီးမှ ပြင်ပသို့ကူးပါ။ Secrets manager ထဲရှိ owner/session/provider credentials များကို password manager တွင်သီးခြားသိမ်းပါ။

Restore သည် **မရှိသေးသော directory အသစ်** တွင်သာလုပ်နိုင်ပြီး existing user data ကို overwrite မလုပ်ပါ:

```bash
python scripts/backup.py restore /private-backups/thalika-2026-10-15.tar.gz \
  --root /workspace/restored-persistent
```

Checksum verify ကိုအရင်လုပ်ပါ။ Restore files/ownership/paths/keys ကိုစစ်ပြီး mount/env ကို directory အသစ်သို့ပြောင်းပါ။ Old persistent directory ကိုသေချာစစ်ပြီးမှ ကိုယ်တိုင်ဖျက်ရန်ဆုံးဖြတ်ပါ။ App က old data ကိုမဖျက်ပါ။ Controller persistent state ကို controller host မှ သီးခြား backup လုပ်ပါ။

## Storage quota နှင့် cleanup

`DATA_QUOTA_GB` default 20 GiB သည် app data/spool quota ဖြစ်သည်။ Models သည် quota ထဲမပါသော်လည်း volume space စားသည်။ Storage screen တွင် used/quota/filesystem free ကိုပြသည်။ Free-space reserve 512 MiB ကိုကာကွယ်ထားသည်။

History မှ ရွေးချယ်ထားသော item ကို delete အတည်ပြုလျှင် WAV၊ job record၊ review၊ သက်ဆိုင်ရာ private execution input ကိုဖျက်သည်။ Stale request ထပ်မလုပ်စေရန် audio မပါသော idempotency digest/ID tombstone သာကျန်သည်။ Saved script ကိုမဖျက်ပါ။ Voices မှ delete လျှင် ရွေးချယ်ထားသော profile/reference ကိုသာဖျက်သည်။ မည်သည့် user data ကိုမျှ scheduled automatic cleanup မလုပ်ပါ။ Active job ကို delete မလုပ်နိုင်ပါ; cancellation သည် current chunk/model call ပြီးမှအကျိုးသက်ရောက်နိုင်သည်။

## Update နှင့် rollback

1. Jobs ပြီးဆုံးပြီး backup လုပ်ပါ။
2. GitHub source update ကိုယူ၍ tests နှင့် image build/import checks အောင်မြင်စေပါ။
3. Registry သို့ commit tag အသစ်တင်ပြီး digest ကိုမှတ်ထားပါ။ Model weights cache ကိုဖျက်ရန်မလိုပါ။
4. Pod ကိုရပ်ပြီး template/image digest အသစ်နှင့် mount paths တူညီအောင် update လုပ်ပါ။ Provider edit/restart သည် container disk ကိုရှင်းနိုင်သည်။ Data ကို `/workspace/persistent` တွင်သာထားပါ။
5. Resume → model readiness → saved profiles/history → short/long Burmese output ကိုလူနားဖြင့်စစ်ပါ။
6. Failure ဖြစ်ပါက အရင် image digest သို့ rollback လုပ်ပါ။ Model/schema behavior ပြောင်းလဲသော release များတွင် backup copy အရင်စမ်းပါ။

## GitHub delivery ကိုဆက်လုပ်ရန်

Connected account သည် `phyoethantnaing` ဖြစ်သည်။ Integration က repo creation ကိုမပေးပါက [GitHub New Repository](https://github.com/new) မှ **empty private** `thalika-iphone-cloud` တည်ဆောက်ပြီး connected GitHub app ကိုထို repo access ပေးပါ။ Unrelated repo ကိုမသုံးပါနှင့်။

Local workspace မှ:

```bash
cd /workspace/thalika-iphone-cloud
git remote -v
# origin သည် သင်ပိုင် repo ဖြစ်ရမည်၊ upstream ကိုမသုံးပါနှင့်
git push -u origin cloud-iphone
# remote branch SHA နှင့် local SHA တူကြောင်းစစ်ပါ
git rev-parse HEAD
git ls-remote origin refs/heads/cloud-iphone
```

Git bundle မှ project ပြန်ဖွင့်ရန်:

```bash
git clone thalika-iphone-cloud.bundle thalika-iphone-cloud
cd thalika-iphone-cloud
git switch cloud-iphone
git remote rename origin bundle-source
git remote add origin https://github.com/phyoethantnaing/thalika-iphone-cloud.git
git push -u origin cloud-iphone
```

Source archive သည် tracked source သာပါသည်။ Real credentials၊ user recordings၊ model cache နှင့် test-generated audio မပါရပါ။ Workflow/image publication မလုပ်မီ GitHub account allowance ကိုစစ်ပါ။
