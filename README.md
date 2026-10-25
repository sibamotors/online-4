# سیباموتور

سامانه مدیریت کار واحد برنامه‌ریزی و انبار (کانبان، اسکرام، گزارش کار، پیام‌رسان).
TanStack Start + React + PostgreSQL.

## اجرا روی VPS (GitHub → سرور → pm2)

پیش‌نیاز: Node.js 22+، PostgreSQL، pm2 (`npm i -g pm2`)، nginx.

```bash
# یک‌بار: دیتابیس
sudo -u postgres psql -c "CREATE USER sibamotor WITH PASSWORD '...';"
sudo -u postgres psql -c "CREATE DATABASE sibamotor OWNER sibamotor;"

# یک‌بار: کد و تنظیمات
git clone <repo-url> /srv/sibamotor && cd /srv/sibamotor
cp .env.example .env && chmod 600 .env && nano .env   # DATABASE_URL, SESSION_SECRET, ADMIN_BOOTSTRAP_*

./deploy/deploy.sh          # pull, install, build, migrate, pm2 start
pm2 startup                 # راه‌اندازی خودکار بعد از ریبوت
```

برای به‌روزرسانی‌های بعدی فقط `./deploy/deploy.sh` را اجرا کنید.
نمونه تنظیم nginx در `deploy/nginx.conf` است (با certbot روی HTTPS ببریدش).

## اعلان در بله (اختیاری)

در بله با `@botfather` یک ربات بسازید، توکنش را در `BALE_BOT_TOKEN` و آدرس سایت را در `APP_URL` (فایل `.env`) بگذارید و دوباره دیپلوی کنید.
هر کاربر از منوی پروفایل ← «اعلان در بله» یک کد می‌گیرد و برای ربات می‌فرستد. بعد از اتصال، ارجاع و منشن و گزارش جدید و یادآوری مهلت کارت‌ها (امروز، فردا، دیرکرد) به بله هم می‌رسد.
بدون توکن، این بخش در برنامه اصلاً نمایش داده نمی‌شود.

## اتاق کنفرانس (صدا و تصویر)

آیکن دوربین بالای صفحه (کنار آیکن افراد) ← «اتاق کنفرانس». هر کس اول شروع کند تا پایان آن کنفرانس میزبان است (می‌تواند بی‌صدا یا خارج کند و برای همه تمام کند). برای اتصال پایدار بین شبکه‌ها سرور TURN لازم است؛ مراحل در `deploy/conference-setup.md` است. فقط پروسه‌ی تک‌نمونه‌ای را پشتیبانی می‌کند (مثل بقیه‌ی برنامه).

## قابلیت‌های مدیریتی

- **سطح‌های مدیر**: «مدیر سیستم» همه‌چیز دارد. «ادمین سطح ۲» (فقط مدیر سیستم می‌سازد: کاربر جدید ← سطح دسترسی) کاربر عادی می‌سازد و ویرایش و حذف می‌کند، لاگ کامل و همه‌ی تب‌های مدیریت را می‌بیند، ولی به حساب مدیران دست نمی‌زند، ادمین نمی‌سازد و پشتیبان را بازگردانی نمی‌کند.
- **اتوماسیون** (ادمین ← تب «اتوماسیون»): قانون «وقتی … آنگاه …» برای هر تخته.
- **فرم‌ها** (ادمین ← تب «فرم‌ها»): فرم درخواست برای واحدهای دیگر؛ هر پاسخ یک کارت می‌سازد. کاربران از منوی «درخواست» فرم را پر می‌کنند.
- **نمای کلی**: وضعیت همه‌ی تخته‌ها، روند هفتگی، بار کاری و ظرفیت افراد.
- **گانت**: کشیدن نوار برای تغییر تاریخ، پیکان وابستگی، مسیر بحرانی.
- **زمان و برآورد**: در پنجره‌ی هر کارت.

## API و وب‌هوک

ادمین ← تب «API» توکن می‌سازد (فقط یک بار نمایش داده می‌شود). نمونه:
```bash
curl -H "Authorization: Bearer sbm_..." https://دامنه/api/v1/boards
curl -H "Authorization: Bearer sbm_..." https://دامنه/api/v1/boards/BOARD_ID/cards
curl -X POST -H "Authorization: Bearer sbm_..." -H "content-type: application/json" \
  -d '{"title":"کارت از API","priority":"high","dueDate":"2026-11-01"}' https://دامنه/api/v1/boards/BOARD_ID/cards
```
وب‌هوک‌ها با هر تغییر کارت یک POST امضاشده (`X-Sibamotor-Signature: sha256=…`) می‌فرستند.

## پشتیبان‌گیری

`deploy/backup.sh` با `pg_dump` از دیتابیس نسخه‌ی فشرده می‌گیرد و ۱۴ روز نگه می‌دارد. با cron هر شب اجرا کنید:
`30 2 * * * cd /srv/sibamotor && ./deploy/backup.sh >> /var/log/sibamotor-backup.log 2>&1`
بازیابی در یک دیتابیس خالی: `gunzip -c فایل.sql.gz | psql "$DATABASE_URL"`. فایل‌های پشتیبان را هر از گاهی به یک سرور دیگر هم کپی کنید.

## پایش

آدرس `/login` برای بررسی زنده بودن سایت کافی است (مثلاً با UptimeRobot). لاگ‌ها: `pm2 logs sibamotor`؛ برای جلوگیری از بزرگ‌شدن لاگ‌ها یک‌بار `pm2 install pm2-logrotate` را اجرا کنید.

## برنامه‌ی نصبی (PWA) و اعلان روی دستگاه

سایت قابل نصب است (Chrome/Edge: «Install»؛ آیفون: Share ← Add to Home Screen) و صفحه‌ی «آفلاین» دارد. برای اعلان فشاری:
```bash
npx web-push generate-vapid-keys     # یک بار؛ خروجی را در .env بگذارید
# VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...  VAPID_SUBJECT=mailto:you@example.com
./deploy/deploy.sh
```
بعد هر کاربر از پروفایل ← «برنامه‌ی نصبی و اعلان روی دستگاه» آن دستگاه را فعال می‌کند. اعلان فقط روی HTTPS کار می‌کند.
کار آفلاین کامل (ثبت تغییر بدون اینترنت) ندارد؛ برنامه برای داده به اینترنت نیاز دارد.

## نکته‌های مهم

- برنامه باید فقط **یک پروسه** باشد (`instances: 1`)؛ قفل نوشتن روی workspace داخل پروسه است.
- در حالت production کوکی فقط روی HTTPS کار می‌کند. اگر فقط HTTP دارید، `COOKIE_SECURE=false` بگذارید.
- ادمین اول از `ADMIN_BOOTSTRAP_*` ساخته می‌شود و باید در اولین ورود رمزش را عوض کند.
- فایل‌ها و عکس‌ها داخل خود دیتابیس ذخیره می‌شوند؛ از دیتابیس بک‌آپ بگیرید (`pg_dump`).

## توسعه

```bash
npm install
npm run dev        # http://localhost:8080  (DATABASE_URL لازم است)
npm run typecheck
npm test
```
