/** Help sections for the newer features, written in both languages (the older sections are translated by the dictionary). */
export type HelpBlock = { h?: string; p?: string; steps?: string[]; items?: string[]; tip?: string };
export type HelpSection = { id: string; emoji: string; title: string; blocks: HelpBlock[] };

type Lang = "fa" | "en";

export function helpNewSections(lang: Lang): HelpSection[] {
  const t = (fa: string, en: string) => (lang === "en" ? en : fa);
  const list = (pairs: [string, string][]) => pairs.map(([fa, en]) => t(fa, en));

  return [
    {
      id: "new",
      emoji: "✨",
      title: t("تازه‌ها", "What's new"),
      blocks: [
        {
          p: t(
            "این فهرست نشان می‌دهد هر قابلیت جدید را کجا پیدا کنید. توضیح کامل هر کدام در بخش‌های «کار روزمره»، «مدیریت و گزارش»، «اعلان در بله» و «بخش مدیر» همین راهنما آمده است.",
            "This list shows where to find each new feature. The full explanation of each one is in the sections “Daily work”, “Management and reports”, “Notifications in Bale” and “Admin area” of this guide.",
          ),
          items: list([
            ["جدول: نمای فهرستی کارت‌ها کنار «تخته» (جستجو، گروه‌بندی، مرتب‌سازی).", "Table: a list view of cards next to “Board” (search, grouping, sorting)."],
            ["گانت: نوار را بکشید تا تاریخ‌ها عوض شود؛ پیکان‌ها وابستگی و حاشیه‌ی زرد مسیر بحرانی است.", "Gantt: drag a bar to change dates; arrows are dependencies and the yellow outline is the critical path."],
            ["نمای کلی: وضعیت همه‌ی تخته‌ها، روند هفتگی، بار کاری و ظرفیت افراد در یک صفحه.", "Overview: all boards, the weekly trend, workload and capacity per person on one page."],
            ["اهداف: هدف‌ها و نتایج کلیدی، و پروژه‌ها با رنگ وضعیت.", "Goals: goals with key results, and projects with a status colour."],
            ["درخواست: فرم‌هایی که برایتان کارت می‌سازند، و درخواست‌های منتظر تأیید شما.", "Requests: forms that create cards for you, and the requests waiting for your approval."],
            ["در پنجره‌ی کارت: فایل‌ها (با نسخه)، تأیید، زمان و برآورد، و پاسخ به نظرها.", "In the card window: files (with versions), approval, time and estimate, and replies to comments."],
            ["جستجوی سراسری: Ctrl+K ← «جستجوی سراسری».", "Global search: Ctrl+K → “Search everything”."],
            ["اتاق کنفرانس: آیکن دوربین بالای صفحه، کنار آیکن افراد؛ تماس صوتی و تصویری گروهی (نقطه‌ی سبز یعنی کنفرانسی در جریان است).", "Conference room: the camera icon at the top of the page, next to the People icon; group audio and video calls (a green dot means a conference is running)."],
            ["اعلان در بله: از منوی پروفایل.", "Notifications in Bale: from the profile menu."],
            ["همگام‌سازی زنده: وقتی همکاری چیزی را تغییر دهد، صفحه‌ی شما خودکار تازه می‌شود.", "Live updates: when a colleague changes something, your screen refreshes by itself."],
            ["تقویم و تاریخ‌ها: در حالت فارسی همه‌ی تاریخ‌ها و تقویم‌ها شمسی‌اند و در حالت انگلیسی میلادی (هفته در تقویم میلادی از دوشنبه شروع می‌شود). با عوض‌کردن زبان، تقویم هم عوض می‌شود؛ خودِ تاریخ‌ها تغییر نمی‌کنند، فقط شکل نمایششان.", "Calendars and dates: in Persian mode every date and calendar is Jalali; in English mode it is Gregorian (the Gregorian week starts on Monday). Switching the language switches the calendar; the dates themselves do not change, only how they are shown."],
          ]),
        },
      ],
    },
    {
      id: "work",
      emoji: "🛠️",
      title: t("کار روزمره", "Daily work"),
      blocks: [
        {
          h: t("جدول", "Table view"),
          p: t(
            "کنار «تخته» برگه‌ی «جدول» است. همه‌ی کارت‌ها را در یک جدول می‌بینید. با کلیک روی عنوان ستون‌ها مرتب کنید، بالای صفحه گروه‌بندی را بر اساس ستون، مسئول یا اولویت بگذارید و در کادر جستجو عنوان یا نام افراد را بنویسید. کلیک روی یک ردیف پنجره‌ی کارت را باز می‌کند.",
            "Next to “Board” there is a “Table” tab. It lists all cards in one table. Click a column title to sort, group by column, assignee or priority at the top, and type a title or a person in the search box. Clicking a row opens the card.",
          ),
        },
        {
          h: t("گانت: کشیدن، وابستگی و مسیر بحرانی", "Gantt: dragging, dependencies and the critical path"),
          items: list([
            ["نوار یک کارت را بکشید تا تاریخ شروع و مهلت با هم جابه‌جا شوند. لبه‌ی چپ یا راست نوار را بکشید تا فقط شروع یا فقط پایان عوض شود. برای این کار مجوز «تغییر تاریخ» لازم است.", "Drag a card's bar to move its start and due date together. Drag the left or right edge to change only the start or only the end. You need the “change dates” permission."],
            ["وابستگی‌ها را در پنجره‌ی کارت تعیین می‌کنید («این کار بعد از کارت دیگری است»). در گانت به‌صورت پیکان از پایان پیش‌نیاز تا شروع کار بعدی دیده می‌شوند.", "You set dependencies in the card window (“this card comes after another card”). In the Gantt chart they appear as arrows from the end of the prerequisite to the start of the next card."],
            ["حاشیه‌ی قرمز یعنی کار قبل از تمام‌شدن پیش‌نیازش شروع شده است. سیستم تاریخ کارهای بعدی را خودکار جابه‌جا نمی‌کند؛ فقط هشدار می‌دهد.", "A red outline means the card starts before its prerequisite is finished. The system does not move later cards by itself; it only warns you."],
            ["حاشیه‌ی زرد مسیر بحرانی است: طولانی‌ترین زنجیره‌ی کارهای نیمه‌تمام که به هم وابسته‌اند. هر تأخیر در آن‌ها کل کار را عقب می‌اندازد. با تیک «نمایش مسیر بحرانی» خاموشش کنید.", "The yellow outline is the critical path: the longest chain of unfinished cards that depend on each other. Any delay in them delays the whole job. Switch it off with “Show critical path”."],
          ]),
        },
        {
          h: t("پاسخ به نظرها", "Replying to comments"),
          p: t(
            "زیر هر نظرِ کارت دکمه‌ی «پاسخ» است. پاسخ‌ها زیر همان نظر و کمی تو می‌روند، پس بحث‌ها در هم نمی‌ریزد. برای خبر دادن به یک نفر در متن او را با @نام‌کاربری منشن کنید.",
            "Under every comment of a card there is a “Reply” button. Replies appear indented under that comment, so discussions do not get mixed up. To notify a person, mention them in the text with @username.",
          ),
        },
        {
          h: t("فایل روی کارت", "Files on a card"),
          items: list([
            ["در بخش «فایل‌ها» با «افزودن فایل» هر فایل تا ۵ مگابایت را به کارت پیوست کنید.", "In the “Files” section, use “Add a file” to attach any file up to 5 MB to the card."],
            ["اگر فایلی با همان نام دوباره بفرستید، نسخه‌ی جدید (v2، v3…) ثبت می‌شود و نسخه‌های قبلی می‌مانند.", "If you upload a file with the same name again, a new version (v2, v3…) is stored and the old ones stay."],
            ["عکس و PDF را با آیکن چشم بدون دانلود ببینید. هر فایل را می‌شود دانلود کرد. فقط فرستنده و مدیر می‌توانند پیوست را حذف کنند.", "Pictures and PDFs can be previewed with the eye icon without downloading. Any file can be downloaded. Only the uploader and an admin can delete an attachment."],
          ]),
        },
        {
          h: t("زمان و برآورد", "Time and estimate"),
          items: list([
            ["برآورد: در پنجره‌ی کارت بنویسید این کار چند ساعت طول می‌کشد.", "Estimate: in the card window, write how many hours the card should take."],
            ["ثبت زمان: بعد از کار، ساعتِ کار خودتان را با «ثبت زمان» وارد کنید. برای روز دیگر هم می‌شود (تا ۶۰ روز قبل). مجموع زمانِ یک نفر در یک روز از ۲۴ ساعت بیشتر نمی‌شود.", "Log time: after working, enter your own hours with “Log time”. You can log for another day too (up to 60 days back). One person's total for a day cannot exceed 24 hours."],
            ["فقط زمان خودتان را می‌توانید حذف کنید. زمان کل و «چقدر مانده» یا «چقدر بیشتر از برآورد» کنار کارت دیده می‌شود.", "You can only delete your own entries. The total and how much is left (or over the estimate) is shown on the card."],
          ]),
        },
        {
          h: t("تأیید روی کارت", "Approval on a card"),
          steps: list([
            ["در پنجره‌ی کارت، بخش «تأیید»، تأییدکننده را انتخاب و «درخواست تأیید» را بزنید.", "In the card window, under “Approval”, choose the approver and press “Request approval”."],
            ["تأییدکننده اعلان می‌گیرد (در برنامه و در بله) و کارت را در بخش «منتظر تأیید شما» صفحه‌ی «درخواست» می‌بیند.", "The approver is notified (in the app and in Bale) and sees the card under “Waiting for your approval” on the Requests page."],
            ["او با یک توضیح اختیاری «تأیید» یا «رد» می‌کند. نتیجه با اعلان به شما می‌رسد و در تاریخچه‌ی کارت می‌ماند.", "The approver presses “Approve” or “Reject” with an optional note. The result reaches you as a notification and stays in the card history."],
            ["تا وقتی جواب نداده، شما می‌توانید درخواست را پس بگیرید. بعد از جواب می‌شود دوباره درخواست داد.", "Until an answer is given you can withdraw the request. After an answer you can ask again."],
          ]),
        },
        {
          h: t("درخواست‌ها (فرم)", "Requests (forms)"),
          p: t(
            "از منوی «درخواست» فرمی را که مدیر ساخته پر کنید (مثلاً «درخواست کالا از انبار»). با ارسال، در تخته و ستونی که مدیر تعیین کرده یک کارت ساخته می‌شود و مسئول‌های رسیدگی خبردار می‌شوند. در «درخواست‌های من» می‌بینید کارتتان الان در کدام ستون است. در هر ساعت حداکثر ۳۰ درخواست می‌توانید بفرستید.",
            "Open the “Requests” menu and fill in a form the admin created (for example “goods request from the warehouse”). When you send it, a card is created on the board and column the admin chose and the people in charge are notified. “My requests” shows which column your card is in now. You can send at most 30 requests per hour.",
          ),
        },
        {
          h: t("جستجوی سراسری", "Global search"),
          p: t(
            "Ctrl+K (در مک ⌘K) و گزینه‌ی «جستجوی سراسری»، یا صفحه‌ی جستجو. کارت‌ها، نظرها، چک‌لیست‌ها و پیام‌ها و گزارش‌های خودتان را یک‌جا جستجو می‌کند (حداقل دو حرف). با دکمه‌های نوع، انتخاب تخته و «فقط کارهای من» نتیجه را محدود کنید و با «ذخیره‌ی جستجو» آن را برای دفعه‌ی بعد نگه دارید (حداکثر ۳۰ مورد). پیام‌ها و گزارش‌های دیگران هرگز در نتیجه‌ی شما نمی‌آید.",
            "Press Ctrl+K (⌘K on Mac) and choose “Search everything”, or open the search page. It searches cards, comments, checklists and your own messages and reports at once (at least two characters). Narrow the result with the type buttons, the board selector and “Only my cards”, and keep a search for next time with “Save search” (up to 30). Other people's messages and reports never appear in your results.",
          ),
        },
      ],
    },
    {
      id: "manage",
      emoji: "📈",
      title: t("مدیریت و گزارش", "Management and reports"),
      blocks: [
        {
          h: t("نمای کلی", "Overview"),
          items: list([
            ["کارت‌های خلاصه: تعداد تخته، کارهای باز، دیرکردها، سررسید تا ۷ روز و تمام‌شده‌ها در هفته‌ی اخیر.", "Summary cards: number of boards, open work, overdue cards, due within 7 days, and what was finished in the last 7 days."],
            ["روند هفتگی ۸ هفته: ساخته‌شده در برابر تمام‌شده (هفته از شنبه شروع می‌شود). «تمام‌شده» فقط کارت‌هایی را می‌شمارد که الان در ستون پایانی هستند.", "Weekly trend over 8 weeks: created versus finished (weeks start on Saturday). “Finished” counts only cards that are in the final column now."],
            ["جدول تخته‌ها با درصد پیشرفت، و بار کاری هر نفر در همه‌ی تخته‌ها (بخش قرمز دیرکردهاست).", "A table of boards with progress, and each person's workload across all boards (the red part is overdue)."],
            ["زمان و ظرفیت هفته: زمان ثبت‌شده‌ی هر نفر از شنبه و کار مانده‌ی کارت‌های برآوردشده در برابر ظرفیت (۴۴ ساعت، مگر مدیر عوض کرده باشد). اگر کسی برآورد نگذارد، بارش کمتر از واقع دیده می‌شود.", "Time and capacity this week: each person's logged time since Saturday and the remaining work of estimated cards against capacity (44 hours unless an admin changed it). If nobody estimates, workload looks lower than it really is."],
          ]),
        },
        {
          h: t("اهداف و پروژه‌ها", "Goals and projects"),
          items: list([
            ["هدف: یک جمله با چند «نتیجه‌ی کلیدی». پیشرفت هر نتیجه یا از میانگین پیشرفت کارت‌هایی که انتخاب می‌کنید حساب می‌شود (کارت ستون پایانی ۱۰۰٪ است) یا یک عدد دستی «جاری ÷ هدف». هر کس می‌تواند هدف بسازد و فقط صاحبش (یا مدیر) آن را ویرایش می‌کند.", "A goal is one sentence with several key results. A key result's progress is either the average progress of the cards you choose (a card in the final column counts as 100%) or a manual number “current ÷ target”. Anyone can create a goal, and only its owner (or an admin) can edit it."],
            ["پروژه: گروهی از تخته‌ها که فقط مدیر می‌سازد. رنگ: سبز یعنی دیرکرد ندارد، زرد یعنی کمتر از ۲۰٪ کارهای باز دیرکرد دارند، قرمز یعنی ۲۰٪ یا بیشتر.", "A project is a group of boards that only an admin creates. Colour: green means nothing is late, yellow means under 20% of open cards are late, red means 20% or more."],
          ]),
        },
        {
          h: t("به‌روزرسانی زنده", "Live updates"),
          p: t(
            "وقتی همکاری کارتی را عوض کند، صفحه‌ی شما حدود یک ثانیه بعد خودکار تازه می‌شود. تا وقتی پنجره‌ای (مثلاً پنجره‌ی کارت) باز است، تازه‌سازی صبر می‌کند تا چیزی را که تایپ می‌کنید از دست ندهید. ویرایش هم‌زمانِ یک متن توسط دو نفر پشتیبانی نمی‌شود؛ آخرین ذخیره می‌ماند.",
            "When a colleague changes a card, your screen refreshes by itself about a second later. While a window (for example a card) is open, the refresh waits so you do not lose what you are typing. Two people editing the same text at once is not supported; the last save wins.",
          ),
        },
      ],
    },
    {
      id: "bale",
      emoji: "🔔",
      title: t("اعلان در بله", "Notifications in Bale"),
      blocks: [
        {
          p: t(
            "اگر مدیر ربات بله را راه‌اندازی کرده باشد، اعلان‌ها را بیرون از برنامه هم می‌گیرید (اگر ربات راه‌اندازی نشده، این بخش در پروفایل دیده نمی‌شود).",
            "If an admin has set up the Bale bot, you receive notifications outside the app too (if the bot is not set up, this block does not appear in your profile).",
          ),
          steps: list([
            ["عکس یا نامتان را بزنید و پروفایل را باز کنید.", "Click your picture or name and open your profile."],
            ["در بخش «اعلان در بله» روی «دریافت کد اتصال» بزنید؛ یک کد ۸ حرفی می‌آید و ۱۵ دقیقه اعتبار دارد.", "In “Notifications in Bale” press “Get a link code”; an 8-character code appears and is valid for 15 minutes."],
            ["ربات را در بله باز کنید، /start بزنید و همان کد را برایش بفرستید. ربات تأیید می‌کند و پنجره‌ی پروفایل «متصل است» را نشان می‌دهد.", "Open the bot in Bale, send /start and then send the same code. The bot confirms and the profile window shows “connected”."],
          ]),
        },
        {
          h: t("چه چیزهایی می‌رسد", "What you receive"),
          items: list([
            ["منشن، گزارش جدید و تغییر وضعیت گزارش، درخواست تأیید و جواب آن، و کارت‌هایی که از فرم برایتان ساخته شد.", "Mentions, new reports and report status changes, approval requests and their answers, and cards created for you from a form."],
            ["یادآوری مهلت: برای کارت‌هایی که مسئولشان هستید، امروز، فردا یا وقتی دیرکرد شد (هر کدام یک بار، فقط ساعت ۸ تا ۲۰ به وقت تهران).", "Due-date reminders for cards you are responsible for: today, tomorrow, or when overdue (each once, only between 08:00 and 20:00 Tehran time)."],
            ["اعلان‌هایی که قانون‌های خودکار مدیر می‌فرستند.", "Notifications sent by the admin's automation rules."],
            ["خلاصه‌ی کارهای من: «هر روز صبح» یا «شنبه‌ها صبح» (ساعت ۸ تا ۱۰) با تعداد کارهای باز، دیرکردها و پنج کار فوری‌تر. از همان بخش پروفایل انتخاب می‌شود.", "Summary of my cards: “every morning” or “Saturday mornings” (08:00–10:00) with open cards, overdue cards and the five most urgent. You choose it in the same profile block."],
          ]),
          tip: t(
            "هر وقت خواستید در همان بخش اعلان‌ها را خاموش کنید یا «قطع اتصال» بزنید.",
            "You can switch notifications off or press “Disconnect” in the same block at any time.",
          ),
        },
      ],
    },
    {
      id: "conference",
      emoji: "🎥",
      title: t("اتاق کنفرانس", "Conference room"),
      blocks: [
        {
          p: t(
            "آیکن دوربین بالای صفحه (کنار آیکن افراد) شما را به اتاق کنفرانس می‌برد. در آن می‌توانید با همکاران تماس صوتی و تصویری گروهی داشته باشید. نقطه‌ی سبز روی آیکن یعنی کنفرانسی در جریان است.",
            "The camera icon at the top of the page (next to the People icon) takes you to the conference room, where you can hold group audio and video calls with colleagues. A green dot on the icon means a conference is running.",
          ),
          steps: list([
            ["آیکن دوربین بالای صفحه را بزنید. اگر کنفرانسی در جریان نباشد، عنوانی بنویسید و «شروع کنفرانس» را بزنید. هر کس اول شروع کند، تا پایان آن کنفرانس مدیر (میزبان) اتاق است. اگر بخواهید، می‌توانید به همه‌ی کاربران اعلان بدهید.", "Press the camera icon at the top. If no conference is running, type a title and press “Start the conference”. Whoever starts first is the room's host until that conference ends. If you like, you can notify all users."],
            ["اگر کنفرانسی در جریان است، «ورود به کنفرانس» را بزنید. قبل از ورود می‌توانید میکروفون و دوربین را انتخاب و آزمایش کنید و تعیین کنید با میکروفون یا دوربین روشن وارد شوید. مرورگر یک‌بار اجازه می‌پرسد.", "If a conference is running, press “Join the conference”. Before entering you can choose and test your microphone and camera and decide whether to join with them on. The browser asks for permission once."],
            ["در تماس: دکمه‌های میکروفون، دوربین، اشتراک صفحه (فقط کامپیوتر)، بالا بردن دست، گفتگوی کنفرانس و فهرست شرکت‌کنندگان. دور تصویر کسی که صحبت می‌کند حلقه‌ی سبز می‌افتد.", "In the call: buttons for microphone, camera, screen sharing (computers only), raise hand, conference chat and the participant list. A green ring appears around whoever is speaking."],
            ["می‌توانید در برنامه جابه‌جا شوید و تماس ادامه دارد؛ یک نوار کوچک پایین صفحه نشان می‌دهد در کنفرانس هستید و با آن می‌توانید میکروفون را ببندید، برگردید یا خارج شوید.", "You can move around the app and the call keeps going; a small bar at the bottom shows you are in a conference and lets you mute, go back or leave."],
          ]),
        },
        {
          h: t("مدیر اتاق (میزبان)", "The host"),
          items: list([
            ["میزبان می‌تواند یک نفر را بی‌صدا کند، همه را بی‌صدا کند، کسی را از کنفرانس خارج کند و کنفرانس را برای همه تمام کند (آیکن‌ها روی تصویر هر نفر و در فهرست شرکت‌کنندگان).", "The host can mute one person, mute everybody, remove someone from the conference and end the conference for everybody (the icons on each tile and in the participant list)."],
            ["اگر میزبان از اتاق بیرون برود، می‌تواند کنفرانس را تمام کند یا مدیریت را به کسی که از همه بیشتر در اتاق بوده بسپارد. اگر ارتباط میزبان قطع شود، مدیریت خودکار به نفر بعدی می‌رسد.", "If the host leaves, they can end the conference or hand it to the person who has been in the room longest. If the host's connection drops, hosting passes to the next person automatically."],
            ["مدیر سیستم و ادمین سطح ۲ هم می‌توانند کنفرانس را تمام کنند یا افراد را بی‌صدا یا خارج کنند.", "The system admin and level-2 admins can also end the conference or mute or remove people."],
          ]),
        },
        {
          h: t("الزامات و محدودیت‌ها", "Requirements and limits"),
          items: list([
            ["سایت باید با HTTPS باز شود (مرورگر بدون آن به میکروفون و دوربین دسترسی نمی‌دهد) و مرورگر به‌روز باشد.", "The site must be opened over HTTPS (the browser does not give access to the microphone and camera otherwise) and the browser must be up to date."],
            ["هر نفر تصویر خودش را برای تک‌تک دیگران می‌فرستد، پس اتاق برای حداکثر ۸ نفر است (مدیر می‌تواند عدد را تغییر دهد) و دوربین‌ها اینترنت زیادی مصرف می‌کنند. با اینترنت ضعیف فقط با صدا شرکت کنید.", "Each person sends their video to everybody else separately, so the room is for up to 8 people (an admin can change the number) and cameras use a lot of bandwidth. On a weak connection join with audio only."],
            ["برای اینکه تماس بین شبکه‌های مختلف (اداره، اینترنت موبایل) وصل شود، مدیر باید سرور TURN را راه‌اندازی کرده باشد (راهنمای آن در deploy/conference-setup.md است).", "For calls to connect between different networks (offices, mobile data) an admin must have set up a TURN server (the guide is in deploy/conference-setup.md)."],
            ["تصویر و صدا مستقیم بین مرورگرها می‌رود و روی سرور ضبط یا ذخیره نمی‌شود. فقط شروع و پایان کنفرانس در لاگ ثبت می‌شود. گفتگوی داخل کنفرانس هم فقط تا پایان همان کنفرانس می‌ماند.", "Sound and picture go directly between browsers and are not recorded or stored on the server. Only the start and end of a conference are written to the log. The chat inside the conference also lasts only until that conference ends."],
          ]),
        },
      ],
    },
    {
      id: "app",
      emoji: "📱",
      title: t("نصب برنامه و اعلان روی دستگاه", "Install the app and device notifications"),
      blocks: [
        {
          items: list([
            ["نصب: در Chrome و Edge از منوی پروفایل «نصب برنامه روی این دستگاه» را بزنید (یا آیکن نصب کنار نوار آدرس). در آیفون: دکمه‌ی Share و سپس «Add to Home Screen». بعد از نصب، سیباموتور مثل یک برنامه‌ی جدا و تمام‌صفحه باز می‌شود.", "Install: in Chrome and Edge press “Install the app on this device” in the profile menu (or the install icon next to the address bar). On iPhone: tap Share, then “Add to Home Screen”. Afterwards SibaMotor opens like a separate full-screen app."],
            ["اعلان روی دستگاه: در پروفایل «فعال‌سازی اعلان روی این دستگاه» را بزنید و در پنجره‌ی مرورگر اجازه بدهید. از آن به بعد منشن، تأیید، یادآوری مهلت و گزارش جدید را حتی وقتی سایت بسته است می‌گیرید. هر دستگاه جدا فعال می‌شود (تا ۱۰ دستگاه برای هر نفر) و هر وقت خواستید «غیرفعال‌سازی» را بزنید.", "Device notifications: press “Turn on notifications on this device” in the profile and allow it in the browser prompt. From then on you get mentions, approvals, due-date reminders and new reports even when the site is closed. Each device is switched on separately (up to 10 per person) and you can turn it off at any time."],
            ["در آیفون اعلان فقط بعد از نصب برنامه و باز کردن آن از صفحه‌ی اصلی کار می‌کند. اگر مدیر کلیدهای اعلان را راه نینداخته باشد، این گزینه در پروفایل دیده نمی‌شود.", "On iPhone notifications only work after installing the app and opening it from the home screen. If the admin has not set up the notification keys, this option does not appear in the profile."],
            ["کار آفلاین: بدون اینترنت فقط صفحه‌ی «اتصال برقرار نیست» نمایش داده می‌شود. نمایش و ثبت اطلاعات به اینترنت نیاز دارد.", "Offline: without internet only the “no connection” page is shown. Viewing and saving data needs internet."],
          ]),
        },
      ],
    },
    {
      id: "admin",
      emoji: "🛡️",
      title: t("بخش مدیر", "Admin area"),
      blocks: [
        {
          p: t(
            "این بخش فقط برای مدیران است (آیکن سپر در بالای صفحه). دو سطح مدیر وجود دارد.",
            "This area is only for admins (the shield icon at the top). There are two admin levels.",
          ),
          items: list([
            ["مدیر سیستم (ادمین اصلی): همه‌چیز، از جمله ساختن و حذف ادمین سطح ۲، تغییر حساب مدیران، و گرفتن یا بازگردانی پشتیبان از داده‌ها.", "System admin (main admin): everything, including creating and deleting level-2 admins, changing admin accounts, and exporting or restoring a backup of the data."],
            ["ادمین سطح ۲: یک پله پایین‌تر. می‌تواند کاربر عادی بسازد، ویرایش کند، رمزش را بازنشانی کند و حذف کند؛ لاگ کامل را می‌بیند و همه‌ی تب‌های مدیریت را باز می‌کند. نمی‌تواند حساب مدیر سیستم یا ادمین سطح ۲ دیگری را تغییر دهد یا حذف کند، ادمین جدید بسازد، یا پشتیبان را بازگردانی کند.", "Level-2 admin: one step below. They can create, edit, reset the password of and delete ordinary users; they see the full log and open every admin tab. They cannot change or delete the system admin or another level-2 admin, create a new admin, or restore a backup."],
            ["ادمین سطح ۲ را فقط مدیر سیستم می‌سازد: در «کاربر جدید» گزینه‌ی «سطح دسترسی» را روی «ادمین سطح ۲» بگذارد. همان گزینه در ویرایش یک کاربر برای تبدیل او از و به ادمین سطح ۲ هم هست. تغییر حساب، نشست‌های قبلی آن کاربر را قطع می‌کند و او باید رمز تازه بگذارد.", "Only the system admin creates a level-2 admin: in “New user” set “Access level” to “Level 2 admin”. The same option exists when editing a user, to promote or demote them. Changing an account ends that user's earlier sessions and they must choose a new password."],
          ]),
        },
        {
          h: t("تب‌های مدیریت", "Admin tabs"),
          items: list([
            ["کاربران: ساخت کاربر، تغییر رمز و حذف.", "Users: create users, change passwords, delete."],
            ["دسترسی تخته: مجوزهای هر کاربر برای هر کار (مثل جابه‌جایی کارت یا حذف)، و «مهمان فقط‌خواندنی» روی هر تخته: کسی که فقط‌خواندن شود، آن تخته را می‌بیند ولی چیزی را تغییر نمی‌دهد. مدیران هیچ‌وقت محدود نمی‌شوند.", "Board access: each user's permissions for each action (such as moving or deleting cards), and “read-only guest” per board: a read-only person can see that board but change nothing. Admins are never restricted."],
            ["اتوماسیون: قانون «وقتی … آنگاه …» برای هر تخته. شرط: کارتی به ستونی رفت، ساخته شد یا از مهلتش گذشت. کار: ارسال اعلان، اختصاص به یک نفر، تغییر اولویت، افزودن برچسب، تنظیم پیشرفت، انتقال به ستون. کار یک قانون، قانون دیگری را راه نمی‌اندازد. هر اجرا در تاریخچه‌ی کارت و لاگ ثبت می‌شود.", "Automation: “when … then …” rules per board. Triggers: a card moves to a column, is created, or becomes overdue. Actions: send a notification, assign a person, set priority, add a label, set progress, move to a column. What a rule does never triggers another rule. Every run is recorded in the card history and the log."],
            ["فرم‌ها: فرم درخواست برای واحدهای دیگر. عنوان، تخته و ستون مقصد، اولویت، مسئول‌های رسیدگی و فیلدها (متن، عدد، تاریخ شمسی، انتخاب از گزینه؛ اجباری یا نه) را تعیین کنید. یک فیلد تاریخ می‌تواند مهلت کارت باشد.", "Forms: request forms for other units. Set the title, the target board and column, the priority, the people in charge and the fields (text, number, Jalali date, choice; required or not). One date field can be the card's due date."],
            ["API: توکن برای اتصال نرم‌افزار دیگر (فقط‌خواندن یا همراه ساخت کارت) و وب‌هوک که با هر تغییر یک POST امضاشده می‌فرستد. توکن و کلید امضا فقط یک بار نمایش داده می‌شوند؛ آن‌ها را همان لحظه نگه دارید. وب‌هوک فقط به سرورهای عمومی اینترنت ارسال می‌کند و رویدادهای حساب و امنیت را نمی‌فرستد.", "API: tokens for connecting other software (read-only, or also able to create cards) and webhooks that send a signed POST on every change. A token and a signing secret are shown only once; save them right away. Webhooks only reach public internet servers and never send account or security events."],
          ]),
          tip: t(
            "لاگ فعالیت‌ها همه‌ی این کارها را ثبت می‌کند، از جمله ساخت توکن، وب‌هوک و تغییر نقش کاربران.",
            "The activity log records all of this, including creating tokens and webhooks and changing user levels.",
          ),
        },
      ],
    },
  ];
}
