/** Localize persisted activity descriptions without changing historical records. */
export function localizeActivityDescription(
  text: string,
  lang: "fa" | "en",
  t: (key: string) => string,
): string {
  if (lang === "fa") return text;
  const exact = t(text);
  if (exact !== text) return exact;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^عنوان را از «(.*?)» به «(.*?)» تغییر داد$/))) return `Changed title from “${m[1]}” to “${m[2]}”`;
  if ((m = text.match(/^اولویت را از (.*?) به (.*?) تغییر داد$/))) return `Changed priority from ${t(m[1])} to ${t(m[2])}`;
  if ((m = text.match(/^پیشرفت را از (.*?)٪ به (.*?)٪ رساند$/))) return `Changed progress from ${m[1]}% to ${m[2]}%`;
  if ((m = text.match(/^تاریخ شروع را (?:از (.*?) )?به (.*?) تغییر داد$/))) return m[1] ? `Changed start date from ${m[1]} to ${m[2]}` : `Set start date to ${m[2]}`;
  if ((m = text.match(/^مهلت انجام را (?:از (.*?) )?به (.*?) تغییر داد$/))) return m[1] ? `Changed due date from ${m[1]} to ${m[2]}` : `Set due date to ${m[2]}`;
  if (text === "تاریخ شروع را حذف کرد") return "Removed start date";
  if (text === "مهلت انجام را حذف کرد") return "Removed due date";
  if (text === "توضیحات کارت را نوشت") return "Added card description";
  if (text === "توضیحات کارت را پاک کرد") return "Cleared card description";
  if (text === "توضیحات کارت را ویرایش کرد") return "Edited card description";
  if (text === "پیگیرکننده را برداشت") return "Removed follower";
  if (text === "رنگ کاور کارت را تغییر داد") return "Changed card cover color";
  if (text === "رنگ کاور کارت را برداشت") return "Removed card cover color";
  if ((m = text.match(/^(.*?) را به کارت اضافه کرد$/))) return `Added ${m[1]} to the card`;
  if ((m = text.match(/^(.*?) را از کارت حذف کرد$/))) return `Removed ${m[1]} from the card`;
  if ((m = text.match(/^برچسب (.*?) را افزود$/))) return `Added label ${m[1]}`;
  if ((m = text.match(/^برچسب (.*?) را برداشت$/))) return `Removed label ${m[1]}`;
  if ((m = text.match(/^وابستگی به (.*?) را افزود$/))) return `Added dependency on ${m[1]}`;
  if ((m = text.match(/^وابستگی به (.*?) را برداشت$/))) return `Removed dependency on ${m[1]}`;
  if ((m = text.match(/^کارت را از ستون (.*?) به ستون (.*?) منتقل کرد$/))) return `Moved card from column ${m[1]} to column ${m[2]}`;
  if (text === "کارت را بایگانی کرد") return "Archived the card";
  if (text === "کارت را از بایگانی خارج کرد") return "Restored the card from archive";
  if ((m = text.match(/^تخته «(.*?)» را ساخت$/))) return `Created board “${m[1]}”`;
  if ((m = text.match(/^نام تخته را از «(.*?)» به «(.*?)» تغییر داد$/))) return `Renamed board from “${m[1]}” to “${m[2]}”`;
  if ((m = text.match(/^تخته «(.*?)» را بایگانی کرد$/))) return `Archived board “${m[1]}”`;
  if ((m = text.match(/^تخته «(.*?)» را از بایگانی بازگرداند$/))) return `Restored board “${m[1]}” from archive`;
  if ((m = text.match(/^ستون «(.*?)» را ساخت$/))) return `Created column “${m[1]}”`;
  if ((m = text.match(/^نام ستون را از «(.*?)» به «(.*?)» تغییر داد$/))) return `Renamed column from “${m[1]}” to “${m[2]}”`;
  if ((m = text.match(/^ستون «(.*?)» را حذف کرد(?: \(همراه با (.*?) کارت\))?$/))) return `Deleted column “${m[1]}”${m[2] ? ` (including ${m[2]} cards)` : ""}`;
  if ((m = text.match(/^کارت را در ستون «(.*?)» ایجاد کرد$/))) return `Created card in column “${m[1]}”`;
  if ((m = text.match(/^کارت «(.*?)» را در ستون «(.*?)» ایجاد کرد$/))) return `Created card “${m[1]}” in column “${m[2]}”`;
  if ((m = text.match(/^کارت «(.*?)» را حذف کرد$/))) return `Deleted card “${m[1]}”`;
  if ((m = text.match(/^روی کارت «(.*?)» نظر ثبت کرد: «(.*?)»$/))) return `Commented on card “${m[1]}”: “${m[2]}”`;
  if ((m = text.match(/^از کارت «(.*?)» کپی ساخت$/))) return `Copied card “${m[1]}”`;
  if ((m = text.match(/^مشخصات «(.*?)» را ویرایش کرد$/))) return `Edited profile for “${m[1]}”`;
  if ((m = text.match(/^«(.*?)» را به فهرست افراد افزود$/))) return `Added “${m[1]}” to people`;
  if ((m = text.match(/^«(.*?)» را از فهرست افراد حذف کرد$/))) return `Removed “${m[1]}” from people`;
  if ((m = text.match(/^برچسب «(.*?)» را ساخت$/))) return `Created label “${m[1]}”`;
  if ((m = text.match(/^برچسب «(.*?)» را حذف کرد$/))) return `Deleted label “${m[1]}”`;
  if (text === "وارد برنامه شد") return "Signed in";
  if (text === "از برنامه خارج شد") return "Signed out";
  if (text === "پین ورود را غیرفعال کرد") return "Disabled sign-in PIN";
  if (text === "پین ورود را فعال/تغییر داد") return "Enabled or changed sign-in PIN";
  return text;
}
