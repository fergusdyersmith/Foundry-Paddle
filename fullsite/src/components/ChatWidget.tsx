import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Send, X } from "lucide-react";

/** Routes where a floating bubble would be wrong: /tv is the big screen in the club, and the
 *  booking iframe already owns the bottom-right corner. */
const HIDDEN_ON = ["/tv", "/book"];

const STORAGE_KEY = "foundry-chat";
const MAX_INPUT = 600;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const GREETING =
  "Hi, I'm the Foundry Padel assistant. Ask me about courts, prices, coaching or what's on this week.";

/** A conversation id is a random label used to group turns in the club's logs. It is not a
 *  login, carries no personal data, and is regenerated whenever the browser forgets it. */
function newConversationId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Site paths the bot is told it may mention, spelled out rather than matched by shape: a
 *  loose `/word` pattern turns "$40/hour" into a link to /hour. No lookbehind, because Safari
 *  older than 16.4 fails to parse it and would take the whole chunk down with it. */
const LINKABLE =
  /(https?:\/\/[^\s<>()[\]"']+|\/(?:book|schedule|coaching|memberships|contact|faq|new-to-padel|the-club|the-sport|survey|privacy)\b)/gi;

/** Renders a reply as text plus links, without dangerouslySetInnerHTML.
 *
 *  The server already strips any URL outside the club's own allowlist, so anything that
 *  survives to here is safe to make clickable. Site paths (/book, /coaching) become links
 *  too, since that is how the bot points people around. */
function RichText({ text }: { text: string }) {
  const parts = text.split(LINKABLE);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline underline-offset-2"
            >
              {part}
            </a>
          );
        }
        if (part?.startsWith("/")) {
          return (
            <a key={i} href={part} className="underline underline-offset-2">
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const ChatWidget = () => {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const convId = useRef<string>("");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ask the server whether the bot is configured (and still inside its daily budget). If it
  // is not, the bubble never appears, rather than appearing and then failing at the visitor.
  useEffect(() => {
    let alive = true;
    fetch("/api/chat/status")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => alive && setEnabled(!!d?.enabled))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Restore the visitor's own transcript so a page navigation does not lose the thread.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.id && Array.isArray(saved.turns)) {
        convId.current = saved.id;
        setTurns(saved.turns.slice(-20));
        return;
      }
    } catch {
      /* a corrupt entry just means a fresh conversation */
    }
    convId.current = newConversationId();
  }, []);

  useEffect(() => {
    if (!convId.current) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: convId.current, turns: turns.slice(-20) }),
      );
    } catch {
      /* private mode: the conversation simply does not survive a reload */
    }
  }, [turns]);

  useEffect(() => {
    if (open) {
      // Optional call: scrollTo is missing in jsdom and in a few older mobile browsers, and
      // failing to auto-scroll should not take the panel down.
      scroller.current?.scrollTo?.({ top: scroller.current.scrollHeight });
      inputRef.current?.focus();
    }
  }, [open, turns, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(async () => {
    const message = draft.trim().slice(0, MAX_INPUT);
    if (!message || busy) return;
    setDraft("");
    setError("");
    setBusy(true);
    const history = turns.slice(-8);
    setTurns((t) => [...t, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId.current, message, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setTurns((t) => [...t, { role: "assistant", content: String(data.reply || "") }]);
    } catch {
      setError("I couldn't reach the club just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, draft, turns]);

  if (!enabled || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask a question about Foundry Padel"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Foundry Padel assistant"
          className="fixed bottom-0 right-0 z-50 flex h-[min(560px,85vh)] w-full flex-col border border-border bg-background shadow-2xl sm:bottom-5 sm:right-5 sm:w-[380px]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-lg tracking-wider text-foreground">ASK FOUNDRY</p>
              <p className="font-body text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Answers from the club
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="max-w-[85%] bg-muted px-3 py-2 font-body text-sm text-foreground">
              {GREETING}
            </div>
            {turns.map((t, i) => (
              <div
                key={i}
                className={
                  t.role === "user"
                    ? "ml-auto max-w-[85%] bg-primary px-3 py-2 font-body text-sm text-primary-foreground"
                    : "max-w-[85%] bg-muted px-3 py-2 font-body text-sm text-foreground"
                }
              >
                {t.role === "assistant" ? <RichText text={t.content} /> : t.content}
              </div>
            ))}
            {busy && (
              <p className="font-body text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Thinking…
              </p>
            )}
            {error && (
              <p className="font-body text-sm text-destructive" role="status">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_INPUT))}
              maxLength={MAX_INPUT}
              placeholder="What does a court cost?"
              aria-label="Your question"
              className="flex-1 bg-transparent px-2 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send"
              className="bg-primary p-2 text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <p className="px-4 pb-3 font-body text-[10px] leading-tight text-muted-foreground">
            An assistant, so it can be wrong. It cannot book or change anything. Conversations
            are kept for 90 days to improve answers, so please do not type anything private.
          </p>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
