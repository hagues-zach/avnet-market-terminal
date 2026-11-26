"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { addItem, moveItem, parseTray, removeItem, TRAY_LIMIT, TrayItemSchema, updateItem, type TrayItem } from "@/lib/deck/tray";
import { MiniTray } from "./mini-tray";

// The deck tray (docs/design/deck-tray): slides collected with Add to deck, kept
// in this browser until there is sign-in, shared by every tab (a change in one
// shows in the others). When the browser won't store anything (a private
// window, blocked site data) the tray still works for this tab, in memory.
// Mounted once in the app shell, with the toast and the mini tray.

const KEY = "deck-tray-v1";
const CHANGED = "deck-tray-change";

/** What a page hands over; the tray stamps the time and includes it. */
export type NewTrayItem = Omit<TrayItem, "addedAt" | "included">;

let memory: string | null = null;

function read(): string {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function write(items: TrayItem[]) {
  memory = JSON.stringify(items);
  try {
    localStorage.setItem(KEY, memory);
    // Saved, so other tabs' changes (storage events) are read from storage again.
    memory = null;
  } catch {
    // Keep it in memory for this tab.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
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
  update: (id: string, patch: Partial<Pick<TrayItem, "note" | "included">>) => void;
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
        if (!quiet) notify(`Removed from deck. ${slides(next.length)}`);
      },
      move: (id, dir) => change((x) => moveItem(x, id, dir)),
      update: (id, patch) => change((x) => updateItem(x, id, patch)),
      clear: () => write([]),
      notify: (text) => notify(text),
      openTray: () => setOpen(true),
    }),
    [items, ready, notify, change],
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
