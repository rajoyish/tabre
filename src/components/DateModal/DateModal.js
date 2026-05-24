import "../FullCalendar/FullCalendar.css";
import "./DateModal.css";
import {
  isHoliday,
  getGregorianMonthYear,
  getRelativeDateText,
} from "../../utils/calendarUtils.js";

let modalDialog = null;

export function initDateModal() {
  if (modalDialog) return modalDialog;
  modalDialog = document.createElement("dialog");
  modalDialog.className = "date-modal";
  modalDialog.addEventListener("click", (e) => {
    if (e.target === modalDialog || e.target.closest(".date-modal__close")) {
      modalDialog.close();
    }
  });
  document.body.appendChild(modalDialog);
  return modalDialog;
}

export function showDateModal(dateObj, calendarData) {
  const dialog = initDateModal();
  const monthObj = calendarData.months.find(
    (m) => m.monthNp === dateObj.monthNp,
  );

  if (!monthObj) {
    console.warn(
      "showDateModal: could not resolve month for dateObj",
      dateObj,
      "— callers must pass a dateObj with a valid monthNp.",
    );
    return;
  }

  const dateIndex = monthObj.days.findIndex(
    (d) => d.dateEn === dateObj.dateEn && d.dateNp === dateObj.dateNp,
  );

  if (dateIndex === -1) {
    console.warn(
      "showDateModal: dateObj not found in resolved month",
      dateObj,
      monthObj.monthNp,
    );
    return;
  }
  const yearNp = calendarData.yearNp;
  let isSecondMonth = false;

  for (let i = 1; i <= dateIndex; i++) {
    if (
      parseInt(monthObj.days[i].dateEn, 10) <
      parseInt(monthObj.days[i - 1].dateEn, 10)
    ) {
      isSecondMonth = true;
      break;
    }
  }

  const { monthIndex, year: enYear } = getGregorianMonthYear(
    monthObj.monthYearEn,
    isSecondMonth,
  );
  const dateEnNum = parseInt(dateObj.dateEn, 10);
  const targetDate = new Date(enYear, monthIndex, dateEnNum);
  const relativeDayText = getRelativeDateText(targetDate);
  const monthNp = monthObj.monthNp;
  const d = dateObj.details;

  let bodyHtml = `<div class="date-modal__content">`;
  const titleColor = isHoliday(dateObj) ? 'style="color:#e53935;"' : "";

  if (d) {
    bodyHtml += `
      <header class="date-modal__header">
        <h3 class="date-modal__title" ${titleColor}>${monthNp} ${dateObj.dateNp}, ${yearNp}, ${d.panchanga.dayName}</h3>
        <div class="date-modal__header-right">
          <span class="date-modal__badge">${relativeDayText}</span>
          <button class="date-modal__close">&times;</button>
        </div>
      </header>
      <div class="date-modal__meta">
        <div class="date-modal__meta-col">
          <div>${d.fullDateEn}</div>
          <p class="date-modal__text-muted">${d.nepalSamvat || ""}</p>
        </div>
        <div class="date-modal__meta-col date-modal__meta-col--right">
          <div>${d.panchanga.yoga ? d.panchanga.yoga + " " : ""}${dateObj.tithi}</div>
          <p class="date-modal__text-muted">☀️ सूर्योदय ०५:${d.sunrise} &nbsp; 🌅 सूर्यास्त १८:${d.sunset}</p>
        </div>
      </div>
      <div class="date-modal__section">
        <h4 class="date-modal__section-title">पञ्चाङ्ग</h4>
        <div class="date-modal__grid">
          <div class="date-modal__grid-label">दिन</div>
          <div class="date-modal__grid-value">${d.panchanga.dayName}</div>
          <div class="date-modal__grid-label">तिथि</div>
          <div class="date-modal__grid-value">${d.panchanga.tithiDetails}</div>
          <div class="date-modal__grid-label">नक्षत्र</div>
          <div class="date-modal__grid-value">${d.panchanga.nakshatra}</div>
          <div class="date-modal__grid-label">योग</div>
          <div class="date-modal__grid-value">${d.panchanga.yoga}</div>
          <div class="date-modal__grid-label">करण</div>
          <div class="date-modal__grid-value">${d.panchanga.firstKarana}</div>
        </div>
      </div>
    `;

    const eventsList =
      d.events && d.events.length > 0
        ? d.events
            .map(
              (e) =>
                `<li class="date-modal__list-item"><span class="date-modal__bullet"></span>${e.label} ${e.isHoliday ? '<span class="date-modal__tag-holiday">(बिदा)</span>' : ""}</li>`,
            )
            .join("")
        : `<li class="date-modal__list-item"><span class="date-modal__bullet"></span> ${dateObj.eventTitle || "छैन"}</li>`;

    bodyHtml += `
      <div class="date-modal__section">
        <h4 class="date-modal__section-title">कार्यक्रमहरू</h4>
        <ul class="date-modal__list">${eventsList}</ul>
      </div>
    `;

    const auspiciousList =
      d.auspiciousTimes && d.auspiciousTimes.length > 0
        ? d.auspiciousTimes
            .map(
              (a) =>
                `<li class="date-modal__list-item"><span class="date-modal__bullet"></span> ${a}</li>`,
            )
            .join("")
        : `<p class="date-modal__text-muted">कुनै शुभ साइत तथा मुहूर्त फेला परेन |</p>`;

    bodyHtml += `
      <div class="date-modal__section">
        <h4 class="date-modal__section-title">शुभ साइत</h4>
        <ul class="date-modal__list">${auspiciousList}</ul>
      </div>
    `;

    if (d.muhurtas && d.muhurtas.length > 0) {
      bodyHtml += `
        <div class="date-modal__section">
          <h4 class="date-modal__section-title">मुहूर्त</h4>
          <div class="date-modal__grid">
            ${d.muhurtas.map((m) => `<div class="date-modal__grid-label">${m.label}</div><div class="date-modal__grid-value">${m.time}</div>`).join("")}
          </div>
        </div>
       `;
    }
  } else {
    const fallbackDayName = targetDate.toLocaleDateString("ne-NP", {
      weekday: "long",
    });
    const fullMonths = [
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
    const fallbackDateEnStr = `${dateEnNum} ${fullMonths[monthIndex]} ${enYear}, ${targetDate.toLocaleDateString("en-US", { weekday: "long" })}`;

    bodyHtml += `
      <header class="date-modal__header">
        <h3 class="date-modal__title" ${titleColor}>${monthNp} ${dateObj.dateNp}, ${yearNp}, ${fallbackDayName}</h3>
        <div class="date-modal__header-right">
          <span class="date-modal__badge">${relativeDayText}</span>
          <button class="date-modal__close">&times;</button>
        </div>
      </header>
      <div class="date-modal__meta">
        <div class="date-modal__meta-col">
          <div>${fallbackDateEnStr}</div>
        </div>
        <div class="date-modal__meta-col date-modal__meta-col--right">
          <div>${dateObj.tithi || ""}</div>
        </div>
      </div>
      <div class="date-modal__section">
        <h4 class="date-modal__section-title">कार्यक्रमहरू</h4>
        <ul class="date-modal__list">
          <li class="date-modal__list-item">
            <span class="date-modal__bullet"></span>
            ${dateObj.eventTitle || "छैन"}
            ${isHoliday(dateObj) ? '<span class="date-modal__tag-holiday">(बिदा)</span>' : ""}
          </li>
        </ul>
      </div>
    `;
  }

  bodyHtml += `</div>`;
  dialog.innerHTML = bodyHtml;
  dialog.showModal();
}
