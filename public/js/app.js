const state = {
  currentUser: JSON.parse(localStorage.getItem("user")),
  books: [],
  filteredBooks: [],
  darkMode: localStorage.getItem("darkMode") === "true",
  favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
};

const API_URL = "/api/books";

function compareBookIdAsc(a, b) {
  return String(a.bookId || "").localeCompare(String(b.bookId || ""), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
  checkAuth();
  loadBooks();
  setupEventListeners();
});

function checkAuth() {
  const user = state.currentUser;
  const authLink = document.getElementById("auth-link");
  const adminMenu = document.getElementById("admin-menu");
  const profileMenu = document.getElementById("profile-menu-item");
  if (!user) {
    if (!window.location.pathname.includes("login.html"))
      window.location.href = "login.html";
    return;
  }
  if (authLink) {
    authLink.innerHTML = `<i class="fas fa-sign-out-alt"></i> Cerrar Sesión (${user.username})`;
    authLink.onclick = () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    };
  }
  if (user.role === "admin" && adminMenu) {
    adminMenu.style.display = "block";
  }
  if (profileMenu) {
    profileMenu.style.display = "block";
  }
  // No mostrar el catálogo automáticamente para usuarios regulares.
}

async function loadBooks() {
  try {
    const response = await fetch(API_URL);
    state.books = await response.json();
    state.books.sort(compareBookIdAsc);
    state.filteredBooks = [...state.books];
    renderBookTable();
    updateWelcomeStats();
    populateFilterOptions();
  } catch (error) {
    console.error("Error al cargar libros:", error);
  }
}

function populateFilterOptions() {
  // Extraer categorías únicas, incluyendo "Sin categoría" si existe
  console.log("📚 Books loaded:", state.books.length);
  console.log("First book:", state.books[0]);

  const categories = [
    ...new Set(state.books.map((b) => b.category || "Sin categoría")),
  ].sort();

  console.log("Categories found:", categories);

  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    // Limpiar opciones existentes (excepto la primera)
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
  }
}

function filterBooks() {
  const searchTerm =
    document.getElementById("bookSearch")?.value.toLowerCase() || "";
  const categoryFilter = document.getElementById("categoryFilter")?.value || "";

  state.filteredBooks = state.books.filter((book) => {
    // Búsqueda por texto
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm) ||
      (book.isbn && book.isbn.includes(searchTerm));

    // Filtro por categoría - cuando está vacío, mostrar TODAS las categorías
    let matchesCategory = true;
    if (categoryFilter) {
      matchesCategory = (book.category || "Sin categoría") === categoryFilter;
    }

    return matchesSearch && matchesCategory;
  });

  renderBookTable();
}

function clearFilters() {
  document.getElementById("bookSearch").value = "";
  document.getElementById("categoryFilter").value = "";
  state.filteredBooks = [...state.books];
  renderBookTable();
  Toast.info("Filtros limpios");
}

function renderBookTable() {
  const tableBody = document.getElementById("book-table-body");
  if (!tableBody) return;
  tableBody.innerHTML = "";
  const isAdmin = state.currentUser?.role === "admin";

  state.filteredBooks.forEach((book) => {
    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    const isFav = isFavorite(book.bookId);

    row.innerHTML = `
          <td><code>${book.bookId}</code></td>
            <td><strong>${book.title}</strong></td>
            <td>${book.author}</td>
            <td style="text-align:center">${book.availableCopies}</td>
            <td><span class="badge ${book.isAvailable ? "bg-success" : "bg-danger"}">${book.isAvailable ? "Disponible" : "Agotado"}</span></td>
            <td class="actions">
                <button onclick="event.stopPropagation(); handleLoan('${book.bookId}')" class="btn-loan" ${!book.isAvailable ? "disabled" : ""}><i class="fas fa-hand-holding"></i> Prestar</button>
                <button onclick="event.stopPropagation(); handleReturn('${book.bookId}')" class="btn-return"><i class="fas fa-undo"></i> Devolver</button>
                ${!isAdmin ? `<button onclick="event.stopPropagation(); toggleFavorite('${book.bookId}')" class="btn-loan" style="background: ${isFav ? "#ef4444" : "#ec4899"};"><i class="fas fa-${isFav ? "heart" : "heart"}"></i> ${isFav ? "Favorito" : "❤️"}</button>` : ""}
            </td>`;
    row.onclick = () => showBookDetails(book);
    tableBody.appendChild(row);
  });
  if (state.currentUser?.role === "admin") renderAdminInventory();
  // selection removed: no cart to update
}

function renderAdminInventory() {
  const adminTableBody = document.getElementById("admin-inventory-table-body");
  if (!adminTableBody) return;
  adminTableBody.innerHTML = "";
  state.books.forEach((book) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td><code>${book.bookId}</code></td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td style="text-align:center">${book.quantity}</td>
            <td class="actions">
                <button onclick="openEditModal('${book.bookId}')" class="btn-edit">✏️ Editar</button>
                <button onclick="deleteBook('${book.bookId}')" class="btn-delete">🗑️ Borrar</button>
            </td>`;
    adminTableBody.appendChild(row);
  });
}

async function loadHistory() {
  const historyBody = document.getElementById("history-table-body");
  if (!historyBody) return;
  try {
    const response = await fetch(`${API_URL}/history`);
    const history = await response.json();

    // Ordenar por fecha descendente (más reciente primero)
    // Convertir fechas ISO a timestamp para comparación más confiable
    history.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // descendente (más reciente primero)
    });

    historyBody.innerHTML = history
      .map((log) => {
        const statusColors = {
          "Préstamo": "#27ae60",
          "Devolución": "#2980b9",
          "Creación de Libro": "#8b5cf6",
          "Edición de Libro": "#f59e0b",
          "Eliminación de Libro": "#ef4444",
        };
        const color = statusColors[log.status] || "#64748b";
        // Formatear fecha a formato legible (DD/MM/YYYY HH:MM)
        const dateObj = new Date(log.date);
        const formattedDate =
          dateObj.toLocaleDateString("es-ES") +
          " " +
          dateObj.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          });
        return `
                <tr>
                    <td>${log.bookTitle}</td>
                    <td>${log.username}</td>
                    <td>${formattedDate}</td>
                    <td><span class="badge" style="background:${color}; color:white; padding:5px 10px; border-radius:4px; font-weight:bold;">${log.status || "Acción"}</span></td>
                </tr>`;
      })
      .join("");
  } catch (e) {
    console.error("Error al cargar historial:", e);
  }
}

function updateWelcomeStats() {
  const totalBooksElement = document.getElementById("total-books");
  const totalLoansElement = document.getElementById("total-loans");
  const adminLoansCard = document.getElementById("admin-loans-card");
  const userAchievementsCard = document.getElementById(
    "user-achievements-card",
  );
  const userBooksReadElement = document.getElementById("user-books-read");

  const isAdmin = state.currentUser?.role === "admin";

  // Mostrar/ocultar tarjetas según rol
  if (adminLoansCard) adminLoansCard.style.display = isAdmin ? "block" : "none";
  if (userAchievementsCard)
    userAchievementsCard.style.display = isAdmin ? "none" : "block";

  if (totalBooksElement) {
    totalBooksElement.textContent = state.books.length;
  }

  if (totalLoansElement && isAdmin) {
    fetch(`${API_URL}/history`)
      .then((res) => res.json())
      .then((history) => {
        if (totalLoansElement) {
          const onlyLoans = history.filter((log) => {
            const status = String(log?.status || "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase();
            return status === "prestamo";
          });
          totalLoansElement.textContent = onlyLoans.length;
        }
      })
      .catch((e) => console.error("Error al cargar historial para stats:", e));
  }

  // Para usuarios: mostrar progreso (libros en historial vs total disponibles)
  if (!isAdmin && userBooksReadElement && state.currentUser) {
    fetch(`${API_URL}/history`)
      .then((res) => res.json())
      .then((history) => {
        const userHistory = history.filter(
          (log) => log.username === state.currentUser.username,
        );
        const totalBooks = state.books.length;
        const percentage =
          totalBooks > 0
            ? Math.round((userHistory.length / totalBooks) * 100)
            : 0;

        if (userBooksReadElement) {
          userBooksReadElement.textContent = `${userHistory.length}/${totalBooks}`;
        }
        const progressPct = document.getElementById("user-progress-pct");
        if (progressPct) {
          progressPct.textContent = percentage;
        }
      })
      .catch((e) => console.error("Error al cargar historial para stats:", e));
  }

  updateRoleCard();
  updateQuickActions();
}

function updateRoleCard() {
  const roleIcon = document.getElementById("role-icon");
  const roleLabel = document.getElementById("role-label");
  const roleValue = document.getElementById("role-value");

  if (!roleIcon || !roleLabel || !roleValue) return;

  if (state.currentUser?.role === "admin") {
    roleIcon.textContent = "👥";
    roleLabel.textContent = "Panel de Control";
    roleValue.textContent = "Administrador";
  } else {
    roleIcon.textContent = "👤";
    roleLabel.textContent = "Usuario";
    roleValue.textContent = "Regular";
  }

  updateWelcomeMessage();
}

function updateWelcomeMessage() {
  const welcomeMsg = document.getElementById("welcome-message");
  if (!welcomeMsg) return;

  if (state.currentUser?.role === "admin") {
    welcomeMsg.textContent =
      "Administra la colección de libros, gestiona préstamos, controla el inventario y visualiza el historial completo del sistema";
  } else {
    welcomeMsg.textContent =
      "Gestiona tu colección de libros, realiza préstamos y mantén un registro completo de todas tus transacciones";
  }
}

function updateQuickActions() {
  const quickActionsContainer = document.getElementById("quick-actions");
  if (!quickActionsContainer) return;

  quickActionsContainer.innerHTML = "";

  if (state.currentUser?.role === "admin") {
    // Acciones para admin
    const adminActions = [
      {
        icon: "fas fa-search",
        label: "Consultar Catálogo",
        onclick: "toggleAdminPanel(); switchAdminTab('catalog');",
      },
      {
        icon: "fas fa-plus",
        label: "Gestionar Inventario",
        onclick: "toggleAdminPanel(); switchAdminTab('inventory');",
      },
      {
        icon: "fas fa-chart-bar",
        label: "Dashboard",
        onclick: "toggleAdminPanel(); switchAdminTab('dashboard');",
      },
      {
        icon: "fas fa-history",
        label: "Ver Historial",
        onclick: "toggleAdminPanel(); switchAdminTab('history');",
      },
    ];

    adminActions.forEach((action) => {
      const button = document.createElement("button");
      button.className = "quick-action-btn";
      button.innerHTML = `<i class="${action.icon}" style="margin-right: 8px"></i>${action.label}`;
      button.onclick = () => eval(action.onclick);
      quickActionsContainer.appendChild(button);
    });
  } else {
    // Acciones para usuario regular
    const userActions = [
      {
        icon: "fas fa-book",
        label: "Ver Catálogo",
        onclick: "showUserCatalog();",
      },
      {
        icon: "fas fa-list",
        label: "Mis Préstamos",
        onclick: "showMyLoans();",
      },
      {
        icon: "fas fa-heart",
        label: "Mis Favoritos",
        onclick: "showFavorites();",
      },
      {
        icon: "fas fa-question-circle",
        label: "Ayuda",
        onclick:
          "alert('Contacta a la biblioteca para obtener ayuda: biblioteca@sena.edu.co');",
      },
    ];

    userActions.forEach((action) => {
      const button = document.createElement("button");
      button.className = "quick-action-btn";
      button.innerHTML = `<i class="${action.icon}" style="margin-right: 8px"></i>${action.label}`;
      button.onclick = () => eval(action.onclick);
      quickActionsContainer.appendChild(button);
    });
  }
}

async function handleLoan(bookId) {
  const res = await fetch(`${API_URL}/${bookId}/loan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: state.currentUser.username }),
  });

  if (res.ok) {
    const data = await res.json();

    Toast.success(`✅ ${data.book.title} prestado exitosamente`, 3000);

    loadBooks();
    if (state.currentUser.role === "admin") loadHistory();
  } else {
    const error = await res.json();
    if (error.currentLoans && error.maxLoans) {
      Toast.error(
        `⚠️ Límite alcanzado: Tienes ${error.currentLoans}/${error.maxLoans} préstamos activos. Devuelve un libro primero.`,
        5000,
      );
    } else {
      Toast.error(error.message || "No se pudo prestar el libro", 3000);
    }
  }
}

async function handleReturn(bookId) {
  const res = await fetch(`${API_URL}/${bookId}/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: state.currentUser.username }),
  });

  if (res.ok) {
    const book = state.books.find((b) => b.bookId === bookId);
    Toast.success(
      `✅ ${book ? book.title : "Libro"} devuelto exitosamente`,
      3000,
    );

    loadBooks();
    if (state.currentUser.role === "admin") {
      loadHistory();
    } else {
      // Refrescar la lista de préstamos del usuario
      loadUserLoans();
    }
  } else {
    let err = { message: "No se pudo devolver el libro" };
    try {
      err = await res.json();
    } catch (e) {
      console.error("Error parsing return error", e);
    }
    Toast.error(err.message || "No se pudo devolver el libro", 4000);
  }
}

// selection/loan-selected feature removed

function toggleAdminPanel() {
  const tabsContainer = document.getElementById("admin-tabs-container");
  const welcomeSection = document.getElementById("welcome-section");
  const isHidden =
    !tabsContainer.style.display || tabsContainer.style.display === "none";

  tabsContainer.style.display = isHidden ? "block" : "none";
  if (welcomeSection) {
    welcomeSection.style.display = isHidden ? "none" : "block";
  }

  if (isHidden) {
    renderAdminInventory();
    loadHistory();
    loadAdminUsers();
  }
}

function switchAdminTab(tabName) {
  // Ocultar todas las pestañas
  document.querySelectorAll(".admin-tab-content").forEach((tab) => {
    tab.classList.remove("active");
    tab.style.display = "none";
  });

  // Desactivar todos los botones de pestaña
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Mostrar la pestaña seleccionada
  let selectedTab;
  let selectedBtn;

  switch (tabName) {
    case "catalog":
      selectedTab = document.getElementById("admin-catalog-tab");
      selectedBtn = document.querySelectorAll(".tab-btn")[0];
      break;
    case "inventory":
      selectedTab = document.getElementById("admin-inventory-tab");
      selectedBtn = document.querySelectorAll(".tab-btn")[1];
      break;
    case "dashboard":
      selectedTab = document.getElementById("admin-dashboard-tab");
      selectedBtn = document.querySelectorAll(".tab-btn")[2];
      loadAdminDashboard();
      break;
    case "history":
      selectedTab = document.getElementById("admin-history-tab");
      selectedBtn = document.querySelectorAll(".tab-btn")[3];
      break;
    case "users":
      selectedTab = document.getElementById("admin-users-tab");
      selectedBtn = document.querySelectorAll(".tab-btn")[4];
      loadAdminUsers();
      break;
  }

  if (selectedTab) {
    selectedTab.classList.add("active");
    selectedTab.style.display = "block";
  }
  if (selectedBtn) {
    selectedBtn.classList.add("active");
  }
}

function showAddModal() {
  document.getElementById("modal-title").innerText = "Añadir Nuevo Libro";
  document.getElementById("book-form").reset();
  document.getElementById("bookId").disabled = false;

  // Llenar categorías disponibles
  const categories = [
    ...new Set(state.books.map((b) => b.category || "Sin categoría")),
  ].sort();
  const categorySelect = document.getElementById("bookCategory");
  categorySelect.innerHTML =
    '<option value="">Selecciona una categoría</option>';
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  document.getElementById("newCategory").value = "";
  document.getElementById("book-modal").style.display = "flex";
}

function openEditModal(bookId) {
  const book = state.books.find((b) => b.bookId === bookId);
  if (!book) return;
  document.getElementById("modal-title").innerText = "Editar Libro";
  document.getElementById("bookId").value = book.bookId;
  document.getElementById("bookId").disabled = true;
  document.getElementById("title").value = book.title;
  document.getElementById("author").value = book.author;
  document.getElementById("isbn").value = book.isbn;
  document.getElementById("quantity").value = book.quantity;
  document.getElementById("description").value = book.description || "";
  document.getElementById("coverImage").value = "";

  // Llenar categorías disponibles
  const categories = [
    ...new Set(state.books.map((b) => b.category || "Sin categoría")),
  ].sort();
  const categorySelect = document.getElementById("bookCategory");
  categorySelect.innerHTML =
    '<option value="">Selecciona una categoría</option>';
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  // Seleccionar categoría actual
  categorySelect.value = book.category || "Sin categoría";
  document.getElementById("newCategory").value = "";

  document.getElementById("book-modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("book-modal").style.display = "none";
}

function showBookDetails(book) {
  const modal = document.getElementById("book-detail-modal");
  const detailsContent = document.getElementById("book-details-content");

  detailsContent.innerHTML = `
    <div style="padding: 20px 0;">
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 30px; margin-bottom: 30px;">
        <!-- Portada del libro -->
        <div style="text-align: center;">
          <img src="${book.coverImage || "https://via.placeholder.com/200x300?text=Sin+Portada"}" 
            alt="Portada de ${book.title}" 
            style="max-width: 100%; width: auto; height: auto; max-height: 400px; object-fit: contain; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #e0e0e0;">
        </div>

        <!-- Información principal -->
        <div>
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 1.5rem; margin: 0 0 10px 0; color: #0f172a;">${book.title}</h3>
            <p style="font-size: 1.1rem; color: #666; margin: 0; font-weight: 500;">por ${book.author}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="font-weight: 600; color: #666; font-size: 0.9rem;">ISBN</label>
            <p style="font-size: 1rem; margin-top: 5px; font-family: monospace;">${book.isbn}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
              <label style="font-weight: 600; color: #666; font-size: 0.9rem;">CANTIDAD TOTAL</label>
              <p style="font-size: 1.3rem; margin-top: 5px; color: #4a90e2; font-weight: 700;">${book.quantity}</p>
            </div>
            <div>
              <label style="font-weight: 600; color: #666; font-size: 0.9rem;">DISPONIBLES</label>
              <p style="font-size: 1.3rem; margin-top: 5px; color: #10b981; font-weight: 700;">${book.availableCopies}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="font-weight: 600; color: #666; font-size: 0.9rem;">ESTADO</label>
            <p style="margin-top: 5px;">
              <span class="badge ${book.isAvailable ? "bg-success" : "bg-danger"}"
                style="padding: 8px 16px; border-radius: 20px; font-weight: 600;">
                ${book.isAvailable ? "✓ Disponible" : "✕ Agotado"}
              </span>
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 12px;">
            <p style="font-size: 0.9rem; color: #666; margin: 0;">
              <strong>${book.quantity - book.availableCopies}</strong> de <strong>${book.quantity}</strong> copias en préstamo
            </p>
          </div>
        </div>
      </div>
      
      <!-- Descripción -->
      <div style="margin-bottom: 25px; padding: 20px; background: #f8f9fa; border-radius: 12px; border-left: 4px solid #4a90e2;">
        <label style="font-weight: 600; color: #666; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">📖 Descripción</label>
        <p style="font-size: 1rem; line-height: 1.8; margin-top: 10px; color: #333;">
          ${book.description || "No hay descripción disponible para este libro."}
        </p>
      </div>
      
      <!-- Botones de acción -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <button onclick="event.stopPropagation(); handleLoan('${book.bookId}'); closeBookDetailModal();" 
          class="btn-loan" ${!book.isAvailable ? "disabled" : ""}
          style="padding: 12px; font-size: 1rem;">
          <i class="fas fa-hand-holding"></i> Prestar Ahora
        </button>
        <button onclick="event.stopPropagation(); handleReturn('${book.bookId}'); closeBookDetailModal();" 
          class="btn-return"
          style="padding: 12px; font-size: 1rem;">
          <i class="fas fa-undo"></i> Devolver
        </button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeBookDetailModal() {
  document.getElementById("book-detail-modal").style.display = "none";
}

function setupEventListeners() {
  const form = document.getElementById("book-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById("bookId").value;
      const isEdit = document.getElementById("bookId").disabled;
      const title = document.getElementById("title").value;
      const author = document.getElementById("author").value;
      const isbn = document.getElementById("isbn").value;
      const quantity = parseInt(document.getElementById("quantity").value);
      const description = document.getElementById("description").value;
      const coverImageFile = document.getElementById("coverImage").files[0];

      // Obtener categoría (seleccionada o nueva)
      const selectedCategory = document.getElementById("bookCategory").value;
      const newCategory = document.getElementById("newCategory").value;
      const category = newCategory.trim() || selectedCategory;

      if (!category) {
        Toast.error("Por favor selecciona o crea una categoría");
        return;
      }

      // Crear FormData para manejar archivos
      const formData = new FormData();
      formData.append("bookId", id);
      formData.append("title", title);
      formData.append("author", author);
      formData.append("isbn", isbn);
      formData.append("quantity", quantity);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("username", state.currentUser?.username || "admin");
      if (coverImageFile) formData.append("coverImage", coverImageFile);

      const response = await fetch(isEdit ? `${API_URL}/${id}` : API_URL, {
        method: isEdit ? "PUT" : "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        // Mostrar mensaje de éxito con información del libro
        Swal.fire({
          icon: "success",
          title: isEdit ? "Libro Actualizado" : "Libro Añadido",
          html: `<div style="text-align: left; display: inline-block;">
            <p><strong>Título:</strong> ${title}</p>
            <p><strong>Autor:</strong> ${author}</p>
            <p><strong>ISBN:</strong> ${isbn}</p>
            <p><strong>Categoría:</strong> ${category}</p>
            <p><strong>Cantidad:</strong> ${quantity} ejemplares</p>
            ${description ? `<p><strong>Descripción:</strong> ${description.substring(0, 80)}...</p>` : ""}
          </div>`,
          confirmButtonText: "Aceptar",
        });

        closeModal();
        loadBooks();
        if (state.currentUser?.role === "admin") loadHistory();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo guardar el libro. Intenta de nuevo.",
        });
      }
    };
  }
}

function showUserCatalog() {
  const welcomeSection = document.getElementById("welcome-section");
  if (welcomeSection) welcomeSection.style.display = "none";

  // Hide all admin tabs and then show only the catalog
  document.querySelectorAll(".admin-tab-content").forEach((tab) => {
    tab.classList.remove("active");
    tab.style.display = "none";
  });

  const catalog = document.getElementById("admin-catalog-tab");
  if (catalog) {
    catalog.classList.add("active");
    catalog.style.display = "block";
    catalog.scrollIntoView({ behavior: "smooth" });
  }
}

async function deleteBook(bookId) {
  // TAMBIÉN PODEMOS USAR SWEETALERT PARA CONFIRMAR ELIMINACIÓN
  const result = await Swal.fire({
    title: "¿Estás seguro?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (result.isConfirmed) {
    const res = await fetch(`${API_URL}/${bookId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: state.currentUser?.username || "admin" }),
    });
    if (res.ok) {
      Swal.fire("Eliminado", "El libro ha sido borrado.", "success");
      loadBooks();
      if (state.currentUser?.role === "admin") loadHistory();
    }
  }
}

// Función para mostrar "Mis Préstamos"
function showMyLoans() {
  const welcomeSection = document.getElementById("welcome-section");
  const myLoansSection = document.getElementById("my-loans-section");

  if (welcomeSection) welcomeSection.style.display = "none";

  // Ocultar todas las pestañas admin
  document.querySelectorAll(".admin-tab-content").forEach((tab) => {
    tab.style.display = "none";
  });

  if (myLoansSection) {
    myLoansSection.style.display = "block";
    myLoansSection.scrollIntoView({ behavior: "smooth" });
  }

  loadUserLoans();
}

// Función para cargar préstamos activos del usuario
async function loadUserLoans() {
  function parseAndFixLoanDate(dateStr) {
    // dateStr may be ISO or locale string. Parse normally first.
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // fallback: try to parse common formats dd/mm/yyyy, with optional time
      const m = dateStr.match(
        /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:.*?(\d{1,2}):(\d{2}):(\d{2}))?/,
      );
      if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10) - 1;
        const year = parseInt(m[3], 10);
        const hh = parseInt(m[4] || "0", 10);
        const mm = parseInt(m[5] || "0", 10);
        const ss = parseInt(m[6] || "0", 10);
        d = new Date(year, month, day, hh, mm, ss);
      }
    }

    // If parsed date is in the future (likely due to US-style parsing), try swapping day/month
    const now = new Date();
    const daysDiff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      // also try subtracting one month (fix for timezone/parse shifts)
      const altMonthMinus = new Date(
        d.getFullYear(),
        d.getMonth() - 1,
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds(),
      );
      const altMinusDiff = Math.ceil(
        (altMonthMinus - now) / (1000 * 60 * 60 * 24),
      );
      if (Math.abs(altMinusDiff) < Math.abs(daysDiff)) {
        d = altMonthMinus;
      }
      // attempt swap month/day from the parsed date
      const year = d.getFullYear();
      const parsedMonth = d.getMonth() + 1;
      const parsedDay = d.getDate();
      // only attempt if swapping yields a different date
      if (parsedDay !== parsedMonth) {
        const alt = new Date(
          year,
          parsedDay - 1,
          parsedMonth,
          d.getHours(),
          d.getMinutes(),
          d.getSeconds(),
        );
        const altDiff = Math.ceil((alt - now) / (1000 * 60 * 60 * 24));
        // choose the alt date if it's closer to today (i.e. smaller positive days or within reasonable past)
        if (Math.abs(altDiff) < Math.abs(daysDiff)) {
          d = alt;
        }
      }
    }
    return d;
  }
  try {
    const response = await fetch(
      `${API_URL}/user/${state.currentUser.username}/loans`,
    );
    const loans = await response.json();

    const tableBody = document.getElementById("my-loans-table-body");
    if (!tableBody) return;

    if (!loans || loans.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">
            <i class="fas fa-inbox"></i><br>
            No tienes préstamos activos
          </td>
        </tr>
      `;
      return;
    }

    // Verificar alertas de devolución
    const overdueBooks = [];
    const warningBooks = [];

    loans.forEach((loan) => {
      const loanDate = parseAndFixLoanDate(loan.date);
      const dueDate = new Date(loanDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        // also try subtracting one month (fix for timezone/parse shifts)
        const altMonthMinus = new Date(
          d.getFullYear(),
          d.getMonth() - 1,
          d.getDate(),
          d.getHours(),
          d.getMinutes(),
          d.getSeconds(),
        );
        const altMinusDiff = Math.ceil(
          (altMonthMinus - now) / (1000 * 60 * 60 * 24),
        );
        if (Math.abs(altMinusDiff) < Math.abs(daysDiff)) {
          d = altMonthMinus;
        }
        overdueBooks.push(
          `${loan.bookTitle} (vencido hace ${Math.abs(daysLeft)} días)`,
        );
      } else if (daysLeft <= 3 && daysLeft >= 0) {
        warningBooks.push(`${loan.bookTitle} (vence en ${daysLeft} días)`);
      }
    });

    // Mostrar alertas
    if (overdueBooks.length > 0) {
      Toast.error(
        `⚠️ ATENCIÓN: Tienes ${overdueBooks.length} préstamo(s) vencido(s)`,
        5000,
      );
    }
    if (warningBooks.length > 0) {
      Toast.error(
        `⏰ RECORDATORIO: ${warningBooks.length} préstamo(s) próximo(s) a vencer`,
        4000,
      );
    }

    tableBody.innerHTML = loans
      .map((loan) => {
        const loanDate = parseAndFixLoanDate(loan.date);
        const dueDate = new Date(loanDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        const today = new Date();
        const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0;
        const isWarning = daysLeft <= 3;

        const statusColor = isOverdue
          ? "#f43f5e"
          : isWarning
            ? "#f59e0b"
            : "#10b981";
        const statusText = isOverdue
          ? "⚠️ VENCIDO"
          : isWarning
            ? "⚡ Próximo a vencer"
            : "✓ En plazo";

        // intentar resolver bookId cuando el registro histórico no lo tenga
        const resolvedBookId =
          loan.bookId ||
          (state.books.find((b) => b.title === loan.bookTitle) || {}).bookId ||
          "";

        const canReturn = !!resolvedBookId;

        return `
          <tr>
            <td><strong>${loan.bookTitle}</strong></td>
            <td>${loanDate.toLocaleString()}</td>
            <td>${dueDate.toLocaleString()}</td>
            <td style="text-align: center; color: ${statusColor}; font-weight: 600;">
              ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""} ${isOverdue ? "vencido" : "restante"}
            </td>
            <td class="actions">
              <button ${canReturn ? `onclick="event.stopPropagation(); handleReturn('${resolvedBookId}')"` : "disabled"} 
                class="btn-return" 
                style="font-size: 0.9rem; padding: 8px 12px;" 
                title="${canReturn ? "Devolver libro" : "ID del libro no disponible, contacta al administrador"}">
                <i class="fas fa-undo"></i> Devolver
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error al cargar préstamos del usuario:", error);
  }
}

// ===== DARK MODE =====
function initDarkMode() {
  if (state.darkMode) {
    document.body.classList.add("dark-mode");
    updateDarkModeButton();
  }
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  localStorage.setItem("darkMode", state.darkMode);
  document.body.classList.toggle("dark-mode");
  updateDarkModeButton();
  Toast.info(
    state.darkMode ? "Modo oscuro activado" : "Modo claro activado",
    2000,
  );
}

function updateDarkModeButton() {
  const btn = document.getElementById("dark-mode-toggle");
  if (btn) {
    btn.innerHTML = state.darkMode
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }
}
// ===== ADMIN DASHBOARD =====
async function loadAdminDashboard() {
  try {
    const loans = await fetch(`${API_URL}/history`).then((r) => r.json());

    // Calcular estadísticas - mostrar TODAS las transacciones
    const totalLoans = loans.length; // Total de todas las transacciones
    const activeLoans = loans.filter((l) => l.status === "Préstamo").length; // Solo préstamos activos
    const availableBooks = state.books.filter((b) => b.isAvailable).length;

    document.getElementById("stat-total-loans").textContent = totalLoans;
    document.getElementById("stat-available-books").textContent =
      availableBooks;

    // Gráfico 1: Top 5 Libros Más Prestados
    const bookLoans = {};
    loans
      .filter((l) => l.status === "Préstamo")
      .forEach((loan) => {
        bookLoans[loan.bookTitle] = (bookLoans[loan.bookTitle] || 0) + 1;
      });

    const topBooks = Object.entries(bookLoans)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    createChart("chart-top-books", "bar", {
      labels: topBooks.map((b) => b[0].substring(0, 20)),
      data: topBooks.map((b) => b[1]),
      label: "Préstamos",
      color: "#667eea",
    });

    // Gráfico 2: Disponibilidad
    const available = state.books.filter((b) => b.availableCopies > 0).length;
    const unavailable = state.books.length - available;

    createChart("chart-availability", "doughnut", {
      labels: ["Disponibles", "Prestados"],
      data: [available, unavailable],
      colors: ["#10b981", "#f43f5e"],
    });

    // Gráfico 3: Usuarios Más Activos
    const userLoans = {};
    loans.forEach((loan) => {
      userLoans[loan.username] = (userLoans[loan.username] || 0) + 1;
    });

    const topUsers = Object.entries(userLoans)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    createChart("chart-top-users", "bar", {
      labels: topUsers.map((u) => u[0]),
      data: topUsers.map((u) => u[1]),
      label: "Transacciones",
      color: "#764ba2",
    });

    // Gráfico 4: Préstamos por Mes (últimos 6 meses)
    const monthlyData = Array(6).fill(0);
    const now = new Date();

    loans
      .filter((l) => l.status === "Préstamo")
      .forEach((loan) => {
        const loanDate = new Date(loan.date);
        const monthDiff =
          (now.getFullYear() - loanDate.getFullYear()) * 12 +
          (now.getMonth() - loanDate.getMonth());

        if (monthDiff < 6) {
          monthlyData[5 - monthDiff]++;
        }
      });

    const months = Array(6)
      .fill(0)
      .map((_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (5 - i));
        return d.toLocaleDateString("es-ES", { month: "short" });
      });

    createChart("chart-monthly-loans", "line", {
      labels: months,
      data: monthlyData,
      label: "Préstamos",
      color: "#4a90e2",
    });
  } catch (error) {
    Toast.error("Error al cargar dashboard", 3000);
    console.error("Error en dashboard:", error);
  }
}

function createChart(canvasId, type, options) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Destruir gráfico anterior si existe
  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const config = {
    type: type,
    data: {
      labels: options.labels,
      datasets: [
        {
          label: options.label,
          data: options.data,
          backgroundColor: options.colors || options.color,
          borderColor: options.colors ? undefined : "rgba(0,0,0,0.1)",
          borderWidth: 2,
          tension: 0.4,
          fill: type === "line",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 12 },
            color: "#64748b",
          },
        },
      },
      scales:
        type !== "doughnut"
          ? {
              y: {
                beginAtZero: true,
                ticks: { color: "#94a3b8" },
                grid: { color: "#e2e8f0" },
              },
              x: {
                ticks: { color: "#94a3b8" },
                grid: { color: "#e2e8f0" },
              },
            }
          : undefined,
    },
  };

  ctx.chart = new Chart(ctx, config);
}

// ===== ADMIN: Gestión de Usuarios =====
let cachedUsers = [];
let cachedHistory = [];

async function loadAdminUsers() {
  try {
    const res = await fetch(`${API_URL.replace("/books", "")}/users`);
    if (!res.ok) {
      console.error("No se pudo cargar usuarios");
      return;
    }
    const users = await res.json();
    cachedUsers = users;

    // Cargar historial para contar préstamos por usuario
    try {
      const historyRes = await fetch(`${API_URL}/history`);
      cachedHistory = await historyRes.json();
    } catch (e) {
      console.error("Error al cargar historial:", e);
      cachedHistory = [];
    }

    renderUsersTable(users);
  } catch (e) {
    console.error("Error al cargar usuarios:", e);
  }
}

function renderUsersTable(users) {
  const container = document.getElementById("users-cards-container");
  if (!container) return;
  if (!users || users.length === 0) {
    container.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8"><p><i class="fas fa-users-slash" style="font-size: 2rem; margin-bottom: 12px; display: block"></i>No hay usuarios registrados</p></div>';
    return;
  }

  container.innerHTML = users
    .map((u) => {
      // Contar préstamos activos (Préstamo sin Devolución)
      const userLoans = cachedHistory.filter(
        (log) => log.username === u.username && log.status === "Préstamo",
      );
      const userReturns = cachedHistory.filter(
        (log) => log.username === u.username && log.status === "Devolución",
      ).length;

      // Obtener préstamos pendientes con detalles
      const loanDetails = userLoans
        .map((loan) => {
          const loanDate = new Date(loan.date);
          const dueDate = new Date(
            loanDate.getTime() + 14 * 24 * 60 * 60 * 1000,
          );
          const today = new Date();
          const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          const isOverdue = daysLeft < 0;
          return `
            <div style="padding:12px; background:#f8fafc; border-left:4px solid ${isOverdue ? "#ef4444" : "#f59e0b"}; margin:8px 0; border-radius:4px">
              <div style="font-weight:600; color:#0f172a">${loan.bookTitle}</div>
              <div style="font-size:0.85rem; color:#64748b; margin-top:4px">
                Prestado: ${loanDate.toLocaleDateString("es-ES")} | Vence: ${dueDate.toLocaleDateString("es-ES")} 
                <span style="color:${isOverdue ? "#ef4444" : "#f59e0b"}; font-weight:600">${isOverdue ? "⚠️ Vencido" : "⏰ " + daysLeft + "d"}</span>
              </div>
            </div>
          `;
        })
        .join("");

      const statusColor = u.blocked ? "#fee2e2" : "#dcfce7";
      const statusText = u.blocked ? "🔒 Bloqueado" : "✓ Activo";
      const statusTextColor = u.blocked ? "#ef4444" : "#10b981";

      return `
    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); transition: all 0.3s ease; cursor: pointer" onmouseover="this.style.boxShadow='0 8px 24px rgba(74, 144, 226, 0.15)'; this.style.borderColor='#4a90e2'" onmouseout="this.style.boxShadow='0 4px 12px rgba(15, 23, 42, 0.08)'; this.style.borderColor='#e2e8f0'">
      <!-- Header con usuario y estado -->
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9">
        <div>
          <h3 style="margin: 0 0 4px 0; color: #0f172a; font-size: 1.1rem"><i class="fas fa-user-circle" style="color: #4a90e2; margin-right: 8px"></i>${u.name || u.username}</h3>
          <code style="color: #64748b; font-size: 0.85rem">@${u.username}</code>
        </div>
        <span style="background: ${statusColor}; color: ${statusTextColor}; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem">${statusText}</span>
      </div>

      <!-- Información de contacto -->
      <div style="margin-bottom: 16px">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px">
          <div>
            <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600">Apellido</span>
            <p style="margin: 4px 0 0 0; color: #0f172a">${u.lastName || "–"}</p>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600">Rol</span>
            <p style="margin: 4px 0 0 0; color: #0f172a"><span style="background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 4px; font-weight: 600">${u.role === "admin" ? "🔑 Admin" : "👤 Usuario"}</span></p>
          </div>
        </div>
        <div style="margin-bottom: 12px">
          <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600">Correo</span>
          <p style="margin: 4px 0 0 0; color: #0f172a; word-break: break-all">${u.email || "–"}</p>
        </div>
        <div>
          <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600">Teléfono</span>
          <p style="margin: 4px 0 0 0; color: #0f172a">${u.phone || "–"}</p>
        </div>
      </div>

      <!-- Estadísticas de préstamos -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px">
        <div style="flex: 1; text-align: center">
          <div style="font-size: 1.8rem; font-weight: 800; color: #15803d">📦</div>
          <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px">Préstamos</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #0f172a">${userLoans.length}</div>
        </div>
        <div style="flex: 1; text-align: center">
          <div style="font-size: 1.8rem; font-weight: 800">✓</div>
          <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px">Devueltos</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #0f172a">${userReturns}</div>
        </div>
      </div>

      <!-- Detalles de préstamos si los hay -->
      ${
        userLoans.length > 0
          ? `
        <div style="margin-bottom: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px">
          <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 0.95rem"><i class="fas fa-book"></i> Préstamos Pendientes:</h4>
          ${loanDetails}
        </div>
      `
          : ""
      }

      <!-- Botones de acción -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button onclick="openEditUserModal('${u.username}')" class="action-btn edit" style="flex: 1; padding: 10px 12px; font-size: 0.85rem; min-width: 120px"><i class="fas fa-edit"></i> Editar</button>
        <button onclick="toggleBlockCurrentUser('${u.username}')" class="action-btn ${u.blocked ? "unblock" : "block"}" style="flex: 1; padding: 10px 12px; font-size: 0.85rem; min-width: 140px"><i class="fas fa-${u.blocked ? "unlock" : "lock"}"></i> ${u.blocked ? "Desbloquear" : "Bloquear"}</button>
      </div>
    </div>
  `;
    })
    .join("");
}

// Nueva función para togglear la visualización de préstamos
function toggleUserLoans(element, username) {
  const detailRow = document.querySelector(`.loans-detail-${username}`);
  if (detailRow) {
    detailRow.style.display =
      detailRow.style.display === "none" ? "table-row" : "none";
    element.style.opacity = detailRow.style.display === "none" ? "1" : "0.7";
  }
}

function openEditUserModal(username) {
  const user = cachedUsers.find((u) => u.username === username);
  if (!user) return;
  document.getElementById("edit-username").value = user.username;
  document.getElementById("edit-name").value = user.name || "";
  document.getElementById("edit-lastname").value = user.lastName || "";
  document.getElementById("edit-email").value = user.email || "";
  document.getElementById("edit-phone").value = user.phone || "";
  document.getElementById("edit-role").value = user.role || "user";
  document.getElementById("btn-block-user").dataset.username = user.username;
  document.getElementById("btn-block-user").dataset.blocked = user.blocked
    ? "1"
    : "0";
  document.getElementById("user-modal").style.display = "flex";
}

function closeUserModal() {
  document.getElementById("user-modal").style.display = "none";
}

async function saveUserChanges() {
  const username = document.getElementById("edit-username").value;
  const name = document.getElementById("edit-name").value;
  const lastName = document.getElementById("edit-lastname").value;
  const email = document.getElementById("edit-email").value;
  const phone = document.getElementById("edit-phone").value;
  const role = document.getElementById("edit-role").value;
  try {
    const res = await fetch(
      `${API_URL.replace("/books", "")}/users/${username}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lastName, email, phone, role }),
      },
    );
    const data = await res.json();
    if (res.ok) {
      Toast.success("Usuario actualizado");
      closeUserModal();
      loadAdminUsers();
    } else {
      Toast.error(data.message || "Error al actualizar usuario");
    }
  } catch (e) {
    console.error(e);
    Toast.error("Error al actualizar usuario");
  }
}

async function toggleBlockCurrentUser(username) {
  const user = cachedUsers.find((u) => u.username === username);
  if (!user) return;

  const currentlyBlocked = user.blocked;
  try {
    const res = await fetch(
      `${API_URL.replace("/books", "")}/users/${username}/block`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block: !currentlyBlocked }),
      },
    );
    const data = await res.json();
    if (res.ok) {
      Toast.success(
        currentlyBlocked ? "Usuario desbloqueado" : "Usuario bloqueado",
      );
      closeUserModal();
      loadAdminUsers();
    } else {
      Toast.error(data.message || "Error al cambiar estado");
    }
  } catch (e) {
    console.error(e);
    Toast.error("Error al cambiar estado");
  }
}

// Funciones para el Modal de Perfil
function showProfileModal() {
  const modal = document.getElementById("profile-modal");
  const user = state.currentUser;

  if (!user) return;

  // Obtener perfil extendido
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");

  // Llenar datos del usuario en vista lectura
  const displayName = userProfile.name || user.username;
  document.getElementById("profile-username").textContent = displayName;
  document.getElementById("profile-email").textContent =
    user.email || "No especificado";
  document.getElementById("profile-bio").textContent =
    userProfile.bio || "Sin bio";
  document.getElementById("profile-genres").textContent =
    userProfile.genres || "No especificados";
  document.getElementById("profile-role").textContent =
    user.role === "admin" ? "👨‍💼 Administrador" : "👤 Usuario";
  document.getElementById("profile-date").textContent =
    new Date().toLocaleDateString("es-ES");

  // Limpiar campos de contraseña
  document.getElementById("current-password").value = "";
  document.getElementById("new-password").value = "";
  document.getElementById("confirm-password").value = "";

  // Asegurarse de que está en modo lectura
  toggleEditProfile(false);

  modal.style.display = "block";
}

function closeProfileModal() {
  document.getElementById("profile-modal").style.display = "none";
  toggleEditProfile(false); // Cerrar modo edición
}

function toggleEditProfile(editMode) {
  const viewMode = document.getElementById("profile-view-mode");
  const editModeDiv = document.getElementById("profile-edit-mode");
  const btnEdit = document.getElementById("btn-edit-profile");

  if (editMode) {
    viewMode.style.display = "none";
    editModeDiv.style.display = "block";
    btnEdit.style.display = "none";
    loadProfileEditForm();
  } else {
    viewMode.style.display = "block";
    editModeDiv.style.display = "none";
    btnEdit.style.display = "block";
  }
}

function loadProfileEditForm() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  document.getElementById("edit-name").value =
    profile.name || state.currentUser.username;
  document.getElementById("edit-bio").value = profile.bio || "";
  document.getElementById("edit-photo").value = profile.photo || "";
  document.getElementById("edit-genres").value = profile.genres || "";
}

function saveProfileChanges() {
  const name = document.getElementById("edit-name").value.trim();
  const bio = document.getElementById("edit-bio").value.trim();
  const photo = document.getElementById("edit-photo").value.trim();
  const genres = document.getElementById("edit-genres").value.trim();

  if (!name) {
    Toast.error("El nombre no puede estar vacío", 3000);
    return;
  }

  // Guardar en localStorage
  const userProfile = {
    name,
    bio,
    photo,
    genres,
  };
  localStorage.setItem("userProfile", JSON.stringify(userProfile));

  // Actualizar vista
  document.getElementById("profile-username").textContent = name;
  document.getElementById("profile-bio").textContent = bio || "Sin bio";
  document.getElementById("profile-genres").textContent =
    genres || "No especificados";

  Toast.success("✅ Perfil actualizado exitosamente", 3000);
  toggleEditProfile(false);
}

async function changePassword() {
  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const user = state.currentUser;

  if (!currentPassword || !newPassword || !confirmPassword) {
    Toast.error("Todos los campos son requeridos");
    return;
  }

  if (newPassword !== confirmPassword) {
    Toast.error("Las nuevas contraseñas no coinciden");
    return;
  }

  if (newPassword.length < 4) {
    Toast.error("Nueva contraseña debe tener al menos 4 caracteres");
    return;
  }

  try {
    const response = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      Toast.success("✅ Contraseña actualizada correctamente");
      closeProfileModal();
    } else {
      Toast.error(data.message || "Error al cambiar la contraseña");
    }
  } catch (error) {
    console.error("Error:", error);
    Toast.error("Error al cambiar la contraseña");
  }
}

// Cerrar modal al presionar Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeProfileModal();
  }
});

// ===== SISTEMA DE FAVORITOS =====
function toggleFavorite(bookId) {
  const index = state.favorites.indexOf(bookId);
  if (index === -1) {
    state.favorites.push(bookId);
    Toast.success("❤️ Añadido a favoritos");
  } else {
    state.favorites.splice(index, 1);
    Toast.info("💔 Removido de favoritos");
  }
  localStorage.setItem("favorites", JSON.stringify(state.favorites));
  renderBookTable();
  loadFavorites();
}

function isFavorite(bookId) {
  return state.favorites.includes(bookId);
}

function loadFavorites() {
  const tableBody = document.getElementById("favorites-table-body");
  if (!tableBody) return;

  const favoriteBooks = state.books.filter((book) =>
    state.favorites.includes(book.bookId),
  );

  if (favoriteBooks.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8"><i class="fas fa-bookmark"></i><br />No tienes favoritos guardados. ¡Comienza a añadir libros!</td></tr>';
    return;
  }

  tableBody.innerHTML = favoriteBooks
    .map(
      (book) => `
    <tr>
      <td><strong>${book.title}</strong></td>
      <td>${book.author}</td>
      <td>${book.category || "Sin categoría"}</td>
      <td>
        ${
          book.stockDisponible > 0
            ? `<span style="color: #10b981">✅ Disponible (${book.stockDisponible})</span>`
            : '<span style="color: #ef4444">❌ No disponible</span>'
        }
      </td>
      <td>
        <button
          onclick="handleLoan('${book.bookId}')"
          style="padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;"
          ${book.stockDisponible === 0 ? "disabled" : ""}
        >
          📖 Prestar
        </button>
        <button
          onclick="toggleFavorite('${book.bookId}')"
          style="padding: 5px 10px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer;"
        >
          ❌ Quitar
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function showFavorites() {
  document.getElementById("welcome-section").style.display = "none";
  document.getElementById("my-loans-section").style.display = "none";
  document.getElementById("my-favorites-section").style.display = "block";
  document.getElementById("admin-tabs-container").style.display = "none";
  loadFavorites();
}

// ===== DESCARGA DE REPORTES =====
async function downloadLoansCSV() {
  try {
    const response = await fetch(
      `${API_URL}/user/${state.currentUser.username}/loans`,
    );
    const loans = await response.json();

    if (!loans || loans.length === 0) {
      Toast.error("No hay préstamos para descargar");
      return;
    }

    // Preparar datos CSV
    let csv =
      "Libro,Autor,Fecha Préstamo,Fecha Devolución,Días Restantes,Estado\n";

    loans.forEach((loan) => {
      const loanDate = new Date(loan.date);
      const dueDate = new Date(loanDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const status =
        daysLeft < 0
          ? "Vencido"
          : daysLeft <= 3
            ? "Próximo a vencer"
            : "En plazo";

      const book = state.books.find((b) => b.title === loan.bookTitle);
      const author = book ? book.author : "Desconocido";

      csv += `"${loan.bookTitle}","${author}","${loanDate.toLocaleString()}","${dueDate.toLocaleString()}","${Math.abs(daysLeft)}","${status}"\n`;
    });

    // Crear blob y descargar
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prestamos-${state.currentUser.username}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Toast.success("📊 Reporte CSV descargado");
  } catch (error) {
    console.error("Error al descargar CSV:", error);
    Toast.error("Error al descargar reporte");
  }
}

async function downloadLoansPDF() {
  try {
    const response = await fetch(
      `${API_URL}/user/${state.currentUser.username}/loans`,
    );
    const loans = await response.json();

    if (!loans || loans.length === 0) {
      Toast.error("No hay préstamos para descargar");
      return;
    }

    // Crear HTML para PDF textual bien ordenado
    const today = new Date();
    const dateString = today.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            color: #1e293b;
            background: white;
            line-height: 1.6;
          }
          .page { max-width: 900px; margin: 0 auto; padding: 40px 30px; }
          .header { 
            border-bottom: 3px solid #4a90e2;
            margin-bottom: 30px;
            padding-bottom: 20px;
          }
          .header h1 { 
            font-size: 2.2rem; 
            color: #357abd;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          .header p { 
            color: #64748b;
            font-size: 0.95rem;
          }
          .metadata {
            background: #f8fafc;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #4a90e2;
          }
          .metadata-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.95rem;
          }
          .metadata-row:last-child { margin-bottom: 0; }
          .metadata-label { font-weight: 600; color: #357abd; }
          .metadata-value { color: #1e293b; }
          .loans-container {
            margin-bottom: 30px;
          }
          .loan-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #4a90e2;
          }
          .loan-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #357abd;
            margin-bottom: 12px;
          }
          .loan-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 0.9rem;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-weight: 600; }
          .detail-value { color: #1e293b; font-weight: 500; }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.85rem;
            margin-top: 10px;
          }
          .status-vencido { 
            background: #fee2e2; 
            color: #b91c1c;
          }
          .status-proximo { 
            background: #fef3c7; 
            color: #92400e;
          }
          .status-plazo { 
            background: #dcfce7; 
            color: #15803d;
          }
          .summary {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 20px;
            border-radius: 8px;
            border-top: 2px solid #4a90e2;
            margin-bottom: 30px;
          }
          .summary-title {
            font-weight: 700;
            color: #357abd;
            margin-bottom: 12px;
            font-size: 0.95rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .summary-stats {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
          }
          .stat-item {
            text-align: center;
          }
          .stat-number {
            font-size: 1.8rem;
            font-weight: 700;
            color: #357abd;
          }
          .stat-label {
            font-size: 0.85rem;
            color: #64748b;
            margin-top: 5px;
          }
          .footer {
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
            text-align: center;
            color: #64748b;
            font-size: 0.85rem;
            margin-top: 40px;
          }
          .footer-company {
            color: #357abd;
            font-weight: 700;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>📚 Reporte de Préstamos</h1>
            <p>Biblioteca Virtual SENA - Sistema de Gestión</p>
          </div>

          <div class="metadata">
            <div class="metadata-row">
              <span class="metadata-label">👤 Usuario:</span>
              <span class="metadata-value">${state.currentUser.username}</span>
            </div>
            <div class="metadata-row">
              <span class="metadata-label">📅 Fecha de Generación:</span>
              <span class="metadata-value">${dateString}</span>
            </div>
            <div class="metadata-row">
              <span class="metadata-label">📖 Total de Préstamos:</span>
              <span class="metadata-value">${loans.length}</span>
            </div>
          </div>

          <div class="summary">
            <div class="summary-title">📊 Resumen de Préstamos</div>
            <div class="summary-stats">
              <div class="stat-item">
                <div class="stat-number">${
                  loans.filter((l) => {
                    const loanDate = new Date(l.date);
                    const dueDate = new Date(
                      loanDate.getTime() + 14 * 24 * 60 * 60 * 1000,
                    );
                    const daysLeft = Math.ceil(
                      (dueDate - new Date()) / (1000 * 60 * 60 * 24),
                    );
                    return daysLeft >= 0;
                  }).length
                }</div>
                <div class="stat-label">✓ En Plazo</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${
                  loans.filter((l) => {
                    const loanDate = new Date(l.date);
                    const dueDate = new Date(
                      loanDate.getTime() + 14 * 24 * 60 * 60 * 1000,
                    );
                    const daysLeft = Math.ceil(
                      (dueDate - new Date()) / (1000 * 60 * 60 * 24),
                    );
                    return daysLeft < 0;
                  }).length
                }</div>
                <div class="stat-label">⚠️ Vencidos</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${
                  loans.filter((l) => {
                    const loanDate = new Date(l.date);
                    const dueDate = new Date(
                      loanDate.getTime() + 14 * 24 * 60 * 60 * 1000,
                    );
                    const daysLeft = Math.ceil(
                      (dueDate - new Date()) / (1000 * 60 * 60 * 24),
                    );
                    return daysLeft >= 0 && daysLeft <= 3;
                  }).length
                }</div>
                <div class="stat-label">⚡ Por Vencer</div>
              </div>
            </div>
          </div>

          <div class="loans-container">
    `;

    // Ordenar préstamos: primero vencidos, luego por vencer, luego en plazo
    const sortedLoans = loans.sort((a, b) => {
      const getStatus = (loan) => {
        const loanDate = new Date(loan.date);
        const dueDate = new Date(loanDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.ceil(
          (dueDate - new Date()) / (1000 * 60 * 60 * 24),
        );
        if (daysLeft < 0) return 0; // vencidos primero
        if (daysLeft <= 3) return 1; // por vencer
        return 2; // en plazo
      };
      return getStatus(a) - getStatus(b);
    });

    sortedLoans.forEach((loan) => {
      const loanDate = new Date(loan.date);
      const dueDate = new Date(loanDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const dayObj = new Date();
      const daysLeft = Math.ceil((dueDate - dayObj) / (1000 * 60 * 60 * 24));

      let statusHtml, statusClass;
      if (daysLeft < 0) {
        statusHtml = "⚠️ VENCIDO";
        statusClass = "status-vencido";
      } else if (daysLeft <= 3) {
        statusHtml = "⚡ PRÓXIMO A VENCER";
        statusClass = "status-proximo";
      } else {
        statusHtml = "✓ EN PLAZO";
        statusClass = "status-plazo";
      }

      html += `
        <div class="loan-item">
          <div class="loan-title">${loan.bookTitle}</div>
          <div class="loan-details">
            <div>
              <div class="detail-row">
                <span class="detail-label">Fecha de Préstamo:</span>
                <span class="detail-value">${loanDate.toLocaleDateString("es-ES")}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de Devolución:</span>
                <span class="detail-value">${dueDate.toLocaleDateString("es-ES")}</span>
              </div>
            </div>
            <div>
              <div class="detail-row">
                <span class="detail-label">Días Restantes:</span>
                <span class="detail-value" style="font-weight: 700; color: #357abd;">${Math.abs(daysLeft)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Días de Préstamo:</span>
                <span class="detail-value">14 días</span>
              </div>
            </div>
          </div>
          <span class="status-badge ${statusClass}">${statusHtml}</span>
        </div>
      `;
    });

    html += `
          </div>

          <div class="footer">
            <div class="footer-company">📚 Biblioteca Virtual SENA</div>
            <p>Documento generado automáticamente el ${today.toLocaleString("es-ES")}</p>
            <p style="margin-top: 8px; color: #94a3b8;">Este reporte contiene información detallada de tus préstamos activos</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Usar html2pdf con mejor configuración
    const element = document.createElement("div");
    element.innerHTML = html;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `prestamos-${state.currentUser.username}-${today.toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };
    html2pdf().set(opt).from(element).save();

    Toast.success("📄 Reporte PDF descargado");
  } catch (error) {
    console.error("Error al descargar PDF:", error);
    Toast.error("Error al descargar reporte PDF");
  }
}

async function downloadCatalogPDF() {
  try {
    const today = new Date();
    const dateString = today.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const fileDate = today.toISOString().slice(0, 10);

    // Crear HTML para PDF con mejor diseño
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            background: white;
          }
          .header {
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            color: white;
            padding: 40px 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(74, 144, 226, 0.2);
          }
          .header h1 {
            font-size: 2.2rem;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          .header p {
            font-size: 1rem;
            opacity: 0.95;
          }
          .info-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-box {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #4a90e2;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .info-box label {
            display: block;
            color: #64748b;
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-box .value {
            color: #357abd;
            font-size: 1.5rem;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            overflow: hidden;
          }
          thead {
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          }
          th {
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
            font-size: 0.95rem;
          }
          tbody tr:nth-child(odd) {
            background-color: #f8fafc;
          }
          tbody tr:hover {
            background-color: #f0f4f8;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          .status-disponible {
            background: #dcfce7;
            color: #15803d;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.85rem;
            display: inline-block;
          }
          .status-agotado {
            background: #fee2e2;
            color: #b91c1c;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.85rem;
            display: inline-block;
          }
          .book-id {
            color: #357abd;
            font-weight: 700;
            font-family: 'Courier New', monospace;
          }
          .book-title {
            color: #4a90e2;
            font-weight: 600;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            color: #64748b;
            font-size: 0.9rem;
            text-align: center;
          }
          .footer-company {
            color: #357abd;
            font-weight: 700;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📚 Catálogo de Libros</h1>
          <p>Biblioteca Virtual - Reporte Completo del Catálogo</p>
        </div>

        <div class="info-section">
          <div class="info-box">
            <label>Fecha de Generación</label>
            <div class="value">${dateString}</div>
          </div>
          <div class="info-box">
            <label>Total de Libros</label>
            <div class="value">${state.books.length}</div>
          </div>
          <div class="info-box">
            <label>Libros Disponibles</label>
            <div class="value">${state.books.filter((b) => b.isAvailable).length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>📖 ID</th>
              <th>📚 Título</th>
              <th>✍️ Autor</th>
              <th>📂 Categoría</th>
              <th>📍 ISBN</th>
              <th>📦 Stock</th>
              <th>✓ Disponibles</th>
              <th>📊 Estado</th>
            </tr>
          </thead>
          <tbody>
            ${state.books
              .map(
                (book) => `
              <tr>
                <td class="book-id">${book.bookId}</td>
                <td class="book-title"><strong>${book.title}</strong></td>
                <td>${book.author}</td>
                <td>${book.category || "Sin categoría"}</td>
                <td>${book.isbn || "N/A"}</td>
                <td style="text-align: center; font-weight: 600;">${book.quantity}</td>
                <td style="text-align: center; font-weight: 600; color: #357abd;">${book.availableCopies}</td>
                <td>
                  <span class="status-${book.isAvailable ? "disponible" : "agotado"}">
                    ${book.isAvailable ? "✓ Disponible" : "✗ Agotado"}
                  </span>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <div class="footer-company">📚 Biblioteca Virtual SENA</div>
          <p>Este documento fue generado automáticamente el ${dateString}</p>
          <p style="margin-top: 8px; font-size: 0.85rem;">Sistema de Gestión de Biblioteca Virtual</p>
        </div>
      </body>
      </html>
    `;

    // Crear elemento temporal para renderizar
    const element = document.createElement("div");
    element.innerHTML = htmlContent;

    // Usar html2pdf con mejor configuración
    const opt = {
      margin: 10,
      filename: `Catalogo-Libros-${fileDate}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    html2pdf().set(opt).from(element.innerHTML).save();

    Toast.success("📥 Catálogo PDF descargado");
  } catch (error) {
    console.error("Error al descargar catálogo PDF:", error);
    Toast.error("Error al descargar catálogo PDF");
  }
}
