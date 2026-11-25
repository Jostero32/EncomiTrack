# Sistema de Roles de Pago (Ecuador)

MVP de nómina con **régimen laboral, décimo tercero, décimo cuarto y horas extras parametrizados**, para empleados del
**Código de Trabajo** (sector privado), **LOSEP** (sector público) y **LOEP** (empresas públicas). Todos los valores
legales se editan desde la interfaz, sin tocar el código.

## Instalación y uso

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run db:init     # crea data/nomina.db (migración idempotente)
npm run db:seed     # carga empresa, parámetros, cargos y empleados del organigrama, novedades y el rol del mes anterior
npm run dev         # http://localhost:3000
```

Otros comandos:

| Comando | Descripción |
|---|---|
| `npm test` | Pruebas del motor de cálculo (vitest) |
| `npm run build && npm start` | Versión de producción |

> `npm run db:seed` **borra los datos existentes** y vuelve a cargar los de ejemplo (conserva el logo cargado).

## Flujo de uso

0. **Configuración → Empresa**: razón social, RUC, dirección y logo (PNG, JPG, WebP o SVG). El logo se usa en el
   menú, los PDF y el Excel; mientras no se cargue uno se muestra el genérico de `public/brand/`.
1. **Configuración → Cálculo de nómina**: revisar/editar valores (pestañas Global, Código de Trabajo, LOSEP y LOEP). Cada edición pide un periodo de
   vigencia: se cierra la versión anterior y se crea una nueva, por lo que los periodos anteriores conservan su valor.
2. **Configuración → Catálogo salarial**: consultar y filtrar 106 cargos oficiales aplicables a una empresa de software
   (TIC, administración, profesionales, seguridad y servicios técnicos), además de crear versiones por año. El catálogo
   conserva los códigos IESS y valores oficiales 2025; para CT 2026 compara cada uno con el piso transitorio de USD 482.
3. **Cargos**: crear puestos internos y vincularlos con un cargo oficial para CT, LOSEP o LOEP. Al elegir una fila CT se
   heredan automáticamente su código IESS y estructura A1–E2; empleados y organigrama reciben esa configuración.
   El campo **Reporta a** define la jerarquía por puesto (se impiden ciclos).
4. **Empleados**: crear/editar/desactivar y seleccionar un cargo. El mínimo vigente se propone automáticamente y el
   servidor impide guardar un sueldo mensual inferior. Los cambios crean historial con fecha y motivo.
5. **Organización**: dos vistas. *Por jerarquía* dibuja el árbol de cargos según «Reporta a» (un puesto vacante
   aparece como «Por definir» solo si tiene subordinados). *Por nivel ocupacional* agrupa al personal de A a E,
   incluyendo empleados inactivos y registros antiguos pendientes de clasificación.
6. **Novedades**: por periodo, registrar horas nocturnas, suplementarias, extraordinarias, otros ingresos y descuentos.
   En **Otros descuentos → Detallar**, agregar conceptos e importes (por ejemplo, anticipo de sueldo o cuota de préstamo), aplicar el detalle y guardar las novedades. El total se calcula automáticamente; no administra préstamos ni cuotas futuras.
   Se advierte (con confirmación) si las suplementarias superan los límites configurados.
7. **Generar rol**: elegir periodo (y opcionalmente régimen) → *Calcular* (vista previa) → *Generar y guardar*. Clic en
   una fila muestra el rol individual. Si el periodo ya tenía rol, se pide confirmación para regenerarlo.
8. **Historial**: roles guardados por periodo; reimpresión en PDF y exportación a Excel.

Exportaciones:

- `GET /api/roles/[periodo]/empleado/[id]/pdf`: rol individual (A4, con firma del empleado)
- `GET /api/roles/[periodo]/pdf`: consolidado (A3 horizontal), con desglose de descuentos manuales.
- `GET /api/roles/[periodo]/excel`: hojas *Resumen*, *Detalle por concepto*, *Modalidades de pago* y *Descuentos por concepto* (montos numéricos con formato de moneda y totales con `SUM`).

### Demostración sugerida

1. En **Historial** ya está el rol del mes anterior (generado por el seed).
2. En **Configuración → Cálculo de nómina → LOSEP**, editar *Recargo horas suplementarias* (ej. 25 → 50) con vigencia desde el mes actual.
3. En **Generar rol**, calcular el mes actual: cambian las horas suplementarias de los empleados LOSEP.
4. El rol del mes anterior en el Historial no cambia (y aunque se recalcule, usa el valor vigente en ese periodo).

## Reglas de cálculo

Motor en `src/lib/payroll/engine.ts` (funciones puras, sin acceso a base de datos). Mes comercial de 30 días.

| Concepto | Fórmula |
|---|---|
| Sueldo | sueldo base × días trabajados / 30 (proporcional si ingresó en el mes) |
| Valor hora | sueldo base / `divisor_horas_mes` |
| Recargo nocturno | horas × valor hora × `recargo_nocturno_pct` |
| Horas suplementarias | horas × valor hora × (1 + `recargo_suplementaria_pct`) |
| Horas extraordinarias | horas × valor hora × (1 + `recargo_extraordinaria_pct`) |
| **Base IESS** | sueldo + horas extras + otros ingresos (sin décimos ni fondos de reserva) |
| 13.º mensualizado | base IESS / 12 |
| 14.º mensualizado | `sbu` / 12 × días / 30 |
| Fondos de reserva | base IESS × `fondos_reserva_pct`, desde el primer aniversario; pago directo o con destino IESS |
| Aporte personal IESS | base IESS × `iess_aporte_personal` |
| Neto | ingresos pagaderos (incluidos pagos de décimos acumulados) − aporte personal − retención IR registrada − otros descuentos |
| Provisiones | aporte patronal (base IESS × `iess_aporte_patronal`) y 13.º/14.º cuando el empleado **no** mensualiza |

- **Dinero sin punto flotante**: los importes se guardan en centavos enteros y se calculan con `bigint`; los porcentajes
  y parámetros se leen como texto y se convierten a enteros escalados. Cada concepto se redondea a centavos (half-up).
- Las diferencias entre regímenes salen **solo** de la tabla `parametros` (no hay `if (regimen === ...)` en el motor).
- Los parámetros se resuelven por vigencia al primer día del periodo calculado. El sueldo se obtiene de su historial
  vigente al cierre del mes, y el cálculo advierte si quedó por debajo de la escala aplicable.
- El rol guardado incluye una copia del detalle (`detalle_json`) con los datos del empleado y los parámetros usados,
  así que la reimpresión muestra exactamente lo calculado en su momento.
- Límite diario de suplementarias: como las novedades son mensuales, se compara contra
  `limite_suplementarias_dia` × días laborables estimados (22 × días trabajados / 30).

## Estructura

```
scripts/            db-init.ts, db-seed.ts
src/lib/brand.ts    colores y nombre del sistema (los mismos tokens están en src/app/globals.css)
src/lib/parametros-meta.ts  nombres legibles y grupos de cada parámetro
src/lib/money.ts    utilidades de centavos/bigint y formato USD
src/lib/cedula.ts   validación módulo 10
src/lib/repo.ts     acceso a datos (SQLite / better-sqlite3)
src/lib/payroll/    engine.ts (motor puro), engine.test.ts, service.ts (orquestación y persistencia)
src/lib/export/     excel.ts (exceljs), pdf.tsx (@react-pdf/renderer)
src/components/ui/  componentes compartidos (PageHeader, StatCard, Toolbar, EmptyState, ConfirmDialog…)
src/app/            pantallas (App Router) y rutas /api
```

## Supuestos y valores a verificar

Los parámetros cargados son **de referencia** y deben verificarse con la normativa vigente antes de usarse:

- `sbu`: 460 (2024), 470 (2025), **482 (2026)**
- Aporte personal IESS 9.45 %, patronal 11.15 % (en el sector público el aporte patronal puede ser distinto; editable por régimen)
- Fondos de reserva 8.33 % desde el segundo año de servicio
- Recargos CT: nocturno 25 %, suplementarias 50 %, extraordinarias 100 %
- Recargos LOSEP: nocturno 25 %, suplementarias 25 %, extraordinarias 100 %
- Límites de suplementarias: 60 h/mes y 4 h/día; divisor de 240 h/mes
- Todos los "otros ingresos" se consideran gravados para el IESS.
- Los fondos de reserva pueden pagarse en el rol o mostrarse con destino IESS; el sistema no ejecuta ni acredita depósitos.
- La región se guarda para referencia (fecha de pago del 14.º acumulado), sin afectar el cálculo mensual.

## Trabajo futuro (fuera del MVP)

Proyección y cálculo automático del impuesto a la renta (la retención validada se registra en Novedades),
liquidaciones/finiquitos, utilidades (15 %), vacaciones, gestión de préstamos quirografarios/hipotecarios,
conciliación de depósitos IESS, liquidación anual de ciclos de décimos, autenticación, roles de usuario y soporte multiempresa.

## Análisis de ampliación de nómina

El [análisis de nómina CT con corte al 26 de octubre de 2026](docs/nomina-ct-ecuador-2026-10.md)
documenta las fuentes consultadas, ingresos, descuentos, aportes de ambas partes, décimos, fondos de reserva,
impuesto a la renta y la propuesta de implementación. Incluye correcciones a referencias anteriores y al uso
de un límite mensual de horas suplementarias como sustituto del control semanal. El documento distingue las mejoras
implementadas de las ampliaciones futuras.

### Nómina detallada implementada

- Tabla por concepto con sueldo, recargos, cada décimo, fondos directos, descuentos, neto y aportes IESS de empleado y empleador.
- Modalidades independientes para cada décimo y destino de fondos; historial de condiciones con fecha de vigencia.
- Vista de beneficios con saldo anterior, devengado, pago y saldo registrado. En Novedades se registran los pagos de décimos y la retención IR validada.
- Los pagos acumulados no pueden superar el saldo registrado; regenerar el mismo mes no duplica el pago. Los meses ausentes no se inventan ni se calculan automáticamente.
- PDF y Excel comparten el desglose de la pantalla; el consolidado PDF usa A3 horizontal para mantener la legibilidad.
- **Configuración → Guía de nómina** explica conceptos, modalidades y fuentes.
- Migración de la base existente a CT con vigencia octubre de 2026, conservando CT/LOSEP/LOEP y los roles históricos. El seed crea empleados CT; no se debe ejecutar sobre datos que se quieran conservar.
