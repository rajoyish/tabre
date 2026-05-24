import "./FullCalendar.css";
import { getCalendarData } from "../../utils/dataFetcher.js";
import { showDateModal } from "../DateModal/DateModal.js";
import {
  fetchKathmanduTime,
  getLocalKathmanduTime,
  getTodayNepaliDateFull,
  abbreviatedWeekdays,
  weekdays,
  isHoliday,
  getGregorianMonthYear,
} from "../../utils/calendarUtils.js";
import { renderNepaliWeekdayHeader } from "../Today/Today.js";

let abbreviationListenerAdded = false;
let isRendered = false;

function renderMonthGrid(ul, monthObj, yearNp, todaysNpDateStr) {
  const fragment = document.createDocumentFragment();
  const monthDates = monthObj.days;
  const { monthIndex, year } = getGregorianMonthYear(
    monthObj.monthYearEn,
    false,
  );
  const firstDateEn = parseInt(monthDates[0].dateEn, 10);
  const firstDate = new Date(year, monthIndex, firstDateEn);
  const firstDayWeekIndex = firstDate.getDay();

  const totalCells = 42;
  let cellIndex = 0;
  let dateIndex = 0;

  for (; cellIndex < firstDayWeekIndex; cellIndex++) {
    const li = document.createElement("li");
    li.className = "month-view__date month-view__date--empty";
    fragment.appendChild(li);
  }

  for (
    ;
    dateIndex < monthDates.length && cellIndex < totalCells;
    dateIndex++, cellIndex++
  ) {
    const dateObj = monthDates[dateIndex];
    const li = document.createElement("li");
    li.className = "month-view__date";
    li.dataset.index = dateIndex;

    if (cellIndex % 7 === 6) li.classList.add("is-saturday");
    if (isHoliday(dateObj)) li.classList.add("is-holiday");

    const cellNpDateStr = `${monthObj.monthNp} ${dateObj.dateNp}, ${yearNp}`;
    if (todaysNpDateStr && cellNpDateStr === todaysNpDateStr) {
      li.classList.add("is-today");
    }

    const spanEn = document.createElement("span");
    spanEn.className = "month-view__date-en";
    spanEn.textContent = dateObj.dateEn;

    const spanNp = document.createElement("span");
    spanNp.className = "month-view__date-np";
    spanNp.textContent = dateObj.dateNp;

    const spanTithi = document.createElement("span");
    spanTithi.className = "month-view__date-tithi";
    spanTithi.textContent = dateObj.tithi || "";

    li.appendChild(spanEn);
    li.appendChild(spanNp);
    li.appendChild(spanTithi);
    fragment.appendChild(li);
  }

  for (; cellIndex < totalCells; cellIndex++) {
    const li = document.createElement("li");
    li.className = "month-view__date month-view__date--empty";
    fragment.appendChild(li);
  }

  ul.appendChild(fragment);
}

function updateWeekdayAbbreviations() {
  const isAbbreviated = window.matchMedia("(max-width: 499px)").matches;
  const npSpans = document.querySelectorAll(
    ".month-view__day-label--np[data-day-label-np]",
  );
  const enSpans = document.querySelectorAll(
    ".month-view__day-label--en[data-day-label-en]",
  );
  if (npSpans.length !== 7 || enSpans.length !== 7) return;

  for (let i = 0; i < 7; i++) {
    npSpans[i].textContent = isAbbreviated
      ? abbreviatedWeekdays[i][1]
      : weekdays[i][1];
    enSpans[i].textContent = isAbbreviated
      ? abbreviatedWeekdays[i][0]
      : weekdays[i][0];
  }
}

function maybeAddResizeListener() {
  if (abbreviationListenerAdded) return;
  window.addEventListener("resize", updateWeekdayAbbreviations, {
    passive: true,
  });
  abbreviationListenerAdded = true;
}

export async function initMonthView(container) {
  if (isRendered) return;

  const calendarData = await getCalendarData();
  if (!calendarData) {
    container.innerHTML = "<p>Failed to load calendar data.</p>";
    return;
  }

  container.innerHTML = "";
  isRendered = true;

  const ul = document.createElement("ul");
  ul.className = "month-view container-xl";

  const headerLi = document.createElement("li");
  headerLi.className = "month-view-header-wrapper";

  const spanNp = document.createElement("span");
  spanNp.className = "todays-date-np";

  const navWrapper = document.createElement("div");
  navWrapper.className = "month-navigation";

  const prevBtn = document.createElement("button");
  prevBtn.className = "month-nav-btn";
  prevBtn.innerHTML = '<i class="bi bi-arrow-left-circle-fill"></i>';

  const spanMonthYear = document.createElement("span");
  spanMonthYear.className = "month-year-indicator";
  spanMonthYear.setAttribute("data-month-year-indicator", "");

  const nextBtn = document.createElement("button");
  nextBtn.className = "month-nav-btn";
  nextBtn.innerHTML = '<i class="bi bi-arrow-right-circle-fill"></i>';

  navWrapper.appendChild(prevBtn);
  navWrapper.appendChild(spanMonthYear);
  navWrapper.appendChild(nextBtn);

  headerLi.appendChild(spanNp);
  headerLi.appendChild(navWrapper);

  const localKtmDate = getLocalKathmanduTime();
  let todayNp = await getTodayNepaliDateFull(localKtmDate);
  let currentMonthIndex = 0;
  let todaysNpDateStr = "";

  const updateCurrentDateInfo = (npDateData) => {
    if (npDateData && calendarData.months) {
      const tMonth = npDateData.monthNp || npDateData.month_np;
      const tDate = npDateData.dateNp || npDateData.date_np;
      const tYear = npDateData.yearNp || npDateData.year;

      todaysNpDateStr = `${tMonth} ${tDate}, ${tYear}`;
      const foundIndex = calendarData.months.findIndex(
        (m) => m.monthNp === tMonth,
      );
      if (foundIndex !== -1) currentMonthIndex = foundIndex;
    }
  };

  updateCurrentDateInfo(todayNp);

  function renderSelectedMonth() {
    if (!calendarData.months || calendarData.months.length === 0) return;

    const monthObj = calendarData.months[currentMonthIndex];
    prevBtn.disabled = currentMonthIndex === 0;
    nextBtn.disabled = currentMonthIndex === calendarData.months.length - 1;

    spanNp.textContent = todaysNpDateStr;
    spanMonthYear.textContent = `${calendarData.yearNp} ${monthObj.monthNp} | ${monthObj.monthYearEn}`;

    ul.innerHTML = "";
    ul.appendChild(headerLi);
    renderNepaliWeekdayHeader(ul);

    renderMonthGrid(ul, monthObj, calendarData.yearNp, todaysNpDateStr);
    updateWeekdayAbbreviations();
  }

  prevBtn.addEventListener("click", () => {
    if (currentMonthIndex > 0) {
      currentMonthIndex--;
      renderSelectedMonth();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentMonthIndex < calendarData.months.length - 1) {
      currentMonthIndex++;
      renderSelectedMonth();
    }
  });

  ul.addEventListener("click", (e) => {
    const li = e.target.closest(
      ".month-view__date:not(.month-view__date--empty)",
    );
    if (!li) return;

    const index = parseInt(li.dataset.index, 10);
    const monthObj = calendarData.months[currentMonthIndex];
    const dateObj = { ...monthObj.days[index], monthNp: monthObj.monthNp };

    showDateModal(dateObj, calendarData);
  });

  const layoutFragment = document.createDocumentFragment();
  layoutFragment.appendChild(ul);
  container.appendChild(layoutFragment);

  renderSelectedMonth();
  maybeAddResizeListener();

  fetchKathmanduTime().then(async (accurateKtmDate) => {
    const accurateTodayNp = await getTodayNepaliDateFull(accurateKtmDate);
    if (
      accurateTodayNp &&
      todayNp &&
      (accurateTodayNp.dateNp !== todayNp.dateNp ||
        accurateTodayNp.monthNp !== todayNp.monthNp)
    ) {
      todayNp = accurateTodayNp;
      updateCurrentDateInfo(todayNp);
      renderSelectedMonth();
    }
  });
}
