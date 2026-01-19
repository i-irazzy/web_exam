const API_KEY = "c6fb517a-1fe1-48fb-921d-c9330f21f4a5";
const BASE_URL = "http://exam-api-courses.std-900.ist.mospolytech.ru/api";

let allCourses = [];
let filteredCourses = [];
let currentPage = 1;
const recordsPerPage = 5;
let selectedCourse = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchCourses();

  const searchForm = document.getElementById("course-search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      currentPage = 1;
      applyFilters();
    });
  }

  const modalInputs = [
    "modal-date",
    "modal-time",
    "modal-persons",
    "opt-intensive",
    "opt-supplementary",
    "opt-personalized",
  ];
  modalInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", calculatePrice);
  });

  const enrollForm = document.getElementById("enroll-form");
  if (enrollForm) {
    enrollForm.addEventListener("submit", handleEnrollSubmit);
  }
});

async function fetchCourses() {
  try {
    const response = await fetch(`${BASE_URL}/courses?api_key=${API_KEY}`);
    allCourses = await response.json();
    applyFilters();
  } catch (error) {
    showAlert("Ошибка при загрузке курсов", "danger");
    console.error(error);
  }
}

function applyFilters() {
  const nameQuery = document.getElementById("search-name").value.toLowerCase();
  const levelQuery = document.getElementById("filter-level").value;

  filteredCourses = allCourses.filter((course) => {
    const matchName = course.name.toLowerCase().includes(nameQuery);
    const matchLevel = levelQuery === "" || course.level === levelQuery;
    return matchName && matchLevel;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("courses-table-body");
  if (!tbody) return;

  const start = (currentPage - 1) * recordsPerPage;
  const end = start + recordsPerPage;
  const paginatedItems = filteredCourses.slice(start, end);

  tbody.innerHTML = paginatedItems
    .map(
      (course) => `
        <tr>
            <td class="fw-bold">${course.name}</td>
            <td><span class="badge bg-info text-dark">${course.level}</span></td>
            <td>${course.teacher}</td>
            <td class="text-end">
                <button class="btn btn-primary btn-sm px-3" onclick="openEnrollModal(${course.id})">Выбрать</button>
            </td>
        </tr>
    `
    )
    .join("");

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById("course-pagination");
  if (!container) return;

  const totalPages = Math.ceil(filteredCourses.length / recordsPerPage);
  let html = "";

  for (let i = 1; i <= totalPages; i++) {
    html += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link" onclick="changePage(${i})">${i}</button>
            </li>
        `;
  }
  container.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  renderTable();
}

function openEnrollModal(id) {
  selectedCourse = allCourses.find((c) => c.id === id);
  if (!selectedCourse) return;

  document.getElementById("modal-course-name").value = selectedCourse.name;
  document.getElementById("modal-teacher").value = selectedCourse.teacher;
  document.getElementById("modal-weeks").value = selectedCourse.total_length;
  document.getElementById("modal-week-length").value =
    selectedCourse.week_length;
  document.getElementById("modal-hour-price").value =
    selectedCourse.course_fee_per_hour;

  const dateSelect = document.getElementById("modal-date");
  const uniqueDates = [
    ...new Set(selectedCourse.start_dates.map((dt) => dt.split("T")[0])),
  ];

  dateSelect.innerHTML = uniqueDates
    .map((date) => {
      const d = new Date(date);
      return `<option value="${date}">${d.toLocaleDateString("ru-RU")}</option>`;
    })
    .join("");

  dateSelect.onchange = () => {
    updateTimeOptions();
    updateEndDate();
    calculatePrice();
  };

  updateTimeOptions();
  updateEndDate();
  calculatePrice();

  const modal = new bootstrap.Modal(document.getElementById("enrollModal"));
  modal.show();
}

function updateTimeOptions() {
  const dateSelect = document.getElementById("modal-date");
  const timeSelect = document.getElementById("modal-time");
  const selectedDate = dateSelect.value;

  const availableTimes = selectedCourse.start_dates
    .filter((dt) => dt.startsWith(selectedDate))
    .map((dt) => dt.split("T")[1].substring(0, 5));

  timeSelect.innerHTML = availableTimes
    .map((t) => `<option value="${t}">${t}</option>`)
    .join("");
}

function updateEndDate() {
  const startDateVal = document.getElementById("modal-date").value;
  const weeks = selectedCourse.total_length;
  const display = document.getElementById("modal-end-date");

  if (startDateVal && display) {
    const end = new Date(startDateVal);
    end.setDate(end.getDate() + weeks * 7);
    display.innerText = end.toLocaleDateString("ru-RU");
  }
}

function calculatePrice() {
  if (!selectedCourse) return;

  const hourPrice = selectedCourse.course_fee_per_hour;
  const totalHours = selectedCourse.total_length * selectedCourse.week_length;
  const students =
    parseInt(document.getElementById("modal-persons").value) || 1;

  // Коэффициент выходного
  const dateVal = new Date(document.getElementById("modal-date").value);
  const isWeekend = dateVal.getDay() === 0 || dateVal.getDay() === 6 ? 1.5 : 1;

  // Надбавки по времени
  const timeVal = document.getElementById("modal-time").value;
  let timeSurcharge = 0;
  if (timeVal >= "09:00" && timeVal <= "12:00") timeSurcharge = 400;
  if (timeVal >= "18:00" && timeVal <= "20:00") timeSurcharge = 1000;

  // Основная сумма
  let total = (hourPrice * totalHours * isWeekend + timeSurcharge) * students;

  // Скидки
  const diffDays = Math.ceil(
    (new Date(document.getElementById("modal-date").value) - new Date()) /
      (1000 * 60 * 60 * 24)
  );
  if (diffDays >= 30) total *= 0.9;
  if (students >= 5) total *= 0.85;

  // Опции
  if (document.getElementById("opt-intensive").checked) total *= 1.2;
  if (document.getElementById("opt-supplementary").checked)
    total += 2000 * students;
  if (document.getElementById("opt-personalized").checked)
    total += 1500 * selectedCourse.total_length;

  document.getElementById("total-price").innerText =
    Math.round(total).toLocaleString();
}

async function handleEnrollSubmit(e) {
  e.preventDefault();

  const priceText = document.getElementById("total-price").innerText;
  const finalPrice = parseInt(priceText.replace(/\s/g, ""));

  const formData = {
    course_id: parseInt(selectedCourse.id),
    tutor_id: 0,
    date_start: document.getElementById("modal-date").value,
    time_start: document.getElementById("modal-time").value,
    duration: parseInt(
      selectedCourse.total_length * selectedCourse.week_length
    ),
    persons: parseInt(document.getElementById("modal-persons").value),
    price: finalPrice,
    intensive_course: document.getElementById("opt-intensive").checked,
    supplementary: document.getElementById("opt-supplementary").checked,
    personalized: document.getElementById("opt-personalized").checked,
    early_registration: (function () {
      const start = new Date(document.getElementById("modal-date").value);
      return (start - new Date()) / (1000 * 60 * 60 * 24) >= 30;
    })(),
    group_enrollment:
      parseInt(document.getElementById("modal-persons").value) >= 5,
    excursions: false,
    assessment: false,
    interactive: false,
  };

  try {
    const response = await fetch(`${BASE_URL}/orders?api_key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      showAlert("Заявка успешно создана!", "success");
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("enrollModal")
      );
      modal.hide();
    } else {
      const err = await response.json();
      showAlert(`Ошибка: ${err.error || "Проверьте данные"}`, "danger");
    }
  } catch (error) {
    showAlert("Ошибка сети", "danger");
  }
}

function showAlert(msg, type) {
  const container = document.getElementById("alert-container");
  if (!container) return;
  container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show shadow-sm">
            ${msg}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
  setTimeout(() => (container.innerHTML = ""), 5000);
}
