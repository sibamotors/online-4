/** Dynamic Persian sentences with holes. Longer templates are tried first. */
export const TEMPLATES: readonly [string, string][] = [
  ["تخته «{0}» برای همیشه حذف شود؟ این کار برگشت‌ناپذیر است.", "Delete board “{0}” forever? This cannot be undone."],
  ["اسپرینت «{0}» بسته شد: {1} از {2} امتیاز انجام شد، {3} کارت به بک‌لاگ برگشت", "Sprint “{0}” closed: {1} of {2} points done, {3} cards returned to the backlog"],
  ["اسپرینت «{0}» شروع شد ({1} امتیاز، {2} کارت)", "Sprint “{0}” started ({1} points, {2} cards)"],
  ["کارت را از تخته «{0}» به تخته «{1}» (ستون «{2}») منتقل کرد", "Moved the card from board “{0}” to board “{1}” (list “{2}”)"],
  ["کارت «{0}» را از تخته «{1}» به تخته «{2}» منتقل کرد", "Moved card “{0}” from board “{1}” to board “{2}”"],
  ["چک‌لیست «{0}» را ویرایش کرد ({1} از {2} انجام‌شده)", "Edited checklist “{0}” ({1} of {2} done)"],
  ["حجم «{0}» ({1}) بیشتر از ۵ مگابایت است.", "“{0}” ({1}) is larger than 5 MB."],
  ["از این کارت یک کپی ساخت (در تخته «{0}»)", "Copied this card (onto board “{0}”)"],
  ["حساب «{0}» ({1}) را ساخت یا رمز آن را بازنشانی کرد", "Created account “{0}” ({1}) or reset its password"],
  ["دسترسی‌های «{0}» را محدود کرد: {1}", "Restricted permissions for “{0}”: {1}"],
  ["روی کارت «{0}» نظر ثبت کرد: «{1}»", "Commented on card “{0}”: “{1}”"],
  ["مورد «{0}» را از چک‌لیست «{1}» حذف کرد", "Removed item “{0}” from checklist “{1}”"],
  ["مورد «{0}» را به چک‌لیست «{1}» افزود", "Added item “{0}” to checklist “{1}”"],
  ["نام چک‌لیست را از «{0}» به «{1}» تغییر داد", "Renamed checklist from “{0}” to “{1}”"],
  ["کارت «{0}» را در ستون «{1}» ایجاد کرد", "Created card “{0}” in list “{1}”"],
  ["تاریخچهٔ کامل کارت «{0}»", "Full history of card “{0}”"],
  ["کاربر «{0}» ({1}) حذف شود؟", "Delete user “{0}” ({1})?"],
  ["ستون «{0}» و کارت‌هایش حذف شود؟", "Delete list “{0}” and its cards?"],
  ["پیشرفت را از {0}٪ به {1}٪ رساند", "Changed progress from {0}% to {1}%"],
  ["اولویت را از {0} به {1} تغییر داد", "Changed priority from {0} to {1}"],
  ["عنوان را از {0} به {1} تغییر داد", "Changed the title from {0} to {1}"],
  ["کارت را از ستون {0} به ستون {1} منتقل کرد", "Moved the card from list {0} to list {1}"],
  ["نام تخته را از «{0}» به «{1}» تغییر داد", "Renamed the board from “{0}” to “{1}”"],
  ["نام ستون را از «{0}» به «{1}» تغییر داد", "Renamed the list from “{0}” to “{1}”"],
  ["کارت «{0}» را به ستون «{1}» منتقل کرد", "Moved card “{0}” to list “{1}”"],
  ["تاریخ شروع را {0}به {1} تغییر داد", "Changed the start date {0}to {1}"],
  ["مهلت انجام را {0}به {1} تغییر داد", "Changed the due date {0}to {1}"],
  ["پیگیرکننده را {0}به {1} تغییر داد", "Changed the follower {0}to {1}"],
  ["{0} کار به‌خاطر وابستگی‌های ناتمام مسدود است.", "{0} cards are blocked by unfinished dependencies."],
  ["میانگین سن در ستون {0}: {1} روز", "Average age in list {0}: {1} days"],
  ["بیشترین بار کاری: {0} با {1} کار.", "Heaviest workload: {0} with {1} cards."],
  ["اسپرینت بسته شد · {0} امتیاز انجام شد{1}", "Sprint closed · {0} points completed{1}"],
  ["همهٔ محدودیت‌های دسترسی «{0}» را برداشت", "Cleared all permission limits for “{0}”"],
  ["حداکثر {0} فایل می‌توان پیوست کرد.", "You can attach at most {0} files."],
  ["حجم فایل بیشتر از {0} است.", "The file is larger than {0}."],
  ["مشخصات «{0} {1}» را ویرایش کرد", "Edited the profile of “{0} {1}”"],
  ["«{0} {1}» را به فهرست افراد افزود", "Added “{0} {1}” to the people directory"],
  ["«{0} {1}» را از فهرست افراد حذف کرد", "Removed “{0} {1}” from the people directory"],
  ["{0} روز در ستون فعلی", "{0} days in the current list"],
  ["{0} کار عقب‌افتاده است{1}.", "{0} cards are overdue{1}."],
  ["{0} کار امروز سررسید دارد.", "{0} cards are due today."],
  ["{0} کار باز مسئول اجرا ندارد.", "{0} open cards have no assignee."],
  ["تخته «{0}» را برای همیشه حذف کرد", "Permanently deleted board “{0}”"],
  ["تخته «{0}» را از بایگانی بازگرداند", "Restored board “{0}” from the archive"],
  ["تخته «{0}» را بایگانی کرد", "Archived board “{0}”"],
  ["علامت انجام مورد «{0}» را برداشت", "Unchecked item “{0}”"],
  ["مورد «{0}» را انجام‌شده علامت زد", "Marked item “{0}” done"],
  ["گزارش «{0}» ارسال شد به {1}{2}", "Report “{0}” was sent to {1}{2}"],
  ["گزارش «{0}» برای {1} ارسال شد", "Report “{0}” was sent to {1}"],
  ["گزارش «{0}» از {1} خوانده شد", "Report “{0}” from {1} was read"],
  ["گزارش «{0}» از {1}: {2}{3}", "Report “{0}” from {1}: {2}{3}"],
  ["یادداشت روی گزارش «{0}»: {1}", "Note on report “{0}”: {1}"],
  ["پیام جدید دربارهٔ «{0}»", "New message about “{0}”"],
  ["عکس پروفایل «{0}» را حذف کرد", "Removed the profile photo of “{0}”"],
  ["امتیاز کارت از {0} به {1} تغییر کرد", "Card points changed from {0} to {1}"],
  ["کارت به اسپرینت «{0}» اضافه شد", "Card was added to sprint “{0}”"],
  ["چک‌لیست «{0}» را ایجاد کرد", "Created checklist “{0}”"],
  ["چک‌لیست «{0}» را حذف کرد", "Deleted checklist “{0}”"],
  ["از کارت «{0}» کپی ساخت", "Made a copy of card “{0}”"],
  ["کارت را در ستون «{0}» ایجاد کرد", "Created the card in list “{0}”"],
  ["کارت را به ستون «{0}» منتقل کرد", "Moved the card to list “{0}”"],
  ["جای ستون «{0}» را عوض کرد", "Reordered list “{0}”"],
  ["ستون «{0}» را حذف کرد{1}", "Deleted list “{0}”{1}"],
  ["(همراه با {0} کارت)", " (along with {0} cards)"],
  ["حساب «{0}» را حذف کرد", "Deleted account “{0}”"],
  ["برچسب «{0}» را ساخت", "Created label “{0}”"],
  ["برچسب «{0}» را حذف کرد", "Deleted label “{0}”"],
  ["اسپرینت «{0}» ساخته شد", "Sprint “{0}” was created"],
  ["اسپرینت «{0}» ویرایش شد", "Sprint “{0}” was edited"],
  ["اسپرینت «{0}» حذف شد", "Sprint “{0}” was deleted"],
  ["وابستگی به {0} را افزود", "Added a dependency on {0}"],
  ["وابستگی به {0} را برداشت", "Removed a dependency on {0}"],
  ["{0} را به کارت اضافه کرد", "Added {0} to the card"],
  ["{0} را از کارت حذف کرد", "Removed {0} from the card"],
  ["برچسب {0} را افزود", "Added label {0}"],
  ["برچسب {0} را برداشت", "Removed label {0}"],
  ["نظر ثبت کرد: «{0}»", "Commented: “{0}”"],
  ["منشن در «{0}»", "Mention in “{0}”"],
  ["تخته «{0}» بایگانی شود؟", "Archive board “{0}”?"],
  ["کارت «{0}» حذف شود؟", "Delete card “{0}”?"],
  ["برچسب «{0}» حذف شود؟", "Delete label “{0}”?"],
  ["حذف {0} از گروه؟", "Remove {0} from the group?"],
  ["«{0}» حذف شود؟", "Delete “{0}”?"],
  ["«{0}» خالی است.", "“{0}” is empty."],
  ["«{0}» حذف شد", "“{0}” was deleted"],
  ["گزارش «{0}» — {1}", "Report “{0}” — {1}"],
  ["گزارش «{0}» {1} شد", "Report “{0}” was marked {1}"],
  ["گزارش برای {0} نفر ارسال شد", "Report sent to {0} people"],
  ["{0} نفر انتخاب شده", "{0} people selected"],
  ["ارسال برای {0} نفر", "Send to {0} people"],
  ["{0} رویداد خروجی گرفته شد", "{0} events exported"],
  ["· {0} کار بدون مهلت", " · {0} cards with no due date"],
  ["· {0} عقب‌افتاده", " · {0} overdue"],
  ["· {0} کارت به بک‌لاگ برگشت", " · {0} cards returned to the backlog"],
  ["· پایان {0}", " · ends {0}"],
  ["سررسید ۷ روز ({0})", "Due in 7 days ({0})"],
  ["عقب‌افتاده ({0})", "Overdue ({0})"],
  ["بک‌لاگ ({0})", "Backlog ({0})"],
  ["لاگ کارت ({0} رویداد)", "Card log ({0} events)"],
  ["{0} پیام جدید", "{0} new messages"],
  ["{0} روز دیرکرد", "{0} days overdue"],
  ["{0} روز مانده", "{0} days left"],
  ["{0} دقیقه پیش", "{0} minutes ago"],
  ["{0} ساعت پیش", "{0} hours ago"],
  ["{0} روز پیش", "{0} days ago"],
  ["{0} روز", "{0} days"],
  ["{0} کارت", "{0} cards"],
  ["{0} عضو", "{0} members"],
  ["{0} از {1}{2}", "{0} of {1}{2}"],
  ["{0} از {1}", "{0} of {1}"],
  ["{0}٪", "{0}%"],
  ["شروع: {0}", "Start: {0}"],
  ["مهلت: {0}", "Due: {0}"],
  ["شروع {0}", "Start {0}"],
  ["پایان {0}", "End {0}"],
  ["وضعیت: {0}", "Status: {0}"],
  ["اسپرینت: {0}", "Sprint: {0}"],
  ["تعهد: {0}", "Commitment: {0}"],
  ["انجام: {0}", "Done: {0}"],
  ["ارجاع: {0}", "Forward: {0}"],
  ["پاسخ: {0}", "Reply: {0}"],
  ["حذف {0}", "Remove {0}"],
  ["توسط {0}", "By {0}"],
  ["تخته {0} را ساخت", "Created board {0}"],
  ["ستون «{0}» را ساخت", "Created list “{0}”"],
  ["کارت «{0}» را حذف کرد", "Deleted card “{0}”"],
  ["استندآپ {0}{1}", "Stand-up {0}{1}"],
  ["· مانع: {0}", " · Blocker: {0}"],
  ["— قدیمی‌ترین: «{0}»", " — oldest: “{0}”"],
  ["از {0}", "from {0}"],
  ["<h2>پیوست‌ها</h2><ul>{0}</ul>", "<h2>Attachments</h2><ul>{0}</ul>"],
  ["<h2>گفتگو و وضعیت‌ها</h2><ul>{0}</ul>", "<h2>Discussion and status</h2><ul>{0}</ul>"],
];

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

const CALENDAR: [string, string][] = [
  ["یکشنبه", "Sunday"],
  ["دوشنبه", "Monday"],
  ["سه‌شنبه", "Tuesday"],
  ["چهارشنبه", "Wednesday"],
  ["پنجشنبه", "Thursday"],
  ["شنبه", "Saturday"],
  ["جمعه", "Friday"],
  ["فروردین", "Farvardin"],
  ["اردیبهشت", "Ordibehesht"],
  ["خرداد", "Khordad"],
  ["تیر", "Tir"],
  ["مرداد", "Mordad"],
  ["شهریور", "Shahrivar"],
  ["مهر", "Mehr"],
  ["آبان", "Aban"],
  ["آذر", "Azar"],
  ["دی", "Dey"],
  ["بهمن", "Bahman"],
  ["اسفند", "Esfand"],
  ["امروز", "Today"],
  ["دیروز", "Yesterday"],
  ["همین حالا", "Just now"],
];

const compiled = [...TEMPLATES]
  .sort((a, b) => b[0].length - a[0].length)
  .map(([fa, en]) => ({ re: templateToRegExp(fa), en }));

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templateToRegExp(fa: string): RegExp {
  const pieces = fa.split(/\{\d+\}/);
  let src = "^";
  pieces.forEach((piece, i) => {
    if (i > 0) src += i === pieces.length - 1 ? "(.*)" : "(.+?)";
    src += escapeReg(piece);
  });
  src += "$";
  return new RegExp(src);
}

export function latinDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/٬/g, ",").replace(/٪/g, "%");
}

export function applyTemplates(key: string): string | null {
  for (const { re, en } of compiled) {
    const m = re.exec(key);
    if (!m) continue;
    return en.replace(/\{(\d+)\}/g, (_, i) => m[Number(i) + 1] ?? "");
  }
  return null;
}

export function replaceCalendarTokens(s: string): string {
  let out = s;
  for (const [fa, en] of CALENDAR) {
    out = out.replace(new RegExp(`(?<![\\u0600-\\u06FF])${escapeReg(fa)}(?![\\u0600-\\u06FF])`, "g"), en);
  }
  return latinDigits(out);
}

export function translateCalendar(key: string): string | null {
  if (!/[\u0600-\u06FF]/.test(key)) return null;
  const out = replaceCalendarTokens(key);
  if (/[\u0600-\u06FF]/.test(out)) return null;
  return out === key ? null : out;
}
