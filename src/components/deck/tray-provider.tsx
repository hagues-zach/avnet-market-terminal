"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import {
  addItem,
  CommentarySchema,
  DeckSummarySchema,
  moveItem,
  parseSummary,
  parseTray,
  removeItem,
  sectionOk,
  TRAY_LIMIT,
  TrayItemSchema,
  TraySchema,
  updateItem,
  type Commentary,
  type DeckSummary,
  type TrayItem,
} from "@/lib/deck/tray";
import { MiniTray } from "./mini-tray";

// The deck tray (docs/design/deck-tray): slides collected with Add to deck, kept
// in this browser until there is sign-in, shared by every tab (a change in one
// shows in the others). When the browser won't store anything (a private
// window, blocked site data) the tray still works for this tab, in memory.
// Mounted once in the app shell, with the toast and the mini tray.

const KEY = "deck-tray-v1";
/** Claude's executive summary for the deck, kept beside the tray (each slide's commentary is in its item). */
const SUMMARY_KEY = "deck-summary-v1";
const CHANGED = "deck-tray-change";

/** What a page hands over; the tray stamps the time and includes it. */
export type NewTrayItem = Omit<TrayItem, "addedAt" | "included">;

/** What couldn't be saved, by key, kept for this tab. */
const memory = new Map<string, string>();

function readKey(key: string): string {
  const kept = memory.get(key);
  if (kept !== undefined) return kept;
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Saves it; false when the browser wouldn't (it's then kept for this tab only, and gone on reload). */
function writeKey(key: string, value: string): boolean {
  memory.set(key, value);
  let saved = false;
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
    // Saved, so other tabs' changes (storage events) are read from storage again.
    memory.delete(key);
    saved = true;
  } catch {
    // Keep it in memory for this tab.
  }
  window.dispatchEvent(new Event(CHANGED));
  return saved;
}

const read = () => readKey(KEY);
const write = (items: TrayItem[]) => writeKey(KEY, JSON.stringify(items));
const readSummary = () => readKey(SUMMARY_KEY);

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => (e.key === KEY || e.key === SUMMARY_KEY || e.key === null) && onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}

interface Toast {
  id: number;
  text: string;
  review?: boolean;
}

interface Tray {
  items: TrayItem[];
  /** False until the browser's saved tray has been read (the server renders an empty one). */
  ready: boolean;
  has: (id: string) => boolean;
  /** Adds it and says so; says why when it can't. */
  add: (item: NewTrayItem) => boolean;
  remove: (id: string, quiet?: boolean) => void;
  move: (id: string, dir: -1 | 1) => void;
  update: (id: string, patch: Partial<Pick<TrayItem, "note" | "included" | "section">>) => void;
  /**
   * The tray rearranged in one write, through the same path as moving a slide:
   * `f` gets the tray as saved now and returns the new one, or null to change
   * nothing (the tray moved on since). The tray as it was comes back, for Undo,
   * or null when nothing was written. Applying Claude's order uses it.
   */
  arrange: (f: (items: TrayItem[]) => TrayItem[] | null) => { before: TrayItem[]; saved: boolean } | null;
  /** Section titles by slide id, saved in one write (undefined clears one); "refused" when one doesn't fit. */
  setSections: (byId: Record<string, string | undefined>) => "saved" | "unsaved" | "refused";
  /**
   * Claude's commentary by slide id, saved in one write (undefined clears a slide's),
   * and with `summary` given, the deck's summary too (null clears it). Anything
   * outside the tray's limits is refused before anything is written, since one bad
   * item would make the whole saved tray unreadable. "unsaved" when the browser
   * kept it for this tab only.
   */
  setCommentary: (byId: Record<string, Commentary | undefined>, summary?: DeckSummary | null) => "saved" | "unsaved" | "refused";
  /** Claude's executive summary for the deck, or none. */
  summary?: DeckSummary;
  clear: () => void;
  notify: (text: string) => void;
  openTray: () => void;
}

const TrayContext = createContext<Tray | null>(null);

export function useTray(): Tray {
  const t = useContext(TrayContext);
  if (!t) throw new Error("useTray needs the TrayProvider (mounted in the app shell).");
  return t;
}

const slides = (n: number) => `${n} ${n === 1 ? "slide" : "slides"}`;

export function TrayProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const items = useMemo(() => parseTray(raw), [raw]);
  const rawSummary = useSyncExternalStore(subscribe, readSummary, () => "");
  const summary = useMemo(() => parseSummary(rawSummary), [rawSummary]);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);
  const n = useRef(0);

  const notify = useCallback((text: string, review = false) => setToast({ id: ++n.current, text, review }), []);

  // Every change reads the latest saved tray, so two quick clicks don't lose one.
  const change = useCallback((f: (items: TrayItem[]) => TrayItem[]) => write(f(parseTray(read()))), []);

  const tray = useMemo<Tray>(
    () => ({
      items,
      ready,
      has: (id) => items.some((x) => x.id === id),
      add: (item) => {
        // Checked as the tray reads it back: a slide outside its limits would be saved, then
        // silently dropped on the next read, so the button would never say "In deck".
        const checked = TrayItemSchema.safeParse({ ...item, addedAt: new Date().toISOString(), included: true });
        if (!checked.success) {
          console.error("Add to deck: the slide doesn't fit the tray", item.id, checked.error.issues);
          notify("Couldn't add that slide to the deck.");
          return false;
        }
        const now = parseTray(read());
        const r = addItem(now, checked.data);
        if (!r.added) {
          notify(r.reason === "full" ? `The deck holds ${TRAY_LIMIT} slides. Remove one to add another.` : "Already in your deck.", true);
          return false;
        }
        write(r.items);
        notify(`Added to deck. ${slides(r.items.length)}`, true);
        return true;
      },
      remove: (id, quiet) => {
        const next = removeItem(parseTray(read()), id);
        write(next);
        // An empty tray has no summary: slides added again later get a new one.
        if (!next.length) writeKey(SUMMARY_KEY, "");
        if (!quiet) notify(`Removed from deck. ${slides(next.length)}`);
      },
      move: (id, dir) => change((x) => moveItem(x, id, dir)),
      update: (id, patch) => change((x) => updateItem(x, id, patch)),
      arrange: (f) => {
        const before = parseTray(read());
        const next = f(before);
        // Checked as the tray reads it back: one item outside its limits would lose the whole saved tray.
        if (!next || !TraySchema.safeParse(next).success) return null;
        return { before, saved: write(next) };
      },
      setSections: (byId) => {
        const entries = Object.entries(byId);
        if (entries.some(([, t]) => t !== undefined && !sectionOk(t))) return "refused";
        return write(entries.reduce((acc, [id, section]) => updateItem(acc, id, { section }), parseTray(read()))) ? "saved" : "unsaved";
      },
      setCommentary: (byId, next) => {
        const entries = Object.entries(byId);
        if (entries.some(([, c]) => c && !CommentarySchema.safeParse(c).success)) return "refused";
        if (next && !DeckSummarySchema.safeParse(next).success) return "refused";
        const items = entries.reduce((acc, [id, c]) => updateItem(acc, id, { commentary: c }), parseTray(read()));
        const saved = write(items);
        // A summary is only saved with the commentary it was written beside: if the tray couldn't be
        // stored, a stored summary would come back after a reload next to slides without it.
        if (next !== undefined) {
          if (saved) return writeKey(SUMMARY_KEY, next ? JSON.stringify(next) : "") ? "saved" : "unsaved";
          writeKey(SUMMARY_KEY, "");
        }
        return saved ? "saved" : "unsaved";
      },
      summary,
      clear: () => {
        write([]);
        writeKey(SUMMARY_KEY, "");
      },
      notify: (text) => notify(text),
      openTray: () => setOpen(true),
    }),
    [items, summary, ready, notify, change],
  );

  // A toast goes after four seconds.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <TrayContext.Provider value={tray}>
      {children}
      {/* Bottom right, clear of the chart drawer's controls at the top. */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 print:hidden">
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-ink py-2 pl-3 pr-1.5 text-body-sm text-surface shadow-overlay"
          >
            <span>{toast.text}</span>
            {toast.review && (
              <Link href="/tools/deck/tray" onClick={() => setToast(null)} className="font-semibold underline underline-offset-2 hover:no-underline">
                Review
              </Link>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center hover:bg-surface/15"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        )}
      </div>
      {open && <MiniTray onClose={() => setOpen(false)} />}
    </TrayContext.Provider>
  );
}
