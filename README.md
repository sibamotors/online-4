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
