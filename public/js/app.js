// public/js/app.js

/**
 * @const {string} API_BASE_URL - Base URL for the backend API.
 */
const API_BASE_URL = "http://localhost:3000/api";

// --- Elementos del DOM ---
const loginSection = document.getElementById("login-section");
const homeSection = document.getElementById("home-section");
const inventorySection = document.getElementById("inventory-section");

const navHome = document.getElementById("nav-home");
const navInventory = document.getElementById("nav-inventory");
const navLogin = document.getElementById("nav-login");
const navLogout = document.getElementById("nav-logout");

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const showBooksButton = document.getElementById("show-books-button");
const bookListTableBody = document.querySelector("#book-list-table tbody");
const bookActionMessage = document.getElementById("book-action-message");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");

const addBookForm = document.getElementById("add-book-form");
const addBookMessage = document.getElementById("add-book-message");
const manageBookSearchInput = document.getElementById("manage-book-search");
const manageSearchButton = document.getElementById("manage-search-button");
const manageSearchMessage = document.getElementById("manage-search-message");
const manageBookDetails = document.getElementById("manage-book-details");
const manageBookTitleDisplay = document.getElementById(
  "manage-book-title-display"
);
const updateBookForm = document.getElementById("update-book-form");
const updateBookIdInput = document.getElementById("update-bookId");
const updateTitleInput = document.getElementById("update-title");
const updateAuthorInput = document.getElementById("update-author");
const updateIsbnInput = document.getElementById("update-isbn");
const updateQuantityInput = document.getElementById("update-quantity");
const deleteBookButton = document.getElementById("delete-book-button");
const updateDeleteMessage = document.getElementById("update-delete-message");

let currentUser = null; // Variable para simular el usuario logeado

// --- Funciones de Utilidad ---

/**
 * @function showSection
 * @description Hides all sections and shows the specified one.
 * @param {HTMLElement} sectionElement - The section to show.
 */
function showSection(sectionElement) {
  [loginSection, homeSection, inventorySection].forEach((section) => {
    section.style.display = "none";
    section.classList.remove("active");
  });
  sectionElement.style.display = "block";
  sectionElement.classList.add("active");
}

/**
 * @function displayMessage
 * @description Displays a message in a specific DOM element.
 * @param {HTMLElement} element - The DOM element to display the message in.
 * @param {string} message - The message text.
 * @param {string} type - The type of message (success, error, info).
 */
function displayMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = "block";
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

/**
 * @function clearTable
 * @description Clears all rows from the book list table body.
 */
function clearTable() {
  bookListTableBody.innerHTML = "";
}

/**
 * @function checkAuthentication
 * @description Checks if a user is logged in and updates UI accordingly.
 */
function checkAuthentication() {
  if (currentUser) {
    navLogin.style.display = "none";
    navLogout.style.display = "inline";
    if (currentUser.role === "admin") {
      // Asumiendo un rol de admin para gestionar inventario
      navInventory.style.display = "inline";
    } else {
      navInventory.style.display = "none";
    }
    showSection(homeSection);
  } else {
    navLogin.style.display = "inline";
    navLogout.style.display = "none";
    navInventory.style.display = "none";
    showSection(loginSection);
  }
}

// --- Lógica de Autenticación (Simulada) ---

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Simulación de autenticación:
  // Usuario 'admin', Contraseña 'admin123' -> rol 'admin'
  // Usuario 'user', Contraseña 'user123' -> rol 'user'
  if (username === "admin" && password === "admin123") {
    currentUser = { username: "admin", role: "admin" };
    displayMessage(
      loginMessage,
      "Inicio de sesión exitoso. ¡Bienvenido, Administrador!",
      "success"
    );
    checkAuthentication();
  } else if (username === "user" && password === "user123") {
    currentUser = { username: "user", role: "user" };
    displayMessage(
      loginMessage,
      "Inicio de sesión exitoso. ¡Bienvenido, Usuario!",
      "success"
    );
    checkAuthentication();
  } else {
    displayMessage(loginMessage, "Usuario o contraseña incorrectos.", "error");
    currentUser = null;
  }
  loginForm.reset();
});

navLogout.addEventListener("click", (event) => {
  event.preventDefault();
  currentUser = null;
  displayMessage(loginMessage, "Has cerrado sesión.", "info");
  checkAuthentication();
  clearTable(); // Limpiar tabla de libros al cerrar sesión
});

// --- Funcionalidades de Libros (API) ---

/**
 * @function fetchBooks
 * @description Fetches all books from the API and displays them.
 * @param {string} [searchTerm=''] - Optional search term to filter books.
 */
async function fetchBooks(searchTerm = "") {
  try {
    const response = await fetch(`${API_BASE_URL}/books`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let books = await response.json();

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      books = books.filter(
        (book) =>
          book.title.toLowerCase().includes(lowerCaseSearchTerm) ||
          book.author.toLowerCase().includes(lowerCaseSearchTerm) ||
          book.isbn.toLowerCase().includes(lowerCaseSearchTerm) ||
          book.bookId.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    clearTable(); // Limpiar antes de rellenar
    if (books.length === 0) {
      bookListTableBody.innerHTML =
        '<tr><td colspan="7">No se encontraron libros.</td></tr>';
      return;
    }

    books.forEach((book) => {
      const row = bookListTableBody.insertRow();
      row.insertCell(0).textContent = book.bookId;
      row.insertCell(1).textContent = book.title;
      row.insertCell(2).textContent = book.author;
      row.insertCell(3).textContent = book.isbn;
      row.insertCell(4).textContent = book.quantity;
      row.insertCell(5).textContent = book.availableCopies;

      const actionsCell = row.insertCell(6);
      if (currentUser && currentUser.role === "user") {
        const loanButton = document.createElement("button");
        loanButton.textContent = "Prestar";
        loanButton.className = "loan-button";
        loanButton.disabled = !book.isAvailable || book.availableCopies === 0;
        loanButton.addEventListener("click", () => loanBook(book.bookId));
        actionsCell.appendChild(loanButton);

        const returnButton = document.createElement("button");
        returnButton.textContent = "Devolver";
        returnButton.className = "return-button";
        // Para simplificar, asumimos que un usuario puede devolver cualquier libro que vea
        // En una app real, se verificaría si el usuario tiene ese libro prestado
        returnButton.addEventListener("click", () => returnBook(book.bookId));
        actionsCell.appendChild(returnButton);
      } else if (currentUser && currentUser.role === "admin") {
        // Los administradores no prestan/devuelven desde esta vista, gestionan en la sección de inventario
        actionsCell.textContent = "N/A";
      } else {
        actionsCell.textContent = "Inicia sesión para acciones";
      }
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    displayMessage(
      bookActionMessage,
      "Error al cargar los libros. Inténtalo de nuevo.",
      "error"
    );
    clearTable();
    bookListTableBody.innerHTML =
      '<tr><td colspan="7">Error al cargar los libros.</td></tr>';
  }
}

/**
 * @function loanBook
 * @description Sends a request to loan a book.
 * @param {string} bookId - The ID of the book to loan.
 */
async function loanBook(bookId) {
  try {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/loan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (response.ok) {
      displayMessage(bookActionMessage, data.message, "success");
      fetchBooks(searchInput.value); // Refrescar la lista de libros
    } else {
      displayMessage(bookActionMessage, data.message, "error");
    }
  } catch (error) {
    console.error("Error loaning book:", error);
    displayMessage(
      bookActionMessage,
      "Error al prestar el libro. Inténtalo de nuevo.",
      "error"
    );
  }
}

/**
 * @function returnBook
 * @description Sends a request to return a book.
 * @param {string} bookId - The ID of the book to return.
 */
async function returnBook(bookId) {
  try {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (response.ok) {
      displayMessage(bookActionMessage, data.message, "success");
      fetchBooks(searchInput.value); // Refrescar la lista de libros
    } else {
      displayMessage(bookActionMessage, data.message, "error");
    }
  } catch (error) {
    console.error("Error returning book:", error);
    displayMessage(
      bookActionMessage,
      "Error al devolver el libro. Inténtalo de nuevo.",
      "error"
    );
  }
}

/**
 * @function addBook
 * @description Sends a request to add a new book.
 * @param {object} bookData - The data of the book to add.
 */
async function addBook(bookData) {
  try {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookData),
    });
    const data = await response.json();
    if (response.ok) {
      displayMessage(addBookMessage, data.message, "success");
      addBookForm.reset();
    } else {
      displayMessage(addBookMessage, data.message, "error");
    }
  } catch (error) {
    console.error("Error adding book:", error);
    displayMessage(
      addBookMessage,
      "Error al añadir el libro. Inténtalo de nuevo.",
      "error"
    );
  }
}

/**
 * @function getBookForManagement
 * @description Fetches a single book for management (update/delete).
 * @param {string} bookId - The ID of the book to fetch.
 */
async function getBookForManagement(bookId) {
  try {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
    const data = await response.json();
    if (response.ok) {
      manageBookDetails.style.display = "block";
      manageBookTitleDisplay.textContent = `Libro: ${data.title} (${data.bookId})`;
      updateBookIdInput.value = data.bookId;
      updateTitleInput.value = data.title;
      updateAuthorInput.value = data.author;
      updateIsbnInput.value = data.isbn;
      updateQuantityInput.value = data.quantity;
      displayMessage(manageSearchMessage, "", ""); // Clear previous message
      updateDeleteMessage.textContent = ""; // Clear update/delete message
    } else {
      displayMessage(manageSearchMessage, data.message, "error");
      manageBookDetails.style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching book for management:", error);
    displayMessage(
      manageSearchMessage,
      "Error al buscar el libro. Inténtalo de nuevo.",
      "error"
    );
    manageBookDetails.style.display = "none";
  }
}

/**
 * @function updateBook
 * @description Sends a request to update an existing book.
 * @param {string} bookId - The ID of the book to update.
 * @param {object} updatedData - The data to update.
 */
async function updateBook(bookId, updatedData) {
  try {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    const data = await response.json();
    if (response.ok) {
      displayMessage(updateDeleteMessage, data.message, "success");
      manageBookDetails.style.display = "none"; // Ocultar después de actualizar
      manageBookSearchInput.value = ""; // Limpiar búsqueda
    } else {
      displayMessage(updateDeleteMessage, data.message, "error");
    }
  } catch (error) {
    console.error("Error updating book:", error);
    displayMessage(
      updateDeleteMessage,
      "Error al actualizar el libro. Inténtalo de nuevo.",
      "error"
    );
  }
}

/**
 * @function deleteBook
 * @description Sends a request to delete a book.
 * @param {string} bookId - The ID of the book to delete.
 */
async function deleteBook(bookId) {
  if (
    !confirm(
      "¿Estás seguro de que quieres eliminar este libro? Esta acción es irreversible."
    )
  ) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (response.ok) {
      displayMessage(updateDeleteMessage, data.message, "success");
      manageBookDetails.style.display = "none"; // Ocultar después de eliminar
      manageBookSearchInput.value = ""; // Limpiar búsqueda
    } else {
      displayMessage(updateDeleteMessage, data.message, "error");
    }
  } catch (error) {
    console.error("Error deleting book:", error);
    displayMessage(
      updateDeleteMessage,
      "Error al eliminar el libro. Inténtalo de nuevo.",
      "error"
    );
  }
}

// --- Event Listeners ---

navHome.addEventListener("click", (event) => {
  event.preventDefault();
  if (currentUser) {
    showSection(homeSection);
    fetchBooks(); // Cargar libros al ir a la sección de inicio
  } else {
    displayMessage(
      loginMessage,
      "Debes iniciar sesión para acceder a esta sección.",
      "info"
    );
    showSection(loginSection);
  }
});

navInventory.addEventListener("click", (event) => {
  event.preventDefault();
  if (currentUser && currentUser.role === "admin") {
    showSection(inventorySection);
    manageBookDetails.style.display = "none"; // Asegurarse de ocultar detalles al cambiar de sección
    manageBookSearchInput.value = ""; // Limpiar búsqueda
    addBookForm.reset();
    addBookMessage.textContent = "";
    manageSearchMessage.textContent = "";
    updateDeleteMessage.textContent = "";
  } else {
    displayMessage(
      loginMessage,
      "No tienes permisos para acceder a esta sección.",
      "error"
    );
    showSection(loginSection); // O redirigir a Home si ya está logeado como user
  }
});

navLogin.addEventListener("click", (event) => {
  event.preventDefault();
  showSection(loginSection);
});

showBooksButton.addEventListener("click", () => {
  fetchBooks();
});

searchButton.addEventListener("click", () => {
  fetchBooks(searchInput.value);
});

addBookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const newBook = {
    bookId: document.getElementById("add-bookId").value,
    title: document.getElementById("add-title").value,
    author: document.getElementById("add-author").value,
    isbn: document.getElementById("add-isbn").value,
    quantity: parseInt(document.getElementById("add-quantity").value, 10),
  };
  addBook(newBook);
});

manageSearchButton.addEventListener("click", () => {
  const bookIdToManage = manageBookSearchInput.value.trim();
  if (bookIdToManage) {
    getBookForManagement(bookIdToManage);
  } else {
    displayMessage(
      manageSearchMessage,
      "Por favor, introduce el ID del libro.",
      "info"
    );
    manageBookDetails.style.display = "none";
  }
});

updateBookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const bookId = updateBookIdInput.value;
  const updatedData = {
    title: updateTitleInput.value,
    author: updateAuthorInput.value,
    isbn: updateIsbnInput.value,
    quantity: parseInt(updateQuantityInput.value, 10), // Asegurarse de parsear a número
  };
  updateBook(bookId, updatedData);
});

deleteBookButton.addEventListener("click", () => {
  const bookId = updateBookIdInput.value;
  if (bookId) {
    deleteBook(bookId);
  }
});

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", () => {
  checkAuthentication();
});
