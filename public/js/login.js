// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", function () {
  console.log("✓ Login page loaded");

  // Obtener elementos del DOM
  const loginForm = document.getElementById("login-form");
  const errorDiv = document.getElementById("error-message");
  const submitBtn = document.querySelector(".submit-btn");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  // Verificar que todos los elementos existen
  if (
    !loginForm ||
    !errorDiv ||
    !submitBtn ||
    !usernameInput ||
    !passwordInput
  ) {
    console.error("❌ Error: Elementos del formulario no encontrados");
    return;
  }

  // Evento principal del login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Validar campos
    if (!username || !password) {
      showError("Por favor completa todos los campos");
      return;
    }

    // Desactivar botón y mostrar estado de carga
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Éxito - guardar usuario y limpiar localStorage anterior
        localStorage.clear(); // Limpiar datos del usuario anterior
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("favorites", JSON.stringify([])); // Inicializar favoritos vacío

        // Animación de éxito
        submitBtn.innerHTML =
          '<i class="fas fa-check-circle"></i> ¡Bienvenido!';
        submitBtn.style.background =
          "linear-gradient(135deg, #10b981 0%, #059669 100%)";

        // Esperar 1.5 segundos y redirigir
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      } else {
        showError(data.message || "Usuario o contraseña incorrectos");
        setLoading(false);
      }
    } catch (error) {
      console.error("Request error:", error);
      showError("Error de conexión con el servidor. Intenta de nuevo.");
      setLoading(false);
    }
  });

  function showError(message) {
    if (errorDiv) {
      errorDiv.innerText = message;
      errorDiv.classList.add("show");

      // Auto-ocultar el error después de 5 segundos
      setTimeout(() => {
        errorDiv.classList.remove("show");
      }, 5000);
    }
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    if (loading) {
      submitBtn.classList.add("loading");
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    } else {
      submitBtn.classList.remove("loading");
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
  }

  // Permitir tecla Enter para enviar el formulario
  [usernameInput, passwordInput].forEach((input) => {
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          loginForm.dispatchEvent(new Event("submit"));
        }
      });
    }
  });

  // Limpiar mensaje de error cuando el usuario escribe
  if (usernameInput) {
    usernameInput.addEventListener("input", () => {
      if (errorDiv) errorDiv.classList.remove("show");
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", () => {
      if (errorDiv) errorDiv.classList.remove("show");
    });
  }
});

// Registro de usuarios (si existe)
document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("register-form");
  const regErrorDiv = document.getElementById("register-error");
  const regSubmitBtn = document.getElementById("reg-submit");

  if (!registerForm) return; // Si no existe el formulario de registro, salir

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username =
      document.getElementById("reg-username")?.value.trim() || "";
    const password = document.getElementById("reg-password")?.value || "";
    const confirmPassword =
      document.getElementById("reg-confirm-password")?.value || "";
    const firstName =
      document.getElementById("reg-firstname")?.value.trim() || "";
    const lastName =
      document.getElementById("reg-lastname")?.value.trim() || "";
    const phone = document.getElementById("reg-phone")?.value.trim() || "";
    const email = document.getElementById("reg-email")?.value.trim() || "";

    // Validaciones básicas
    if (
      !username ||
      !password ||
      !confirmPassword ||
      !firstName ||
      !lastName ||
      !email
    ) {
      showRegError("Por favor completa todos los campos obligatorios");
      return;
    }
    if (username.length < 3) {
      showRegError("Usuario debe tener al menos 3 caracteres");
      return;
    }
    if (password.length < 4) {
      showRegError("Contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      showRegError("Las contraseñas no coinciden");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showRegError("Email inválido");
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          confirmPassword,
          firstName,
          lastName,
          phone,
          email,
        }),
      });

      const data = await res.json();
      if (res.ok || res.status === 201) {
        // Registro exitoso
        if (window.Swal) {
          Swal.fire({
            icon: "success",
            title: "¡Cuenta Creada!",
            text: `Usuario "${username}" creado exitosamente. Ahora puedes iniciar sesión.`,
            confirmButtonColor: "#10b981",
            confirmButtonText: "Ir a Login",
          }).then(() => {
            const registerContainer =
              document.getElementById("register-container");
            const loginForm = document.getElementById("login-form");
            if (registerContainer) registerContainer.style.display = "none";
            if (loginForm) loginForm.style.display = "block";
            registerForm.reset();
            setRegLoading(false);
            const usernameInput = document.getElementById("username");
            if (usernameInput) usernameInput.focus();
          });
        } else {
          alert("¡Cuenta creada! Ahora puedes iniciar sesión.");
          registerForm.reset();
          setRegLoading(false);
        }
      } else {
        showRegError(data.message || "Error: No se pudo crear la cuenta");
        setRegLoading(false);
      }
    } catch (err) {
      console.error("Error en registro:", err);
      showRegError("Error de conexión con el servidor. Intenta de nuevo.");
      setRegLoading(false);
    }
  });

  function showRegError(msg) {
    if (regErrorDiv) {
      regErrorDiv.innerText = msg;
      regErrorDiv.classList.add("show");
      setTimeout(() => regErrorDiv.classList.remove("show"), 5000);
    }
  }

  function setRegLoading(loading) {
    if (regSubmitBtn) {
      regSubmitBtn.disabled = loading;
      if (loading) {
        regSubmitBtn.classList.add("loading");
        regSubmitBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Creando...';
      } else {
        regSubmitBtn.classList.remove("loading");
        regSubmitBtn.innerHTML = "Crear Cuenta";
      }
    }
  }
});

// Mostrar / ocultar formulario de registro
const showRegisterBtn = document.getElementById("show-register-btn");
const registerContainer = document.getElementById("register-container");
const cancelRegisterBtn = document.getElementById("cancel-register-btn");

if (showRegisterBtn && registerContainer) {
  showRegisterBtn.addEventListener("click", () => {
    registerContainer.style.display = "block";
    if (loginForm) loginForm.style.display = "none";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

if (cancelRegisterBtn && registerContainer) {
  cancelRegisterBtn.addEventListener("click", () => {
    registerContainer.style.display = "none";
    if (loginForm) loginForm.style.display = "block";
  });
}
