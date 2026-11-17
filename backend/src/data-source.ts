import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Empresa } from './entities/Empresa';
import { Evidencia } from './entities/Evidencia';
import { Expediente } from './entities/Expediente';
import { Liquidacion } from './entities/Liquidacion';
import { Requisito } from './entities/Requisito';
import { Trabajador } from './entities/Trabajador';

const dbPath = process.env.DB_PATH || './dev.db';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: dbPath,
  synchronize: true,
  entities: [Empresa, Trabajador, Expediente, Requisito, Evidencia, Liquidacion],
});
