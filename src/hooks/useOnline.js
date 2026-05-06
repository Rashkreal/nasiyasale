import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue, onDisconnect, set, remove } from "firebase/database";

const OWNER_ADDRESS = "0x0e86d8afaa0B77D732d89BD5ceC3dC9003b321dA";

function getOrCreateSessionId() {
  try {
    // Har safar sahifa yuklananda yangi session
    // sessionStorage — tab yopilganda o'chadi, F5 da ham yangilanadi
    let id = sessionStorage.getItem("_nsSession");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("_nsSession", id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function getDeviceInfo() {
  try {
    const ua = navigator.userAgent || "";
    let os = "Noma'lum";
    let browser = "Noma'lum";
    let device = "Desktop";

    if (/Windows NT/.test(ua)) os = "Windows";
    else if (/Mac OS X/.test(ua)) os = "MacOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Linux/.test(ua)) os = "Linux";

    if (/Android/.test(ua) || /iPhone|iPad|iPod/.test(ua)) device = "Mobil";
    else if (/Mobile/.test(ua)) device = "Mobil";

    if (/OPR\/|Opera/.test(ua)) browser = "Opera";
    else if (/Edg\//.test(ua)) browser = "Edge";
    else if (/YaBrowser/.test(ua)) browser = "Yandex";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua)) browser = "Safari";
    else if (/SamsungBrowser/.test(ua)) browser = "Samsung";
    else if (/MIUI/.test(ua)) browser = "MIUI";

    return {
      os,
      browser,
      device,
      screen: (window.screen?.width || "?") + "x" + (window.screen?.height || "?"),
      lang: navigator.language || "noma'lum",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "noma'lum",
    };
  } catch {
    return { os: "Noma'lum", browser: "Noma'lum", device: "Noma'lum", screen: "?", lang: "?", timezone: "?" };
  }
}

async function getLocationInfo() {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return {
      ip: data.ip || null,
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
      isp: data.org || null,
    };
  } catch {
    return { ip: null, city: null, region: null, country: null, isp: null };
  }
}

const SESSION_ID = getOrCreateSessionId();

function isBot() {
  const ua = navigator.userAgent || "";
  // Bot yoki crawler belgilari
  if (/bot|crawler|spider|crawling|headless|phantomjs|selenium|puppeteer/i.test(ua)) return true;
  // 800x600 — odatda bot yoki Firebase Console
  if (window.screen?.width === 800 && window.screen?.height === 600) return true;
  // UTC timezone va en-US til — Firebase Console belgisi
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language || "";
  if (tz === "UTC" && lang === "en-US") return true;
  return false;
}
let locationCache = null;
let locationFetched = false;

export function useOnline(account) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const isOwner = account?.toLowerCase() === OWNER_ADDRESS.toLowerCase();
  const wroteRef = useRef(false);

  useEffect(() => {
    const sessionRef = ref(db, "online/" + SESSION_ID);

    const writeData = async () => {
      // Bot bo'lsa yozmaymiz
      if (isBot()) return;
      // Device info har safar yangi olinadi
      const device = getDeviceInfo();

      // Avval location siz yozamiz (tez)
      await set(sessionRef, {
        timestamp: Date.now(),
        address: account || null,
        device: device.device,
        os: device.os,
        browser: device.browser,
        screen: device.screen,
        lang: device.lang,
        timezone: device.timezone,
        ip: null,
        city: null,
        region: null,
        country: null,
        isp: null,
      }).catch(err => console.error("Firebase write error:", err));

      if (!wroteRef.current) {
        onDisconnect(sessionRef).remove();
        wroteRef.current = true;
      }

      // Keyin location olib yangilaymiz
      if (!locationFetched) {
        locationCache = await getLocationInfo();
        locationFetched = true;
      }

      await set(sessionRef, {
        timestamp: Date.now(),
        address: account || null,
        device: device.device,
        os: device.os,
        browser: device.browser,
        screen: device.screen,
        lang: device.lang,
        timezone: device.timezone,
        ip: locationCache?.ip || null,
        city: locationCache?.city || null,
        region: locationCache?.region || null,
        country: locationCache?.country || null,
        isp: locationCache?.isp || null,
      }).catch(err => console.error("Firebase write error:", err));

      if (!wroteRef.current) {
        onDisconnect(sessionRef).remove();
        wroteRef.current = true;
      }
    };

    writeData();

    const onlineRef = ref(db, "online");
    const unsub = onValue(onlineRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) { setOnlineCount(0); setOnlineUsers([]); return; }
      // 30 daqiqadan eski sessionlarni o'tkazib yuborish
      const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
      const users = Object.values(val).filter(u => u.timestamp > thirtyMinAgo);
      setOnlineCount(users.length);
      if (isOwner) setOnlineUsers(users);
    }, (err) => console.error("Firebase read error:", err));

    return () => { unsub(); };
  }, [account, isOwner]);

  return { onlineCount, onlineUsers, isOwner };
}
