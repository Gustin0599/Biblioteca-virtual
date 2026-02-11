# 🚀 INICIO RÁPIDO - Deployment en Vercel + MongoDB

## Pasos Rápidos (15 minutos)

### 1️⃣ MongoDB Atlas (Gratis)

- Accede: https://www.mongodb.com/cloud/atlas
- Sign Up → Create Cluster (FREE)
- Database Access → Create User (`biblioteca_user` / contraseña)
- Network Access → Allow 0.0.0.0/0
- Connect → Copy MongoDB URI
  ```
  mongodb+srv://biblioteca_user:PASSWORD@cluster.mongodb.net/biblioteca_virtual
  ```

### 2️⃣ GitHub

```bash
git add .
git commit -m "Preparado para Vercel"
git push origin main
```

### 3️⃣ Vercel

- Ve a https://vercel.com
- Sign Up with GitHub
- "New Project" → Select `biblioteca-virtual`
- Settings → Environment Variables
- Agrega: `MONGODB_URI` = Tu URI de MongoDB
- Deploy

### 4️⃣ ¡Listo! 🎉

Tu app estará en: `https://biblioteca-virtual.vercel.app`

---

## Cambios Realizados ✅

✅ Instalado mongoose y dotenv
✅ Creados modelos: User, Book, Loan
✅ Actualizado authController para MongoDB
✅ Actualizado server/app.js
✅ Creado .env y .env.example
✅ Creado vercel.json
✅ Creada guía completa en DEPLOYMENT.md

---

## Próximos Pasos

1. Si necesitas más detalles, lee `DEPLOYMENT.md`
2. Para testing local, necesitas MongoDB instalado localmente
3. Los datos persisten en MongoDB (no se pierden en redeploys)

---

## Comandos Útiles

```bash
# Instalar dependencias
npm install

# Correr localmente
npm start

# Ver logs en Vercel
vercel logs

# Redeployar
vercel --prod
```
