import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dictionarySource = readFileSync(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../src/components/dashboard-view.tsx", import.meta.url), "utf8");

function keysFor(language) {
  const start = dictionarySource.indexOf(`  ${language}: {`);
  assert.notEqual(start, -1, `Missing ${language} dictionary`);
  const next = language === "fa" ? dictionarySource.indexOf("  },\n  en: {", start) : dictionarySource.indexOf("  },\n};", start);
  assert.notEqual(next, -1, `Could not find end of ${language} dictionary`);
  return new Set([...dictionarySource.slice(start, next).matchAll(/^\s{4}([A-Za-z0-9_]+):/gm)].map((match) => match[1]));
}

test("Persian and English dictionaries have matching keys", () => {
  const fa = keysFor("fa");
  const en = keysFor("en");
  assert.deepEqual([...fa].filter((key) => !en.has(key)), []);
  assert.deepEqual([...en].filter((key) => !fa.has(key)), []);
});

test("dashboard translation calls reference known dictionary keys", () => {
  const known = keysFor("fa");
  const used = new Set([...dashboardSource.matchAll(/\bt\("([A-Za-z0-9_]+)"\)/g)].map((match) => match[1]));
  assert.deepEqual([...used].filter((key) => !known.has(key)), []);
});

test("help guide Persian copy has English translations", () => {
  const helpSource = readFileSync(new URL("../src/components/help-panel.tsx", import.meta.url), "utf8");
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const persianStrings = new Set([...helpSource.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1]));
  const missing = [...persianStrings].filter((text) => !guideEnglish[text] && !keysFor("fa").has(text));
  assert.deepEqual(missing, []);
});

test("onboarding tour Persian copy has English translations", () => {
  const onboardingSource = readFileSync(new URL("../src/components/onboarding-tour.tsx", import.meta.url), "utf8");
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const persianStrings = new Set([...onboardingSource.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1]));
  const missing = [...persianStrings].filter((text) => !guideEnglish[text] && !keysFor("fa").has(text));
  assert.deepEqual(missing, []);
});

test("daily tips have English translations", () => {
  const tipsSource = readFileSync(new URL("../src/lib/daily-tips.ts", import.meta.url), "utf8");
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const tipsBlock = tipsSource.slice(tipsSource.indexOf("export const DAILY_TIPS"), tipsSource.indexOf("];", tipsSource.indexOf("export const DAILY_TIPS")));
  const tips = new Set([...tipsBlock.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1]));
  const missing = [...tips].filter((text) => !guideEnglish[text]);
  assert.deepEqual(missing, []);
});

test("Kanban board UI and card templates have English translations", () => {
  const boardFiles = [
    "../src/components/board/card-modal.tsx",
    "../src/components/board/kanban.tsx",
    "../src/components/board/list-column.tsx",
    "../src/components/board/task-card.tsx",
    "../src/lib/board-context.tsx",
  ];
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const sources = boardFiles.map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
  const constants = readFileSync(new URL("../src/lib/constants.ts", import.meta.url), "utf8");
  const templateStart = constants.indexOf("export const CARD_TEMPLATES");
  const templateEnd = constants.indexOf("\n];", templateStart);
  sources.push(constants.slice(templateStart, templateEnd));
  const literals = new Set(sources.flatMap((source) => [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1])));
  const missing = [...literals].filter((text) => text !== "؟" && text !== "٪" && !text.includes("${") && !guideEnglish[text] && !known.has(text));
  assert.deepEqual(missing, []);
});

test("calendar, Gantt, and Scrum badge copy has English translations", () => {
  const files = ["../src/components/calendar-view.tsx", "../src/components/gantt-view.tsx", "../src/components/scrum-badge.tsx"];
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const literals = new Set(files.flatMap((file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    return [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1]);
  }));
  const missing = [...literals].filter((text) => text !== "؟" && text !== "٪" && !text.includes("${") && !guideEnglish[text] && !known.has(text));
  assert.deepEqual(missing, []);
});

test("Scrum workspace Persian UI copy has English translations", () => {
  const scrumSource = readFileSync(new URL("../src/components/scrum-view.tsx", import.meta.url), "utf8");
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const literals = new Set([...scrumSource.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1]));
  const missing = [...literals].filter((text) => text !== "؟" && text !== "٪" && !text.includes("${") && !guideEnglish[text] && !known.has(text));
  assert.deepEqual(missing, []);
});

test("messaging, message popup, and notification UI have English translations", () => {
  const files = ["../src/components/messages-view.tsx", "../src/components/message-popup.tsx", "../src/components/notifications-bell.tsx"];
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const literals = new Set(files.flatMap((file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    return [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1]);
  }));
  const missing = [...literals].filter((text) => text !== "؟" && text !== "٪" && !text.includes("${") && !guideEnglish[text] && !known.has(text));
  assert.deepEqual(missing, []);
});


test("reports, activity, user administration, profile, and security UI have English translations", () => {
  const files = [
    "../src/components/reports-inbox-view.tsx",
    "../src/components/activity-view.tsx",
    "../src/components/send-report-dialog.tsx",
    "../src/components/admin-users-view.tsx",
    "../src/components/permissions-panel.tsx",
    "../src/components/profile-dialog.tsx",
    "../src/components/change-password-dialog.tsx",
  ];
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const literals = new Set(files.flatMap((file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    return [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)]
      .map((match) => match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  }));
  const missing = [...literals].filter((text) =>
    !text.startsWith(">") && !text.includes("${") && !guideEnglish[text] && !known.has(text)
  );
  assert.deepEqual(missing, []);
});


test("app shell, command palette, people, tasks, due reminders, and board context use translated vocabulary", () => {
  const files = [
    "../src/components/app-shell.tsx",
    "../src/components/command-palette.tsx",
    "../src/components/people-view.tsx",
    "../src/components/my-tasks-view.tsx",
    "../src/components/due-reminder-popup.tsx",
    "../src/components/user-avatar.tsx",
    "../src/lib/board-context.tsx",
  ];
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const literals = new Set(files.flatMap((file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    return [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)]
      .map((match) => match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  }));
  const missing = [...literals].filter((text) =>
    !text.startsWith(">") && !text.includes("${") && !guideEnglish[text] && !known.has(text)
  );
  assert.deepEqual(missing, []);
});


test("application shell, command palette, people, reminders, and appearance settings have English translations", () => {
  const files = [
    "../src/components/app-shell.tsx",
    "../src/components/command-palette.tsx",
    "../src/components/people-view.tsx",
    "../src/components/my-tasks-view.tsx",
    "../src/components/due-reminder-popup.tsx",
    "../src/components/user-avatar.tsx",
    "../src/components/appearance-panel.tsx",
    "../src/lib/board-context.tsx",
  ];
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const literals = new Set(files.flatMap((file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    return [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)]
      .map((match) => match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  }));
  const missing = [...literals].filter((text) =>
    !text.startsWith(">") && !text.includes("${") && !guideEnglish[text] && !known.has(text)
  );
  assert.deepEqual(missing, []);
});

test("authentication, password, and server error messages have English translations", () => {
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const sources = [
    readFileSync(new URL("../src/lib/local-users.ts", import.meta.url), "utf8"),
    readFileSync(new URL("../src/lib/server/password.server.ts", import.meta.url), "utf8"),
    readFileSync(new URL("../src/lib/server/session.server.ts", import.meta.url), "utf8"),
  ];
  const literals = new Set(sources.flatMap((source) =>
    [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1])
  ));
  const missing = [...literals].filter((text) => !guideEnglish[text] && !keysFor("fa").has(text));
  assert.deepEqual(missing, []);
});

test("shared controls and date/emoji pickers translate visible Persian UI copy", () => {
  const files = [
    "../src/components/ui/dialog.tsx",
    "../src/components/workspace-layout.tsx",
    "../src/components/emoji-picker.tsx",
    "../src/components/jalali-picker.tsx",
    "../src/lib/emoji.ts",
  ];
  const guideStart = dictionarySource.indexOf("const guideEnglish: Record<string, string> = ") + "const guideEnglish: Record<string, string> = ".length;
  const guideEnd = dictionarySource.indexOf(";\n\ntype LangContextType", guideStart);
  const guideEnglish = JSON.parse(dictionarySource.slice(guideStart, guideEnd));
  const known = keysFor("fa");
  const literals = new Set(files.flatMap((file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    return [...source.matchAll(/"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g)].map((match) => match[1]);
  }));
  const missing = [...literals].filter((text) => !guideEnglish[text] && !known.has(text) && !/^\p{Extended_Pictographic}+$/u.test(text));
  assert.deepEqual(missing, []);
});
