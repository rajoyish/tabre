import "./NepaliConverter.css";
import {
  convertToUnicode,
  convertToPreeti,
  transliterateNepali,
} from "./converter.js";
import { NepaliPhoneticMap } from "../NepaliPhoneticMap/NepaliPhoneticMap.js";

export const initNepaliConverter = (containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  let cursorPosition = 0;
  let alertTimeout = null;
  let debounceTimer = null;
  let storageWriteTimer = null;
  let pendingStorageValue = null;
  let pendingStorageKey = null;
  let activeFetchToken = 0;
  let currentSuggestions = [];
  let activeIndex = -1;
  let currentMode = "preeti2unicode";
  let isManualOffline = false;
  let dom = {};
  let phoneticFallback = null;
  let caretMirror = null;

  const render = () => {
    container.innerHTML = `
      <div class="nepali-converter__alert nepali-converter__alert--success" id="copyAlert" role="alert">
        <span>👍 Copied to clipboard!</span>
      </div>
      <section class="container-xl nepali-converter glass">
        <div class="nepali-converter__modes" id="converterModes">
          <div class="toggle-switch">
            <span class="toggle-switch__label" id="labelU2P">Preeti</span>
            <label>
              <input type="checkbox" id="toggleP2U" class="toggle-switch__input" role="switch" aria-checked="true" checked />
              <span class="toggle-switch__slider"></span>
            </label>
            <span class="toggle-switch__label toggle-switch__label--active" id="labelP2U">Unicode</span>
          </div>
          <div class="toggle-switch">
            <span class="toggle-switch__label" id="labelRoman">Roman to Unicode?</span>
            <label>
              <input type="checkbox" id="toggleRoman" class="toggle-switch__input" role="switch" aria-checked="false" />
              <span class="toggle-switch__slider"></span>
            </label>
          </div>
        </div>

        <div class="nepali-converter__input-group" id="inputGroupSource">
          <textarea id="converterInput" class="nepali-converter__textarea nepali-converter__textarea--preeti" placeholder="oxfF k|Llt jf gful/s kmG6df n]Vg&quot;xf];\\ ." spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
          <div class="nepali-converter__copy-bar" id="copyBarSource" style="display: none;">
            <button type="button" class="nepali-converter__copy-btn">
              <i class="bi bi-clipboard copy-icon-default"></i>
              <i class="bi bi-clipboard-check copy-icon-active"></i>
            </button>
            <button type="button" class="nepali-converter__mode-btn nepali-converter__mode-btn--online" id="networkModeBtn">
              <i class="bi bi-wifi"></i> ONLINE MODE
            </button>
          </div>
          <ul id="suggestionBox" class="nepali-converter__suggestions"></ul>
        </div>
        <div class="nepali-converter__keys-hint" id="keysHint" hidden>
          <span>↑</span> <span>↓</span> to navigate,
          <span>SPACE</span> <span>TAB</span> to select,
          <span>ENTER</span> for new line,
          <span>.</span> for ।
        </div>

        <div class="nepali-converter__toolbar" id="charToolbar">
          <button type="button" class="nepali-converter__char-btn" data-char="ङ">ङ</button>
          <button type="button" class="nepali-converter__char-btn" data-char="क्ष">क्ष</button>
          <button type="button" class="nepali-converter__char-btn" data-char="फ्">फ्</button>
          <button type="button" class="nepali-converter__char-btn" data-char="झ्">झ्</button>
          <button type="button" class="nepali-converter__char-btn" data-char="घ्">घ्</button>
          <button type="button" class="nepali-converter__char-btn" data-char="ऱ्">ऱ्</button>
          <button type="button" class="nepali-converter__char-btn" data-char="–">–</button>
          <button type="button" class="nepali-converter__char-btn" data-char="—">—</button>
          <button type="button" class="nepali-converter__char-btn" data-char="‘ ’">‘ ’</button>
          <button type="button" class="nepali-converter__char-btn" data-char="“ ”">“ ”</button>
          <button type="button" class="nepali-converter__char-btn" data-char="ईं">ईं</button>
          <button type="button" class="nepali-converter__char-btn" data-char="ौँ">ौँ</button>
          <button type="button" class="nepali-converter__char-btn" data-char="त्त्">त्त्</button>
          <button type="button" class="nepali-converter__char-btn" data-char="ऽ">ऽ</button>
          <button type="button" class="nepali-converter__char-btn" data-char="ॐ">ॐ</button>
          <button type="button" class="nepali-converter__char-btn" data-char="॥">॥</button>
        </div>

        <div class="nepali-converter__input-group" id="inputGroupTarget">
          <textarea id="converterOutput" class="nepali-converter__textarea nepali-converter__textarea--target nepali-converter__textarea--unicode" placeholder="यहाँ यूनिकोड नेपालीमा रुपान्तरण हुनेछ ।" readonly></textarea>
          <div class="nepali-converter__copy-bar" id="copyBarTarget">
            <button type="button" class="nepali-converter__copy-btn">
              <i class="bi bi-clipboard copy-icon-default"></i>
              <i class="bi bi-clipboard-check copy-icon-active"></i>
            </button>
          </div>
        </div>
      </section>
    `;
  };

  const cacheDOM = () => {
    dom = {
      modes: document.getElementById("converterModes"),
      toggleP2U: document.getElementById("toggleP2U"),
      toggleRoman: document.getElementById("toggleRoman"),
      labelU2P: document.getElementById("labelU2P"),
      labelP2U: document.getElementById("labelP2U"),
      labelRoman: document.getElementById("labelRoman"),
      input: document.getElementById("converterInput"),
      output: document.getElementById("converterOutput"),
      toolbar: document.getElementById("charToolbar"),
      copyBtns: document.querySelectorAll(".nepali-converter__copy-btn"),
      copyBarSource: document.getElementById("copyBarSource"),
      networkModeBtn: document.getElementById("networkModeBtn"),
      inputGroupTarget: document.getElementById("inputGroupTarget"),
      inputGroupSource: document.getElementById("inputGroupSource"),
      alert: document.getElementById("copyAlert"),
      suggestionBox: document.getElementById("suggestionBox"),
      keysHint: document.getElementById("keysHint"),
    };
    phoneticFallback = NepaliPhoneticMap(dom.input, dom.inputGroupSource);
  };

  const updateClassesAndPlaceholders = () => {
    if (currentMode === "preeti2unicode") {
      dom.input.className =
        "nepali-converter__textarea nepali-converter__textarea--preeti";
      dom.output.className =
        "nepali-converter__textarea nepali-converter__textarea--target nepali-converter__textarea--unicode";
      dom.input.placeholder = 'oxfF k|Llt jf gful/s kmG6df n]Vg"xf];\\ .';
      dom.output.placeholder = "यहाँ यूनिकोड नेपालीमा रुपान्तरण हुनेछ ।";
      dom.inputGroupTarget.classList.remove(
        "nepali-converter__input-group--hidden",
      );
      dom.copyBarSource.style.display = "none";
      dom.toolbar.style.display = "flex";
      dom.output.readOnly = true;
      if (dom.keysHint) dom.keysHint.hidden = true;
      phoneticFallback.hide();
    } else if (currentMode === "unicode2preeti") {
      dom.input.className =
        "nepali-converter__textarea nepali-converter__textarea--unicode";
      dom.output.className =
        "nepali-converter__textarea nepali-converter__textarea--target nepali-converter__textarea--preeti";
      dom.input.placeholder = "यहाँ यूनिकोड नेपालीमा लेख्नुहोस् ।";
      dom.output.placeholder = "oxfF k|Llt jf gful/s kmG6df ?kfGt/0f x'g]5 .";
      dom.inputGroupTarget.classList.remove(
        "nepali-converter__input-group--hidden",
      );
      dom.copyBarSource.style.display = "none";
      dom.toolbar.style.display = "flex";
      dom.output.readOnly = true;
      if (dom.keysHint) dom.keysHint.hidden = true;
      phoneticFallback.hide();
    } else if (currentMode === "roman2unicode") {
      dom.input.className =
        "nepali-converter__textarea nepali-converter__textarea--unicode";
      dom.input.placeholder = "Type Roman English here (e.g. namaste)...";
      dom.inputGroupTarget.classList.add(
        "nepali-converter__input-group--hidden",
      );
      dom.copyBarSource.style.display = "flex";
      dom.toolbar.style.display = "none";
      dom.output.readOnly = false;
      if (dom.keysHint) dom.keysHint.hidden = false;
    }
  };

  const syncOutput = () => {
    const val = dom.input.value;
    if (currentMode === "preeti2unicode") {
      dom.output.value = convertToUnicode(val);
    } else if (currentMode === "unicode2preeti") {
      dom.output.value = convertToPreeti(val);
    }
  };

  const STORAGE_FLUSH_MS = 200;
  const flushStorageWrite = () => {
    if (pendingStorageKey !== null) {
      try {
        localStorage.setItem(pendingStorageKey, pendingStorageValue ?? "");
      } catch {}
      pendingStorageKey = null;
      pendingStorageValue = null;
    }
    if (storageWriteTimer) {
      clearTimeout(storageWriteTimer);
      storageWriteTimer = null;
    }
  };

  const queueStorageWrite = (key, value) => {
    pendingStorageKey = key;
    pendingStorageValue = value;
    if (storageWriteTimer) clearTimeout(storageWriteTimer);
    storageWriteTimer = setTimeout(flushStorageWrite, STORAGE_FLUSH_MS);
  };

  const handleCursorUpdate = () => {
    cursorPosition = dom.input.selectionStart;
  };

  const getCaretCoordinates = (element, position) => {
    if (!caretMirror) {
      caretMirror = document.createElement("div");
      caretMirror.style.position = "absolute";
      caretMirror.style.visibility = "hidden";
      caretMirror.style.whiteSpace = "pre-wrap";
      caretMirror.style.overflowWrap = "break-word";
      caretMirror.style.top = "0";
      caretMirror.style.left = "-9999px";
      document.body.appendChild(caretMirror);
    }
    const style = window.getComputedStyle(element);
    const properties = [
      "direction",
      "boxSizing",
      "width",
      "height",
      "overflowX",
      "overflowY",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderStyle",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "fontStyle",
      "fontVariant",
      "fontWeight",
      "fontStretch",
      "fontSize",
      "lineHeight",
      "fontFamily",
      "textAlign",
      "textTransform",
      "textIndent",
      "textDecoration",
      "letterSpacing",
      "wordSpacing",
    ];
    properties.forEach((prop) => (caretMirror.style[prop] = style[prop]));
    caretMirror.textContent = element.value.substring(0, position);
    const span = document.createElement("span");
    span.textContent = element.value.substring(position) || ".";
    caretMirror.appendChild(span);
    const coords = {
      top:
        span.offsetTop +
        parseInt(style.borderTopWidth || "0") -
        element.scrollTop,
      left: span.offsetLeft + parseInt(style.borderLeftWidth || "0"),
    };
    caretMirror.removeChild(span);
    caretMirror.textContent = "";
    return coords;
  };

  const setSuggestionActive = (index) => {
    const items = dom.suggestionBox.querySelectorAll("li");
    items.forEach((li) =>
      li.classList.remove("nepali-converter__suggestion-item--active"),
    );
    if (index >= 0 && index < items.length) {
      items[index].classList.add("nepali-converter__suggestion-item--active");
      activeIndex = index;
    }
  };

  const getCurrentWordBounds = () => {
    const val = dom.input.value;
    const caret = dom.input.selectionStart;
    let start = caret;
    while (start > 0 && !/[\s।॥]/.test(val[start - 1])) {
      start--;
    }
    return { start, end: caret, word: val.substring(start, caret) };
  };

  const selectSuggestion = (index) => {
    const word = currentSuggestions[index];
    if (!word) return;
    const { start, end } = getCurrentWordBounds();
    const val = dom.input.value;
    const replacement = word + " ";
    dom.input.value =
      val.substring(0, start) + replacement + val.substring(end);
    const newCaret = start + replacement.length;
    dom.input.setSelectionRange(newCaret, newCaret);
    cursorPosition = newCaret;
    dom.suggestionBox.style.display = "none";
    activeIndex = -1;
    queueStorageWrite(`nepaliInput_${currentMode}`, dom.input.value);
    dom.input.focus();
  };

  const renderSuggestions = (suggestions) => {
    dom.suggestionBox.innerHTML = "";
    currentSuggestions = suggestions;
    activeIndex = -1;

    if (!suggestions.length) {
      dom.suggestionBox.style.display = "none";
      return;
    }

    const fragment = document.createDocumentFragment();
    suggestions.forEach((word, index) => {
      const li = document.createElement("li");
      li.textContent = word;
      li.className = "nepali-converter__suggestion-item";
      li.dataset.index = index;
      fragment.appendChild(li);
    });

    dom.suggestionBox.appendChild(fragment);

    const coords = getCaretCoordinates(dom.input, cursorPosition);
    const viewportPadding = 8;
    const inputRect = dom.input.getBoundingClientRect();

    dom.suggestionBox.style.maxWidth = "";
    dom.suggestionBox.style.left = "0";
    dom.suggestionBox.style.top = `${coords.top + 24}px`;
    dom.suggestionBox.style.display = "block";

    const boxRect = dom.suggestionBox.getBoundingClientRect();
    const boxWidth = boxRect.width;
    const maxLeftWithinInput = Math.max(
      0,
      inputRect.width - boxWidth - viewportPadding,
    );
    const desiredLeft = coords.left + 16;
    const clampedLeft = Math.min(desiredLeft, maxLeftWithinInput);
    dom.suggestionBox.style.left = `${Math.max(0, clampedLeft)}px`;
  };

  const handleSuggestionMouseOver = (e) => {
    const li = e.target.closest(".nepali-converter__suggestion-item");
    if (!li) return;
    const idx = parseInt(li.dataset.index, 10);
    if (!isNaN(idx)) setSuggestionActive(idx);
  };

  const handleSuggestionMouseDown = (e) => {
    const li = e.target.closest(".nepali-converter__suggestion-item");
    if (!li) return;
    e.preventDefault();
    const idx = parseInt(li.dataset.index, 10);
    if (!isNaN(idx)) selectSuggestion(idx);
  };

  const handleInput = () => {
    handleCursorUpdate();
    queueStorageWrite(`nepaliInput_${currentMode}`, dom.input.value);

    if (currentMode === "roman2unicode") {
      clearTimeout(debounceTimer);
      const { word: currentWord } = getCurrentWordBounds();

      if (!currentWord || currentWord.length < 2) {
        dom.suggestionBox.style.display = "none";
        phoneticFallback.hide();
        return;
      }

      debounceTimer = setTimeout(async () => {
        if (isManualOffline) {
          dom.suggestionBox.style.display = "none";
          phoneticFallback.show();
          return;
        }

        const isOffline = !navigator.onLine;
        let suggestions = [];
        let apiFailed = false;

        const token = ++activeFetchToken;

        if (!isOffline) {
          try {
            suggestions = await transliterateNepali(currentWord);
            if (suggestions.length === 1 && suggestions[0] === currentWord) {
              apiFailed = true;
            }
          } catch {
            apiFailed = true;
          }
        }

        if (token !== activeFetchToken || !dom || !dom.input) return;

        if (isOffline || apiFailed) {
          showAlert("⚠️ Offline: Autocomplete paused.", "warning");
          dom.suggestionBox.style.display = "none";
          phoneticFallback.show();
        } else {
          phoneticFallback.hide();
          renderSuggestions(suggestions);
        }
      }, 250);
    } else {
      syncOutput();
    }
  };

  const handleKeydown = (e) => {
    if (currentMode !== "roman2unicode") return;

    if (e.key === ".") {
      e.preventDefault();

      const val = dom.input.value;
      const start = dom.input.selectionStart;
      const end = dom.input.selectionEnd;

      let newVal;
      let newCaret;

      if (start === end && start > 0 && val[start - 1] === "।") {
        newVal = val.substring(0, start - 1) + "." + val.substring(end);
        newCaret = start;
      } else {
        const charToInsert = "।";
        newVal = val.substring(0, start) + charToInsert + val.substring(end);
        newCaret = start + charToInsert.length;
      }

      dom.input.value = newVal;
      cursorPosition = newCaret;
      dom.input.setSelectionRange(newCaret, newCaret);
      queueStorageWrite(`nepaliInput_${currentMode}`, dom.input.value);

      dom.suggestionBox.style.display = "none";
      activeIndex = -1;
      dom.input.dispatchEvent(new Event("input"));
      return;
    }

    if (e.key === "|") {
      e.preventDefault();
      const charToInsert = "।";

      const val = dom.input.value;
      const start = dom.input.selectionStart;
      const end = dom.input.selectionEnd;
      const before = val.substring(0, start);
      const after = val.substring(end);

      dom.input.value = before + charToInsert + after;
      cursorPosition = start + charToInsert.length;
      dom.input.setSelectionRange(cursorPosition, cursorPosition);
      queueStorageWrite(`nepaliInput_${currentMode}`, dom.input.value);

      dom.suggestionBox.style.display = "none";
      dom.input.dispatchEvent(new Event("input"));
      return;
    }

    if (e.shiftKey && /^[B-DF-HJ-NP-TV-Z]$/.test(e.key)) {
      e.preventDefault();
      const charToInsert = e.key.toLowerCase() + "\\";

      const val = dom.input.value;
      const start = dom.input.selectionStart;
      const end = dom.input.selectionEnd;
      const before = val.substring(0, start);
      const after = val.substring(end);

      dom.input.value = before + charToInsert + after;
      cursorPosition = start + charToInsert.length;
      dom.input.setSelectionRange(cursorPosition, cursorPosition);
      queueStorageWrite(`nepaliInput_${currentMode}`, dom.input.value);

      dom.suggestionBox.style.display = "none";
      dom.input.dispatchEvent(new Event("input"));
      return;
    }

    if (phoneticFallback.isActive() && e.key === " ") {
      if (phoneticFallback.handleSpace()) {
        e.preventDefault();
        return;
      }
    }

    if (dom.suggestionBox.style.display === "none") return;

    const items = dom.suggestionBox.querySelectorAll("li");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next =
        activeIndex < 0 ? 0 : Math.min(activeIndex + 1, items.length - 1);
      setSuggestionActive(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev =
        activeIndex < 0 ? items.length - 1 : Math.max(activeIndex - 1, 0);
      setSuggestionActive(prev);
    } else if (e.key === "Tab" || e.key === " ") {
      const idx = activeIndex >= 0 ? activeIndex : 0;
      if (currentSuggestions[idx]) {
        e.preventDefault();
        selectSuggestion(idx);
      }
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(activeIndex);
    } else if (e.key === "Escape") {
      dom.suggestionBox.style.display = "none";
      activeIndex = -1;
    }
  };

  const handleToolbarClick = (event) => {
    const btn = event.target.closest(".nepali-converter__char-btn");
    if (!btn) return;

    const charToInsert = btn.dataset.char;
    const currentVal = dom.input.value;

    const before = currentVal.substring(0, cursorPosition);
    const after = currentVal.substring(cursorPosition);

    dom.input.value = before + charToInsert + after;
    cursorPosition += charToInsert.length;

    dom.input.focus();
    dom.input.setSelectionRange(cursorPosition, cursorPosition);

    queueStorageWrite(`nepaliInput_${currentMode}`, dom.input.value);
    syncOutput();
  };

  const handleNetworkModeClick = () => {
    isManualOffline = !isManualOffline;

    if (isManualOffline) {
      dom.networkModeBtn.className =
        "nepali-converter__mode-btn nepali-converter__mode-btn--offline";
      dom.networkModeBtn.innerHTML = `<i class="bi bi-wifi-off"></i> OFFLINE MODE`;
    } else {
      dom.networkModeBtn.className =
        "nepali-converter__mode-btn nepali-converter__mode-btn--online";
      dom.networkModeBtn.innerHTML = `<i class="bi bi-wifi"></i> ONLINE MODE`;
      showAlert("✅ Online: Autocomplete active.", "success");
    }

    if (currentMode === "roman2unicode") {
      handleInput();
    }
  };

  const handleModeChange = (event) => {
    if (event.target === dom.toggleP2U || event.target === dom.toggleRoman) {
      if (event.target === dom.toggleP2U && dom.toggleRoman.checked) {
        dom.toggleRoman.checked = false;
      }

      if (dom.toggleRoman.checked) {
        currentMode = "roman2unicode";
        dom.labelRoman.classList.add("toggle-switch__label--active");
        dom.labelU2P.classList.remove("toggle-switch__label--active");
        dom.labelP2U.classList.remove("toggle-switch__label--active");
        dom.toggleRoman.setAttribute("aria-checked", "true");
      } else {
        dom.labelRoman.classList.remove("toggle-switch__label--active");
        dom.toggleRoman.setAttribute("aria-checked", "false");

        if (dom.toggleP2U.checked) {
          currentMode = "preeti2unicode";
          dom.labelP2U.classList.add("toggle-switch__label--active");
          dom.labelU2P.classList.remove("toggle-switch__label--active");
          dom.toggleP2U.setAttribute("aria-checked", "true");
        } else {
          currentMode = "unicode2preeti";
          dom.labelU2P.classList.add("toggle-switch__label--active");
          dom.labelP2U.classList.remove("toggle-switch__label--active");
          dom.toggleP2U.setAttribute("aria-checked", "false");
        }
      }

      updateClassesAndPlaceholders();
      dom.input.value =
        localStorage.getItem(`nepaliInput_${currentMode}`) || "";
      if (currentMode !== "roman2unicode") syncOutput();
      dom.suggestionBox.style.display = "none";
    }
  };

  const closeSuggestionsOnClickOutside = (e) => {
    if (dom.inputGroupSource && !dom.inputGroupSource.contains(e.target)) {
      if (dom.suggestionBox) dom.suggestionBox.style.display = "none";
    }
  };

  const showAlert = (message = "👍 Copied to clipboard!", type = "success") => {
    const alertSpan = dom.alert.querySelector("span");
    if (alertSpan) alertSpan.textContent = message;

    dom.alert.className = `nepali-converter__alert nepali-converter__alert--visible nepali-converter__alert--${type}`;

    if (message.includes("Copied")) {
      dom.copyBtns.forEach((btn) => btn.classList.add("is-copied"));
    }

    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
      dom.alert.className = `nepali-converter__alert nepali-converter__alert--${type}`;
      dom.copyBtns.forEach((btn) => btn.classList.remove("is-copied"));
    }, 10000);
  };

  const handleCopyClick = () => {
    const textToCopy =
      currentMode === "roman2unicode" ? dom.input.value : dom.output.value;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => showAlert());
  };

  const bindEvents = () => {
    dom.input.addEventListener("input", handleInput);
    dom.input.addEventListener("click", handleCursorUpdate);
    dom.input.addEventListener("keyup", handleCursorUpdate);
    dom.input.addEventListener("keydown", handleKeydown);
    dom.toolbar.addEventListener("click", handleToolbarClick);
    dom.networkModeBtn.addEventListener("click", handleNetworkModeClick);
    dom.copyBtns.forEach((btn) =>
      btn.addEventListener("click", handleCopyClick),
    );
    dom.modes.addEventListener("change", handleModeChange);
    dom.suggestionBox.addEventListener("mouseover", handleSuggestionMouseOver);
    dom.suggestionBox.addEventListener("mousedown", handleSuggestionMouseDown);
    document.addEventListener("click", closeSuggestionsOnClickOutside);
  };

  const initializeState = () => {
    updateClassesAndPlaceholders();
    const savedInput = localStorage.getItem(`nepaliInput_${currentMode}`) || "";
    if (savedInput) {
      dom.input.value = savedInput;
      if (currentMode !== "roman2unicode") syncOutput();
    }
  };

  const destroy = () => {
    activeFetchToken++;
    flushStorageWrite();

    if (dom && dom.input) {
      dom.input.removeEventListener("input", handleInput);
      dom.input.removeEventListener("click", handleCursorUpdate);
      dom.input.removeEventListener("keyup", handleCursorUpdate);
      dom.input.removeEventListener("keydown", handleKeydown);
    }
    if (dom && dom.toolbar)
      dom.toolbar.removeEventListener("click", handleToolbarClick);
    if (dom && dom.networkModeBtn)
      dom.networkModeBtn.removeEventListener("click", handleNetworkModeClick);
    if (dom && dom.copyBtns)
      dom.copyBtns.forEach((btn) =>
        btn.removeEventListener("click", handleCopyClick),
      );
    if (dom && dom.modes)
      dom.modes.removeEventListener("change", handleModeChange);
    if (dom && dom.suggestionBox) {
      dom.suggestionBox.removeEventListener(
        "mouseover",
        handleSuggestionMouseOver,
      );
      dom.suggestionBox.removeEventListener(
        "mousedown",
        handleSuggestionMouseDown,
      );
    }
    document.removeEventListener("click", closeSuggestionsOnClickOutside);

    if (alertTimeout) {
      clearTimeout(alertTimeout);
      alertTimeout = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (storageWriteTimer) {
      clearTimeout(storageWriteTimer);
      storageWriteTimer = null;
    }
    if (phoneticFallback) {
      phoneticFallback.destroy();
      phoneticFallback = null;
    }

    if (caretMirror && caretMirror.parentNode) {
      caretMirror.parentNode.removeChild(caretMirror);
    }
    caretMirror = null;

    container.innerHTML = "";
    dom = null;
    currentSuggestions = [];
  };

  render();
  cacheDOM();
  bindEvents();
  initializeState();

  return { destroy };
};
