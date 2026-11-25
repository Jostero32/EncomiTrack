/** Migración idempotente: crea las tablas si no existen. */
import { DB_PATH, openDb } from "../src/lib/db/index";

const db = openDb();
const tablas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[];
console.log(`Base de datos lista en ${DB_PATH}`);
console.log(`Tablas: ${tablas.map((t) => t.name).join(", ")}`);
db.close();
