import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Head } from "vite-react-ssg";
import { format, parseISO } from "date-fns";
import { formatTime } from "@/lib/events";
import type { PadelEvent } from "@/types/events";

/** Operator wall-screen / screensaver page (hidden route, noindex).
 *
 *  Main panel rotates through upcoming tournaments, clinics & courses, and
 *  joinable open matches (the club's live Playtomic data); the right rail
 *  carries the connect QR codes (same style as the open-play podium screen:
 *  level-H QR with the app logo excavated in the centre) plus wifi and a
 *  low-key Google-review nudge. Data refreshes every 5 minutes; the whole
 *  page hard-reloads hourly so deploys reach the screen unattended.
 */

// ---- Config ----------------------------------------------------------------
const IG_HANDLE = "foundrypadelpdx";
const WA_COMMUNITY_URL = "https://chat.whatsapp.com/KrXH7lUsPftHHgOOVVc2Ki";
const REVIEW_URL =
  "https://www.google.com/maps/search/?api=1&query=Foundry+Padel+Portland+OR";
// Set both to enable the wifi QR tile (WPA2). Leave blank to hide it.
const WIFI_SSID = "";
const WIFI_PASS = "";

const ROTATE_MS = 20_000;
const REFETCH_MS = 5 * 60_000;
const RELOAD_MS = 60 * 60_000;
const ROWS_PER_PANEL = 7;

// ---- QR logos (ported from the open-play podium's BrandConnect) ------------
const IG_PATH =
  "M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772c-.5.509-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428A4.88 4.88 0 0 1 3.68 3.678 4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.059-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.04 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.04.058 2.67 0 2.987-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.04 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 0 0-.748-1.15 3.098 3.098 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.04-.058zm0 3.063a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27zm0 8.468a3.333 3.333 0 1 0 0-6.666 3.333 3.333 0 0 0 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z";
const WA_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411";

const IG_LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><radialGradient id="ig" cx="30%" cy="107%" r="150%">' +
      '<stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/>' +
      '<stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs>' +
      '<rect width="24" height="24" rx="6" fill="url(#ig)"/><path transform="translate(4 4) scale(0.6667)" fill="#fff" d="' +
      IG_PATH +
      '"/></svg>',
  );
const WA_LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#25D366"/>' +
      '<path transform="translate(3.6 3.6) scale(0.7)" fill="#fff" d="' +
      WA_PATH +
      '"/></svg>',
  );
const WIFI_LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#313E39"/>' +
      '<circle cx="12" cy="17.5" r="1.6" fill="#fff"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M5.5 12.5a9 9 0 0 1 13 0M8.5 15.2a5 5 0 0 1 7 0"/></svg>',
  );

// ---- Panels -----------------------------------------------------------------
const PANELS = [
  {
    key: "tournaments",
    title: "TOURNAMENTS & EVENTS",
    types: new Set(["TOURNAMENT"]),
    empty: "No tournaments on the calendar yet — watch this space.",
  },
  {
    key: "clinics",
    title: "CLINICS & COURSES",
    types: new Set(["PUBLIC_CLASS", "COURSE_CLASS"]),
    empty: "New clinic dates drop soon.",
  },
  {
    key: "matches",
    title: "OPEN MATCHES — JUMP IN",
    types: new Set(["OPEN_MATCH"]),
    empty: "No open matches right now — start one in the Playtomic app.",
  },
];

function QrTile({
  value,
  logo,
  label,
  sub,
  size = 128,
}: {
  value: string;
  logo?: string;
  label: string;
  sub?: string;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-[#F4F5EC] p-4">
      <div className="shrink-0 rounded bg-white p-2">
        <QRCodeSVG
          value={value}
          size={size}
          level="H"
          bgColor="#ffffff"
          fgColor="#101010"
          imageSettings={
            logo ? { src: logo, height: size * 0.24, width: size * 0.24, excavate: true } : undefined
          }
        />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl leading-tight text-[#313E39]">{label}</p>
        {sub && <p className="mt-1 font-body text-sm text-[#6b7268]">{sub}</p>}
      </div>
    </div>
  );
}

const TvScreen = () => {
  const [events, setEvents] = useState<PadelEvent[]>([]);
  const [panelIdx, setPanelIdx] = useState(0);
  const [now, setNow] = useState<Date | null>(null);

  // Live data: fetch now + every 5 minutes; hard reload hourly; tick the clock.
  useEffect(() => {
    const load = async () => {
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const end = format(new Date(Date.now() + 14 * 864e5), "yyyy-MM-dd");
        const res = await fetch(`/api/events/range?start=${today}&end=${end}`);
        if (res.ok) setEvents(await res.json());
      } catch {
        /* keep last data */
      }
    };
    load();
    setNow(new Date());
    const fetchT = setInterval(load, REFETCH_MS);
    const clockT = setInterval(() => setNow(new Date()), 30_000);
    const reloadT = setTimeout(() => window.location.reload(), RELOAD_MS);
    return () => {
      clearInterval(fetchT);
      clearInterval(clockT);
      clearTimeout(reloadT);
    };
  }, []);

  // Only future items; matches only if joinable.
  const upcoming = useMemo(() => {
    const nowStr = format(new Date(), "yyyy-MM-dd HH:mm");
    return events.filter((e) => {
      if (`${e.date} ${e.start_time}` <= nowStr) return false;
      if (e.booking_type === "OPEN_MATCH" && e.signed_up >= 4) return false;
      return true;
    });
  }, [events, now]);

  const activePanels = useMemo(
    () => PANELS.filter((p) => upcoming.some((e) => p.types.has(e.booking_type))),
    [upcoming],
  );
  const panels = activePanels.length ? activePanels : PANELS.slice(0, 1);

  useEffect(() => {
    const t = setInterval(() => setPanelIdx((i) => i + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const panel = panels[panelIdx % panels.length];
  const rows = upcoming.filter((e) => panel.types.has(e.booking_type)).slice(0, ROWS_PER_PANEL);

  const wifiQr =
    WIFI_SSID && WIFI_PASS ? `WIFI:T:WPA;S:${WIFI_SSID};P:${WIFI_PASS};;` : null;

  return (
    <main className="flex min-h-screen flex-col bg-[#313E39] px-10 py-8 text-[#EEEFE3]">
      <Head>
        <title>Foundry Padel — This Week</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top bar */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/rebrand/FP_icon_light.svg" alt="" className="h-14 w-auto" />
          <div>
            <p className="font-display text-2xl leading-tight tracking-widest">FOUNDRY PADEL</p>
            <p className="font-body text-sm text-[#96998D]">This week at the club</p>
          </div>
        </div>
        <p className="font-display text-3xl tabular-nums text-[#96998D]">
          {now ? format(now, "EEE MMM d · h:mm a") : ""}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 gap-10">
        {/* Rotating schedule panel */}
        <section className="min-w-0 flex-[2]">
          <h1 className="mb-6 font-display text-5xl tracking-wide text-[#EEEFE3]">
            {panel.title}
          </h1>
          {rows.length === 0 ? (
            <p className="font-body text-2xl text-[#96998D]">{panel.empty}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((e) => (
                <div
                  key={e.id + e.date + e.start_time}
                  className="flex items-center gap-6 overflow-hidden rounded-lg bg-[#28322E] px-6 py-4"
                >
                  <div className="w-20 shrink-0 text-center">
                    <p className="font-display text-sm uppercase tracking-wider text-[#96998D]">
                      {format(parseISO(e.date), "EEE")}
                    </p>
                    <p className="font-display text-4xl leading-none">{format(parseISO(e.date), "d")}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-2xl tracking-wide">{e.title}</p>
                    <p className="font-body text-lg text-[#96998D]">
                      {formatTime(e.start_time)} · {e.duration_min} min
                      {e.price ? ` · ${e.price.replace(/^(\d+(?:\.\d+)?)\s*USD$/i, "$$$1")}` : ""}
                    </p>
                  </div>
                  {e.booking_type === "OPEN_MATCH" && (
                    <p className="shrink-0 font-display text-xl text-[#AE6C56]">
                      {4 - e.signed_up} {4 - e.signed_up === 1 ? "spot" : "spots"} left
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Panel dots */}
          <div className="mt-6 flex gap-2">
            {panels.map((p, i) => (
              <span
                key={p.key}
                className={`h-2 w-8 rounded-full ${i === panelIdx % panels.length ? "bg-[#AE6C56]" : "bg-[#48544E]"}`}
              />
            ))}
          </div>
        </section>

        {/* Connect rail */}
        <aside className="flex w-[380px] shrink-0 flex-col gap-4">
          <QrTile
            value={WA_COMMUNITY_URL}
            logo={WA_LOGO}
            label="Join the WhatsApp community"
            sub="Games, partners, and club news"
          />
          <QrTile
            value={`https://www.instagram.com/${IG_HANDLE}`}
            logo={IG_LOGO}
            label="Follow us on Instagram"
            sub={`@${IG_HANDLE}`}
          />
          {wifiQr && (
            <QrTile value={wifiQr} logo={WIFI_LOGO} label="Guest wifi" sub={`Scan to join · ${WIFI_SSID}`} />
          )}
          <div className="mt-auto rounded-lg border border-[#48544E] p-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 rounded bg-white p-1.5">
                <QRCodeSVG value={REVIEW_URL} size={84} level="M" bgColor="#ffffff" fgColor="#101010" />
              </div>
              <p className="font-body text-sm leading-relaxed text-[#96998D]">
                Enjoying Foundry? A quick Google review helps more people find padel. ⭐
              </p>
            </div>
          </div>
          <p className="text-center font-body text-sm text-[#6b7268]">
            Book courts, clinics &amp; matches at{" "}
            <span className="text-[#EEEFE3]">foundrypadel.com/book</span>
          </p>
        </aside>
      </div>
    </main>
  );
};

export default TvScreen;
