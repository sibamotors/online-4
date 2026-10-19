/**
 * English text for the screens added after the first bilingual release:
 * Help panel, new login page, dashboard health, report templates.
 * Keys are the exact Persian strings used in the code (whitespace is normalised).
 * Merged into the main dictionary by `i18n.tsx`.
 */
export const EXTRA_PHRASES: Record<string, string> = {
  /* dashboard */
  "سلامت تخته": "Board health",
  "کار باز (WIP)": "Open work (WIP)",
  "تکانه فعالیت ۱۴ روز (Burnup تقریبی)": "14-day activity momentum (approximate burn-up)",
  "بر اساس تاریخچه فعالیت و ورود به ستون تمام‌شده": "Based on activity history and moves into the done list",

  /* help: quick start */
  "سیباموتور جایی است که کارهای تیم، گزارش‌ها، گفتگوها و برنامه‌ریزی (اسپرینت) یکجا و مرتب کنار هم هستند. اگر تازه آمده‌اید، همین پنج قدم کافی است:":
    "SibaMotor is where your team's tasks, reports, chats and sprint planning live together. If you are new, these five steps are enough:",
  "از منوی کنار صفحه «تخته» را باز کنید. هر ستون یک مرحله از کار است (مثلاً در صف ← در حال انجام ← تمام‌شده).":
    "Open “Board” from the side menu. Each list is a stage of the work (for example Queued → In progress → Done).",
  "پایین هر ستون «کارت جدید» را بزنید و عنوان کار را بنویسید. هر کارت یک کار مشخص است.":
    "Press “New card” at the bottom of a list and type the title. Each card is one specific task.",
  "کارت را با ماوس بکشید و در ستون بعدی بگذارید. اینطور همه می‌بینند کار به کجا رسیده.":
    "Drag the card to the next list. That way everyone can see how far the work has come.",
  "روی کارت کلیک کنید تا جزئیات باز شود: مسئول، مهلت، اولویت، چک‌لیست و نظر.":
    "Click a card to open its details: assignee, due date, priority, checklist and comments.",
  "از «پیام‌ها» با همکار صحبت کنید و از «گزارش» نتیجه کار را برای مسئول بفرستید.":
    "Use “Messages” to talk to a colleague and “Reports” to send the result of your work to your supervisor.",
  "همیشه با Ctrl+K (در مک ⌘K) می‌توانید هر صفحه، تخته، کارت یا همکار را جستجو کنید و مستقیم بروید.":
    "Press Ctrl+K (⌘K on Mac) any time to search for any page, board, card or colleague and jump straight to it.",

  /* help: menu */
  "منوی کنار صفحه چه چیزهایی دارد؟": "What is in the side menu?",
  "تخته: کارها به‌صورت ستون‌های کانبان": "Board: tasks as Kanban lists",
  "تقویم: مهلت کارها روی تقویم شمسی": "Calendar: task due dates on the Jalali calendar",
  "گانت: بازهٔ شروع تا پایان کارها روی محور زمان": "Gantt: each task's start-to-end span on a timeline",
  "اسکرام: اسپرینت، بک‌لاگ، استندآپ، برن‌داون و ریتروسپکتیو": "Scrum: sprint, backlog, stand-up, burndown and retrospective",
  "داشبورد: خلاصهٔ مدیریتی و سلامت تخته": "Dashboard: management summary and board health",
  "گزارش: ارسال و دریافت گزارش کاری و تأیید آن": "Reports: send and receive work reports and approve them",
  "کارهای من: فقط کارهایی که به شما سپرده شده": "My tasks: only the tasks assigned to you",
  "پیام‌ها: چت خصوصی و گروهی": "Messages: private and group chat",
  "لاگ: تاریخچهٔ همهٔ اتفاق‌ها (چه کسی، چه زمانی، چه کاری)": "Log: history of everything that happened (who, when, what)",
  "کاربران: فقط برای ادمین": "Users: admins only",

  /* help: kanban */
  "کانبان یعنی چه؟": "What is Kanban?",
  "کانبان یک تابلو با ستون‌هاست و هر کار یک کارت روی آن است. هدف این است که همه یک نگاه ببینند چه کاری در چه وضعیتی است و کجا گیر کرده. ستون آخر تخته همیشه «تمام‌شده» حساب می‌شود.":
    "Kanban is a board with lists, and each task is a card on it. The goal is that everyone can see at a glance what is in which state and where work is stuck. The last list on a board always counts as “Done”.",
  "ساخت و جابه‌جایی": "Creating and moving cards",
  "کارت جدید: پایین هر ستون → عنوان بنویسید یا از قالب آماده استفاده کنید.":
    "New card: at the bottom of a list → type a title or use a ready-made template.",
  "جابه‌جایی: کارت را بکشید و در ستون دیگر یا جای دیگری از همان ستون رها کنید.":
    "Moving: drag the card and drop it in another list or another spot in the same list.",
  "ستون‌ها را هم می‌توانید اضافه، تغییر نام، حذف یا جابه‌جا کنید (طبق مجوز شما).":
    "You can also add, rename, delete or reorder lists (depending on your permissions).",
  "کپی کارت به تخته یا ستون دیگر: از پایین پنجرهٔ کارت. انتقال هم در همان‌جاست.":
    "Copy a card to another board or list: from the bottom of the card window. Moving is there too.",
  "داخل کارت": "Inside a card",
  "اولویت (بالا، متوسط، پایین) و درصد پیشرفت": "Priority (high, medium, low) and progress percentage",
  "تاریخ شروع و مهلت: با تقویم شمسی؛ بالای تقویم ماه و سال را هم می‌توانید انتخاب کنید.":
    "Start and due dates: with the Jalali calendar; you can also pick the month and year at the top of the calendar.",
  "اعضا و دنبال‌کننده: اعضا مسئول کارند، دنبال‌کننده فقط خبردار می‌شود.":
    "Members and follower: members are responsible for the card; a follower is only kept informed.",
  "برچسب‌ها و رنگ جلد برای دسته‌بندی بصری": "Labels and cover colour for visual grouping",
  "چک‌لیست: کار را به مرحله‌های کوچک تقسیم می‌کند و درصد پیشرفت را نشان می‌دهد.":
    "Checklist: splits the work into small steps and shows the progress percentage.",
  "نظرها: با @نام‌کاربری کسی را منشن کنید تا اعلان بگیرد.":
    "Comments: mention someone with @username so they get a notification.",
  "وابستگی: «این کارت منتظر کارت دیگری است». تا آن کار تمام نشود کارت مسدود نشان داده می‌شود.":
    "Dependency: “this card is waiting for another card”. Until that card is finished, this one is shown as blocked.",
  "امتیاز و اسپرینت اسکرام (بخش اسکرام را ببینید)": "Scrum points and sprint (see the Scrum section)",
  "لاگ کارت: هر تغییر با نام و زمان همین‌جا ثبت می‌شود و هرگز پاک نمی‌شود.":
    "Card log: every change is recorded here with name and time and is never erased.",
  "جستجو و فیلتر": "Search and filters",
  "نوار جستجوی بالا کارت‌های همین تخته را فیلتر می‌کند.": "The search bar at the top filters the cards of this board.",
  "چیپ‌های زیر عنوان تخته: عقب‌افتاده، سررسید نزدیک، اولویت، برچسب و فرد.":
    "Chips under the board title: overdue, due soon, priority, label and person.",
  "SLA: بالای کارت نشان می‌دهد چند روز است در همین ستون مانده؛ عدد بزرگ یعنی کار گیر کرده.":
    "SLA: the top of a card shows how many days it has stayed in this list; a big number means the work is stuck.",

  /* help: scrum */
  "اسکرام (از صفر)": "Scrum (from scratch)",
  "اسکرام چیست؟": "What is Scrum?",
  "اسکرام یک روش کار چابک (Agile) است: به‌جای برنامه‌ریزی چند ماهه، کار را در بازه‌های کوتاه ۱ تا ۴ هفته‌ای به اسم «اسپرینت» انجام می‌دهیم. در پایان هر اسپرینت چیزی واقعاً تمام‌شده داریم و دربارهٔ اینکه چطور بهتر شویم حرف می‌زنیم.":
    "Scrum is an Agile way of working: instead of planning for months, we work in short 1–4 week periods called “sprints”. At the end of each sprint we have something truly finished and we talk about how to get better.",
  "نقش‌ها": "Roles",
  "مالک محصول (Product Owner): تعیین می‌کند چه کاری مهم‌تر است و ترتیب بک‌لاگ را مشخص می‌کند.":
    "Product Owner: decides which work matters most and sets the order of the backlog.",
  "اسکرام مستر (Scrum Master): مربی روش کار است؛ جلسه‌ها را روان نگه می‌دارد و موانع تیم را برطرف می‌کند. رئیس تیم نیست.":
    "Scrum Master: the coach of the way of working; keeps meetings smooth and removes the team's obstacles. Not the team's boss.",
  "تیم: کسانی که کار را انجام می‌دهند و خودشان تصمیم می‌گیرند چطور انجام دهند.":
    "Team: the people who do the work and decide for themselves how to do it.",
  "ادمین یا اسکرام مستر در صفحهٔ اسکرام → «نقش‌های اسکرام این تخته» نقش‌ها را تعیین می‌کند.":
    "An admin or Scrum Master sets the roles on the Scrum page → “Scrum roles of this board”.",
  "اصطلاح‌ها به زبان ساده": "Terms in plain language",
  "بک‌لاگ (Backlog): فهرست همهٔ کارهایی که قرار است روزی انجام شود، به ترتیب اهمیت.":
    "Backlog: the list of all work that will be done someday, in order of importance.",
  "اسپرینت (Sprint): بازهٔ زمانی ثابت کار، مثلاً ۲ هفته.": "Sprint: a fixed period of work, for example 2 weeks.",
  "هدف اسپرینت (Sprint Goal): یک جملهٔ روشن که می‌گوید این اسپرینت دنبال چیست.":
    "Sprint Goal: one clear sentence saying what this sprint is after.",
  "امتیاز (Story Point): اندازهٔ نسبی یک کار، نه ساعت. ۱ خیلی کوچک و ۲۱ خیلی بزرگ است. اعداد فیبوناچی (۱، ۲، ۳، ۵، ۸، ۱۳، ۲۱) برای همین‌اند که بین «بزرگ» و «خیلی بزرگ» فاصله بیفتد.":
    "Story Point: the relative size of a task, not hours. 1 is very small and 21 is very big. Fibonacci numbers (1, 2, 3, 5, 8, 13, 21) are used so there is a clear gap between “big” and “very big”.",
  "سرعت تیم (Velocity): مجموع امتیازی که تیم در هر اسپرینت واقعاً تمام می‌کند. با آن می‌شود آینده را پیش‌بینی کرد.":
    "Velocity: the total points the team really finishes in each sprint. It lets you predict the future.",
  "برن‌داون (Burndown): نموداری که نشان می‌دهد امتیاز باقی‌مانده روز به روز کم می‌شود یا نه. خط چین مسیر ایده‌آل است.":
    "Burndown: a chart showing whether the remaining points are going down day by day. The dashed line is the ideal path.",
  "مانع (Impediment): هر چیزی که جلوی کار تیم را گرفته، مثل منتظر تأیید ماندن یا نبودن ابزار.":
    "Impediment: anything blocking the team's work, such as waiting for approval or a missing tool.",
  "تعریف «انجام‌شده» (DoD): فهرست شرط‌هایی که یک کار باید داشته باشد تا واقعاً تمام شده حساب شود، مثل تست شده و مستند شده.":
    "Definition of Done (DoD): the list of conditions a task must meet to count as truly finished, such as tested and documented.",
  "ریتروسپکتیو (Retrospective): جلسهٔ پایان اسپرینت برای «چه چیزی خوب بود، چه چیزی باید بهتر شود، چه کاری می‌کنیم».":
    "Retrospective: the end-of-sprint meeting on “what went well, what should improve, what will we do”.",
  "قدم‌به‌قدم در این برنامه": "Step by step in this app",
  "در صفحهٔ اسکرام یک اسپرینت بسازید (نام، هدف، تاریخ شروع و پایان). این کار با ادمین، اسکرام مستر یا مالک محصول است.":
    "On the Scrum page create a sprint (name, goal, start and end date). This is done by an admin, Scrum Master or Product Owner.",
  "تب «بک‌لاگ»: برای هر کار امتیاز بگذارید (همه با هم تخمین بزنید) و کارهای این دوره را به اسپرینت اضافه کنید. می‌توانید همین کار را از داخل خود کارت هم بکنید.":
    "“Backlog” tab: give each task points (estimate together) and add this period's tasks to the sprint. You can also do this from inside the card.",
  "«شروع اسپرینت» را بزنید. فقط یک اسپرینت فعال هم‌زمان داریم و تعداد امتیازهای اولیه به‌عنوان «تعهد» ثبت می‌شود.":
    "Press “Start sprint”. Only one sprint can be active at a time, and the initial points are recorded as the “commitment”.",
  "هر روز: استندآپ را پر کنید (دیروز، امروز، مانع) و کارت‌ها را در ستون‌های تخته جلو ببرید. برن‌داون خودکار ساخته می‌شود.":
    "Every day: fill in the stand-up (yesterday, today, blockers) and move cards along the board lists. The burndown is built automatically.",
  "هر مانعی پیش آمد در بخش موانع ثبت کنید و وقتی حل شد تیک بزنید.":
    "Record every obstacle in the impediments section and tick it when it is resolved.",
  "در پایان «بستن اسپرینت» را بزنید. کارهای تمام‌شده در سرعت تیم حساب می‌شوند و ناتمام‌ها به بک‌لاگ برمی‌گردند.":
    "At the end press “Close sprint”. Finished tasks count toward the team's velocity and unfinished ones return to the backlog.",
  "تب «ریتروسپکتیو»: سه ستون را پر کنید و برای هر مورد بهبود یک اقدام مشخص بنویسید.":
    "“Retrospective” tab: fill the three columns and write one concrete action for each improvement.",
  "اسپرینت را وسط کار بزرگ نکنید. اگر کار جدیدی آمد، به بک‌لاگ برود و در اسپرینت بعد انجام شود؛ کارت «افزوده‌شده بعد از شروع» در صفحه همین را نشان می‌دهد.":
    "Do not grow a sprint in the middle. If new work arrives, put it in the backlog for the next sprint; the “added after start” card on the page shows exactly this.",

  /* help: calendar / gantt */
  "ماه شمسی با شروع هفته از شنبه؛ مهلت هر کارت روی روز خودش دیده می‌شود.":
    "A Jalali month with the week starting on Saturday; each card's due date appears on its own day.",
  "ماه و سال را از بالای صفحه انتخاب کنید و با «امروز» برگردید.":
    "Pick the month and year at the top of the page and return with “Today”.",
  "کارهای عقب‌افتاده قرمزند، تمام‌شده‌ها خط‌خورده و شروع/پایان اسپرینت با ⚡ نشان داده می‌شود.":
    "Overdue tasks are red, finished ones are struck through, and sprint start/end are marked with ⚡.",
  "روی کارت کلیک کنید تا باز شود.": "Click a card to open it.",
  "گانت هر کار را به‌صورت یک نوار از تاریخ شروع تا مهلت نشان می‌دهد. فقط کارت‌هایی که تاریخ دارند می‌آیند؛ اگر چیزی نمی‌بینید، به کارت‌ها تاریخ بدهید.":
    "Gantt shows each task as a bar from its start date to its due date. Only cards with dates appear; if you see nothing, give the cards dates.",

  /* help: messages */
  "سمت راست فهرست همکاران و گروه‌ها؛ سمت چپ گفتگو. هر دو اسکرول جدا دارند.":
    "The list of colleagues and groups is on one side and the conversation on the other. Each scrolls separately.",
  "نقطهٔ سبز کنار عکس یعنی آن همکار الان آنلاین است.": "A green dot next to the photo means that colleague is online now.",
  "دو تیک یعنی خوانده شد. در گروه یعنی همهٔ اعضا خوانده‌اند.":
    "Two ticks mean read. In a group it means all members have read it.",
  "روی پیام ماوس ببرید: واکنش ایموجی، پاسخ، کپی، ویرایش و حذف (فقط پیام خودتان).":
    "Hover over a message: emoji reaction, reply, copy, edit and delete (your own messages only).",
  "فایل و عکس: دکمهٔ گیره، کشیدن و رها کردن یا Paste کردن عکس. حداکثر ۵ مگابایت.":
    "Files and photos: the paperclip button, drag and drop, or paste an image. Maximum 5 MB.",
  "ذره‌بین بالای گفتگو: جستجو در همین گفتگو با پرش به نتیجه.":
    "Magnifier at the top of the chat: search this conversation and jump to the result.",
  "گروه جدید با دکمهٔ + بالای فهرست؛ فقط سازندهٔ گروه عضو اضافه یا حذف می‌کند.":
    "Create a new group with the + button above the list; only the group's creator can add or remove members.",
  "Enter ارسال می‌کند و Shift+Enter خط جدید می‌سازد.": "Enter sends and Shift+Enter makes a new line.",

  /* help: reports */
  "گزارش یعنی نتیجهٔ یک کار یا وضعیت یک موضوع را رسمی برای کسی (یا چند نفر) بفرستید و جواب و تأیید بگیرید؛ برخلاف پیام که برای گفتگوی سریع است.":
    "A report means formally sending the result of a task or the status of a topic to someone (or several people) and getting a reply and approval; unlike a message, which is for quick conversation.",
  "دکمهٔ «گزارش جدید» را بزنید و گیرنده‌ها را انتخاب کنید.": "Press “New report” and choose the recipients.",
  "موضوع و نوع گزارش (روزانه، هفتگی، مشکل، درخواست، تحویل کار) را بنویسید؛ قالب آمادهٔ همان نوع درج می‌شود.":
    "Write the subject and choose the report type (daily, weekly, problem, request, delivery); the ready-made template for that type is inserted.",
  "اولویت و در صورت نیاز تخته یا کارت مرتبط را مشخص کنید و تا ۶ فایل پیوست کنید.":
    "Set the priority and, if needed, the related board or card, and attach up to 6 files.",
  "ارسال: برای هر گیرنده یک گزارش جدا ساخته می‌شود و وضعیت هر نفر جدا پیگیری می‌شود.":
    "Send: a separate report is created for each recipient and each person's status is tracked separately.",
  "وضعیت‌ها": "Statuses",
  "ارسال‌شده ← دیده‌شد (خودکار وقتی گیرنده باز می‌کند)": "Sent → Seen (automatic when the recipient opens it)",
  "گیرنده می‌تواند بگذارد: در حال بررسی، تأیید شد، نیاز به اصلاح یا رد شد.":
    "The recipient can set: under review, approved, needs changes or rejected.",
  "برای «نیاز به اصلاح» و «رد» نوشتن دلیل لازم است.": "A reason is required for “needs changes” and “rejected”.",
  "زیر هر گزارش گفتگوی مخصوص همان گزارش هست و هر تغییر وضعیت هم در آن ثبت می‌شود.":
    "Each report has its own discussion thread, and every status change is recorded in it.",
  "ابزارها": "Tools",
  "بایگانی (برای هر طرف جدا)، فیلتر وضعیت و اولویت، جستجو": "Archive (separate for each side), status and priority filters, search",
  "خروجی CSV از فهرست و چاپ یا ذخیرهٔ PDF از هر گزارش": "CSV export of the list and print or save as PDF for each report",
  "پیش‌نویس گزارش جدید خودکار در مرورگر ذخیره می‌شود.": "The draft of a new report is saved automatically in your browser.",

  /* help: other pages */
  "داشبورد: سلامت تخته، عقب‌افتاده‌ها، سررسید نزدیک، مسدودها و نمودارها؛ همراه خروجی CSV و JSON.":
    "Dashboard: board health, overdue items, due soon, blocked cards and charts; with CSV and JSON export.",
  "کارهای من: همهٔ کارت‌هایی که شما عضو آنها هستید، از همهٔ تخته‌ها.": "My tasks: all cards you are a member of, from all boards.",
  "افراد: فهرست افراد واحد و پیوند آنها به حساب کاربری.": "People: the unit's people directory and their link to a user account.",

  /* help: log */
  "هر کاری که در برنامه انجام شود (ساخت و تغییر کارت، جابه‌جایی، نظر، چک‌لیست، گزارش، اسپرینت، ورود و خروج و ...) با نام کاربر و زمان دقیق ثبت می‌شود و قابل پاک کردن نیست؛ حتی اگر کارت بعداً حذف شود.":
    "Everything done in the app (creating and changing cards, moves, comments, checklists, reports, sprints, sign-ins and sign-outs, …) is recorded with the user's name and exact time and cannot be erased, even if the card is deleted later.",
  "صفحهٔ «لاگ»: جستجو، فیلتر کاربر، بازهٔ زمانی و دسته، و خروجی CSV.":
    "The “Log” page: search, user filter, time range and category, and CSV export.",
  "داخل هر کارت بخش «لاگ کارت» فقط تاریخچهٔ همان کارت را نشان می‌دهد.":
    "Inside each card the “Card log” section shows only that card's history.",
  "رویدادهای ورود، حساب‌ها و گزارش‌ها فقط برای ادمین دیده می‌شود.":
    "Sign-in, account and report events are visible to admins only.",

  /* help: account */
  "حساب و امنیت": "Account and security",
  "عکس پروفایل: منوی حساب (بالا) ← «پروفایل و عکس». تصویر را بکشید و بزرگ‌نمایی کنید تا قاب مناسب شود.":
    "Profile photo: account menu (top) → “Profile & photo”. Drag and zoom the picture to fit the frame.",
  "تغییر رمز و پین دومرحله‌ای (۲FA) از همان منو. با پین فعال، موقع ورود بعد از رمز، پین را هم می‌خواهد.":
    "Change your password and two-step PIN (2FA) from the same menu. With a PIN enabled, sign-in asks for the PIN after the password.",
  "ظاهر: از دکمهٔ «ظاهر» تم، رنگ تأکید و فونت را عوض کنید.": "Appearance: change the theme, accent colour and font from the “Appearance” button.",
  "زنگوله: اعلان منشن، گزارش‌ها و رویدادها.": "Bell: notifications for mentions, reports and events.",
  "پشتیبان‌گیری و بازیابی: فقط ادمین.": "Backup and restore: admins only.",
  "رمز را به کسی ندهید؛ بعد از چند تلاش ناموفق، ورود موقتاً قفل می‌شود.":
    "Never share your password; after several failed attempts, sign-in is locked temporarily.",
  "میان‌بر و نکته‌ها": "Shortcuts and tips",
  "Ctrl + K : جستجوی سریع در همه‌جا": "Ctrl + K : quick search everywhere",
  "Enter : ارسال پیام یا یادداشت  |  Shift + Enter : خط جدید": "Enter : send a message or note  |  Shift + Enter : new line",
  "Ctrl + Enter : ارسال گزارش در پنجرهٔ گزارش": "Ctrl + Enter : send the report in the report window",
  "Esc : بستن پنجره‌ها": "Esc : close windows",
  "اگر چیزی را اشتباه حذف یا جابه‌جا کردید، در «لاگ» می‌بینید چه کسی و کی انجام داده؛ کارت‌ها را هم می‌توانید به‌جای حذف، بایگانی کنید.":
    "If you deleted or moved something by mistake, the “Log” shows who did it and when; you can also archive cards instead of deleting them.",

  /* login */
  "کارت، چک‌لیست، وابستگی و مهلت": "Cards, checklists, dependencies and due dates",
  "اسپرینت، بک‌لاگ، استندآپ و برن‌داون": "Sprint, backlog, stand-up and burndown",
  "برنامهٔ زمانی با تقویم شمسی": "Schedule with the Jalali calendar",
  "گزارش و تأیید": "Reports and approval",
  "ارسال، بررسی و پیگیری وضعیت": "Send, review and track status",
  "پیام‌رسان تیمی": "Team messenger",
  "چت خصوصی و گروهی، فایل و واکنش": "Private and group chat, files and reactions",
  "لاگ کامل": "Full audit log",
  "ثبت دقیق همهٔ تغییرات با نام و زمان": "Every change recorded with name and time",
  "نشست امن و امضاشده": "Secure, signed session",
  "ورود دومرحله‌ای اختیاری": "Optional two-step sign-in",
  "ثبت همهٔ رویدادها": "All events recorded",
  "در حال انجام": "In progress",
  "ورود به حساب": "Sign in to your account",
  "پین امنیتی حساب خود را وارد کنید.": "Enter your account's security PIN.",
  "با نام کاربری و رمز عبوری که ادمین برای شما ساخته وارد شوید.":
    "Sign in with the username and password your admin created for you.",
  "مخفی کردن رمز": "Hide password",
  "نمایش رمز": "Show password",
  "در حال بررسی…": "Checking…",
  "تأیید و ورود": "Confirm and sign in",
  "ورود به سامانه": "Sign in",
  "برن‌داون: طبق برنامه": "Burndown: on track",
  "ظاهر": "Appearance",
  "پین (۴ تا ۸ رقم)": "PIN (4 to 8 digits)",

  /* reports */
  "پیوست‌ها": "Attachments",
  "گفتگو و وضعیت‌ها": "Discussion and status",
  "انجام‌شده:\n- \n\nدر حال انجام:\n- \n\nموانع و مشکلات:\n- \n\nبرنامه فردا:\n-":
    "Done:\n- \n\nIn progress:\n- \n\nBlockers and problems:\n- \n\nPlan for tomorrow:\n-",
  "دستاوردهای این هفته:\n- \n\nکارهای نیمه‌تمام:\n- \n\nریسک‌ها و موانع:\n- \n\nنیاز به تصمیم یا کمک شما:\n- \n\nبرنامه هفته آینده:\n-":
    "This week's achievements:\n- \n\nUnfinished work:\n- \n\nRisks and blockers:\n- \n\nNeeds your decision or help:\n- \n\nPlan for next week:\n-",
  "شرح مشکل:\n\nزمان وقوع:\n\nاثر بر کار:\n\nاقدام انجام‌شده:\n\nکمک موردنیاز:\n":
    "Problem description:\n\nWhen it happened:\n\nImpact on work:\n\nAction taken:\n\nHelp needed:\n",
  "موضوع درخواست:\n\nتوضیح:\n\nمهلت موردنیاز:\n": "Subject of the request:\n\nDetails:\n\nDeadline needed:\n",
  "کار تحویل‌شده:\n\nنتیجه / خروجی:\n\nنکات مهم برای بررسی:\n":
    "Delivered work:\n\nResult / output:\n\nKey points to review:\n",
};
