const API_KEY = "c6fb517a-1fe1-48fb-921d-c9330f21f4a5";
const BASE_URL = "http://exam-api-courses.std-900.ist.mospolytech.ru/api";

let orders = [];
let courses = [];
let currentEditingOrder = null;
let currentEditingCourse = null;

document.addEventListener("DOMContentLoaded", async () => {
  await fetchCourses();
  await fetchOrders();

  const editInputs = [
    "edit-date",
    "edit-time",
    "edit-persons",
    "edit-intensive",
    "edit-supplementary",
    "edit-personalized",
  ];
  editInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", calculateEditPrice);
  });

  document.getElementById("edit-form").addEventListener("submit", updateOrder);

  document
    .getElementById("confirm-delete-btn")
    .addEventListener("click", deleteOrder);
});

async function fetchCourses() {
  const res = await fetch(`${BASE_URL}/courses?api_key=${API_KEY}`);
  courses = await res.json();
}

async function fetchOrders() {
  try {
    const res = await fetch(`${BASE_URL}/orders?api_key=${API_KEY}`);
    orders = await res.json();
    renderOrdersTable();
  } catch (err) {
    showAlert("Ошибка загрузки заказов", "danger");
  }
}

function renderOrdersTable() {
  const tbody = document.getElementById("orders-table-body");
  if (!tbody) return;

  tbody.innerHTML = orders
    .map((order, index) => {
      const course = courses.find((c) => c.id === order.course_id);
      return `
            <tr>
                <td>${index + 1}</td>
                <td class="fw-bold">${course ? course.name : "Курс не найден"}</td>
                <td>${new Date(order.date_start).toLocaleDateString("ru-RU")}</td>
                <td>${order.price.toLocaleString()} ₽</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="openEditModal(${order.id})">✎</button>
                        <button class="btn btn-outline-danger" onclick="openDeleteModal(${order.id})">🗑</button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

function openEditModal(orderId) {
  currentEditingOrder = orders.find((o) => o.id === orderId);
  currentEditingCourse = courses.find(
    (c) => c.id === currentEditingOrder.course_id
  );

  if (!currentEditingOrder || !currentEditingCourse) return;

  document.getElementById("edit-order-id").value = orderId;
  document.getElementById("edit-date").value = currentEditingOrder.date_start;
  document.getElementById("edit-time").value = currentEditingOrder.time_start;
  document.getElementById("edit-persons").value = currentEditingOrder.persons;

  document.getElementById("edit-intensive").checked =
    currentEditingOrder.intensive_course;
  document.getElementById("edit-supplementary").checked =
    currentEditingOrder.supplementary;
  document.getElementById("edit-personalized").checked =
    currentEditingOrder.personalized;

  calculateEditPrice();

  new bootstrap.Modal(document.getElementById("editModal")).show();
}

function calculateEditPrice() {
  if (!currentEditingCourse) return;

  const hourPrice = currentEditingCourse.course_fee_per_hour;
  const totalHours =
    currentEditingCourse.total_length * currentEditingCourse.week_length;
  const students = parseInt(document.getElementById("edit-persons").value) || 1;

  const dateVal = new Date(document.getElementById("edit-date").value);
  const isWeekend = dateVal.getDay() === 0 || dateVal.getDay() === 6 ? 1.5 : 1;

  const timeVal = document.getElementById("edit-time").value;
  let timeSurcharge = 0;
  if (timeVal >= "09:00" && timeVal <= "12:00") timeSurcharge = 400;
  if (timeVal >= "18:00" && timeVal <= "20:00") timeSurcharge = 1000;

  let total = (hourPrice * totalHours * isWeekend + timeSurcharge) * students;

  const diffDays = Math.ceil(
    (new Date(document.getElementById("edit-date").value) - new Date()) /
      (1000 * 60 * 60 * 24)
  );
  if (diffDays >= 30) total *= 0.9;
  if (students >= 5) total *= 0.85;

  if (document.getElementById("edit-intensive").checked) total *= 1.2;
  if (document.getElementById("edit-supplementary").checked)
    total += 2000 * students;
  if (document.getElementById("edit-personalized").checked)
    total += 1500 * currentEditingCourse.total_length;

  document.getElementById("edit-total-price").innerText =
    Math.round(total).toLocaleString();
}

async function updateOrder(e) {
  e.preventDefault();
  const id = document.getElementById("edit-order-id").value;

  const priceText = document.getElementById("edit-total-price").innerText;
  const finalPrice = parseInt(priceText.replace(/\s/g, ""));

  const data = {
    date_start: document.getElementById("edit-date").value,
    time_start: document.getElementById("edit-time").value,
    persons: parseInt(document.getElementById("edit-persons").value),
    price: finalPrice,
    intensive_course: document.getElementById("edit-intensive").checked,
    supplementary: document.getElementById("edit-supplementary").checked,
    personalized: document.getElementById("edit-personalized").checked,
  };

  try {
    const res = await fetch(`${BASE_URL}/orders/${id}?api_key=${API_KEY}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      showAlert("Заказ успешно обновлен!", "success");
      fetchOrders();
      bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
    } else {
      const err = await res.json();
      showAlert(`Ошибка: ${err.error}`, "danger");
    }
  } catch (err) {
    showAlert("Ошибка сети", "danger");
  }
}

let orderIdToDelete = null;
function openDeleteModal(id) {
  orderIdToDelete = id;
  new bootstrap.Modal(document.getElementById("deleteModal")).show();
}

async function deleteOrder() {
  try {
    const res = await fetch(
      `${BASE_URL}/orders/${orderIdToDelete}?api_key=${API_KEY}`,
      {
        method: "DELETE",
      }
    );
    if (res.ok) {
      showAlert("Заказ удален", "warning");
      fetchOrders();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteModal")
      ).hide();
    }
  } catch (err) {
    showAlert("Не удалось удалить", "danger");
  }
}

function showAlert(msg, type) {
  const container = document.getElementById("alert-container");
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show shadow-sm">${msg}<button class="btn-close" data-bs-dismiss="alert"></button></div>`;
  setTimeout(() => (container.innerHTML = ""), 4000);
}
