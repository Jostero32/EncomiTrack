import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AprobacionDepartamento } from './entities/AprobacionDepartamento';
import { BienAsignado } from './entities/BienAsignado';
import { Documento } from './entities/Documento';
import { Empresa } from './entities/Empresa';
import { Expediente } from './entities/Expediente';
import { Liquidacion } from './entities/Liquidacion';
import { Obligacion } from './entities/Obligacion';
import { PlantillaRequisito } from './entities/PlantillaRequisito';
import { Requisito } from './entities/Requisito';
import { Trabajador } from './entities/Trabajador';
import { VacacionGozada } from './entities/VacacionGozada';

const dbPath = process.env.DB_PATH || './dev.db';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: dbPath,
  synchronize: true,
  entities: [
    Empresa,
    Trabajador,
    Expediente,
    Requisito,
    Documento,
    Liquidacion,
    BienAsignado,
    Obligacion,
    VacacionGozada,
    PlantillaRequisito,
    AprobacionDepartamento,
  ],
});
