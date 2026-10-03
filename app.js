(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SECTIONS = window.SECTIONS;
  const QUESTIONS = window.QUESTIONS.map((q, i) => ({ ...q, id: i }));
  const secTitle = (id) => (SECTIONS.find((s) => s.id === id) || {}).title || id;

  let state = null;
  let timerId = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function show(id) {
    ["setup", "quiz", "result"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
    window.scrollTo(0, 0);
  }

  // ---------- Налаштування ----------
  function renderSections() {
    $("sections").innerHTML = SECTIONS.map((s) => {
      const n = QUESTIONS.filter((q) => q.s === s.id).length;
      return `<label><input type="checkbox" value="${s.id}" checked> <span>${s.title} <span class="cnt">(${n})</span></span></label>`;
    }).join("");
  }

  function prepare(q) {
    // Перемішуємо варіанти, запам'ятовуючи новий індекс правильного.
    const order = shuffle(q.a.map((_, i) => i));
    return { ...q, opts: order.map((i) => q.a[i]), correct: order.indexOf(q.c), chosen: null };
  }

  function start(pool) {
    if (!pool) {
      const chosen = [...document.querySelectorAll("#sections input:checked")].map((i) => i.value);
      if (!chosen.length) { alert("Оберіть хоча б один розділ."); return; }
      pool = QUESTIONS.filter((q) => chosen.includes(q.s));
      const count = +$("count").value;
      pool = shuffle(pool);
      if (count) pool = pool.slice(0, count);
    }
    state = {
      items: pool.map(prepare),
      idx: 0,
      mode: $("mode").value,
      timed: $("timer").checked,
      name: $("name").value.trim(),
      startedAt: Date.now()
    };
    if (state.timed) startTimer(state.items.length * 60);
    show("quiz");
    renderQuestion();
  }

  // ---------- Таймер ----------
  function startTimer(seconds) {
    clearInterval(timerId);
    const end = Date.now() + seconds * 1000;
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      $("clock").textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      if (left === 0) { clearInterval(timerId); finish(); }
    };
    tick();
    timerId = setInterval(tick, 1000);
  }

  // ---------- Питання ----------
  function renderQuestion() {
    const { items, idx } = state;
    const q = items[idx];
    $("progress").textContent = `Питання ${idx + 1} з ${items.length}`;
    if (!state.timed) $("clock").textContent = "";
    $("trackFill").style.width = `${(idx / items.length) * 100}%`;
    $("secTitle").textContent = secTitle(q.s);
    $("question").textContent = q.q;
    $("explain").classList.add("hidden");
    $("next").disabled = true;
    $("next").textContent = idx === items.length - 1 ? "Завершити" : "Далі";

    const box = $("answers");
    box.innerHTML = "";
    q.opts.forEach((text, i) => {
      const b = document.createElement("button");
      b.className = "answer";
      b.textContent = text;
      b.onclick = () => choose(i);
      box.appendChild(b);
    });
  }

  function choose(i) {
    const q = state.items[state.idx];
    const btns = [...$("answers").children];
    if (state.mode === "study") {
      if (q.chosen !== null) return;
      q.chosen = i;
      btns.forEach((b, j) => {
        b.disabled = true;
        if (j === q.correct) b.classList.add("ok");
        else if (j === i) b.classList.add("bad");
      });
      const ok = i === q.correct;
      $("explain").innerHTML = `<b>${ok ? "✅ Правильно." : "❌ Неправильно."}</b> ${q.e || ""}`;
      $("explain").classList.remove("hidden");
    } else {
      q.chosen = i;
      btns.forEach((b, j) => b.classList.toggle("sel", j === i));
    }
    $("next").disabled = false;
  }

  function next() {
    if (state.idx < state.items.length - 1) { state.idx++; renderQuestion(); }
    else finish();
  }

  // ---------- Результат ----------
  function grade(p) {
    if (p >= 90) return "Відмінно (5)";
    if (p >= 75) return "Добре (4)";
    if (p >= 60) return "Задовільно (3)";
    return "Незадовільно (2)";
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function finish() {
    clearInterval(timerId);
    const items = state.items;
    const right = items.filter((q) => q.chosen === q.correct).length;
    const pct = Math.round((right / items.length) * 100);
    const mins = Math.round((Date.now() - state.startedAt) / 60000);
    const date = new Date().toLocaleString("uk-UA");

    $("score").innerHTML = `${right} / ${items.length} — ${pct}%<small>${grade(pct)}${state.name ? " · " + esc(state.name) : ""} · ${date} · ${mins} хв</small>`;

    const rows = SECTIONS.map((s) => {
      const list = items.filter((q) => q.s === s.id);
      if (!list.length) return "";
      const r = list.filter((q) => q.chosen === q.correct).length;
      return `<tr><td>${s.title}</td><td>${r} / ${list.length}</td></tr>`;
    }).join("");
    $("bySection").innerHTML = `<table>${rows}</table>`;

    $("review").innerHTML = items.map((q) => {
      const ok = q.chosen === q.correct;
      const yours = q.chosen === null ? "— (без відповіді)" : esc(q.opts[q.chosen]);
      return `<li><b>${esc(q.q)}</b><br>
        <span class="${ok ? "ok" : "bad"}">${ok ? "✅" : "❌"} Ваша відповідь: ${yours}</span>
        ${ok ? "" : `<br><span class="ok">Правильно: ${esc(q.opts[q.correct])}</span>`}
        ${q.e ? `<div class="e">${esc(q.e)}</div>` : ""}</li>`;
    }).join("");

    $("retryWrong").disabled = right === items.length;
    show("result");
  }

  function retryWrong() {
    const wrong = state.items.filter((q) => q.chosen !== q.correct).map((q) => QUESTIONS[q.id]);
    start(shuffle(wrong));
  }

  renderSections();
  $("start").onclick = () => start();
  $("next").onclick = next;
  $("restart").onclick = () => show("setup");
  $("retryWrong").onclick = retryWrong;
  $("print").onclick = () => window.print();
})();
