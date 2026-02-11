/**
 * Sistema de notificaciones Toast
 * Uso: showToast("Mensaje", "success|error|info|warning", 3000)
 */

let toastContainer = null;

function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
}

function showToast(message, type = "info", duration = 3000) {
  initToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: '<i class="fas fa-check-circle toast-icon"></i>',
    error: '<i class="fas fa-exclamation-circle toast-icon"></i>',
    info: '<i class="fas fa-info-circle toast-icon"></i>',
    warning: '<i class="fas fa-exclamation-triangle toast-icon"></i>',
  };

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  toastContainer.appendChild(toast);

  // Auto-remover después de la duración especificada
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 400);
      }
    }, duration);
  }

  return toast;
}

// Aliases para comodidad
const Toast = {
  success: (msg, duration = 3000) => showToast(msg, "success", duration),
  error: (msg, duration = 4000) => showToast(msg, "error", duration),
  info: (msg, duration = 3000) => showToast(msg, "info", duration),
  warning: (msg, duration = 3500) => showToast(msg, "warning", duration),
};
