import { getCalendarData } from "../../utils/dataFetcher.js";
import {
  getGregorianMonthYear,
  toDevanagariNumeral,
  weekdays,
} from "../../utils/calendarUtils.js";

const npMonths = [
  "वैशाख",
  "जेठ",
  "असार",
  "साउन",
  "भदौ",
  "असोज",
  "कात्तिक",
  "मंसिर",
  "पुष",
  "माघ",
  "फागुन",
  "चैत",
];

const enMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const npDays = weekdays.map((w) => w[1]);
const enDays = weekdays.map((w) => w[0]);

let systemEventsCache = null;
let emojiIconCache = null;

const getEmojiIcon = () => {
  if (emojiIconCache) return emojiIconCache;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📅", 32, 36);
  emojiIconCache = canvas.toDataURL("image/png");
  return emojiIconCache;
};

export const getLocalYYYYMMDD = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getSystemEvents = async () => {
  if (systemEventsCache) return systemEventsCache;
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarData = await getCalendarData();
  if (!calendarData || !calendarData.months) return events;

  calendarData.months.forEach((month) => {
    let isSecondMonth = false;
    month.days.forEach((day, idx) => {
      if (
        idx > 0 &&
        parseInt(day.dateEn, 10) < parseInt(month.days[idx - 1].dateEn, 10)
      ) {
        isSecondMonth = true;
      }
      const { monthIndex, year } = getGregorianMonthYear(
        month.monthYearEn,
        isSecondMonth,
      );
      const adDate = new Date(year, monthIndex, parseInt(day.dateEn, 10));
      adDate.setHours(0, 0, 0, 0);

      if (adDate >= today && day.details?.events) {
        day.details.events.forEach((evt) => {
          events.push({
            id: `sys-${adDate.getTime()}-${evt.label}`,
            title: evt.label,
            adDate: adDate.toISOString(),
            bsDate: day.details.fullDateNp,
            monthNp: month.monthNp,
            dateNp: day.dateNp,
            dayOfWeekNp:
              day.details.panchanga?.dayName || npDays[adDate.getDay()],
            fullDateNp: day.details.fullDateNp,
            fullDateEn:
              day.details.fullDateEn ||
              `${enMonths[adDate.getMonth()]} ${adDate.getDate()}, ${adDate.getFullYear()}, ${enDays[adDate.getDay()]}`,
            isHoliday: evt.isHoliday,
            isCustom: false,
            timestamp: adDate.getTime(),
          });
        });
      }
    });
  });

  systemEventsCache = events;
  return events;
};

export const getCustomEvents = () => {
  try {
    return JSON.parse(localStorage.getItem("customEvents")) || [];
  } catch {
    return [];
  }
};

export const checkAndNotifyTodayEvents = async () => {
  const todayStr = getLocalYYYYMMDD(new Date());
  const notifiedKey = `notified_events_${todayStr}`;

  let notifiedIds = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(notifiedKey));
    notifiedIds = Array.isArray(parsed) ? parsed : [];
  } catch {
    notifiedIds = [];
  }

  const customEvents = getCustomEvents();
  const systemEvents = await getSystemEvents();

  const todayEvents = [
    ...customEvents,
    ...systemEvents.filter((e) => e.isHoliday),
  ].filter(
    (e) =>
      getLocalYYYYMMDD(e.timestamp) === todayStr && !notifiedIds.includes(e.id),
  );

  if (todayEvents.length === 0) return;

  const isExtension = typeof chrome !== "undefined" && chrome.notifications;
  const canWebNotify =
    !isExtension &&
    "Notification" in window &&
    Notification.permission === "granted";

  if (!isExtension && !canWebNotify) return;

  const iconUrl = getEmojiIcon();

  todayEvents.forEach((e) => {
    const adDateObj = new Date(e.timestamp);
    let fullDateNp = e.bsDate || e.fullDateNp;

    if (e.isCustom) {
      const match = e.bsDate.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      if (match) {
        const [, yyyy, mm, dd] = match;
        fullDateNp = `${toDevanagariNumeral(parseInt(dd, 10))} ${npMonths[parseInt(mm, 10) - 1]}, ${toDevanagariNumeral(yyyy)} ${npDays[adDateObj.getDay()]}`;
      }
    }

    const fullDateEn =
      e.fullDateEn ||
      `${enMonths[adDateObj.getMonth()]} ${adDateObj.getDate()}, ${adDateObj.getFullYear()}, ${enDays[adDateObj.getDay()]}`;
    const title = e.title;
    const body = `${fullDateNp}\n${fullDateEn}`;

    if (isExtension) {
      chrome.notifications.create(`evt-${e.id}`, {
        type: "basic",
        iconUrl,
        title,
        message: body,
        requireInteraction: true,
      });
      notifiedIds.push(e.id);
    } else if (canWebNotify) {
      new Notification(title, {
        body,
        icon: iconUrl,
        requireInteraction: true,
      });
      notifiedIds.push(e.id);
    }
  });

  localStorage.setItem(notifiedKey, JSON.stringify(notifiedIds));
};
