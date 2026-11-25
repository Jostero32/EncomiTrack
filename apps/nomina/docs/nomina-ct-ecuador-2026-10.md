# Análisis de nómina detallada — Ecuador, Código del Trabajo

Fecha de consulta y corte: **26 de octubre de 2026**, zona America/Guayaquil.

Estado del análisis original: **investigación y propuesta de implementación**. Las reglas descritas se refieren al trabajador adulto del sector privado general, bajo relación de dependencia y jornada completa; las excepciones se identifican expresamente.

Actualización de implementación, 26 de octubre de 2026: ya se incorporaron la tabla detallada, los aportes de ambas partes, los selectores de modalidades, el destino de fondos, el historial de condiciones y la guía dentro de la aplicación. Se convirtió la base actual a CT conservando los roles históricos. Los pagos de décimos se registran en Novedades contra saldos de los roles cargados; no se realiza todavía una liquidación anual automática por ciclo ni una carga de saldos anteriores externos. La retención IR se registra por importe validado y se desglosa en el rol; la proyección tributaria automática continúa propuesta. Las secciones siguientes conservan el diagnóstico y alcance completo del análisis para distinguirlo de esta entrega.

## 1. Alcance acordado

Ampliación demostrativa implementada: descuentos manuales por concepto e importe para cada empleado y periodo, total calculado desde el detalle y desglose en pantalla, rol individual, PDF y Excel. Los montos agregados anteriores se conservan como «Otros descuentos» al editarlos; las copias de roles emitidos no se modifican. No incorpora gestión de préstamos ni cobro de cuotas futuras.

- Mantener disponibles CT, LOSEP y LOEP en el sistema.
- Preparar la conversión de todos los empleados de la base actual a CT y ajustar los datos iniciales de demostración para que las futuras cargas también sean CT.
- Generar nómina con detalle por concepto, fórmula, base, porcentaje, modalidad y destino del dinero.
- Explicar dentro de la aplicación los décimos, acumulados, descuentos, fondos de reserva y aportes de ambas partes.
- Incorporar renta y seguimiento de beneficios acumulados; conservar la información histórica.

La revisión de la base, realizada en modo de solo lectura, encontró ocho empleados: cuatro CT y cuatro LOSEP. Los cuatro cargos de los empleados LOSEP ya tienen vinculación con una referencia salarial CT. Esto permite preparar la conversión, pero aún hay que validar los mínimos de los cargos al periodo de cambio. Solo existen ocho roles de septiembre de 2026: faltan meses anteriores para reconstruir obligaciones anuales completas.

## 2. Criterio de vigencia y correcciones a referencias anteriores

Se consultaron textos normativos y publicaciones oficiales, no solo títulos de artículos que contienen «2026». Una fecha reciente de publicación de una noticia no demuestra que sus cifras sean actuales. Las propuestas legislativas no se tratan como normas aprobadas.

Hallazgos que afectan este proyecto:

1. **El MDT-2019-199 está derogado.** La respuesta anterior enlazó una pregunta frecuente oficial que todavía lo cita. El fundamento para el nuevo diseño es el **MDT-2023-140**, con su reforma **MDT-2025-053**. Esta última exige entregar roles con ingresos detallados, incluidos décimos, y conservar los documentos. [Acuerdo original](https://www.trabajo.gob.ec/wp-content/uploads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf), [reforma 2025](https://www.trabajo.gob.ec/wp-content/uploads/2025/06/ACUERDO-MINISTERIAL-MDT-2025-053.pdf).
2. **El MDT-2026-059 regula jornadas especiales y distribución de horas.** Fue publicado en el Registro Oficial 240, cuarto suplemento, el 10 de marzo de 2026. Sus artículos 9 y 10 contemplan pactar jornadas de hasta diez horas, manteniendo cuarenta semanales, con respaldo contractual. Deroga el MDT-2018-0219 y su reforma. No se debe asumir que toda novena hora es automáticamente suplementaria en cualquier modalidad. [Texto oficial](https://www.trabajo.gob.ec/wp-content/uploads/2026/03/2.7-ACUERDO-MINISTERIAL-MDT-2026-059.pdf), [edición del Registro Oficial](https://esacc.corteconstitucional.gob.ec/storage/api/v1/10_DWL_FL/eyJjYXJwZXRhIjoicm8iLCJ1dWlkIjoiMzg1YzYzMzgtMDJhOC00OGIyLWFiOTQtNjY0NzQwODg0Nzg2LnBkZiJ9).
3. **La reforma MDT-2026-0155 es transitoria.** Amplió un registro de utilidades hasta el 24 de junio de 2026 para determinados dígitos de RUC. No cambia permanentemente las fechas de pago de beneficios ni crea una regla mensual. [Texto oficial](https://www.trabajo.gob.ec/wp-content/uploads/2026/07/ACUERDO-MINISTERIAL-MDT-2026-155.pdf).
4. Para la revisión del Código del Trabajo se utilizó la edición alojada por la Defensoría Pública que incorpora reformas hasta el **18 de mayo de 2026**. Para renta se contrastó la ley publicada por el SRI, con reforma de **1 de abril de 2026**, su tabla fiscal 2026 y el comunicado del SRI de **8 de septiembre de 2026**. Las fechas de consolidación de estos archivos se distinguen de la fecha de consulta; no equivalen a una certificación de inexistencia de reformas posteriores. [Código](https://biblioteca.defensoria.gob.ec/bitstream/37000/3819/12/C%C3%93DIGO%20DEL%20TRABAJO.%20ACTUALIZADO.pdf), [LRTI](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/12c884d5-c8d9-4171-becc-1513b990b87a/LEY_DE_REGIMEN_TRIBUTARIO_INTERNO_LRTI.pdf), [SRI, septiembre](https://www.sri.gob.ec/detalle-noticias?idnoticia=1324&marquesina=1).

## 3. Qué paga y qué descuenta una nómina CT general

### Remuneración y beneficios del empleado

| Concepto | Tratamiento para el diseño |
| --- | --- |
| Sueldo | Pago contractual, proporcional cuando corresponde; validar mínimo general y referencia sectorial aplicable. |
| Comisiones y bonificaciones remunerativas | Conceptos separados; clasificar sus efectos en cada base. No esconderlos en «Otros ingresos». |
| Recargo nocturno | Recargo general de 25% para jornada nocturna de 19:00 a 06:00; registrar las horas que lo originan. |
| Horas suplementarias | Valor hora más recargo general de 50%; registrar fecha y horario. |
| Horas extraordinarias | Valor hora más recargo de 100% en los supuestos legales, incluyendo descanso obligatorio y horas adicionales de 00:00 a 06:00. |
| Décimo tercero | Mostrar pago mensual o derecho acumulado, individualmente. |
| Décimo cuarto | Mostrar pago mensual o derecho acumulado, individualmente. |
| Fondos de reserva | Derecho por antigüedad; pago directo al trabajador o depósito mensual al IESS. |
| Reembolsos y viáticos | Registrar como conceptos propios con respaldo y tratamiento específico; no presumir que todo reembolso es sueldo ni que toda bonificación está exenta. |

El **SBU 2026 es USD 482**, con efecto desde el 1 de enero. La tabla sectorial aplicable no se sustituye automáticamente por ese monto cuando su mínimo es mayor. [Acuerdo MDT-2025-195](https://esacc.corteconstitucional.gob.ec/storage/api/v1/10_DWL_FL/eyJjYXJwZXRhIjoicm8iLCJ1dWlkIjoiYjk5ZGQ3ODUtNWNkYS00YmIzLTg5Y2MtMmNhMmU0MGM4YjIxLnBkZiJ9). La publicación institucional de marzo de 2026 mantiene como referencia sectorial el MDT-2024-301. [Fuente del Ministerio](https://www.trabajo.gob.ec/wp-content/uploads/2026/03/Evaluacion-Gestion-Institucional-Planta-Central-2025.pdf).

En la jornada general, el control de suplementarias debe contemplar **cuatro horas diarias y doce semanales**. Un tope mensual de sesenta no reemplaza esos controles. Las jornadas especiales necesitan configuración propia. [Criterio oficial sobre recargos y límites](https://www.trabajo.gob.ec/5-cual-es-la-jornada-maxima-de-trabajo-para-el-personal-sujeto-al-codigo-del-trabajo-y-cuando-procede-el-pago-por-horas-suplementarias-y-extraordinarias/), complementado por el MDT-2026-059 citado arriba.

### Descuentos del empleado

| Concepto | Cuándo corresponde |
| --- | --- |
| Aporte personal IESS | **9,45%** de la materia gravada para trabajador privado general. |
| Impuesto a la renta | Retención resultante de la proyección y liquidación tributaria; puede ser cero. |
| Extensión de salud IESS | **3,41% adicional** si existe solicitud y cobertura activa para cónyuge/conviviente; no se aplica a todos. |
| Cuotas BIESS | Importes de planilla/autorización aplicable, separados por préstamo y periodo. |
| Retenciones judiciales / alimentos | Según orden y valores aplicables; conservar expediente, beneficiario y destino de pago. |
| Anticipos y otras obligaciones válidas | Con documento, motivo y reglas de cobro; no un descuento libre sin trazabilidad. |
| Multas laborales | Solo en los supuestos permitidos; el art. 44 exige reglamento aprobado y limita su retención al 10%. El art. 90 contiene un límite específico del 10% para las retenciones allí contempladas por anticipos/compras. Son controles distintos, no un tope universal para cualquier descuento. |

Fuentes: [IESS, aporte general](https://iess.gob.ec/web/afiliado/servicios-y-prestaciones), [IESS, extensión de cobertura](https://www.iess.gob.ec/es/cobertura3/-/asset_publisher/qZm2/content/conyuges-e-hijos-de-los-asegurados-reciben-atencion-de-salud-en-el-iess/10174), [BIESS, gestión de préstamos](https://www.biess.fin.ec/movil/servicio-al-cliente/preguntas-frecuentes), [Código del Trabajo, arts. 44, 90 y 91](https://biblioteca.defensoria.gob.ec/bitstream/37000/3819/12/C%C3%93DIGO%20DEL%20TRABAJO.%20ACTUALIZADO.pdf), [Consejo de la Judicatura, SUPA](https://www.funcionjudicial.gob.ec/resources/pdf/Manual%20de%20usuario%20Acuerdo%20de%20responsabilidad%2025-09-24.pdf).

Las ausencias, licencias e incapacidades deben registrarse como novedades con fechas y tipo. No corresponde tratar cualquier ausencia como una multa ni descontar días de vacaciones o licencia remunerada. El modelo debe evitar reducir el sueldo por un evento y volver a descontar el mismo importe.

### Obligaciones y beneficios a cargo del empleador

| Concepto | Efecto |
| --- | --- |
| Aporte patronal IESS | **11,15%** para trabajador privado general; gasto del empleador, sin reducir el neto del empleado. |
| Contribuciones adicionales | Contemplar el **1% adicional cuando el empleador esté sujeto**, históricamente identificado como 0,5% IECE y 0,5% SECAP. Mostrar separado del 11,15% y resolver excepciones por tipo de empleador. |
| Décimos | Costo que se devenga y se paga mensual o acumuladamente; el pago del acumulado cancela la obligación ya reconocida. |
| Fondos de reserva | Costo del empleador, con obligación de pago directo o depósito. |
| Vacaciones | Beneficio con saldo en días y valoración; distinguir disfrute, remuneración anticipada y liquidación. |

Los porcentajes IESS generales están publicados por el [IESS](https://iess.gob.ec/web/afiliado/servicios-y-prestaciones). La contribución adicional se distingue de la seguridad social en la disposición general décima primera del [Código Monetario y Financiero alojado por el BCE](https://www.bce.fin.ec/storage/BCE/normativa/Codigo-Organico-Monetario-Financiero-Libro-1.pdf). Ese archivo está consolidado a octubre de 2025; en 2026 también se identificaron proyectos sobre financiamiento del SECAP, que no se convierten en reglas por su sola presentación. [Registro del proyecto en la Asamblea](https://www.asambleanacional.gob.ec/es/multimedios-legislativos/111248-proyecto-de-ley-organica-de). Antes de activar esta contribución en la empresa se debe cerrar su aplicabilidad y contrastar su planilla vigente. No presentar «12,15% IESS» como una tasa universal.

Para vacaciones, el caso general adulto reconoce quince días al año y días adicionales por antigüedad después de cinco años, con las condiciones legales. La valoración general del art. 71 usa la remuneración anual computable dividida para veinticuatro. Su provisión no significa añadir mensualmente ese importe al sueldo. [Código del Trabajo, arts. 69–72](https://biblioteca.defensoria.gob.ec/bitstream/37000/3819/12/C%C3%93DIGO%20DEL%20TRABAJO.%20ACTUALIZADO.pdf).

## 4. Décimos: mensualizar, acumular y pagar son operaciones distintas

Las bases de cálculo se mantienen independientes: el décimo tercero se vincula a la remuneración computable, no a una equivalencia permanente con la base IESS; el cuarto usa el SBU y la proporcionalidad que corresponda. Los décimos no integran IESS ni renta. [Código, arts. 111–114](https://biblioteca.defensoria.gob.ec/bitstream/37000/3819/12/C%C3%93DIGO%20DEL%20TRABAJO.%20ACTUALIZADO.pdf).

Calendario y solicitud bajo el MDT-2023-140, arts. 9 y 10:

| Beneficio | Periodo de cálculo | Vencimiento de pago acumulado |
| --- | --- | --- |
| Décimo tercero | 1 diciembre a 30 noviembre siguiente | 24 diciembre |
| Décimo cuarto Costa/Insular | 1 marzo a último día de febrero siguiente | 15 marzo |
| Décimo cuarto Sierra/Amazonía | 1 agosto a 31 julio siguiente | 15 agosto |

La elección se documenta por escrito dentro del plazo de enero o del ingreso aplicable; los cambios de modalidad conservan los derechos ya devengados. Los plazos de registro en el Ministerio son distintos de los vencimientos de pago. [Acuerdo vigente de referencia](https://www.trabajo.gob.ec/wp-content/uploads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf).

Propuesta funcional:

- Selector independiente «Mensual / Acumulado» para cada décimo, con fecha de vigencia y respaldo.
- Por beneficio: ciclo, saldo inicial, devengado del mes, ajustes justificados, pagos y saldo pendiente.
- Si mensualiza: el importe pagado aparece en ingresos. Si acumula: el devengado aparece en el estado de beneficios; no incrementa el neto de ese mes.
- Pago acumulado como comprobante identificable, con posibilidad de incluirlo en el rol del mes mediante enlace; una sola obligación y un solo pago aunque se visualice en ambos lugares.
- No pagar dos veces periodos previamente mensualizados.
- Calcular el cierre desde las bases y el derecho del ciclo; no confiar exclusivamente en sumar provisiones mensuales ya redondeadas. Evaluar diferencias de centavos y cambios de SBU en el décimo cuarto acumulado.
- Mostrar el periodo exacto al que pertenece cada pago. Diciembre puede pagar un ciclo y devengar el siguiente.

## 5. Fondos de reserva

El IESS describe el derecho después de un año con el mismo empleador, el porcentaje **8,33%** de la remuneración de aportación y las dos modalidades: pago mensual al trabajador o depósito mensual al IESS previa solicitud. [Fuente oficial](https://www.iess.gob.ec/es/web/afiliado/fondos-de-reserva). Su exclusión de aportes e impuestos consta en la [ley de pago mensual del fondo de reserva](https://asambleanacional.gob.ec/documentos/leyes_aprobadas/ley_fondo_reservas.pdf).

Propuesta:

- Elegibilidad calculada por antigüedad y condiciones; modalidad separada «Pago directo / Depósito IESS».
- Registrar vigencia, solicitud y fecha desde la que aplica la modalidad.
- Cuando todavía no exista derecho, mostrar el motivo y la fecha prevista de inicio.
- En pago directo, sumar a ingresos y neto. En depósito, mostrar el importe como obligación con destino IESS, fuera del efectivo entregado al trabajador.
- Registrar generado, pendiente de depósito y depositado. Calcular un rol no demuestra que el IESS recibió el dinero.
- Revisar el mes del primer aniversario con fechas, bases proporcionales y novedades reales.

Un fondo enviado al IESS no debe presentarse como ahorro retenido indefinidamente por la empresa ni descontarse del sueldo después de haber sido excluido del ingreso pagadero.

## 6. Impuesto a la renta para el ejercicio fiscal 2026

La tabla debe pertenecer al **ejercicio de los ingresos**, no al año en que se presenta una declaración. Para ingresos 2026 se usa la tabla 2026. Fuente: [tabla oficial del SRI, Resolución NAC-DGERCGC25-00000043](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf).

| Fracción básica USD | Hasta USD | Impuesto básico USD | Sobre el excedente |
| ---: | ---: | ---: | ---: |
| 0 | 12.208 | 0 | 0% |
| 12.208 | 15.549 | 0 | 5% |
| 15.549 | 20.188 | 167 | 10% |
| 20.188 | 26.700 | 631 | 12% |
| 26.700 | 35.136 | 1.412 | 15% |
| 35.136 | 46.575 | 2.678 | 20% |
| 46.575 | 62.005 | 4.965 | 25% |
| 62.005 | 82.679 | 8.823 | 30% |
| 82.679 | 109.956 | 15.025 | 35% |
| 109.956 | En adelante | 24.572 | 37% |

Secuencia de cálculo que debe poder explicar el sistema:

1. Ingresos gravados percibidos y proyectados del ejercicio.
2. Aporte personal deducible y exoneraciones que correspondan.
3. Base imponible anual y aplicación de la tabla.
4. Rebaja por gastos personales y condiciones especiales documentadas.
5. Impuesto proyectado, retenciones efectuadas y saldo que corresponde distribuir en los meses aplicables.
6. Retención del periodo y explicación de los ajustes.

El procedimiento general del art. 104 prevé retenciones desde febrero, excluyendo enero, y reparto inicial en once meses. En una reliquidación no se divide ciegamente otra vez para once: se consideran retenciones practicadas y periodos pendientes. [Reglamento publicado por el SRI, art. 104](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/0a735a5a-a79c-4cef-851c-c135ad3c322a/REGLAMENTO_PARA_APLICACION_LEY_DE_REGIMEN_TRIBUTARIO_INTERNO_LRTI.pdf), [instructivo oficial de cálculo 2026 del MEF](https://spryn.finanzas.gob.ec/esipren-web/archivos_html/file/Instructivo%20descuento%20Impuesto%20Renta%20SRI%202026.pdf). El instructivo del MEF se usa para contrastar la mecánica tributaria, no para trasladar reglas laborales públicas a CT.

El SRI confirmó en septiembre de 2026: **18%** de rebaja sobre el menor entre gastos computables y límite por cargas; canasta de enero **USD 821,80**. También confirmó la actualización de proyección en septiembre. [SRI, 8 septiembre 2026](https://www.sri.gob.ec/detalle-noticias?idnoticia=1324&marquesina=1).

| Cargas | Canastas | Límite gastos USD | Rebaja máxima USD |
| ---: | ---: | ---: | ---: |
| 0 | 7 | 5.752,60 | 1.035,47 |
| 1 | 9 | 7.396,20 | 1.331,32 |
| 2 | 11 | 9.039,80 | 1.627,16 |
| 3 | 14 | 11.505,20 | 2.070,94 |
| 4 | 17 | 13.970,60 | 2.514,71 |
| 5 o más | 20 | 16.436,00 | 2.958,48 |

Fuente de cifras: [boletín oficial del SRI de febrero de 2026](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/ea002a89-17d8-4cdf-be42-affedbe3f8d8/BOLET%25C3%258DN%2520006%2520-%2520SRI%2520HABILITA%2520LA%2520PROYECCI%25C3%2593N%2520DE%2520GASTOS%2520PERSONALES%25202026%2520PARA%2520REDUCIR%2520EL%2520IMPUESTO%2520A%2520LA%2520RENTA.pdf). Hay tratamiento especial de cien canastas para las condiciones señaladas por el SRI y ajuste territorial de Galápagos; deben ser reglas específicas, con soporte, no opciones que se activen por defecto.

Datos necesarios por empleado/año: proyecciones versionadas, cargas y condiciones acreditadas, residencia fiscal/territorio, ingresos y aportes anteriores, información de otros empleadores y retenciones acumuladas. Las cargas para renta y las cargas para reparto de utilidades no deben compartir sin más una misma regla de elegibilidad.

La aplicación debe mostrar «Información fiscal incompleta» cuando falten datos necesarios para resolver la retención; no presentar cero como resultado validado. Para octubre se debe considerar la última proyección válida, incluida la actualización de septiembre si existe.

## 7. Otros procesos que forman parte del alcance laboral

- **Utilidades:** reparto anual general del 15%, distribuido en los componentes 10% y 5% de acuerdo con las reglas legales. Debe ser un proceso anual; no equivale a sumar 15% del sueldo cada mes. No incorporar el antiguo tope de veinticuatro SBU declarado inconstitucional. [Código, arts. 97 y nota del 97.1](https://biblioteca.defensoria.gob.ec/bitstream/37000/3819/12/C%C3%93DIGO%20DEL%20TRABAJO.%20ACTUALIZADO.pdf).
- **Compensación por salario digno:** el MDT-2026-087 fijó USD 506,99 para el **ejercicio 2025**, con pago de la compensación aplicable hasta marzo de 2026. No sustituye el SBU 2026 ni constituye un nuevo sueldo mínimo de octubre. El ejercicio 2026 requiere su propia liquidación y norma que corresponda. [Acuerdo oficial](https://www.trabajo.gob.ec/wp-content/uploads/2026/04/2.3-Acuerdo-Ministerial-MDT-2026-087.pdf).
- **Vacaciones, ingresos/salidas, licencias e incapacidades:** necesitan fechas y tratamiento por evento; separar lo pagado por el empleador de subsidios de terceros. La primera implementación no debe inventar porcentajes generales para estos casos.
- **Finiquitos e indemnizaciones:** flujo aparte con causa de salida, beneficios proporcionales y respaldos. No reemplazarlo con «desactivar empleado».
- **Reporte tributario anual:** preparar datos conciliables para Formulario 107/RDEP. Su generación y presentación son pasos diferentes del cálculo mensual. Los formatos y plazos del ejercicio 2026 se verificarán antes de implementar su exportación.

## 8. Cómo debe verse la nómina

### Rol individual

1. Empresa, empleado, cargo, régimen, periodo, días remunerados, jornada, sueldo contractual y estado del rol.
2. **Ingresos pagaderos:** sueldo, recargos, extras, comisiones, bonos y beneficios efectivamente pagados; un renglón por concepto.
3. **Descuentos:** IESS personal, extensión de salud cuando aplique, renta, préstamos, anticipos y retenciones; importe y motivo individual.
4. **Neto a pagar**, fecha y referencia del pago cuando se registre.
5. **Beneficios del periodo:** devengado, pagado y pendiente de cada décimo; modalidad y ciclo; fondos de reserva directos o con destino IESS.
6. **Información del empleador:** aporte patronal y contribuciones adicionales aplicables, separados del neto.

Cada renglón calculado debe permitir consultar cantidad, base, tasa, fórmula, resultado, vigencia y fuente. Ejemplo: «IESS personal: base USD 800,00 × 9,45% = USD 75,60».

Los valores cero deben tener contexto: «Acumula», «Aún no cumple antigüedad», «No hubo horas registradas» o «No existe obligación en el periodo». No mostrar todos como si fueran pagos pendientes ni confundir falta de información fiscal con exención.

### Consolidado y exportaciones

- Columnas separadas para 13.º y 14.º pagados, IESS personal, IR, fondos directos, total descuentos y neto.
- Vistas complementarias de beneficios acumulados, obligaciones IESS y costo del empleador.
- PDF individual, PDF consolidado y Excel con los mismos conceptos y totales. El Excel puede incluir hojas de ingresos/descuentos, beneficios y obligaciones patronales.
- Diferenciar **costo devengado** de **salida de dinero**. Pagar un acumulado reconocido anteriormente no genera de nuevo el mismo costo.

### Lugar para las explicaciones

Propuesta: **Configuración → Guía de nómina**, accesible también desde «Generar rol» mediante «Cómo se calcula».

Contenido: ingresos; descuentos; IESS empleado/empleador; décimos; fondos de reserva; vacaciones; impuesto a la renta; calendario; fuentes y vigencias. Las pantallas de empleados y novedades tendrán ayudas breves. El rol conservará explicaciones pertinentes al cálculo, sin llenar el comprobante con instrucciones de implementación.

La guía debe distinguir regla legal, configuración de la empresa y elección individual. Debe indicar fecha de revisión y enlazar la fuente concreta de cada regla.

## 9. Ejemplo de lectura del rol

Ejemplo ilustrativo: sueldo USD 800, mes completo, sin extras, antigüedad superior a un año, ambos décimos mensuales, sin retención IR ni otros descuentos en este caso.

| Concepto | USD |
| --- | ---: |
| Sueldo | 800,00 |
| Décimo tercero mensual | 66,67 |
| Décimo cuarto mensual | 40,17 |
| Fondos de reserva pagados directamente | 66,64 |
| Total ingresos pagaderos | 973,48 |
| IESS personal | 75,60 |
| Neto | **897,88** |

Por separado, el empleador reconoce IESS patronal **USD 89,20** y, si está sujeto al 1% adicional, **USD 8,00**. Estos importes no se descuentan al empleado.

Si los fondos van al IESS, se muestran **USD 66,64 con destino IESS** y el neto de este ejemplo es **USD 831,24**. Si además ambos décimos se acumulan, el neto mensual es **USD 724,40** y se informan sus devengados fuera del pago mensual. Cambia el destino o la fecha de cobro de los beneficios; no desaparece el derecho.

Los valores ilustran un mes y sus redondeos; no fijan por sí solos la liquidación anual de cada beneficio.

## 10. Diferencias concretas con el sistema actual

| Componente | Situación comprobada | Cambio propuesto |
| --- | --- | --- |
| `src/lib/payroll/engine.ts` | Base única para IESS/13.º; fondos siempre en ingresos; dos egresos agregados; sin IR | Resolver bases por concepto y destinos; incorporar renta y detalle. |
| `src/lib/payroll/service.ts` | Lee empleados activos actuales; reemplaza roles/provisiones al regenerar | Selección histórica por vínculo/fechas, versiones, cierres y control de pagos. |
| `src/lib/db/index.ts` | Empleados con opciones actuales; provisiones por mes, sin pagos/saldos | Configuración histórica, movimientos de beneficios, impuestos y pagos. |
| `src/lib/repo.ts` | Historial salarial, pero sin historial de régimen y modalidades | Resolver condiciones vigentes en el periodo; preservar cambios. |
| `src/app/empleados/empleados-client.tsx` | Casillas para mensualizar y «Aplica fondos» | Selectores claros, vigencia, respaldos y elegibilidad. |
| `src/app/novedades/` | Solo horas mensuales y dos montos «otros» | Movimientos por concepto; fechas/horarios y descuentos identificables. |
| `src/components/rol-views.tsx` | Consolidado suma ambos décimos; detalle básico | Desglose, destinos, saldos, obligaciones y explicación del cálculo. |
| `src/lib/export/` | PDF/Excel con estructura fija actual | Sincronizar con el modelo nuevo y conservar lectura de roles antiguos. |
| `src/lib/parametros-meta.ts` | Tasas, SBU y jornada; sin reglas tributarias completas | Fuentes/vigencias y parámetros por categoría aplicable. |
| `scripts/db-seed.ts` | Carga demostrativa mixta y límite mensual de 60 horas | Demostración toda CT; conservar catálogos de los otros regímenes; revisar límites. |

El motor usa centavos y `bigint`: conviene conservar esa base. La ampliación requiere precisión adicional para acumulaciones y liquidación final, sin cambiar los importes guardados de roles antiguos.

## 11. Modelo y secuencia de implementación propuestos

Estos nombres son orientativos y aún no están implementados:

| Datos / proceso | Responsabilidad |
| --- | --- |
| Historial de condiciones laborales | Régimen, jornada, fechas, modalidades de décimos y fondos. |
| Catálogo de conceptos con vigencia | Naturaleza, bases IESS/13.º/FR/vacaciones/IR, destino y fundamento. Las excepciones con requisitos no se resuelven con una casilla libre. |
| Novedades por concepto | Fecha, cantidad, valor, respaldo y origen. |
| Información tributaria por ejercicio | Proyecciones, cargas, exoneraciones y retenciones anteriores. |
| Movimientos de beneficios | Apertura, devengado, ajuste, pago y reverso por ciclo. |
| Registro de obligaciones y pagos | Empleado/IESS/SRI/otros destinos; calculado, pendiente y pagado. |
| Versiones de roles | Datos, reglas y parámetros usados, responsable y motivo de corrección. |

Orden recomendado:

1. Validar y versionar reglas, conceptos y condiciones del empleado; preparar carga de saldos iniciales.
2. Convertir los ocho empleados actuales a CT en una migración identificable, respaldada y que pueda ejecutarse una sola vez; mantener catálogos LOSEP/LOEP. Ajustar el seed por separado, sin ejecutarlo sobre los datos actuales.
3. Desglosar novedades y generación de roles; incorporar modalidades y pagos de beneficios.
4. Implementar renta anual/proyección/reliquidación y deducciones con respaldo.
5. Actualizar guía, pantallas, PDF y Excel; incorporar conciliación y controles de pago.
6. Extender vacaciones y eventos especiales con sus reglas completas; preparar procesos anuales y exportaciones oficiales.

La migración debe registrar la fecha efectiva del cambio de régimen. Los roles de septiembre contienen copias históricas y no deben reescribirse automáticamente por cambiar la ficha actual. Si se corrigen datos demostrativos históricos, debe hacerse como una corrección explícita y trazable.

No hay meses suficientes para calcular saldos anuales completos con la base actual. Se necesitan importes de apertura y antecedentes fiscales; una suma de septiembre no representa todo el ciclo.

## 12. Validaciones que deberá superar la implementación

- Ocho empleados actuales CT, con CT/LOSEP/LOEP todavía disponibles; referencias y mínimos válidos.
- IESS personal y patronal separados; sin descuentos de costos del empleador al trabajador.
- Mensualización independiente de cada décimo; pago acumulado con cancelación del saldo y sin duplicación.
- Ciclos regionales, ingreso a mitad de ciclo, cambio de modalidad y diferencias de redondeo.
- Fondos antes/después del aniversario, pago directo y depósito con conciliación.
- IR: tramos 2026, enero/febrero, cambio salarial, proyección de septiembre, retenciones previas y datos incompletos.
- Horas: fecha y semana; regla general y jornada especial pactada; evitar duplicar recargos.
- Ausencias, vacaciones y licencias sin doble descuento.
- Regenerar una vista previa no registra pagos; corregir periodos liquidados no destruye los movimientos previos.
- Pantalla, PDF y Excel coinciden por concepto, base y total; reimpresión histórica estable.

En la revisión inicial pasaron las dieciséis pruebas existentes. No acreditan los procesos nuevos: sus casos se definirán e implementarán junto con cada ampliación.

## 13. Puntos que quedan abiertos antes de activar cálculos

- Aplicabilidad exacta de la contribución adicional del empleador y su identificación en la planilla vigente de la empresa; no resolverla solo con el régimen CT.
- Fuentes y reglas completas para modalidades excepcionales: Galápagos, jornada parcial, artesanos, incapacidades y otras categorías de afiliación. Mantenerlas identificadas y evitar aplicar automáticamente la regla privada general.
- Fechas efectivas de conversión de los datos, saldos iniciales y documentación tributaria faltante.
- Versiones oficiales de formatos para exportar RDEP y comprobantes de cumplimiento al momento de implementarlos.

La investigación respalda la nómina CT general aquí descrita. Los puntos abiertos deben quedar visibles como pendientes de configuración o de verificación específica, en lugar de aparecer como reglas ya implementadas y validadas.
