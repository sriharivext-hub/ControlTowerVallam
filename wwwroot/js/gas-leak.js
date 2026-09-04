/*
 * gas-leak.js
 * LPG Gas Leak Monitoring dashboard — mock-data-driven Phase 1 UI, ported from the
 * standalone Vallam_Gasleak prototype into Control Tower's tab-pane/switchTab() shell.
 * Replace GL_MOCK with real API calls once the .NET backend + MSSQL DB is connected.
 */

const GL_MOCK = {
  state: {
    SprinklerPressure: 8.0,
    lot1: { valveOpen: true, alert: false },
    lot2: { valveOpen: true, alert: false },
    paintShop1: {
      valveOpen: true,
      points: [
        { name: "VPC - 1", status: "grey" },
        { name: "HWG - 1", status: "grey" },
        { name: "HWG - 2", status: "grey" },
        { name: "PTCED - 1 Heat up", status: "grey" },
        { name: "PTCED - 1 Hold up", status: "grey" },
        { name: "Liquid Line - 1", status: "grey" },
        { name: "Liquid Line - 2", status: "grey" }
      ]
    },
    paintShop2: {
      valveOpen: true,
      points: [
        { name: "VPC - 2", status: "green" },
        { name: "HWG - 3", status: "green" },
        { name: "HWG - 4", status: "green" },
        { name: "PTCED - 2 Heat up", status: "green" },
        { name: "PTCED - 2 Hold up", status: "green" },
        { name: "Liquid Line - 3", status: "green" },
        { name: "Liquid Line - 4", status: "green" }
      ]
    },
    tagQualityAlert: false,
    lastUpdate: null
  },

  listeners: [],

  onUpdate(fn) {
    this.listeners.push(fn);
  },

  emit() {
    this.state.lastUpdate = new Date();
    this.listeners.forEach((fn) => fn(this.state));
  },

  toggleValve(target) {
    const node = this.state[target];
    if (node) node.valveOpen = !node.valveOpen;
    this.emit();
  },

  _tickProperties() {
    const s = this.state;

    const delta = (Math.random() - 0.5) * 0.6;
    s.SprinklerPressure = Math.min(11, Math.max(3, s.SprinklerPressure + delta));

    if (Math.random() < 0.1) {
      const group = s.paintShop2.points;
      const point = group[Math.floor(Math.random() * group.length)];
      const roll = Math.random();
      point.status = roll < 0.75 ? "green" : roll < 0.93 ? "yellow" : "red";
    }

    this.emit();
  },

  _tickAlerts() {
    const s = this.state;
    const trip = Math.random() < 0.12;
    if (trip) {
      const which = Math.random();
      s.lot1.alert = which < 0.4;
      s.lot2.alert = which >= 0.4 && which < 0.8;
      s.tagQualityAlert = which >= 0.8;
    } else {
      s.lot1.alert = false;
      s.lot2.alert = false;
      s.tagQualityAlert = false;
    }
    this.emit();
  },

  start() {
    this._tickProperties();
    this._tickAlerts();
    this._propTimer = setInterval(() => this._tickProperties(), 1000);
    this._alertTimer = setInterval(() => this._tickAlerts(), 8000);
  },

  stop() {
    clearInterval(this._propTimer);
    clearInterval(this._alertTimer);
  }
};

const GL_SIREN_IMG = {
  green: "assets/gasleak/RE_Safety_GasLeak_SirenGreen_MD.png",
  yellow: "assets/gasleak/RE_Safety_GasLeak_SirenYellow_MD.png",
  red: "assets/gasleak/RE_Safety_GasLeak_SirenRed_MD.png",
  grey: "assets/gasleak/RE_Safety_GasLeak_SirenGrey_MD.png"
};

function glPressureState(p) {
  if (p < 4.5) return { label: "LOW", cls: "red" };
  if (p < 6) return { label: "WARNING", cls: "yellow" };
  if (p < 8) return { label: "NORMAL", cls: "green" };
  if (p < 9.5) return { label: "WARNING", cls: "yellow" };
  return { label: "HIGH", cls: "red" };
}

const GL_STATUS_ROW_TOPS = {
  paintShop1: [31, 93, 153, 215, 279, 343, 403],
  paintShop2: [583, 645, 705, 768, 831, 895, 955]
};

function glWorstStatus(points) {
  if (points.some((p) => p.status === "red")) return "red";
  if (points.some((p) => p.status === "yellow")) return "yellow";
  if (points.every((p) => p.status === "grey")) return "grey";
  return "green";
}

function glRenderPointList(container, points, tops) {
  container.innerHTML = "";
  points.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "gl-point-row";
    row.style.top = tops[i] + "px";
    row.innerHTML = `
      <span class="gl-point-name">${p.name}</span>
      <img class="gl-point-siren" src="${GL_SIREN_IMG[p.status]}" alt="${p.status}">
    `;
    container.appendChild(row);
  });
}

function glShowAssetInfo(name) {
  glOpenModal(`
    <h3>${name}</h3>
    <p>Live property detail for this asset will be wired up once the backend API
    and database are connected.</p>
  `);
}

function glShowAlertsTable(state) {
  const rows = [];
  if (state.lot1.alert) rows.push(["LOT 1", "Gas leak detected", "Active"]);
  if (state.lot2.alert) rows.push(["LOT 2", "Gas leak detected", "Active"]);
  if (state.tagQualityAlert) rows.push(["System", "Tag quality alert", "Active"]);
  const body = rows.length
    ? `<table><thead><tr><th>Zone</th><th>Alert</th><th>State</th></tr></thead>
       <tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table>`
    : `<p>No active alerts.</p>`;
  glOpenModal(`<h3>Active Alerts</h3>${body}`);
}

function glOpenModal(html) {
  document.getElementById("glModalBody").innerHTML = html;
  document.getElementById("glModalOverlay").hidden = false;
}

function glCloseModal() {
  document.getElementById("glModalOverlay").hidden = true;
}

function glSetValveUI(button, open) {
  button.classList.toggle("gl-closed", !open);
}

function glRenderState(state) {
  const p = state.SprinklerPressure;
  const ps = glPressureState(p);
  document.getElementById("glSprinklerPressure").textContent = p.toFixed(2);
  const gauge = document.getElementById("glGaugeCircle");
  gauge.classList.remove("gl-state-green", "gl-state-yellow", "gl-state-red");
  gauge.classList.add("gl-state-" + ps.cls);

  document.getElementById("glTagQuality").textContent = state.tagQualityAlert ? "ALERT" : "OK";
  document.getElementById("glTagQuality").style.color = state.tagQualityAlert ? "#bf3030" : "#66cc33";

  document.getElementById("glLot1StatusBadge").textContent = state.lot1.alert ? "Danger" : "Normal";
  document.getElementById("glLot1StatusBadge").classList.toggle("gl-danger", state.lot1.alert);
  document.getElementById("glLot1Siren").src = GL_SIREN_IMG[state.lot1.alert ? "red" : "green"];
  document.getElementById("glLot1Siren").classList.toggle("gl-blink", state.lot1.alert);

  document.getElementById("glLot2StatusBadge").textContent = state.lot2.alert ? "Danger" : "Normal";
  document.getElementById("glLot2StatusBadge").classList.toggle("gl-danger", state.lot2.alert);
  document.getElementById("glLot2Siren").src = GL_SIREN_IMG[state.lot2.alert ? "red" : "green"];
  document.getElementById("glLot2Siren").classList.toggle("gl-blink", state.lot2.alert);

  glSetValveUI(document.getElementById("glLot1Valve"), state.lot1.valveOpen);
  glSetValveUI(document.getElementById("glLot2Valve"), state.lot2.valveOpen);
  glSetValveUI(document.getElementById("glPs1Valve"), state.paintShop1.valveOpen);
  glSetValveUI(document.getElementById("glPs2Valve"), state.paintShop2.valveOpen);

  document.getElementById("glPs1Siren").src = GL_SIREN_IMG[glWorstStatus(state.paintShop1.points)];
  document.getElementById("glPs2Siren").src = GL_SIREN_IMG[glWorstStatus(state.paintShop2.points)];

  glRenderPointList(document.getElementById("glPs1Points"), state.paintShop1.points, GL_STATUS_ROW_TOPS.paintShop1);
  glRenderPointList(document.getElementById("glPs2Points"), state.paintShop2.points, GL_STATUS_ROW_TOPS.paintShop2);

  const danger = state.lot1.alert || state.lot2.alert || state.tagQualityAlert;
  document.getElementById("glAlertBanner").hidden = !danger;
  if (danger) {
    const zone = state.lot1.alert ? "LOT 1" : state.lot2.alert ? "LOT 2" : "sensor tag quality";
    document.getElementById("glAlertBannerText").textContent = `⚠ Gas leak alert — ${zone}`;
  }
}

function glWireStaticControls() {
  document.getElementById("glModalClose").addEventListener("click", glCloseModal);
  document.getElementById("glModalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("glModalOverlay")) glCloseModal();
  });

  document.querySelectorAll(".gl-valve-switch").forEach((btn) => {
    btn.addEventListener("click", () => GL_MOCK.toggleValve(btn.dataset.target));
  });

  document.querySelectorAll(".gl-vaporizer-label").forEach((label) => {
    const name = label.textContent;
    const open = () => glShowAssetInfo(name);
    label.addEventListener("click", open);
    const icon = label.previousElementSibling;
    if (icon && icon.classList.contains("gl-vaporizer-icon")) icon.addEventListener("click", open);
  });

  document.getElementById("glBtnViewAlerts").addEventListener("click", () => glShowAlertsTable(GL_MOCK.state));
}

let glInitialized = false;

function renderGasLeak() {
  if (glInitialized) return;
  glInitialized = true;

  glWireStaticControls();
  GL_MOCK.onUpdate(glRenderState);
  GL_MOCK.start();
}
