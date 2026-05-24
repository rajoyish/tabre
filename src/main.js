import "./style.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { initTodayCalendar } from "./components/Today/Today.js";
import { setupTabs } from "./tabs.js";
import "./components/DateConverter/DateConverter.js";
import { createTaskReminder } from "./components/TaskReminder/TaskReminder.js";
import { setupDateInputIcon } from "./utils/dateInputIcon.js";
import { initSettingsDropdown } from "./components/SettingsDropdown/SettingsDropdown.js";
import { updateDateBadge } from "./components/DateBadgeRenderer/DateBadgeRenderer.js";
import { initBookmarks } from "./components/Bookmarks/Bookmarks.js";
import { getNepaliDateForAd } from "./utils/calendarUtils.js";
import { initNepaliConverter } from "./components/NepaliConverter/NepaliConverter.js";
import { checkAndNotifyTodayEvents } from "./components/UpcomingEvents/notifications.js";

window.getNepaliDateForAd = getNepaliDateForAd;

const taskReminder = createTaskReminder();
let updateInterval;
let nepaliConverterInstance = null;
let midnightTimeoutId = null;

function startPeriodicUpdates() {
  if (!updateInterval) {
    updateInterval = setInterval(() => {
      initTodayCalendar(updateDateBadge);
    }, 60 * 1000);
  }
}

function stopPeriodicUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

function clearMidnightTimer() {
  if (midnightTimeoutId !== null) {
    clearTimeout(midnightTimeoutId);
    midnightTimeoutId = null;
  }
}

function scheduleMidnightCheck() {
  clearMidnightTimer();
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    5,
  );
  const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());
  midnightTimeoutId = setTimeout(() => {
    midnightTimeoutId = null;
    checkAndNotifyTodayEvents();
    if (!document.hidden) scheduleMidnightCheck();
  }, delay);
}

function setupTabActivation(
  tabSelector,
  panelSelector,
  onActivate,
  onDeactivate,
) {
  const tabsList = document.querySelector(".tabs-list");
  if (!tabsList) return;

  const tabButtons = tabsList.querySelectorAll("a");
  const tabIndex = Array.from(tabButtons).findIndex(
    (tab) =>
      tab.textContent.trim() === tabSelector ||
      tab.getAttribute("href") === panelSelector,
  );
  if (tabIndex === -1) return;

  const tab = tabButtons[tabIndex];
  const panel = document.querySelector(panelSelector);

  function maybeActivate() {
    if (panel && !panel.hasAttribute("hidden")) {
      onActivate(panel);
    } else if (panel && panel.hasAttribute("hidden") && onDeactivate) {
      onDeactivate(panel);
    }
  }

  tabsList.addEventListener("click", (e) => {
    setTimeout(maybeActivate, 0);
  });

  tabsList.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      setTimeout(maybeActivate, 0);
    }
  });

  maybeActivate();
}

function setupCalendarTab() {
  setupTabActivation("Full Calendar", "#panel-calendar", async (panel) => {
    const calendarRoot = panel.querySelector("#month-view-calendar-root");
    if (calendarRoot) {
      const { initMonthView } =
        await import("./components/FullCalendar/FullCalendar.js");
      initMonthView(calendarRoot);
    }
  });
}

function setupUpcomingEventsTab() {
  setupTabActivation("Upcoming Events", "#panel-upcoming", async (panel) => {
    const root = panel.querySelector("#upcoming-events-root");
    if (root) {
      const { initUpcomingEvents } =
        await import("./components/UpcomingEvents/UpcomingEvents.js");
      initUpcomingEvents(root);
    }
  });
}

function setupNepaliConverterTab() {
  setupTabActivation(
    "Nepali Converter",
    "#panel-nepali",
    (panel) => {
      if (!nepaliConverterInstance) {
        nepaliConverterInstance = initNepaliConverter("panel-nepali");
      }
    },
    (panel) => {
      if (nepaliConverterInstance) {
        nepaliConverterInstance.destroy();
        nepaliConverterInstance = null;
      }
    },
  );
}

function setupEventHandlers() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPeriodicUpdates();
      clearMidnightTimer();
    } else {
      initTodayCalendar(updateDateBadge);
      startPeriodicUpdates();
      checkAndNotifyTodayEvents();
      scheduleMidnightCheck();
    }
  });
}

async function initApp() {
  await initTodayCalendar(updateDateBadge);

  taskReminder.init();
  initBookmarks();
  setupTabs();
  setupCalendarTab();
  setupUpcomingEventsTab();
  setupNepaliConverterTab();
  startPeriodicUpdates();
  setupEventHandlers();
  setupDateInputIcon();

  const settingsElement = document.querySelector(".settings");
  if (settingsElement) {
    initSettingsDropdown(settingsElement);
  }

  checkAndNotifyTodayEvents();
  scheduleMidnightCheck();
}

document.addEventListener("DOMContentLoaded", initApp);
