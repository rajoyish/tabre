import "./TaskReminder.css";

let cachedEmojiIcon = null;
const getEmojiIcon = () => {
  if (cachedEmojiIcon) return cachedEmojiIcon;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔔", 32, 36);
  cachedEmojiIcon = canvas.toDataURL("image/png");
  return cachedEmojiIcon;
};

const isExtension =
  typeof chrome !== "undefined" && !!chrome.alarms && !!chrome.notifications;

export function createTaskReminder() {
  let notificationSound;
  try {
    notificationSound = new URL(
      "../../assets/notification.mp3",
      import.meta.url,
    ).href;
  } catch {
    notificationSound = "/src/assets/notification.mp3";
  }

  let reminderEndTime = null;
  let countdownInterval = null;
  let reminderTimeout = null;
  let soundTimeout = null;
  let audio = null;
  let soundEnabled = true;
  let isSoundPlaying = false;
  let lastTask = "";

  let isInitialized = false;

  const PAST_REMINDERS_KEY = "pastReminders";
  const ACTIVE_REMINDER_KEY = "activeReminder";
  const MAX_PAST_REMINDERS = 6;
  const COUNTDOWN_TICK_MS = 500;

  function requestNotificationPermission() {
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  }

  function showWebNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: getEmojiIcon(),
        requireInteraction: true,
      });
    }
  }

  function loadPastReminders() {
    try {
      return JSON.parse(localStorage.getItem(PAST_REMINDERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function savePastReminders(reminders) {
    localStorage.setItem(PAST_REMINDERS_KEY, JSON.stringify(reminders));
  }

  function addOrMovePastReminder(reminder) {
    const reminders = loadPastReminders();
    const idx = reminders.findIndex(
      (r) => r.task === reminder.task && r.time === reminder.time,
    );
    if (idx !== -1) {
      reminders.splice(idx, 1);
    }
    reminders.unshift(reminder);
    if (reminders.length > MAX_PAST_REMINDERS)
      reminders.length = MAX_PAST_REMINDERS;
    savePastReminders(reminders);
  }

  function deletePastReminder(index) {
    const reminders = loadPastReminders();
    reminders.splice(index, 1);
    savePastReminders(reminders);
  }

  function renderPastReminders(pastRemindersBlock, list) {
    if (!pastRemindersBlock || !list) return;

    const reminders = loadPastReminders();

    if (!reminders.length) {
      pastRemindersBlock.style.display = "none";
      return;
    } else {
      pastRemindersBlock.style.display = "";
    }

    list.innerHTML = "";

    const fragment = document.createDocumentFragment();

    reminders.forEach((reminder, idx) => {
      const li = document.createElement("li");
      li.className =
        "reminder-card glass-pill reminder-card--custom past-reminders__item";
      li.setAttribute("data-past-reminder-index", idx);

      const createdDate = reminder.created
        ? new Date(reminder.created)
        : new Date();
      const timeStr = createdDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      li.innerHTML = `
        <div class="reminder-card__details">
            <div class="reminder-card__header">
                <h3 class="reminder-card__title" title="${reminder.task}" data-past-reminder-task-title>
                    ${reminder.task}
                </h3>
            </div>
            <span class="reminder-card__full-np" data-past-reminder-time>Duration: ${reminder.time}</span>
            <span class="reminder-card__full-en">Created: ${timeStr}</span>
        </div>
        <div class="reminder-card__actions">
            <button class="reminder-card__btn-delete past-reminder-delete-btn" title="Delete reminder">
                <i class="bi bi-trash3-fill"></i>
            </button>
        </div>
      `;
      fragment.appendChild(li);
    });

    list.appendChild(fragment);
  }

  function init() {
    if (isInitialized) return;

    const panel = document.getElementById("panel-reminder");
    if (!panel) return;

    const elements = {
      setBtn: panel.querySelector(".reminder__btn"),
      resetBtn: panel.querySelectorAll(".reminder__btn")[1],
      modal: panel.querySelector(".reminder__modal"),
      form: panel.querySelector(".reminder-form"),
      cancelBtn: panel.querySelector('.reminder-form__btn[type="button"]'),
      titleInput: panel.querySelector("#reminder-form__task-title"),
      minutesInput: panel.querySelector("#reminder-form__minutes"),
      soundCheckbox: panel.querySelector("#sound"),
      displayTitle: panel.querySelector(".reminder__title"),
      displayTime: panel.querySelector(".reminder__time"),
      pastRemindersBlock: panel.querySelector(".past-reminders"),
      list: panel.querySelector(".past-reminders__list"),
    };

    const required = [
      "setBtn",
      "resetBtn",
      "modal",
      "form",
      "displayTitle",
      "displayTime",
    ];
    if (!required.every((key) => elements[key])) return;

    const {
      setBtn,
      resetBtn,
      modal,
      form,
      cancelBtn,
      titleInput,
      minutesInput,
      soundCheckbox,
      displayTitle,
      displayTime,
      pastRemindersBlock,
      list,
    } = elements;

    const updateRemindersUI = () =>
      renderPastReminders(pastRemindersBlock, list);

    function showModal() {
      modal.classList.remove("hidden");
      form.classList.remove("hidden");
      titleInput?.focus();
      requestNotificationPermission();
    }

    function hideModal() {
      modal.classList.add("hidden");
      form.classList.add("hidden");
      form?.reset();
    }

    function formatTime(ms) {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function updateDisplay(task, time = "20:00") {
      const titleTextNode = displayTitle.childNodes[0];
      if (titleTextNode) {
        titleTextNode.textContent = `${task} `;
      } else {
        displayTitle.innerHTML = `${task} <span class="reminder__title-emphasis">in</span>`;
      }
      displayTime.textContent = time;
      displayTime.setAttribute("datetime", time);
    }

    function updateResetBtnText() {
      resetBtn.textContent = isSoundPlaying ? "Stop Sound" : "Reset";
    }

    function playSound() {
      if (!soundEnabled) return;
      stopSound();
      try {
        audio = new Audio(notificationSound);
        audio.loop = true;
        audio
          .play()
          .then(() => {
            isSoundPlaying = true;
            updateResetBtnText();
          })
          .catch(() => {
            isSoundPlaying = false;
            updateResetBtnText();
          });
      } catch {
        isSoundPlaying = false;
        updateResetBtnText();
      }
    }

    function stopSound() {
      if (audio) {
        try {
          audio.pause();
          audio.loop = false;
          audio.currentTime = 0;
          audio.src = "";
          audio.removeAttribute("src");
          audio.load();
        } catch {}
        audio = null;
      }
      isSoundPlaying = false;
      updateResetBtnText();
    }

    function clearTimers() {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      if (reminderTimeout) {
        clearTimeout(reminderTimeout);
        reminderTimeout = null;
      }
      if (soundTimeout) {
        clearTimeout(soundTimeout);
        soundTimeout = null;
      }
    }

    function tickDisplay(task) {
      if (!reminderEndTime) return;
      const msLeft = reminderEndTime - Date.now();
      if (msLeft <= 0) {
        updateDisplay(task, "00:00");
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
        return;
      }
      const formatted = formatTime(msLeft);
      if (displayTime.textContent !== formatted) {
        updateDisplay(task, formatted);
      }
    }

    function startCountdown(task) {
      clearTimers();

      tickDisplay(task);
      countdownInterval = setInterval(
        () => tickDisplay(task),
        COUNTDOWN_TICK_MS,
      );

      const msToSound = Math.max(0, reminderEndTime - Date.now() - 500);
      soundTimeout = setTimeout(() => {
        soundTimeout = null;
        if (soundEnabled) playSound();
      }, msToSound);

      const msToEnd = Math.max(0, reminderEndTime - Date.now());
      reminderTimeout = setTimeout(() => {
        reminderTimeout = null;
        updateDisplay(task, "00:00");
        localStorage.removeItem(ACTIVE_REMINDER_KEY);

        if (!isExtension) {
          showWebNotification(
            `Time to ${task}! ✅`,
            "Your reminder session is complete.",
          );
        }
      }, msToEnd);
    }

    function setReminder(task, minutes) {
      requestNotificationPermission();
      soundEnabled = soundCheckbox?.checked ?? true;
      lastTask = task;
      reminderEndTime = Date.now() + Number(minutes) * 60 * 1000;

      stopSound();

      localStorage.setItem(
        ACTIVE_REMINDER_KEY,
        JSON.stringify({
          task,
          reminderEndTime,
          soundEnabled,
        }),
      );

      if (isExtension) {
        chrome.alarms.create("task-reminder", {
          delayInMinutes: Number(minutes),
        });
        if (chrome.storage) {
          chrome.storage.local.set({
            reminderTask: task,
            reminderSound: soundEnabled,
            reminderIcon: getEmojiIcon(),
          });
        }
      }

      startCountdown(task);

      addOrMovePastReminder({
        task,
        time: `${minutes} min`,
        created: Date.now(),
      });
      updateRemindersUI();
    }

    function resetReminder(stopSoundNow = true) {
      updateDisplay("Buy Eggs");
      reminderEndTime = null;
      localStorage.removeItem(ACTIVE_REMINDER_KEY);

      if (isExtension) {
        chrome.alarms.clear("task-reminder");
        if (chrome.storage) {
          chrome.storage.local.remove([
            "reminderTask",
            "reminderSound",
            "reminderIcon",
          ]);
        }
      }

      clearTimers();
      if (stopSoundNow) stopSound();

      hideModal();
    }

    function handleFormSubmit(e) {
      e.preventDefault();
      const task = titleInput?.value.trim() || "";
      const minutes = minutesInput?.value.trim() || "";

      if (!task || !minutes || isNaN(minutes) || Number(minutes) <= 0) return;
      setReminder(task, Number(minutes));
      hideModal();
    }

    function restoreActiveReminder() {
      try {
        const saved = JSON.parse(localStorage.getItem(ACTIVE_REMINDER_KEY));
        if (saved && saved.reminderEndTime > Date.now()) {
          lastTask = saved.task;
          reminderEndTime = saved.reminderEndTime;
          soundEnabled = saved.soundEnabled;

          if (isExtension) {
            chrome.alarms.create("task-reminder", {
              when: saved.reminderEndTime,
            });
            if (chrome.storage) {
              chrome.storage.local.set({
                reminderTask: saved.task,
                reminderSound: saved.soundEnabled,
                reminderIcon: getEmojiIcon(),
              });
            }
          }

          startCountdown(lastTask);
        } else if (saved) {
          localStorage.removeItem(ACTIVE_REMINDER_KEY);
        }
      } catch {
        localStorage.removeItem(ACTIVE_REMINDER_KEY);
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden && reminderEndTime && reminderEndTime > Date.now()) {
        tickDisplay(lastTask);
      }
    }

    function handlePageHide() {
      clearTimers();
      stopSound();
    }

    setBtn.addEventListener("click", showModal);
    resetBtn.addEventListener("click", () => resetReminder());
    form.addEventListener("submit", handleFormSubmit);
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        hideModal();
      });
    }

    if (list) {
      list.addEventListener("click", (e) => {
        const btn = e.target.closest(".past-reminder-delete-btn");
        if (btn) {
          const li = btn.closest(".past-reminders__item");
          if (!li) return;
          const idx = parseInt(li.getAttribute("data-past-reminder-index"), 10);
          if (!isNaN(idx)) {
            deletePastReminder(idx);
            updateRemindersUI();
          }
          return;
        }

        const item = e.target.closest(".past-reminders__item");
        if (item && !e.target.closest(".past-reminder-delete-btn")) {
          const idx = parseInt(
            item.getAttribute("data-past-reminder-index"),
            10,
          );
          const reminders = loadPastReminders();
          const reminder = reminders[idx];
          if (!reminder) return;

          let minutes = 0;
          if (reminder.time) {
            const match = reminder.time.match(/(\d+)\s*min/);
            if (match) minutes = parseInt(match[1], 10);
          }
          setReminder(reminder.task, minutes);
        }
      });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide, { once: true });

    modal.classList.add("hidden");
    form.classList.add("hidden");
    isSoundPlaying = false;
    updateResetBtnText();
    updateRemindersUI();
    restoreActiveReminder();

    isInitialized = true;
  }

  return { init };
}
