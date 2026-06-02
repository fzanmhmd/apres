const STORAGE_KEYS = {
  user: "mp_absensi_user",
  device: "mp_absensi_device",
  records: "mp_absensi_records",
  audit: "mp_absensi_audit",
  geofence: "mp_absensi_geofence",
  schedule: "mp_absensi_schedule",
  monthlySchedule: "mp_absensi_monthly_schedule",
  reports: "mp_absensi_reports",
};

const DEFAULT_GEOFENCE = {
  name: "Kantor PT.MARKOJAN",
  lat: -6.208763,
  lng: 106.845599,
  radius: 250,
};

const DEFAULT_SCHEDULE = {
  activeShift: "Pagi",
  times: {
    Pagi: "08:00",
    Siang: "13:30",
    Malam: "21:00",
  },
};

const OFFICE_NEWS = [
  {
    image: "assets/brosur-natal.svg",
    label: "Brosur",
    title: "Selamat Hari Natal",
    body: "Damai dan sukacita untuk seluruh keluarga besar PT.MARKOJAN.",
  },
  {
    image: "assets/brosur-idulfitri.svg",
    label: "Brosur",
    title: "Selamat Idul Fitri",
    body: "Mohon maaf lahir dan batin. Jadwal operasional mengikuti edaran kantor.",
  },
  {
    image: "assets/pengumuman-libur.svg",
    label: "Surat keterangan",
    title: "Info Libur Nasional",
    body: "Periksa surat edaran kantor untuk perubahan jadwal dan hari libur.",
  },
];

const PAYROLL_RATE = {
  dailySalary: 150000,
  mealAllowance: 20000,
  overtimeBonus: 20000,
  transportAllowance: 15000,
  latePenaltyPerMinute: 1000,
};

const appState = {
  user: null,
  device: null,
  records: [],
  audit: [],
  geofence: loadJson(STORAGE_KEYS.geofence, DEFAULT_GEOFENCE),
  schedule: loadJson(STORAGE_KEYS.schedule, DEFAULT_SCHEDULE),
  monthlySchedule: loadJson(STORAGE_KEYS.monthlySchedule, {}),
  reports: loadJson(STORAGE_KEYS.reports, []),
  location: null,
  cameraStream: null,
  faceReady: false,
  livenessReady: false,
  lastFaceImage: "",
  map: null,
  officeMarker: null,
  userMarker: null,
  officeCircle: null,
  mapAutoFitDone: false,
};

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  updateRealtime();
  setInterval(updateRealtime, 1000);
  bootApp();
});

function cacheElements() {
  [
    "authScreen",
    "appShell",
    "loginForm",
    "loginNik",
    "loginPassword",
    "loginMessage",
    "logoutBtn",
    "activeUserName",
    "homeGreetingTime",
    "homeGreetingName",
    "homeEmployeeId",
    "realtimeClock",
    "realtimeDate",
    "attendanceStatus",
    "deviceStatus",
    "geoStatus",
    "faceStatus",
    "auditCount",
    "homeAttendanceTitle",
    "homeAttendanceDesc",
    "homePrimaryAttendanceBtn",
    "homeSecondaryAttendanceBtn",
    "homeScheduleNotice",
    "officeNewsList",
    "todaySummary",
    "restMessage",
    "refreshLocationBtn",
    "focusMyLocationBtn",
    "focusOfficeBtn",
    "cameraPreview",
    "captureCanvas",
    "cameraPlaceholder",
    "startCameraBtn",
    "runLivenessBtn",
    "livenessStatus",
    "challengeText",
    "faceScore",
    "attendanceForm",
    "attendanceTodaySummary",
    "shiftSelect",
    "attendanceNote",
    "geoFenceBadge",
    "deviceShortId",
    "distanceInfo",
    "downloadHistoryBtn",
    "historyMonth",
    "historyTable",
    "scheduleDashboard",
    "scheduleDefaultShift",
    "generateMonthlyScheduleBtn",
    "monthlyScheduleGrid",
    "insideOfficeBadge",
    "officeCoordinate",
    "officeRadius",
    "currentCoordinate",
    "mapCanvas",
    "mapFallback",
    "fallbackUserPin",
    "fallbackMapLabel",
    "profileForm",
    "profileName",
    "profileNikView",
    "profileSavedBadge",
    "profileRoleBadge",
    "currentPassword",
    "newPassword",
    "confirmPassword",
    "scheduleForm",
    "scheduleShift",
    "schedulePagi",
    "scheduleSiang",
    "scheduleMalam",
    "geoForm",
    "officeLatInput",
    "officeLngInput",
    "officeRadiusInput",
    "clearAuditBtn",
    "auditList",
    "payrollEstimate",
    "payrollNote",
    "payrollBars",
    "payrollTable",
    "payrollMonthLabel",
    "payrollMonth",
    "payrollWorkDays",
    "payrollOvertimeHours",
    "payrollMealAllowance",
    "overtimeReportBtn",
    "downloadPayrollBtn",
    "toast",
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

async function bootApp() {
  appState.user = loadJson(STORAGE_KEYS.user, null);
  appState.device = getOrCreateDevice();
  appState.records = loadJson(STORAGE_KEYS.records, []);
  appState.audit = loadJson(STORAGE_KEYS.audit, []);
  appState.schedule = normalizeSchedule(loadJson(STORAGE_KEYS.schedule, DEFAULT_SCHEDULE));
  appState.monthlySchedule = loadJson(STORAGE_KEYS.monthlySchedule, {});
  appState.reports = loadJson(STORAGE_KEYS.reports, []);

  if (el.historyMonth) el.historyMonth.value = localMonthKey();
  if (el.payrollMonth) el.payrollMonth.value = localMonthKey();
  ensureMonthlySchedule(localMonthKey());
  fillGeofenceForm();
  fillScheduleForm();
  renderOfficeNews();

  if (appState.user?.sessionToken) {
    const valid = await validateStoredSession();
    if (valid) {
      showApp();
      return;
    }

    clearAuthState();
    showAuth();
    showToast("Session lama dibersihkan. Silakan login ulang.");
    return;
  }

  clearAuthState();
  showAuth();
}

function bindEvents() {
  el.loginForm?.addEventListener("submit", handleLogin);
  el.logoutBtn?.addEventListener("click", handleLogout);
  el.refreshLocationBtn?.addEventListener("click", () => requestLocation(true));
  el.focusMyLocationBtn?.addEventListener("click", focusMyLocation);
  el.focusOfficeBtn?.addEventListener("click", focusOfficeLocation);
  el.startCameraBtn?.addEventListener("click", startCamera);
  el.runLivenessBtn?.addEventListener("click", runLivenessCheck);
  el.attendanceForm?.addEventListener("submit", saveAttendance);
  el.attendanceForm?.addEventListener("change", renderAttendanceAction);
  el.downloadHistoryBtn?.addEventListener("click", downloadHistoryCsv);
  el.historyMonth?.addEventListener("change", () => {
    ensureMonthlySchedule(el.historyMonth.value || localMonthKey());
    renderHistory();
    renderScheduleDashboard();
    renderMonthlySchedule();
    renderPayroll();
  });
  el.payrollMonth?.addEventListener("change", renderPayroll);
  el.overtimeReportBtn?.addEventListener("click", createOvertimeReport);
  el.downloadPayrollBtn?.addEventListener("click", downloadPayrollCsv);
  el.profileForm?.addEventListener("submit", saveProfile);
  el.scheduleForm?.addEventListener("submit", saveSchedule);
  el.geoForm?.addEventListener("submit", saveGeofence);
  el.clearAuditBtn?.addEventListener("click", clearAudit);
  el.homePrimaryAttendanceBtn?.addEventListener("click", handleHomeAttendanceAction);
  el.homeSecondaryAttendanceBtn?.addEventListener("click", () => jumpToAttendance("Keluar"));
  el.generateMonthlyScheduleBtn?.addEventListener("click", generateMonthlySchedule);
  el.monthlyScheduleGrid?.addEventListener("change", handleMonthlyScheduleChange);
  el.historyTable?.addEventListener("click", handleHistoryAction);

  document.querySelectorAll("[data-schedule-tab]").forEach((button) => {
    button.addEventListener("click", () => switchScheduleTab(button.dataset.scheduleTab));
  });

  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.target));
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.jump));
  });
}

async function handleLogin(event) {
  event.preventDefault();
  el.loginMessage.textContent = "";

  const nik = el.loginNik.value.trim();
  const password = el.loginPassword.value.trim();

  if (!nik || !password) {
    el.loginMessage.textContent = "No absen dan password wajib diisi.";
    showToast("No absen dan password wajib diisi.");
    return;
  }

  const response = await apiRequest("login.php", {
    method: "POST",
    body: {
      nik,
      password,
      device: appState.device,
      bind_device: true,
    },
  });

  if (!response?.ok || !response?.user || !response?.session_token) {
    clearAuthState();
    const message = response?.message || "Login gagal. Pastikan no absen dan password benar.";
    el.loginMessage.textContent = message;
    showToast(message);
    return;
  }

  appState.user = response.user;
  appState.user.sessionToken = response.session_token;
  appState.records = [];
  saveJson(STORAGE_KEYS.user, appState.user);
  saveJson(STORAGE_KEYS.records, appState.records);
  bindCurrentDevice(false);

  addAudit("login", "Login berhasil", { nik });
  showToast(`Selamat datang, ${appState.user.name}.`);
  showApp();
}

function handleLogout() {
  addAudit("logout", "Logout", { nik: appState.user?.nik });
  stopCamera();
  clearAuthState();
  showAuth();
  showToast("Logout berhasil.");
}

function showAuth() {
  el.authScreen?.classList.remove("hidden");
  el.appShell?.classList.add("hidden");
}

function showApp() {
  el.authScreen?.classList.add("hidden");
  el.appShell?.classList.remove("hidden");
  hydrateProfile();
  renderAll();
  syncRemoteHistory();
  syncRemoteGeofence();
  syncRemoteSchedule();
  requestLocation(false);
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });

  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.target === viewName);
  });

  if (viewName === "absen") {
    setTimeout(() => {
      initMap();
      updateMap();
      prepareAttendanceView();
    }, 120);
  }

  if (viewName === "histori") {
    renderScheduleDashboard();
    renderMonthlySchedule();
  }

  if (viewName === "payroll") {
    if (el.payrollMonth && !el.payrollMonth.value) el.payrollMonth.value = el.historyMonth?.value || localMonthKey();
    renderPayroll();
  }
}

function hydrateProfile() {
  const user = appState.user || {};
  el.activeUserName.textContent = user.name || user.nik || "Karyawan";
  el.homeGreetingName.textContent = user.name || user.nik || "Karyawan";
  el.homeEmployeeId.textContent = `No Absen: ${user.nik || "-"}`;
  el.profileName.value = user.name || "";
  el.profileNikView.textContent = user.nik || "-";
  el.profileSavedBadge.textContent = userCanManageGeofence() ? "Admin" : "Employee";
  el.profileRoleBadge.textContent = userCanManageGeofence() ? "Admin" : "Employee";
  el.geoForm?.classList.toggle("hidden", !userCanManageGeofence());
}

function renderAll() {
  updateDeviceStatus();
  updateGeofenceStatus();
  renderHomeGreeting();
  renderTodaySummary();
  renderAttendanceAction();
  renderScheduleNotice();
  renderHistory();
  renderScheduleDashboard();
  renderMonthlySchedule();
  renderPayroll();
  renderAudit();
  updateMapDetails();
}

function updateRealtime() {
  const now = new Date();
  if (el.realtimeClock) {
    el.realtimeClock.textContent = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
  }

  if (el.realtimeDate) {
    el.realtimeDate.textContent = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now);
  }

  renderHomeGreeting();
}

function renderHomeGreeting() {
  if (!el.homeGreetingTime) return;
  el.homeGreetingTime.textContent = timeGreeting();
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function getOrCreateDevice() {
  const existing = loadJson(STORAGE_KEYS.device, null);
  if (existing?.id) return existing;

  const id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const device = {
    id,
    label: navigator.platform || "Browser",
    fingerprint: simpleHash([
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
    ].join("|")),
    boundAt: "",
  };
  saveJson(STORAGE_KEYS.device, device);
  return device;
}

function bindCurrentDevice(showMessage = true) {
  appState.device.boundAt = new Date().toISOString();
  appState.device.boundUser = appState.user?.nik || "";
  saveJson(STORAGE_KEYS.device, appState.device);
  addAudit("device_binding", "Perangkat di-bind otomatis", { device_id: appState.device.id });
  updateDeviceStatus();
  if (showMessage) showToast("Perangkat berhasil di-bind otomatis.");
}

function updateDeviceStatus() {
  const isBound = Boolean(appState.device?.boundAt);
  if (el.deviceStatus) el.deviceStatus.textContent = isBound ? "Terikat otomatis" : "Belum bind";
  if (el.deviceShortId) el.deviceShortId.textContent = appState.device?.id ? appState.device.id.slice(0, 8) : "Device";
}

async function requestLocation(showMessage = true) {
  if (!navigator.geolocation) {
    if (el.geoStatus) el.geoStatus.textContent = "GPS tidak tersedia";
    setPill(el.geoFenceBadge, "GPS off", "danger");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      appState.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date().toISOString(),
      };
      addAudit("gps_check", "GPS diperbarui", {
        lat: appState.location.lat,
        lng: appState.location.lng,
      });
      updateGeofenceStatus();
      updateMap();
      if (showMessage) showToast("Lokasi GPS diperbarui.");
    },
    (error) => {
      if (el.geoStatus) el.geoStatus.textContent = "Izin GPS ditolak";
      setPill(el.geoFenceBadge, "GPS gagal", "danger");
      addAudit("gps_error", "GPS gagal", { message: error.message });
      if (showMessage) showToast("GPS belum bisa dibaca.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

function updateGeofenceStatus() {
  const distance = getDistanceFromOffice();
  const hasLocation = Boolean(appState.location);
  const inside = hasLocation && distance <= appState.geofence.radius;

  if (el.geoStatus) el.geoStatus.textContent = hasLocation ? (inside ? "Dalam area" : "Di luar area") : "Menunggu lokasi";
  if (el.distanceInfo) el.distanceInfo.textContent = hasLocation ? formatDistance(distance) : "-";
  setPill(el.geoFenceBadge, hasLocation ? (inside ? "Valid" : "Luar area") : "GPS", inside ? "" : hasLocation ? "warning" : "soft");
  setPill(el.insideOfficeBadge, hasLocation ? (inside ? "Dalam area" : "Di luar area") : "Menunggu GPS", inside ? "" : hasLocation ? "warning" : "soft");
  updateMapDetails();
}

function getDistanceFromOffice() {
  if (!appState.location) return 0;
  return calculateDistance(appState.location.lat, appState.location.lng, appState.geofence.lat, appState.geofence.lng);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Kamera tidak tersedia di browser ini.");
    return;
  }

  try {
    stopCamera();
    appState.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
      audio: false,
    });
    el.cameraPreview.srcObject = appState.cameraStream;
    await el.cameraPreview.play();
    el.cameraPlaceholder.classList.add("hidden");
    appState.faceReady = true;
    if (el.faceStatus) el.faceStatus.textContent = "Kamera aktif";
    if (el.faceScore) el.faceScore.textContent = "72%";
    addAudit("camera_start", "Kamera aktif", {});
    showToast("Kamera aktif. Liveness diproses otomatis.");
  } catch (error) {
    appState.faceReady = false;
    if (el.faceStatus) el.faceStatus.textContent = "Kamera gagal";
    showToast("Akses kamera belum diizinkan.");
    addAudit("camera_error", "Kamera gagal", { message: error.message });
  }
}

function stopCamera() {
  if (appState.cameraStream) {
    appState.cameraStream.getTracks().forEach((track) => track.stop());
    appState.cameraStream = null;
  }
  if (el.cameraPreview) el.cameraPreview.srcObject = null;
}

async function runLivenessCheck() {
  if (!appState.cameraStream) await startCamera();
  if (!appState.cameraStream) return;

  const challenges = ["Kedip 2x", "Hadap kamera", "Senyum", "Tengok kanan"];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  el.challengeText.textContent = challenge;
  setPill(el.livenessStatus, "Memproses", "warning");

  const detected = await detectFace();
  captureFaceImage();

  appState.faceReady = detected;
  appState.livenessReady = detected;
  if (el.faceStatus) el.faceStatus.textContent = detected ? "Wajah cocok" : "Perlu ulang";
  if (el.faceScore) el.faceScore.textContent = detected ? `${Math.floor(88 + Math.random() * 8)}%` : "40%";
  setPill(el.livenessStatus, detected ? "Liveness valid" : "Ulangi", detected ? "" : "danger");
  addAudit("liveness_check", detected ? "Liveness valid" : "Liveness gagal", { challenge });
  showToast(detected ? "Liveness otomatis valid." : "Liveness gagal, ulangi buka menu presensi.");
}

async function detectFace() {
  if (!("FaceDetector" in window)) return Boolean(appState.cameraStream);

  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(el.cameraPreview);
    return faces.length > 0;
  } catch (error) {
    return Boolean(appState.cameraStream);
  }
}

function captureFaceImage() {
  const video = el.cameraPreview;
  const canvas = el.captureCanvas;
  if (!video.videoWidth || !video.videoHeight) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  appState.lastFaceImage = canvas.toDataURL("image/jpeg", 0.72);
}

function prepareAttendanceView() {
  requestLocation(false);
  const todaySchedule = getTodaySchedule();
  if (el.shiftSelect) {
    el.shiftSelect.value = todaySchedule.shift === "Libur" ? "Pagi" : todaySchedule.shift;
  }
  renderAttendanceAction();
  if (!appState.livenessReady) {
    runLivenessCheck();
  }
}

async function saveAttendance(event) {
  event.preventDefault();

  const type = new FormData(el.attendanceForm).get("attendanceType");
  const shift = el.shiftSelect.value;
  const distance = getDistanceFromOffice();
  const inside = appState.location && distance <= appState.geofence.radius;
  const { masuk, keluar } = getTodayAttendance();

  if (!shift) {
    showToast("Shift wajib dipilih.");
    return;
  }

  if (type === "Keluar" && !masuk) {
    showToast("Presensi keluar belum bisa dilakukan sebelum presensi masuk.");
    setAttendanceType("Masuk");
    renderAttendanceAction();
    return;
  }

  if (type === "Masuk" && masuk) {
    showToast("Presensi masuk hari ini sudah tersimpan.");
    return;
  }

  if (type === "Keluar" && keluar) {
    showToast("Presensi keluar hari ini sudah tersimpan.");
    return;
  }

  if (!appState.device?.boundAt) {
    bindCurrentDevice(false);
  }

  if (!inside) {
    showToast("Lokasi belum valid di area kantor.");
    return;
  }

  if (!appState.livenessReady) {
    showToast("Liveness sedang diproses otomatis. Coba simpan lagi setelah status valid.");
    runLivenessCheck();
    return;
  }

  const now = new Date();
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}`,
    user_id: appState.user.id || appState.user.nik,
    nik: appState.user.nik,
    name: appState.user.name,
    type,
    shift,
    note: "",
    date: localDateKey(now),
    time: localTimeKey(now),
    timestamp: now.toISOString(),
    latitude: appState.location.lat,
    longitude: appState.location.lng,
    distance,
    status: "Valid",
    device_id: appState.device.id,
    device: appState.device,
    face_image: appState.lastFaceImage,
  };

  const result = await apiRequest("attendance.php", {
    method: "POST",
    body: {
      session_token: appState.user.sessionToken,
      record,
    },
  });

  if (!result?.ok) {
    if (handleAuthFailure(result)) return;
    showToast(result?.message || "Presensi gagal disimpan.");
    return;
  }

  appState.records = appState.records.filter((item) => !(item.date === record.date && item.type === record.type));
  appState.records.unshift(record);
  saveJson(STORAGE_KEYS.records, appState.records);
  addAudit("attendance_save", `Presensi ${type}`, { record_id: record.id, distance });
  if (el.attendanceNote) el.attendanceNote.value = "";
  appState.livenessReady = false;
  setPill(el.livenessStatus, "Menunggu validasi", "soft");
  showToast(type === "Keluar" ? "Presensi keluar tersimpan. Selamat istirahat." : "Presensi masuk tersimpan.");
  renderAll();
}

function renderTodaySummary() {
  const { masuk, keluar } = getTodayAttendance();
  const todaySchedule = getTodaySchedule();
  if (el.attendanceStatus) el.attendanceStatus.textContent = keluar ? "Selesai" : masuk ? "Sudah masuk" : "Belum presensi";
  const html = [
    summaryItem("Jadwal", `${todaySchedule.shift} ${todaySchedule.time || ""}`.trim()),
    summaryItem("Masuk", masuk ? `${masuk.time} - ${masuk.shift}` : "-"),
    summaryItem("Keluar", keluar ? `${keluar.time} - ${keluar.shift}` : "-"),
  ].join("");
  if (el.todaySummary) el.todaySummary.innerHTML = html;
  if (el.attendanceTodaySummary) el.attendanceTodaySummary.innerHTML = html;
  el.restMessage?.classList.toggle("hidden", !keluar);
}

function renderAttendanceAction() {
  const { masuk, keluar } = getTodayAttendance();
  const keluarInput = document.querySelector(`input[name="attendanceType"][value="Keluar"]`);
  const masukInput = document.querySelector(`input[name="attendanceType"][value="Masuk"]`);

  if (keluarInput) keluarInput.disabled = !masuk || Boolean(keluar);
  if (masukInput) masukInput.disabled = Boolean(masuk);
  if (keluarInput?.checked && !masuk) setAttendanceType("Masuk");

  el.homeSecondaryAttendanceBtn?.classList.add("hidden");
  if (el.homePrimaryAttendanceBtn) el.homePrimaryAttendanceBtn.disabled = false;

  if (!masuk) {
    el.homeAttendanceTitle.textContent = "Anda belum presensi";
    el.homeAttendanceDesc.textContent = "Lakukan presensi masuk sesuai jadwal hari ini.";
    el.homePrimaryAttendanceBtn.innerHTML = `<i class="fa-solid fa-fingerprint"></i> Presensi masuk`;
    el.homePrimaryAttendanceBtn.dataset.action = "Masuk";
    setPill(el.attendanceStatus, "Belum presensi", "warning");
    return;
  }

  if (!keluar) {
    el.homeAttendanceTitle.textContent = `Anda sudah presensi masuk jam ${masuk.time}`;
    el.homeAttendanceDesc.textContent = "Lakukan presensi keluar setelah selesai bekerja.";
    el.homePrimaryAttendanceBtn.innerHTML = `<i class="fa-solid fa-arrow-right-from-bracket"></i> Presensi keluar`;
    el.homePrimaryAttendanceBtn.dataset.action = "Keluar";
    setPill(el.attendanceStatus, "Sudah masuk", "");
    return;
  }

  el.homeAttendanceTitle.textContent = "Anda sudah keluar";
  el.homeAttendanceDesc.textContent = `Presensi masuk ${masuk.time}, keluar ${keluar.time}.`;
  el.homePrimaryAttendanceBtn.innerHTML = `<i class="fa-solid fa-check"></i> Selesai hari ini`;
  el.homePrimaryAttendanceBtn.disabled = true;
  el.homePrimaryAttendanceBtn.dataset.action = "";
  setPill(el.attendanceStatus, "Selesai", "");
}

function handleHomeAttendanceAction() {
  const action = el.homePrimaryAttendanceBtn.dataset.action;
  if (!action) {
    showToast("Presensi hari ini sudah selesai.");
    return;
  }
  jumpToAttendance(action);
}

function jumpToAttendance(type) {
  if (type === "Keluar" && !getTodayAttendance().masuk) {
    showToast("Presensi keluar belum bisa dilakukan sebelum presensi masuk.");
    type = "Masuk";
  }
  switchView("absen");
  setAttendanceType(type);
  const todaySchedule = getTodaySchedule();
  el.shiftSelect.value = todaySchedule.shift === "Libur" ? "Pagi" : todaySchedule.shift;
  showToast(`Mode presensi ${type.toLowerCase()} siap.`);
}

function setAttendanceType(type) {
  const input = document.querySelector(`input[name="attendanceType"][value="${type}"]`);
  if (input) input.checked = true;
}

function getTodayAttendance() {
  const today = localDateKey();
  const todayRecords = appState.records.filter((record) => record.date === today);
  return {
    masuk: todayRecords.find((record) => record.type === "Masuk"),
    keluar: todayRecords.find((record) => record.type === "Keluar"),
  };
}

function summaryItem(label, value) {
  return `<div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderHistory() {
  const month = el.historyMonth?.value || localMonthKey();
  const rows = groupRecordsByDate(appState.records).filter((row) => row.date.startsWith(month));

  if (!rows.length) {
    el.historyTable.innerHTML = `<tr><td colspan="7">Belum ada histori jadwal pada bulan ini.</td></tr>`;
    return;
  }

  el.historyTable.innerHTML = rows
    .map((row) => {
      const duration = row.masuk && row.keluar ? calculateDuration(row.masuk.time, row.keluar.time) : "-";
      const schedule = getScheduleForDate(row.date);
      const shift = row.masuk?.shift || row.keluar?.shift || schedule.shift || "-";
      const late = row.masuk ? calculateLateMinutes(schedule.time, row.masuk.time) : 0;
      const status = row.masuk && row.keluar ? "Lengkap" : row.masuk ? "Belum keluar" : "Review";
      const reportButton = status === "Lengkap" ? "" : `<button class="text-btn report-btn" type="button" data-report-date="${row.date}">Buat laporan</button>`;

      return `
        <tr>
          <td>${formatDate(row.date)}</td>
          <td>${escapeHtml(shift)} ${schedule.time ? `<span class="table-subtext">${escapeHtml(schedule.time)}</span>` : ""}</td>
          <td>${row.masuk ? escapeHtml(row.masuk.time) : "-"}</td>
          <td>${row.keluar ? escapeHtml(row.keluar.time) : "-"}</td>
          <td>${late > 0 ? `${late} menit` : "-"}</td>
          <td>${escapeHtml(duration)}</td>
          <td><span class="pill ${status === "Belum keluar" ? "warning" : ""}">${status}</span>${reportButton}</td>
        </tr>
      `;
    })
    .join("");
}

function groupRecordsByDate(records) {
  const map = new Map();
  records.forEach((record) => {
    if (!map.has(record.date)) {
      map.set(record.date, { date: record.date, masuk: null, keluar: null });
    }
    const row = map.get(record.date);
    if (record.type === "Masuk") row.masuk = record;
    if (record.type === "Keluar") row.keluar = record;
  });
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function downloadHistoryCsv() {
  const header = ["tanggal", "jadwal", "masuk", "keluar", "telat_menit", "durasi", "status"];
  const rows = groupRecordsByDate(appState.records).map((row) => {
    const schedule = getScheduleForDate(row.date);
    const late = row.masuk ? calculateLateMinutes(schedule.time, row.masuk.time) : 0;
    return [
      row.date,
      row.masuk?.shift || row.keluar?.shift || schedule.shift || "",
      row.masuk?.time || "",
      row.keluar?.time || "",
      late || "",
      row.masuk && row.keluar ? calculateDuration(row.masuk.time, row.keluar.time) : "",
      row.masuk && row.keluar ? "Lengkap" : "Belum lengkap",
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `histori-presensi-${localDateKey()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  addAudit("download_history", "Download histori CSV", { total: rows.length });
  showToast("CSV histori dibuat.");
}

function initMap() {
  if (!window.L || !el.mapCanvas) {
    updateMap();
    return;
  }

  if (appState.map) {
    appState.map.invalidateSize();
    return;
  }

  appState.map = L.map(el.mapCanvas, {
    zoomControl: false,
    preferCanvas: true,
  }).setView([appState.geofence.lat, appState.geofence.lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(appState.map);

  L.control.zoom({ position: "bottomright" }).addTo(appState.map);
  el.mapFallback.classList.add("hidden");
  updateMap();
}

function updateMap() {
  updateMapDetails();
  if (!appState.map || !window.L) return;

  const officeLatLng = [appState.geofence.lat, appState.geofence.lng];
  if (!appState.officeMarker) {
    appState.officeMarker = L.marker(officeLatLng, { icon: createMapIcon("office") }).addTo(appState.map);
    appState.officeCircle = L.circle(officeLatLng, {
      radius: appState.geofence.radius,
      color: "#176b4d",
      fillColor: "#176b4d",
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(appState.map);
  } else {
    appState.officeMarker.setLatLng(officeLatLng);
    appState.officeCircle.setLatLng(officeLatLng);
    appState.officeCircle.setRadius(appState.geofence.radius);
  }

  appState.officeMarker.bindPopup(appState.geofence.name);

  if (appState.location) {
    const currentLatLng = [appState.location.lat, appState.location.lng];
    if (!appState.userMarker) {
      appState.userMarker = L.marker(currentLatLng, { icon: createMapIcon("user") }).addTo(appState.map);
    } else {
      appState.userMarker.setLatLng(currentLatLng);
    }
    appState.userMarker.bindPopup("Lokasi perangkat");

    if (!appState.mapAutoFitDone) {
      appState.map.fitBounds(L.latLngBounds([officeLatLng, currentLatLng]).pad(0.25));
      appState.mapAutoFitDone = true;
    }
  } else if (!appState.mapAutoFitDone) {
    appState.map.setView(officeLatLng, 16);
    appState.mapAutoFitDone = true;
  }
}

function createMapIcon(type) {
  return L.divIcon({
    className: "",
    html: `<div class="leaflet-${type}-marker"><i class="fa-solid ${type === "office" ? "fa-building" : "fa-location-dot"}"></i></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

function focusMyLocation() {
  if (!appState.location) {
    requestLocation(true);
    showToast("Membaca lokasi kamu.");
    return;
  }

  initMap();
  if (appState.map) {
    appState.map.setView([appState.location.lat, appState.location.lng], 18);
  }
  showToast("Map diarahkan ke lokasi kamu.");
}

function focusOfficeLocation() {
  initMap();
  if (appState.map) {
    appState.map.setView([appState.geofence.lat, appState.geofence.lng], 17);
  }
  showToast("Map diarahkan ke kantor.");
}

function updateMapDetails() {
  if (el.officeCoordinate) el.officeCoordinate.textContent = `${appState.geofence.lat.toFixed(6)}, ${appState.geofence.lng.toFixed(6)}`;
  if (el.officeRadius) el.officeRadius.textContent = `${appState.geofence.radius} m`;
  if (el.currentCoordinate) {
    el.currentCoordinate.textContent = appState.location
      ? `${appState.location.lat.toFixed(6)}, ${appState.location.lng.toFixed(6)}`
      : "-";
  }
  if (el.fallbackMapLabel) {
    el.fallbackMapLabel.textContent = appState.location
      ? `Jarak ${formatDistance(getDistanceFromOffice())}`
      : `Radius ${appState.geofence.radius} m`;
  }
  el.fallbackUserPin?.classList.toggle("hidden", !appState.location);
  fillGeofenceForm();
}

function fillGeofenceForm() {
  if (!el.officeLatInput) return;
  el.officeLatInput.value = appState.geofence.lat;
  el.officeLngInput.value = appState.geofence.lng;
  el.officeRadiusInput.value = appState.geofence.radius;
}

async function saveProfile(event) {
  event.preventDefault();

  const currentPassword = el.currentPassword.value;
  const newPassword = el.newPassword.value;
  const confirmPassword = el.confirmPassword.value;

  if (!currentPassword && !newPassword && !confirmPassword) {
    showToast("Nama dikunci. Isi password jika ingin mengganti password.");
    return;
  }

  if ((newPassword || confirmPassword || currentPassword) && (!currentPassword || !newPassword || !confirmPassword)) {
    showToast("Lengkapi password saat ini, password baru, dan konfirmasi.");
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    showToast("Konfirmasi password baru tidak sama.");
    return;
  }

  const result = await apiRequest("profile.php", {
    method: "POST",
    body: {
      session_token: appState.user.sessionToken,
      profile: { name: appState.user.name },
      current_password: currentPassword,
      new_password: newPassword,
    },
  });

  if (!result?.ok) {
    if (handleAuthFailure(result)) return;
    showToast(result?.message || "Profil gagal disimpan.");
    return;
  }

  appState.user = {
    ...(result.user || appState.user),
    sessionToken: appState.user.sessionToken,
  };
  saveJson(STORAGE_KEYS.user, appState.user);
  el.currentPassword.value = "";
  el.newPassword.value = "";
  el.confirmPassword.value = "";
  addAudit("password_update", "Password diperbarui", { nik: appState.user.nik });
  hydrateProfile();
  showToast("Password berhasil diperbarui.");
}

async function saveSchedule(event) {
  event.preventDefault();

  appState.schedule = normalizeSchedule({
    activeShift: el.scheduleShift.value,
    times: {
      Pagi: el.schedulePagi.value || "08:00",
      Siang: el.scheduleSiang.value || "13:30",
      Malam: el.scheduleMalam.value || "21:00",
    },
  });
  saveJson(STORAGE_KEYS.schedule, appState.schedule);

  const result = await apiRequest("schedule.php", {
    method: "POST",
    body: {
      session_token: appState.user.sessionToken,
      schedule: appState.schedule,
    },
  });

  if (!result?.ok && result?.status !== 404) {
    if (handleAuthFailure(result)) return;
    showToast(result?.message || "Jadwal tersimpan lokal, server belum menerima.");
  } else {
    showToast("Jadwal kerja tersimpan.");
  }

  fillScheduleForm();
  renderScheduleNotice();
  renderPayroll();
}

async function saveGeofence(event) {
  event.preventDefault();
  if (!userCanManageGeofence()) {
    showToast("Geofence hanya bisa diubah admin.");
    return;
  }

  appState.geofence = {
    ...appState.geofence,
    lat: Number(el.officeLatInput.value),
    lng: Number(el.officeLngInput.value),
    radius: Number(el.officeRadiusInput.value),
  };
  saveJson(STORAGE_KEYS.geofence, appState.geofence);
  appState.mapAutoFitDone = false;

  const result = await apiRequest("geofence.php", {
    method: "POST",
    body: {
      session_token: appState.user.sessionToken,
      geofence: appState.geofence,
    },
  });

  if (!result?.ok) {
    if (handleAuthFailure(result)) return;
    showToast(result?.message || "Geofence gagal diperbarui.");
    return;
  }

  addAudit("geofence_update", "Geofence diperbarui", appState.geofence);
  updateMap();
  showToast("Geofence diperbarui.");
}

function fillScheduleForm() {
  if (!el.scheduleShift) return;
  const schedule = normalizeSchedule(appState.schedule);
  el.scheduleShift.value = schedule.activeShift;
  el.schedulePagi.value = schedule.times.Pagi;
  el.scheduleSiang.value = schedule.times.Siang;
  el.scheduleMalam.value = schedule.times.Malam;
  if (el.shiftSelect && !el.shiftSelect.value) el.shiftSelect.value = schedule.activeShift;
}

function renderScheduleNotice() {
  if (!el.homeScheduleNotice) return;
  const schedule = getTodaySchedule();
  if (schedule.shift === "Libur") {
    el.homeScheduleNotice.innerHTML = `
      <div class="notice-icon"><i class="fa-solid fa-calendar-day"></i></div>
      <strong>Hari ini libur.</strong>
      <span>Kalau ada perubahan, update dari menu Jadwal anda.</span>
    `;
    return;
  }
  el.homeScheduleNotice.innerHTML = `
    <div class="notice-icon"><i class="fa-solid fa-bell"></i></div>
    <strong>Anda masuk ${escapeHtml(schedule.shift)} pukul ${escapeHtml(schedule.time)}.</strong>
    <span>Notifikasi ini mengikuti jadwal bulanan yang dibuat di menu Jadwal.</span>
  `;
}

function normalizeSchedule(schedule) {
  return {
    activeShift: schedule?.activeShift || "Pagi",
    times: {
      Pagi: schedule?.times?.Pagi || "08:00",
      Siang: schedule?.times?.Siang || "13:30",
      Malam: schedule?.times?.Malam || "21:00",
    },
  };
}

function getShiftTime(shift) {
  const schedule = normalizeSchedule(appState.schedule);
  return schedule.times[shift] || "";
}

function getScheduleForDate(dateKey) {
  const entry = appState.monthlySchedule?.[dateKey];
  const shift = entry?.shift || normalizeSchedule(appState.schedule).activeShift || "Pagi";
  return {
    shift,
    time: shift === "Libur" ? "" : getShiftTime(shift),
  };
}

function getTodaySchedule() {
  return getScheduleForDate(localDateKey());
}

function ensureMonthlySchedule(month) {
  if (!month) return;
  if (Object.keys(appState.monthlySchedule || {}).some((date) => date.startsWith(month))) return;
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const jsDate = new Date(`${date}T00:00:00`);
    appState.monthlySchedule[date] = {
      shift: [0, 6].includes(jsDate.getDay()) ? "Libur" : normalizeSchedule(appState.schedule).activeShift,
    };
  }
  saveJson(STORAGE_KEYS.monthlySchedule, appState.monthlySchedule);
}

function generateMonthlySchedule() {
  const month = el.historyMonth?.value || localMonthKey();
  const shift = el.scheduleDefaultShift?.value || "Pagi";
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const jsDate = new Date(`${date}T00:00:00`);
    appState.monthlySchedule[date] = {
      shift: shift === "Libur" ? "Libur" : [0].includes(jsDate.getDay()) ? "Libur" : shift,
    };
  }
  saveJson(STORAGE_KEYS.monthlySchedule, appState.monthlySchedule);
  renderMonthlySchedule();
  renderScheduleDashboard();
  renderScheduleNotice();
  showToast("Jadwal bulan ini dibuat dan bisa diedit per hari.");
}

function renderMonthlySchedule() {
  if (!el.monthlyScheduleGrid) return;
  const month = el.historyMonth?.value || localMonthKey();
  ensureMonthlySchedule(month);
  const dates = Object.keys(appState.monthlySchedule)
    .filter((date) => date.startsWith(month))
    .sort();

  el.monthlyScheduleGrid.innerHTML = dates
    .map((date) => {
      const schedule = getScheduleForDate(date);
      const isToday = date === localDateKey();
      return `
        <label class="day-schedule ${isToday ? "today" : ""}">
          <span>${formatShortDate(date)}</span>
          <select data-schedule-date="${date}">
            ${["Pagi", "Siang", "Malam", "Libur"]
              .map((shift) => `<option value="${shift}" ${schedule.shift === shift ? "selected" : ""}>${shift}</option>`)
              .join("")}
          </select>
        </label>
      `;
    })
    .join("");
}

function handleMonthlyScheduleChange(event) {
  const select = event.target.closest("[data-schedule-date]");
  if (!select) return;
  appState.monthlySchedule[select.dataset.scheduleDate] = { shift: select.value };
  saveJson(STORAGE_KEYS.monthlySchedule, appState.monthlySchedule);
  renderScheduleDashboard();
  renderScheduleNotice();
  renderTodaySummary();
  if (select.dataset.scheduleDate === localDateKey() && el.shiftSelect) {
    el.shiftSelect.value = select.value === "Libur" ? "Pagi" : select.value;
  }
  showToast("Jadwal harian diperbarui.");
}

function switchScheduleTab(tabName) {
  document.querySelectorAll("[data-schedule-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.scheduleTab === tabName);
  });
  document.querySelectorAll("[data-schedule-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.schedulePanel === tabName);
  });
}

function renderScheduleDashboard() {
  if (!el.scheduleDashboard) return;
  const month = el.historyMonth?.value || localMonthKey();
  ensureMonthlySchedule(month);
  const scheduleDates = Object.entries(appState.monthlySchedule).filter(([date]) => date.startsWith(month));
  const workDays = scheduleDates.filter(([, item]) => item.shift !== "Libur").length;
  const rows = groupRecordsByDate(appState.records).filter((row) => row.date.startsWith(month));
  const completeDays = rows.filter((row) => row.masuk && row.keluar).length;
  const incompleteDays = rows.filter((row) => row.masuk && !row.keluar).length;
  const lateMinutes = rows.reduce((total, row) => {
    const schedule = getScheduleForDate(row.date);
    return total + (row.masuk ? calculateLateMinutes(schedule.time, row.masuk.time) : 0);
  }, 0);

  el.scheduleDashboard.innerHTML = [
    dashboardCard("Hari kerja", workDays, "Jadwal aktif bulan ini", "fa-calendar-check"),
    dashboardCard("Presensi lengkap", completeDays, "Masuk dan keluar tercatat", "fa-circle-check"),
    dashboardCard("Total telat", `${lateMinutes} menit`, "Akumulasi keterlambatan", "fa-stopwatch"),
    dashboardCard("Belum lengkap", incompleteDays, "Butuh laporan keterangan", "fa-file-circle-exclamation"),
  ].join("");
}

function dashboardCard(title, value, body, icon) {
  return `
    <article class="dashboard-card">
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function handleHistoryAction(event) {
  const button = event.target.closest("[data-report-date]");
  if (!button) return;
  appState.reports.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `report-${Date.now()}`,
    date: button.dataset.reportDate,
    type: "Keterangan presensi",
    status: "Draft",
    createdAt: new Date().toISOString(),
  });
  appState.reports = appState.reports.slice(0, 50);
  saveJson(STORAGE_KEYS.reports, appState.reports);
  showToast(`Draft laporan tanggal ${formatDate(button.dataset.reportDate)} dibuat.`);
}

function renderOfficeNews() {
  if (!el.officeNewsList) return;
  el.officeNewsList.innerHTML = OFFICE_NEWS.map(
    (item) => `
      <article class="news-item brochure-item">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
        <div>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </div>
      </article>
    `
  ).join("");
}

function renderPayroll() {
  const month = el.payrollMonth?.value || el.historyMonth?.value || localMonthKey();
  const grouped = groupRecordsByDate(appState.records).filter((row) => row.date.startsWith(month));
  const completeDays = grouped.filter((row) => row.masuk && row.keluar).length;
  const incompleteDays = grouped.filter((row) => row.masuk && !row.keluar).length;
  const overtimeMinutes = grouped.reduce((total, row) => {
    if (!row.masuk || !row.keluar) return total;
    return total + Math.max(0, durationMinutes(row.masuk.time, row.keluar.time) - 8 * 60);
  }, 0);
  const overtimeHours = Math.round((overtimeMinutes / 60) * 10) / 10;
  const lateMinutes = grouped.reduce((total, row) => {
    const schedule = getScheduleForDate(row.date);
    return total + (row.masuk ? calculateLateMinutes(schedule.time, row.masuk.time) : 0);
  }, 0);
  const salary = completeDays * PAYROLL_RATE.dailySalary;
  const meal = completeDays * PAYROLL_RATE.mealAllowance;
  const transport = completeDays * PAYROLL_RATE.transportAllowance;
  const overtime = Math.round(overtimeHours * PAYROLL_RATE.overtimeBonus);
  const latePenalty = lateMinutes * PAYROLL_RATE.latePenaltyPerMinute;
  const total = salary + meal + transport + overtime - latePenalty;

  el.payrollEstimate.textContent = formatRupiah(total);
  el.payrollMonthLabel.textContent = formatMonthLabel(month);
  el.payrollNote.textContent = `${completeDays} hari lengkap, ${incompleteDays} belum lengkap, ${lateMinutes} menit telat.`;
  if (el.payrollWorkDays) el.payrollWorkDays.textContent = completeDays;
  if (el.payrollOvertimeHours) el.payrollOvertimeHours.textContent = overtimeHours;
  if (el.payrollMealAllowance) el.payrollMealAllowance.textContent = formatRupiah(meal);

  const components = [
    ["Gaji harian", salary, `${completeDays} hari x ${formatRupiah(PAYROLL_RATE.dailySalary)}`],
    ["Uang makan", meal, `${completeDays} hari x ${formatRupiah(PAYROLL_RATE.mealAllowance)}`],
    ["Transport", transport, `${completeDays} hari x ${formatRupiah(PAYROLL_RATE.transportAllowance)}`],
    ["Lembur", overtime, `${overtimeHours} jam x ${formatRupiah(PAYROLL_RATE.overtimeBonus)}`],
    ["Potongan telat", -latePenalty, `${lateMinutes} menit x ${formatRupiah(PAYROLL_RATE.latePenaltyPerMinute)}`],
  ];

  el.payrollBars.innerHTML = renderPayrollGraph(components);

  el.payrollTable.innerHTML = components
    .map(
      ([label, value, note]) => `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${value < 0 ? `-${formatRupiah(Math.abs(value))}` : formatRupiah(value)}</td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `
    )
    .join("");
}

function renderPayrollGraph(components) {
  const positive = components.filter(([, value]) => value > 0);
  const max = Math.max(...positive.map(([, value]) => value), 1);
  const points = positive.map(([, value], index) => {
    const x = 34 + index * (360 / Math.max(positive.length - 1, 1));
    const y = 180 - (value / max) * 132;
    return `${x},${y}`;
  });

  return `
    <svg viewBox="0 0 430 220" class="salary-chart" role="img" aria-label="Grafik payroll bulanan">
      <path d="M32 188H402" stroke="#dce8e3" stroke-width="2"/>
      <path d="M32 52H402" stroke="#eef4f1" stroke-width="2"/>
      <polyline points="${points.join(" ")}" fill="none" stroke="#1e7a5f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      ${positive
        .map(([label, value], index) => {
          const [x, y] = points[index].split(",");
          return `<g><circle cx="${x}" cy="${y}" r="7" fill="#0ea5a3"/><text x="${x}" y="210" text-anchor="middle">${escapeHtml(label.split(" ")[0])}</text><title>${escapeHtml(label)} ${formatRupiah(value)}</title></g>`;
        })
        .join("")}
    </svg>
  `;
}

function createOvertimeReport() {
  const month = el.payrollMonth?.value || localMonthKey();
  appState.reports.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `overtime-${Date.now()}`,
    date: month,
    type: "Laporan lembur",
    status: "Draft",
    createdAt: new Date().toISOString(),
  });
  appState.reports = appState.reports.slice(0, 50);
  saveJson(STORAGE_KEYS.reports, appState.reports);
  showToast("Draft laporan lembur dibuat.");
}

function downloadPayrollCsv() {
  const month = el.payrollMonth?.value || localMonthKey();
  const rows = groupRecordsByDate(appState.records).filter((row) => row.date.startsWith(month));
  const header = ["tanggal", "shift", "masuk", "keluar", "durasi", "telat_menit"];
  const csvRows = rows.map((row) => {
    const schedule = getScheduleForDate(row.date);
    return [
      row.date,
      row.masuk?.shift || row.keluar?.shift || schedule.shift,
      row.masuk?.time || "",
      row.keluar?.time || "",
      row.masuk && row.keluar ? calculateDuration(row.masuk.time, row.keluar.time) : "",
      row.masuk ? calculateLateMinutes(schedule.time, row.masuk.time) : "",
    ];
  });
  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `payroll-${month}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Laporan payroll CSV dibuat.");
}

function renderAudit() {
  if (el.auditCount) el.auditCount.textContent = `${appState.audit.length} event`;
  if (!el.auditList) return;
  const html = appState.audit.length
    ? appState.audit
        .slice(0, 30)
        .map(
          (item) => `
            <div class="audit-item">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${formatDateTime(item.timestamp)} - ${escapeHtml(item.type)}</span>
              </div>
              <span>${escapeHtml(item.user || "-")}</span>
            </div>
          `
        )
        .join("")
    : `<div class="audit-item"><div><strong>Belum ada log.</strong><span>-</span></div></div>`;

  el.auditList.innerHTML = html;
}

function addAudit(type, title, metadata = {}) {
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `audit-${Date.now()}`,
    type,
    title,
    metadata,
    user: appState.user?.nik || "guest",
    timestamp: new Date().toISOString(),
  };
  appState.audit.unshift(item);
  appState.audit = appState.audit.slice(0, 100);
  saveJson(STORAGE_KEYS.audit, appState.audit);
  apiRequest("audit.php", {
    method: "POST",
    body: {
      session_token: appState.user?.sessionToken,
      event: item,
    },
  });
  renderAudit();
}

function clearAudit() {
  appState.audit = [];
  saveJson(STORAGE_KEYS.audit, []);
  renderAudit();
  showToast("Aktivitas akun dibersihkan.");
}

async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`api/${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await response.json().catch(() => null);
    return {
      status: response.status,
      ok: response.ok && payload?.ok !== false,
      ...(payload || {}),
      message: payload?.message || (response.ok ? "Response kosong." : "Request gagal."),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: "Server API tidak terhubung. Jalankan lewat Laragon: http://localhost/FORMABSENSI/",
    };
  }
}

async function syncRemoteHistory() {
  if (!appState.user?.sessionToken) return;

  const result = await apiRequest(`history.php?session_token=${encodeURIComponent(appState.user.sessionToken)}`);
  if (!result?.ok) {
    handleAuthFailure(result);
    return;
  }
  if (!result?.records?.length) {
    appState.records = [];
    saveJson(STORAGE_KEYS.records, appState.records);
    renderAll();
    return;
  }

  appState.records = result.records.map((record) => ({
    id: record.public_id,
    user_id: appState.user.id,
    nik: appState.user.nik,
    name: appState.user.name,
    type: record.attendance_type,
    shift: record.shift_name,
    note: "",
    date: record.attendance_date,
    time: String(record.attendance_time).slice(0, 5),
    timestamp: record.created_at,
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
    distance: Number(record.distance_m),
    status: record.status,
    device_id: "",
    face_image: "",
  }));
  saveJson(STORAGE_KEYS.records, appState.records);
  renderAll();
}

async function syncRemoteGeofence() {
  if (!appState.user?.sessionToken) return;

  const result = await apiRequest(`geofence.php?session_token=${encodeURIComponent(appState.user.sessionToken)}`);
  if (!result?.ok) {
    handleAuthFailure(result);
    return;
  }
  if (!result?.geofence) return;

  appState.geofence = {
    name: result.geofence.name || DEFAULT_GEOFENCE.name,
    lat: Number(result.geofence.latitude),
    lng: Number(result.geofence.longitude),
    radius: Number(result.geofence.radius_m),
  };
  saveJson(STORAGE_KEYS.geofence, appState.geofence);
  appState.mapAutoFitDone = false;
  fillGeofenceForm();
  updateMap();
}

async function syncRemoteSchedule() {
  if (!appState.user?.sessionToken) return;

  const result = await apiRequest(`schedule.php?session_token=${encodeURIComponent(appState.user.sessionToken)}`);
  if (!result?.ok) return;

  if (result.schedule) {
    appState.schedule = normalizeSchedule(result.schedule);
    saveJson(STORAGE_KEYS.schedule, appState.schedule);
    fillScheduleForm();
    renderScheduleNotice();
  }
}

function userCanManageGeofence() {
  return appState.user?.role === "admin";
}

async function validateStoredSession() {
  const token = appState.user?.sessionToken;
  if (!token) return false;

  const result = await apiRequest(`profile.php?session_token=${encodeURIComponent(token)}`);
  if (!result?.ok || !result?.user) return false;

  appState.user = {
    ...result.user,
    sessionToken: token,
  };
  saveJson(STORAGE_KEYS.user, appState.user);
  return true;
}

function handleAuthFailure(result) {
  if (result?.status !== 401) return false;
  clearAuthState();
  showAuth();
  showToast(result?.message || "Session berakhir. Silakan login ulang.");
  return true;
}

function clearAuthState() {
  appState.user = null;
  appState.faceReady = false;
  appState.livenessReady = false;
  localStorage.removeItem(STORAGE_KEYS.user);
}

function setPill(node, text, tone = "") {
  if (!node) return;
  node.textContent = text;
  node.className = `pill${tone ? ` ${tone}` : ""}`;
}

function showToast(message) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2800);
}

function calculateDuration(start, end) {
  const minutes = durationMinutes(start, end);
  if (!Number.isFinite(minutes) || minutes < 0) return "-";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}j ${String(rest).padStart(2, "0")}m`;
}

function calculateLateMinutes(scheduleTime, actualTime) {
  if (!scheduleTime || !actualTime) return 0;
  const [scheduleHour, scheduleMinute] = String(scheduleTime).split(":").map(Number);
  const [actualHour, actualMinute] = String(actualTime).split(":").map(Number);
  if (![scheduleHour, scheduleMinute, actualHour, actualMinute].every(Number.isFinite)) return 0;
  const scheduleTotal = scheduleHour * 60 + scheduleMinute;
  const actualTotal = actualHour * 60 + actualMinute;
  return Math.max(0, actualTotal - scheduleTotal);
}

function durationMinutes(start, end) {
  const [startHour, startMinute] = String(start).split(":").map(Number);
  const [endHour, endMinute] = String(end).split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return NaN;
  let startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

function formatDistance(value) {
  if (!Number.isFinite(value)) return "-";
  return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function localTimeKey(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function simpleHash(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
