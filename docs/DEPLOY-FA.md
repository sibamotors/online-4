# راه‌اندازی روی سرور مجازی (Ubuntu + Nginx + PM2)

برای سرور لینوکسی (مثلاً VPS ایرانی) با دامنهٔ خودتان. همهٔ دستورها روی سرور و با کاربر عادی (غیر root) هستند، مگر آنجا که `sudo` آمده.

## ۰) پشتیبان از داده‌های فعلی
اگر برنامه جای دیگری اجرا می‌شود: با ادمین وارد شوید → منوی کاربر → **پشتیبان‌گیری** و فایل JSON را نگه دارید. در سرور جدید با **بازیابی از فایل پشتیبان** برمی‌گردد.

## ۱) دامنه
در پنل دامنه، رکورد **A** دامنه (و `www`) را به IP سرور بزنید. انتشار DNS ممکن است چند ساعت طول بکشد.

## ۲) نصب ابزارها
```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx postgresql git ufw certbot python3-certbot-nginx
# Node.js 22 (مثلاً با NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs
sudo npm i -g pm2
node -v   # باید 22.12 یا بالاتر باشد
```
اگر سرور به NodeSource دسترسی ندارد، از آینهٔ npm/ریپازیتوری داخلی یا `nvm` با فایل‌های دانلودشده استفاده کنید.

فایروال:
```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## ۳) دیتابیس
```bash
sudo -u postgres psql <<'SQL'
create user sibamotor with password 'یک-رمز-قوی';
create database sibamotor owner sibamotor;
SQL
```
آدرس دیتابیس: `postgresql://sibamotor:یک-رمز-قوی@localhost:5432/sibamotor` (برای localhost اتصال SSL خودکار خاموش است).

## ۴) کد برنامه
```bash
cd ~ && unzip sibamotor-secure-*.zip && cd sibamotor-main     # یا git clone
cp .env.example .env && nano .env
```
در `.env` مقدار `DATABASE_URL`، **`SESSION_SECRET`** (حداقل ۳۲ کاراکتر تصادفی) و `ADMIN_BOOTSTRAP_USERNAME/PASSWORD` را بنویسید. رمز ادمین حداقل ۱۰ کاراکتر باشد.

```bash
npm ci
npm run build
```
اگر سرور به رجیستری npm دسترسی ندارد، `npm ci` و `npm run build` را روی کامپیوتر خودتان بزنید و پوشهٔ پروژه (همراه `node_modules` و `.output`) را با `scp`/`rsync` ببرید.

## ۵) اجرا با PM2
```bash
NODE_ENV=production PORT=3000 pm2 start npm --name sibamotor -- start
pm2 save
pm2 startup        # دستوری که چاپ می‌کند را اجرا کنید تا بعد از ریبوت بالا بیاید
pm2 logs sibamotor # باید «[migrate]» و «admin ... is ready» را ببینید
```
**فقط یک نمونه** اجرا کنید (`pm2 start` را دوبار نزنید و حالت cluster نگذارید).

## ۶) Nginx و HTTPS
فایل `/etc/nginx/sites-available/sibamotor`:
```nginx
server {
    listen 80;
    server_name example.ir www.example.ir;
    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/sibamotor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.ir -d www.example.ir
```
(`example.ir` را با دامنهٔ خودتان عوض کنید.) خط `X-Forwarded-For $remote_addr` عمداً جایگزین هدر ورودی است تا IP ثبت‌شده در لاگ قابل جعل نباشد.

اگر Certbot (Let's Encrypt) از داخل ایران کار نکرد، گواهی را از سرویس‌دهنده‌ات بگیرید و در Nginx با `ssl_certificate` بگذارید. **برنامه فقط روی HTTPS کار می‌کند** (کوکی `__Host-`).

## ۷) بک‌آپ خودکار
```bash
mkdir -p ~/backups
( crontab -l 2>/dev/null; echo '0 3 * * * pg_dump "postgresql://sibamotor:یک-رمز-قوی@localhost:5432/sibamotor" | gzip > ~/backups/sibamotor-$(date +\%F).sql.gz && find ~/backups -mtime +30 -delete' ) | crontab -
```
نسخه‌ها را گهگاه بیرون از سرور هم کپی کنید.

## ۸) به‌روزرسانی
```bash
cd ~/sibamotor-main   # کد جدید را جایگزین کنید (فایل .env را نگه دارید)
npm ci && npm run build
pm2 restart sibamotor
```
مهاجرت دیتابیس در هر استارت خودکار انجام می‌شود.

## عیب‌یابی
| نشانه | علت محتمل |
|---|---|
| `SESSION_SECRET is missing` | در `.env` نیست یا کمتر از ۳۲ کاراکتر است |
| `DATABASE_URL is not set` | `.env` در پوشهٔ پروژه نیست یا PM2 از پوشهٔ دیگری اجرا شده |
| بعد از ورود، دوباره به صفحهٔ ورود می‌رود | سایت با HTTP باز شده؛ HTTPS لازم است |
| 502 از Nginx | برنامه بالا نیست: `pm2 logs sibamotor` |

---

# به‌روزرسانی خودکار از GitHub

هدف: هر بار تغییری در شاخهٔ `main` گیت‌هاب ذخیره کردید، سرور خودش نسخهٔ جدید را بگیرد، بیلد کند و ریستارت کند (فایل‌های `.github/workflows/deploy.yml` و `scripts/deploy.sh`).

## الف) یک بار: کد را روی GitHub بگذارید
محتوای این پروژه را (بدون `node_modules` و `.output` و `.env`) در مخزن GitHub خودتان commit و push کنید. فایل `.gitignore` پروژه این‌ها را از قبل نادیده می‌گیرد.

## ب) یک بار: سرور را به مخزن وصل کنید
**اگر سرور به github.com دسترسی دارد** (حالت پیش‌فرض `pull`):
```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub     # این را در GitHub → مخزن → Settings → Deploy keys بگذارید (فقط خواندن)
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
ssh -T git@github.com            # باید پیام موفقیت بدهد

cd /var/www && pm2 stop sibamotor
cp sibamotor/.env /root/sibamotor.env.bak && mv sibamotor sibamotor-old
git clone git@github.com:USER/REPO.git sibamotor
cp /root/sibamotor.env.bak sibamotor/.env
cd sibamotor && bash scripts/deploy.sh
```
(به‌جای `USER/REPO` آدرس مخزن خودتان.)

**اگر سرور به GitHub نمی‌رسد:** حالت `push` را بزنید؛ GitHub خودش کد را با rsync به سرور می‌فرستد و فقط به SSH سرور نیاز دارد. در مخزن: Settings → Secrets and variables → Actions → تب **Variables** → متغیر `DEPLOY_MODE` با مقدار `push`. پوشهٔ `/var/www/sibamotor` همین الان (بدون git) کافی است و `rsync` باید روی سرور نصب باشد (`sudo apt install rsync`).

## پ) یک بار: دسترسی GitHub به سرور
روی کامپیوتر خودتان (نه سرور):
```bash
ssh-keygen -t ed25519 -f gh_to_server -N ""
ssh-copy-id -i gh_to_server.pub root@IP_SERVER      # یا محتوای .pub را در ~/.ssh/authorized_keys سرور بگذارید
ssh-keyscan -p 22 IP_SERVER                         # خروجی را برای DEPLOY_KNOWN_HOSTS نگه دارید
```
در GitHub → مخزن → Settings → Secrets and variables → Actions → **Secrets** این‌ها را بسازید:

| نام | مقدار |
|---|---|
| `DEPLOY_HOST` | IP یا دامنهٔ سرور |
| `DEPLOY_USER` | کاربر SSH (مثلاً `root`) |
| `DEPLOY_PATH` | `/var/www/sibamotor` |
| `DEPLOY_SSH_KEY` | تمام محتوای فایل `gh_to_server` (کلید خصوصی) |
| `DEPLOY_KNOWN_HOSTS` | خروجی `ssh-keyscan` بالا |
| `DEPLOY_PORT` | فقط اگر پورت SSH غیر از ۲۲ است |

بعد از ساخت، فایل کلید خصوصی را از کامپیوتر پاک کنید.

## ت) روش کار روزانه
تغییر را به `main` push کنید ← تب **Actions** در GitHub را ببینید ← بعد از ۱ تا ۳ دقیقه سایت به‌روز است. دستی هم می‌شود: Actions → Deploy → Run workflow، یا روی سرور `bash scripts/deploy.sh`.

اگر بیلد خطا بدهد، ریستارت انجام نمی‌شود و نسخهٔ قبلی به کار خود ادامه می‌دهد؛ علت را در لاگ همان اجرای Actions می‌بینید. دیتابیس و فایل `.env` هیچ‌وقت لمس نمی‌شوند.
