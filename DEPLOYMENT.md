# 📚 Biblioteca Virtual - Guía de Deployment

Guía completa para subir tu proyecto a la web usando Vercel y MongoDB Atlas.

---

## 📋 Requisitos Previos

1. Cuenta en GitHub (https://github.com)
2. Cuenta en Vercel (https://vercel.com)
3. Cuenta en MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
4. Node.js instalado localmente (opcional, pero recomendado)

---

## 🚀 Paso 1: Preparar MongoDB Atlas (Gratis)

### 1.1 Crear una cuenta en MongoDB Atlas

- Ve a https://www.mongodb.com/cloud/atlas
- Haz clic en "Sign Up"
- Completa el registro
- Verifica tu email

### 1.2 Crear un Cluster

1. En el dashboard, haz clic en "Create" → "Build a Cluster"
2. Selecciona el plan **FREE** (M0 Sandbox)
3. Elige tu región (ej: us-east-1)
4. Haz clic en "Create Cluster" (espera 2-3 minutos)

### 1.3 Crear un Usuario de Base de Datos

1. Ve a "Database Access" en el menú izquierdo
2. Haz clic en "Add New Database User"
3. Elige "Password" como método de autenticación
4. Crea un usuario y contraseña
   - Username: `biblioteca_user`
   - Password: `TuContraseñaSegura123` (recuérdala)
5. Asigna el rol "Atlas Admin" (para desarrollo)
6. Haz clic en "Create Database User"

### 1.4 Whitelist tu IP

1. Ve a "Network Access"
2. Haz clic en "Add IP Address"
3. Selecciona "Allow access from anywhere" (0.0.0.0/0)
4. Haz clic en "Confirm"

### 1.5 Obtener la Cadena de Conexión

1. Ve al cluster que creaste
2. Haz clic en "Connect"
3. Selecciona "Connect your application"
4. Copia la cadena de conexión (MongoDB URI)
   ```
   mongodb+srv://biblioteca_user:<password>@cluster0.xxxxx.mongodb.net/biblioteca_virtual?retryWrites=true&w=majority
   ```
5. Reemplaza `<password>` con tu contraseña
6. **Guarda esta cadena** (la usarás después)

---

## 📁 Paso 2: Preparar tu Repositorio en GitHub

### 2.1 Si ya tienes un repositorio

- Sube todos tus cambios:
  ```bash
  git add .
  git commit -m "Migrate to MongoDB for cloud deployment"
  git push origin main
  ```

### 2.2 Si no tienes repositorio aún

1. Ve a https://github.com y crea un nuevo repositorio
2. Clona el repositorio:
   ```bash
   git clone https://github.com/TuUsuario/biblioteca-virtual.git
   cd biblioteca-virtual
   ```
3. Copia todos tus archivos al repositorio
4. Sube los cambios:
   ```bash
   git add .
   git commit -m "Initial commit - Biblioteca Virtual"
   git push origin main
   ```

### 2.3 Archivo .gitignore

Asegúrate de que `.gitignore` contenga:

```
node_modules/
.env
.env.local
.DS_Store
public/uploads/*
!public/uploads/.gitkeep
```

---

## 🔧 Paso 3: Desplegar en Vercel

### 3.1 Conectar GitHub a Vercel

1. Ve a https://vercel.com
2. Haz clic en "Sign Up with GitHub"
3. Autoriza a Vercel para acceder a tus repositorios

### 3.2 Importar tu Proyecto

1. En el dashboard de Vercel, haz clic en "New Project"
2. Busca tu repositorio `biblioteca-virtual`
3. Haz clic en "Import"
4. En "Project Settings", deja los valores por defecto
5. Haz clic en "Deploy" (debería fallar porque falta la variable de entorno)

### 3.3 Configurar Variables de Entorno

1. Ve al proyecto en Vercel
2. Ve a "Settings" → "Environment Variables"
3. Haz clic en "Add New"
4. Agrega:
   - **Name**: `MONGODB_URI`
   - **Value**: Tu cadena de conexión completa de MongoDB Atlas
   - **Environments**: Production, Preview, Development
5. Haz clic en "Save"

### 3.4 Redeploy

1. Ve a "Deployments"
2. Haz clic en los tres puntos del último deployment
3. Selecciona "Redeploy"
4. Espera 2-3 minutos

---

## ✅ Paso 4: Verificar el Deployment

1. Una vez completado, Vercel te dará una URL como:

   ```
   https://biblioteca-virtual.vercel.app
   ```

2. Abre esa URL en tu navegador

3. Prueba las funcionalidades:
   - Registro de nuevo usuario
   - Login
   - Ver catálogo de libros
   - Descargar PDFs
   - Panel de admin (si eres admin)

---

## 🔐 Seguridad en Producción

### Cambios de Seguridad Recomendados:

1. **Variables de Entorno**: Nunca expongas credenciales
2. **HTTPS**: Vercel proporciona HTTPS automáticamente
3. **CORS**: Agrega validación si deseas
4. **Rate Limiting**: Considera agregar límites de solicitudes
5. **Validación de Entrada**: El código actual ya valida

---

## 🐛 Solución de Problemas

### "MongoDB connection failed"

- Verifica la URI de MongoDB
- Asegúrate de que el whitelist incluye 0.0.0.0/0
- Comprueba usuario/contraseña

### "Build failed on Vercel"

- Ve a "Deployments" → "Build Logs"
- Busca errores específicos
- Asegúrate de que `package.json` tiene todas las dependencias

### "Uploads no funcionan"

- Las imágenes se guardan temporalmente en Vercel (se pierden en redeploy)
- Considera usar Cloudinary o AWS S3 para imágenes persistentes

### "El sitio carga pero no funciona"

- Abre "DevTools" (F12) → "Console"
- Revisa los errores
- Verifica que el backend esté respondiendo correctamente

---

## 📊 Monitoreo y Mantenimiento

### Ver Logs

1. En Vercel: "Deployments" → Click en un deployment
2. Ve a "Logs" para ver errores en tiempo real

### Actualizar Código

1. Haz cambios locales
2. Sube a GitHub: `git push origin main`
3. Vercel redeploya automáticamente

### Escalar MongoDB

- Usa MongoDB Atlas para agregar más capacidad
- Los planes gratuitos incluyen 512MB (suficiente para desarrollo)

---

## 🎉 ¡Listo!

Tu Biblioteca Virtual está ahora en línea y disponible para que cualquiera acceda a ella 24/7.

**URL**: `https://biblioteca-virtual.vercel.app`

---

## 📝 Notas Finales

- El backend se ejecuta sin costo en Vercel
- MongoDB Atlas tiene un plan gratuito de 512MB (suficiente para miles de registros)
- Las imágenes se pierden en redeploys (considera agregar almacenamiento externo si es crítico)
- Los datos en MongoDB persisten permanentemente

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs de Vercel
2. Verifica MongoDB Atlas status
3. Asegúrate de que `package.json` tiene todas las dependencias
4. Prueba localmente primero antes de desplegar
