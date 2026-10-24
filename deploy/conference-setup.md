# راه‌اندازی اتاق کنفرانس (صدا و تصویر)

اتاق کنفرانس با WebRTC کار می‌کند: صدا و تصویر **مستقیم بین مرورگرها** رد و بدل می‌شود و فقط «خبر دادن به هم» از سرور برنامه می‌گذرد.
برای اینکه این اتصال مستقیم بین شبکه‌های مختلف (اداره، اینترنت موبایل، پشت NAT) هم برقرار شود، یک **سرور TURN** لازم است. ساده‌ترین راه، نصب `coturn` روی همین VPS است.

## الزامات

- سایت باید با **HTTPS** باز شود (مرورگر بدون آن میکروفون و دوربین نمی‌دهد).
- یک سرور TURN (پایین‌تر). بدون آن تماس بین بعضی شبکه‌ها وصل نمی‌شود.
- پهنای باند: هر نفر تصویر خودش را برای تک‌تک دیگران می‌فرستد (حدود ۰٫۵ مگابیت بر ثانیه برای هر نفر با دوربین). اتاق برای حداکثر ۸ نفر است.
- ترافیک TURN از nginx رد نمی‌شود؛ پورت‌هایش باید روی فایروال باز باشد.

## نصب coturn (Ubuntu)

```bash
sudo apt update && sudo apt install -y coturn
sudo sed -i 's/^#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
openssl rand -hex 24      # این خروجی را به‌عنوان SECRET نگه دارید
```

فایل `/etc/turnserver.conf` را این‌طور بنویسید (به‌جای `example.com` دامنه‌ی خودتان و به‌جای `SECRET` همان مقدار بالا و به‌جای `IP_SERVER` آی‌پی عمومی VPS):

```
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=IP_SERVER
realm=example.com
fingerprint
use-auth-secret
static-auth-secret=SECRET
min-port=49152
max-port=65535
no-multicast-peers
no-cli
# جلوگیری از دسترسی به شبکه‌ی داخلی سرور
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
# اختیاری (TLS روی ۵۳۴۹): مسیر گواهی certbot
# cert=/etc/letsencrypt/live/example.com/fullchain.pem
# pkey=/etc/letsencrypt/live/example.com/privkey.pem
```

سپس:

```bash
sudo systemctl enable --now coturn
sudo systemctl status coturn --no-pager
# فایروال
sudo ufw allow 3478/tcp && sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp && sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp
```

## تنظیم برنامه (`.env`)

```
TURN_URLS=turn:example.com:3478?transport=udp,turn:example.com:3478?transport=tcp
TURN_SECRET=SECRET
# اگر گواهی TLS گذاشتید، این را هم به TURN_URLS اضافه کنید:  turns:example.com:5349?transport=tcp
CONFERENCE_MAX=8
```

بعد `./deploy/deploy.sh`. رمز TURN برای هر کاربر موقت است (۶ ساعت) و از `TURN_SECRET` ساخته می‌شود؛ خودِ `TURN_SECRET` هیچ‌وقت به مرورگر نمی‌رسد.

## آزمایش

1. روی دو دستگاه یا دو مرورگر با دو کاربر وارد شوید؛ اولی «اتاق کنفرانس» ← «شروع کنفرانس»، دومی «ورود».
2. یکی از دو نفر را روی اینترنت موبایل بگذارید (شبکه‌ی متفاوت) تا اتصال TURN آزمایش شود.
3. اگر تصویر یا صدا نیامد: `sudo journalctl -u coturn -n 50 --no-pager` و باز بودن پورت‌ها را بررسی کنید. می‌توانید در مرورگر صفحه‌ی «Trickle ICE» (webrtc.github.io/samples/src/content/peerconnection/trickle-ice) را باز کنید، آدرس `turn:example.com:3478` را با یک نام کاربری و رمز موقت وارد و ببینید «relay» می‌آید یا نه.
