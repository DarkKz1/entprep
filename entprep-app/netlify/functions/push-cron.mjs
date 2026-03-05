import webpush from "web-push";

// Netlify Scheduled Function: runs every hour at :00
export const config = { schedule: "0 * * * *" };

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:dzakpelov@gmail.com",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

// Kazakhstan is UTC+5 (Almaty/Astana) — all times in KZ
const KZ_OFFSET = 5;

function getKZHour() {
  return (new Date().getUTCHours() + KZ_OFFSET) % 24;
}

function isKZSunday() {
  const now = new Date();
  // Shift to KZ time before checking day
  const kzTime = new Date(now.getTime() + KZ_OFFSET * 3600000);
  return kzTime.getUTCDay() === 0;
}

// ── Supabase helpers ──────────────────────────────────────────────────────

async function fetchSubscriptions(prefColumn) {
  const filter = prefColumn ? `&${prefColumn}=eq.true` : "";
  const res = await fetch(
    `${SB_URL}/rest/v1/push_subscriptions?select=id,user_id,endpoint,p256dh,auth${filter}`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  if (!res.ok) {
    console.error("Failed to fetch subscriptions:", await res.text());
    return [];
  }
  return res.json();
}

/** Fetch last_active for a set of user IDs from profiles table */
async function fetchLastActive(userIds) {
  if (!userIds.length) return {};
  const ids = userIds.map((id) => `"${id}"`).join(",");
  const res = await fetch(
    `${SB_URL}/rest/v1/profiles?select=id,last_active&id=in.(${ids})`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  if (!res.ok) return {};
  const rows = await res.json();
  const map = {};
  for (const r of rows) map[r.id] = r.last_active;
  return map;
}

/** Check if a date string is today in KZ timezone */
function isToday(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  const kzNow = new Date(now.getTime() + KZ_OFFSET * 3600000);
  const kzDate = kzNow.toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === kzDate;
}

async function deleteSubscription(id) {
  await fetch(`${SB_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
    method: "DELETE",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
}

// ── Send push to a single subscription, clean up expired ─────────────────

async function sendPush(sub, payload) {
  const pushSub = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload), { TTL: 3600 });
    return true;
  } catch (err) {
    // 404 or 410 = subscription expired/unsubscribed → remove from DB
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`Removing expired subscription ${sub.id}`);
      await deleteSubscription(sub.id);
    } else {
      console.error(`Push failed for sub ${sub.id}:`, err.statusCode || err.message);
    }
    return false;
  }
}

// ── Batch send to all matching subscriptions ─────────────────────────────

async function broadcast(prefColumn, payload, { skipActiveToday = false } = {}) {
  const subs = await fetchSubscriptions(prefColumn);
  if (!subs.length) return { sent: 0, failed: 0 };

  let filtered = subs;
  if (skipActiveToday) {
    const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
    const lastActiveMap = await fetchLastActive(userIds);
    filtered = subs.filter((s) => !s.user_id || !isToday(lastActiveMap[s.user_id]));
    const skipped = subs.length - filtered.length;
    if (skipped > 0) console.log(`${payload.tag}: skipped ${skipped} active-today users`);
  }

  if (!filtered.length) return { sent: 0, failed: 0 };

  const results = await Promise.allSettled(filtered.map((s) => sendPush(s, payload)));

  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.length - sent;
  console.log(`${payload.tag}: ${sent} sent, ${failed} failed out of ${filtered.length}`);
  return { sent, failed };
}

// ── Notification payloads ────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function streakPayload() {
  const variants = [
    { title: "Серия на кону", body: "Сегодня ещё ни одного теста. Давай хотя бы 5 минут?" },
    { title: "Эй, не пропадай", body: "Один тест — и серия сохранена. Ты же не хочешь начинать заново?" },
    { title: "Серия ждёт тебя", body: "Осталось немного до конца дня. Зайди и реши пару вопросов." },
    { title: "Не сегодня, да?", body: "Ладно, но серия обнулится. Может всё-таки один тест?" },
    { title: "Ты сегодня не заходил", body: "Даже 5 вопросов — уже прогресс. Серия пока жива." },
  ];
  return { ...pick(variants), icon: "/icon-192.png", badge: "/icon-96.png", tag: "streak-reminder", url: "/" };
}

function errorsPayload() {
  const variants = [
    { title: "Ошибки не кусаются", body: "Повтори те вопросы, где промахнулся. Второй раз будет проще." },
    { title: "Давай разберём ошибки", body: "Пока помнишь материал — пройдись по ошибкам ещё раз." },
    { title: "Работа над ошибками", body: "Лучший способ запомнить — повторить то, что не получилось." },
    { title: "Помнишь те ошибки?", body: "Они всё ещё ждут. Повтори сейчас, пока свежо в голове." },
  ];
  return { ...pick(variants), icon: "/icon-192.png", badge: "/icon-96.png", tag: "error-review", url: "/?screen=errors" };
}

function weeklyPayload() {
  const variants = [
    { title: "Итоги недели", body: "Посмотри, сколько ты прошёл за эту неделю." },
    { title: "Неделя позади", body: "Зайди глянуть свою статистику — есть чем гордиться?" },
    { title: "Как прошла неделя?", body: "Твоя статистика обновилась. Зайди, посмотри прогресс." },
  ];
  return { ...pick(variants), icon: "/icon-192.png", badge: "/icon-96.png", tag: "weekly-report", url: "/?screen=prog" };
}

// ── Main handler ─────────────────────────────────────────────────────────

export default async function handler() {
  if (!SB_URL || !SB_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log("Push cron skipped: missing env vars");
    return;
  }

  const hour = getKZHour();
  console.log(`Push cron running. KZ hour: ${hour}`);

  const tasks = [];

  // 20:00 KZ — streak reminder (skip users who already studied today)
  if (hour === 20) {
    tasks.push(broadcast("pref_streak", streakPayload(), { skipActiveToday: true }));
  }

  // 21:00 KZ — error review reminder
  if (hour === 21) {
    tasks.push(broadcast("pref_errors", errorsPayload()));
  }

  // Sunday 10:00 KZ — weekly report
  if (hour === 10 && isKZSunday()) {
    tasks.push(broadcast("pref_weekly", weeklyPayload()));
  }

  if (tasks.length) {
    await Promise.all(tasks);
  } else {
    console.log("No notifications scheduled for this hour");
  }
}
