import { useLayoutEffect } from "react";
import { translatePhrase, useTranslation, type Lang } from "@/lib/i18n";

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const origText = new WeakMap<Text, string>();
const outText = new WeakMap<Text, string>();
const origAttr = new WeakMap<Element, Partial<Record<(typeof ATTRS)[number], string>>>();

let applying = false;
let originalTitle = "";

function skipText(el: Element | null): boolean {
  if (!el) return true;
  if (el.closest("[data-i18n-skip], script, style, noscript")) return true;
  if (el.closest("[contenteditable='true']")) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SCRIPT" || tag === "STYLE";
}

function renderText(node: Text, lang: Lang) {
  const cur = node.nodeValue ?? "";
  const prevOut = outText.get(node);
  const prevOrig = origText.get(node);
  let source = cur;
  if (prevOrig !== undefined && prevOut !== undefined && cur === prevOut) source = prevOrig;
  const next = translatePhrase(source, lang);
  if (next !== cur) {
    origText.set(node, source);
    outText.set(node, next);
    node.nodeValue = next;
    return;
  }
  if (lang === "fa") {
    origText.delete(node);
    outText.delete(node);
  }
}

function renderAttrs(el: Element, lang: Lang) {
  if (el.closest("[data-i18n-skip], script, style")) return;
  let bag = origAttr.get(el);
  for (const name of ATTRS) {
    const cur = el.getAttribute(name);
    if (cur == null) continue;
    const stored = bag?.[name];
    const source = stored !== undefined && cur === translatePhrase(stored, "en") ? stored : cur;
    const next = translatePhrase(source, lang);
    if (next !== cur) {
      bag ??= {};
      bag[name] = source;
      origAttr.set(el, bag);
      el.setAttribute(name, next);
    } else if (lang === "fa" && stored !== undefined && cur !== stored) {
      el.setAttribute(name, stored);
      if (bag) delete bag[name];
    }
  }
}

function walk(node: Node, lang: Lang) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = (node as Text).parentElement;
    if (!skipText(parent)) renderText(node as Text, lang);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  renderAttrs(el, lang);
  for (const child of el.childNodes) walk(child, lang);
}

function syncTitle(lang: Lang) {
  const cur = document.title || "";
  if (!originalTitle) originalTitle = cur;
  if (lang === "fa") {
    const en = translatePhrase(originalTitle, "en");
    document.title = cur === en ? originalTitle : cur;
    if (cur !== en) originalTitle = cur;
    return;
  }
  if (/[\u0600-\u06FF]/.test(cur)) originalTitle = cur;
  const next = translatePhrase(originalTitle, "en");
  if (next) document.title = next;
}

/**
 * Rewrites rendered Persian UI copy when English is selected, including
 * strings produced on the server or stored in the workspace. React keeps
 * the Persian source; this layer only changes what is on screen.
 */
export function I18nBridge() {
  const { lang } = useTranslation();

  useLayoutEffect(() => {
    const root = document.body;
    const run = () => {
      if (applying) return;
      applying = true;
      try {
        walk(root, lang);
        syncTitle(lang);
      } finally {
        applying = false;
      }
    };
    run();
    if (lang !== "en") return;
    const obs = new MutationObserver((records) => {
      if (applying) return;
      applying = true;
      try {
        for (const r of records) {
          if (r.type === "characterData" && r.target.nodeType === Node.TEXT_NODE) {
            const parent = (r.target as Text).parentElement;
            if (!skipText(parent)) renderText(r.target as Text, lang);
          } else if (r.type === "attributes" && r.target.nodeType === Node.ELEMENT_NODE) {
            renderAttrs(r.target as Element, lang);
          } else if (r.type === "childList") {
            r.addedNodes.forEach((n) => walk(n, lang));
          }
        }
      } finally {
        applying = false;
      }
    });
    obs.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });
    return () => obs.disconnect();
  }, [lang]);

  return null;
}
