const fs = require("fs");
const path = require("path");
const loansPath = path.join(__dirname, "..", "data", "loans.json");
let loans = [];
try {
  loans = JSON.parse(fs.readFileSync(loansPath, "utf8"));
} catch (e) {
  console.error("No se pudo leer loans.json", e);
  process.exit(1);
}
let changed = false;
loans = loans.map((l) => {
  if (!l || !l.date || typeof l.date !== "string") return l;
  const d = new Date(l.date);
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString();
    if (iso !== l.date) {
      l.date = iso;
      changed = true;
    }
  }
  return l;
});
if (changed) {
  fs.writeFileSync(loansPath, JSON.stringify(loans, null, 2));
  console.log("Fechas normalizadas en loans.json");
} else {
  console.log("No se detectaron cambios necesarios");
}
