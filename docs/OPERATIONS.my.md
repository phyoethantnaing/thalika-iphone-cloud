# စီမံခန့်ခွဲခြင်း၊ backup နှင့် recovery (Kaggle)

## Session တစ်ခု၏ သက်တမ်း

| အခြေအနေ | ဖြစ်ပုံ |
| --- | --- |
| Save & Run All (Commit) | Browser ပိတ်လည်း background တွင် run သည်။ ပြီးဆုံးလျှင် `/kaggle/working` ကို output အဖြစ်သိမ်းသည် |
| Interactive Run | စမ်းသပ်ရန်သာ။ Idle ဖြစ်လျှင် Kaggle ကပိတ်နိုင်ပြီး output မသိမ်းပါ |
| `MAX_HOURS` ပြည့်ခြင်း | Generation ပြီးအောင်စောင့် (အများဆုံး ၂၅ မိနစ်) → ရပ် → data သိမ်း |
| Kaggle **Cancel run** / quota ကုန် | ချက်ချင်းရပ်သည်။ ထို version ၏ output ကို Kaggle က မသိမ်းနိုင်ပါ |

Session ပြီးလျှင် tunnel URL အလုပ်မလုပ်တော့ပါ။ နောက်တစ်ကြိမ် **Save & Run All** ပြန်နှိပ်ပြီး log ထဲမှ link အသစ်ကိုသုံးပါ။

## Data ပြန်ယူခြင်း

1. ယခင် **ပြီးဆုံးသော** commit version ရှိကြောင်း notebook ၏ **Versions** တွင်စစ်ပါ။
2. Editor တွင် **Add Input → Your Work → Notebooks → ဒီ notebook** ကိုရွေးပါ။
3. Run လုပ်လျှင် log တွင် `restoring saved Studio data from …` ပေါ်ရမည်။
4. Input များစွာ attach ထားလျှင် `.thalika-saved-at` အသစ်ဆုံးကိုသာ ရွေးသည်။ Existing data ကို overwrite မလုပ်ပါ။

## Kaggle အပြင်ဘက် backup

Kaggle storage တစ်ခုတည်းကို backup ဟုမယူဆပါနှင့်။ Version page → **Output** မှ `thalika-data` ကို download ပြီး
encrypted copy ထားပါ။ Job input spool တွင် private reference audio ပါနိုင်သည်။

ကွန်ပျူတာပေါ်တွင် `data/` ပါသော folder ကို backup/verify/restore လုပ်ရန်:

```bash
mkdir -p ~/thalika-root && cp -a ~/Downloads/thalika-data ~/thalika-root/data
python scripts/backup.py backup ~/private-backups/thalika-2026-11-10.tar.gz --root ~/thalika-root --confirm-quiescent
python scripts/backup.py verify ~/private-backups/thalika-2026-11-10.tar.gz
python scripts/backup.py restore ~/private-backups/thalika-2026-11-10.tar.gz --root ~/thalika-restored
```

Restore သည် မရှိသေးသော directory အသစ်တွင်သာ လုပ်ပြီး existing data ကို overwrite မလုပ်ပါ။

## Startup ပျက်ခြင်း

| Log | လုပ်ရန် |
| --- | --- |
| `No GPU` / `not supported` | Accelerator → **GPU T4 x2** |
| `Add a Kaggle secret THALIKA_OWNER_PASSWORD` | Secret ထည့်ပြီး notebook attach checkbox on |
| download / `Cloudflare tunnel exited` | **Internet On** နှင့် ဖုန်း verify စစ်ပါ |
| `command failed … uv pip install` | ခဏစောင့်ပြီး ပြန် run ပါ (PyPI/network) |
| `Model initialization failed` / warmup failed | Hugging Face error ကိုကြည့်ပါ၊ `HF_TOKEN` ထည့်ပါ |
| `Another app is using this persistent data directory` | Notebook တစ်ခုတည်းကိုသာ run ပါ |
| Login `Invalid request origin` | Log ထဲမှ **နောက်ဆုံး** URL ကိုသုံးပါ |

## Storage quota နှင့် cleanup

`DATA_QUOTA_GB` default 20 GiB ဖြစ်ပြီး Kaggle output ကန့်သတ်ချက် (~20 GB) နှင့်ကိုက်သည်။ Storage screen
တွင် used/quota ကြည့်ပြီး History မှ ရွေးချယ်ထားသော item ကို delete အတည်ပြုမှသာ ဖျက်သည်။
Model cache သည် `/tmp` တွင်ရှိပြီး output ထဲမပါပါ။

## Update

Notebook သည် run တိုင်း `BRANCH` ၏ နောက်ဆုံး commit ကို clone လုပ်သည်။ Repo update ပြီးလျှင် notebook ကို
ပြန် run ရုံသာ။ Branch/fork ပြောင်းလိုလျှင် notebook ထိပ်ရှိ `REPO_URL` / `BRANCH` ကိုပြင်ပါ။
Update မတိုင်မီ `npm run lint && npm test && npm run build && npm run test:e2e` အောင်မြင်ရမည်။

## GitHub

```bash
git remote -v             # origin သည် သင်ပိုင် repo ဖြစ်ရမည်၊ upstream သို့ push မလုပ်ပါ
git push -u origin cloud-iphone
git rev-parse HEAD
git ls-remote origin refs/heads/cloud-iphone   # SHA တူကြောင်းစစ်ပါ
```
