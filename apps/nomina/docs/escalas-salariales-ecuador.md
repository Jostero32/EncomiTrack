# Investigación para escalas salariales por régimen

Consulta realizada el 20 de octubre de 2026. El modelo descrito está implementado en **Parámetros → Catálogo salarial**.

## Hallazgo principal

La estructura ocupacional A1–E2 no basta para determinar un sueldo. El sistema deberá resolver el valor usando el régimen laboral y otros clasificadores propios de cada normativa, conservando además la vigencia histórica.

## Código del Trabajo (CT)

Las tablas de salarios mínimos sectoriales se organizan por:

1. comisión sectorial;
2. rama de actividad económica;
3. cargo o actividad específica;
4. estructura ocupacional A1–E2;
5. código IESS; y
6. salario o tarifa mínima con vigencia anual.

Dos cargos con la misma estructura pueden tener mínimos diferentes según la rama y la comisión. Por ello, A1–E2 servirá para el organigrama, pero el salario mínimo deberá enlazarse con la fila sectorial completa.

Fuente oficial consultada: [Anexo de salarios mínimos sectoriales 2025](https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/12/Anexo-1-Salarios-Minimos-Sectoriales-y-Tarifas-2025-2-1-1.pdf).

## LOSEP

La escala nacional usa grupo ocupacional, grado y remuneración mensual unificada (RMU). Además existen escalas especiales para determinados sectores o instituciones, por lo que no se debe inferir el sueldo desde A1–E2.

La resolución MRL-2012-0021 estableció la escala nacional y existen reformas posteriores, entre ellas MDT-2017-0154. Antes de cargar valores se debe consolidar la versión vigente y las escalas especiales que correspondan a la institución usuaria.

Fuentes oficiales consultadas: [Registro Oficial No. 637 — MRL-2012-0021](https://www.registroficial.gob.ec/registro-oficial-no-637-12/), [Registro Oficial No. 102 — MDT-2017-0154](https://www.registroficial.gob.ec/registro-oficial-no-102-14/).

## LOEP

La LOEP regula un régimen propio y especial. La administración de talento humano corresponde a cada empresa pública mediante su normativa interna; el Código del Trabajo actúa de manera supletoria en los ámbitos previstos. También existen límites y directrices nacionales para las remuneraciones del sector público.

Por esta razón, una futura escala LOEP debe identificar la empresa pública y la norma interna que respalda cada cargo, además de validar los techos nacionales y, cuando corresponda, contratación colectiva.

Fuentes oficiales consultadas: [criterio del Ministerio del Trabajo sobre el régimen LOEP](https://www.trabajo.gob.ec/18-los-servidores-publicos-de-carrera-de-las-empresas-publicas-pueden-participar-de-la-contratacion-colectiva/), [Acuerdo MDT-2024-039 sobre remuneraciones y techos del sector público](https://www.trabajo.gob.ec/wp-content/uploads/2024/03/ACUERDO-MINISTERIAL-NO.-039-signed.pdf).

## Modelo implementado

- `escalas_salariales`: régimen, nombre, fuente normativa, institución o empresa, vigencia y estado.
- `escala_salarial_detalles`: referencia a la escala, clasificador propio del régimen y valor en centavos.
- Para CT: comisión, rama, cargo/actividad oficial, código IESS y estructura A1–E2.
- Para LOSEP: grupo ocupacional, grado, denominación y RMU.
- Para LOEP: empresa pública, categoría o grado interno, denominación y RMU, con fuente normativa.
- `cargo_escalas`: relación entre el cargo interno, el régimen y el código estable de la fila normativa aplicable.

También se implementó `historial_sueldos`, que conserva cada valor con su vigencia y evita que un incremento anual altere roles guardados.

Al seleccionar régimen y cargo en un empleado, el sistema sugiere el sueldo vigente y bloquea valores mensuales inferiores. En CT se trata como mínimo obligatorio; en LOSEP y LOEP cada institución debe cargar y vincular su escala aplicable.

Para 2026 se registra únicamente el piso general de USD 482 como escala transitoria, respaldado por el Acuerdo MDT-2025-195. Los cálculos proporcionales publicados por terceros no se marcan como oficiales; las filas sectoriales específicas deben incorporarse desde una fuente oficial y con su código estable.

El sistema incluye 106 filas oficiales 2025 seleccionadas para una empresa de software: Comisión 12, ramas 1–3
(tecnología, sin telefonía móvil), y Comisión 19 para administración, profesionales, seguridad y servicios técnicos.
La fila elegida se vincula al cargo interno mediante el código IESS y su estructura ocupacional se hereda automáticamente.
