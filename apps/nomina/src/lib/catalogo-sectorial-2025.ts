import type { EstructuraOcupacional } from "./estructura-ocupacional";

export interface FilaSectorial2025 {
  codigo: string;
  denominacion: string;
  estructura: EstructuraOcupacional;
  minimoCent: number;
  comision: string;
  rama: string;
}

type FilaBase = readonly [codigo: string, denominacion: string, estructura: EstructuraOcupacional, minimoCent: number];

const COMISION_TIC = "12 · Tecnología: hardware y software (incluye TIC)";
const RAMA_TIC = "1–3 · Informática, programación, hardware, software y otros servicios TIC";
const COMISION_SERVICIOS = "19 · Actividades tipo servicios";
const RAMA_ADMIN = "2 · Actividades en materia de gestión administrativa";
const RAMA_PROFESIONAL = "3 · Actividades profesionales";
const RAMA_SEGURIDAD = "6 · Servicios de seguridad privada y vigilancia";
const RAMA_TECNICA = "7 · Servicios técnicos";

const tic: FilaBase[] = [
  ["1209642000004", "Director de telecomunicaciones / Jefe de área", "A1", 50737],
  ["1209642000005", "Supervisor general de telecomunicaciones", "B1", 50667],
  ["1209642000006", "Supervisor de sistemas, desarrollo, tecnología y proyectos", "B1", 50667],
  ["1209642000007", "Arquitecto y usabilidad de software", "B1", 50667],
  ["1209642000008", "Supervisor de diseño de software", "B2", 50597],
  ["1209642000009", "Administrador de base de datos", "B2", 50597],
  ["1220030000001", "Ingeniero electrónico especialista en mantenimiento", "B2", 50597],
  ["1220000000001", "Analista de investigación y desarrollo de hardware y software", "B2", 50597],
  ["1220000000002", "Analista / Controller de calidad de software", "B2", 50597],
  ["1209642000010", "Especialista de telecomunicaciones", "B3", 50526],
  ["1209642000011", "Supervisor de plataformas / Equipo de voz y datos", "B3", 50526],
  ["1209642000014", "Técnico operador de radar", "B3", 50526],
  ["1230000000003", "Supervisor de planta externa / Seguridad electrónica / Cableado estructurado", "B3", 50526],
  ["1209642000016", "Programador en telecomunicaciones", "C1", 50456],
  ["1209642000017", "Analista de software", "C1", 50456],
  ["1209642000018", "Tester de software", "C1", 50456],
  ["1209642000019", "Programador y diseñador multimedia / Web", "C1", 50456],
  ["1209642000020", "Técnico en mantenimiento de servidores", "C1", 50456],
  ["1209642000022", "Técnico instalador de servicios agregados", "C1", 50456],
  ["1209642000024", "Técnico de fibra óptica / Cobre / Empalmador", "C1", 50456],
  ["1210000000004", "Analista de redes", "C1", 50456],
  ["1210000000005", "Analista de sistemas / Telecomunicaciones", "C1", 50456],
  ["1210000000006", "Especialista funcional / Implementador de soluciones", "C1", 50456],
  ["1210000000007", "Programador semi senior de software", "C1", 50456],
  ["1209642000015", "Técnico de redes de datos", "C2", 50268],
  ["1209642000025", "Técnico en mantenimiento de computadoras", "C2", 50268],
  ["1209642000027", "Técnico de centrales telefónicas", "C2", 50268],
  ["1209642000028", "Técnico de transmisiones", "C2", 50268],
  ["1209642000029", "Técnico conectorizador de equipo", "C2", 50268],
  ["1220000000008", "Técnico en sistemas satelitales", "C2", 50268],
  ["1220000000009", "Técnico en cableado estructurado", "C2", 50268],
  ["1220000000010", "Técnico en seguridad electrónica", "C2", 50268],
  ["1230000000011", "Programador junior de software", "C3", 50080],
  ["1220030002003", "Técnico de help desk", "D1", 49893],
  ["1209642000033", "Técnico de planta externa / Cablista / Instalador", "D2", 49705],
  ["1209642000034", "Asistente / Ayudante / Instalador auxiliar de telecomunicaciones", "D2", 49705],
  ["1220030001002", "Técnico en ensamblaje y mantenimiento de equipos de computación y electrónicos", "D2", 49705],
  ["1220000000012", "Asistente / Ayudante / Auxiliar / Instalador de sistemas", "D2", 49705],
  ["1209642000023", "Operador de locutorio / Cyber / Centro de llamadas", "E2", 49329],
];

const administrativos: FilaBase[] = [
  ["1918200000101", "Gerente / Afines", "A1", 49122],
  ["1910000000003", "Administrador de locales / Establecimientos", "B1", 49071],
  ["1910000000004", "Administrador de campo", "B1", 49071],
  ["1910000000005", "Administrador gerencial", "B1", 49071],
  ["1910000000006", "Subgerente / Afines", "B1", 49071],
  ["1910000000007", "Superintendente / Afines", "B1", 49071],
  ["1920000000008", "Jefe / Afines", "B2", 48958],
  ["1920000000009", "Supervisor / Afines", "B2", 48958],
  ["1920000000010", "Director / Afines", "B2", 48958],
  ["1930000000011", "Coordinador / Afines", "B3", 48822],
  ["1910000000012", "Contador / Contador general", "C1", 48657],
  ["1910000000013", "Analista / Afines", "C1", 48657],
  ["1910000000014", "Asesor / Agente / Afines", "C1", 48657],
  ["1910000000015", "Tesorero", "C1", 48657],
  ["1920000000016", "Instructor / Capacitador", "C2", 48409],
  ["1920000000017", "Relacionador público", "C2", 48409],
  ["1920000000018", "Liquidador", "C2", 48409],
  ["1930000000019", "Cajero no financiero", "C3", 48161],
  ["1930000000020", "Vendedor / Vendedora", "C3", 48161],
  ["1930000000021", "Ejecutivo / Afines", "C3", 48161],
  ["1910000000022", "Digitador", "D1", 47911],
  ["1910000000023", "Operador de bodega / Almacenista", "D1", 47911],
  ["1910000000024", "Secretaria / Oficinista", "D1", 47911],
  ["1910000000025", "Recepcionista / Anfitriona", "D1", 47911],
  ["1910000000026", "Asistente / Auxiliar de contabilidad", "D1", 47911],
  ["1910000000027", "Cobrador / Recaudador / Facturador / Encuestador", "D1", 47911],
  ["1910000000028", "Asistente / Auxiliar administrativo", "D1", 47911],
  ["1910000000029", "Asistente de cobranzas no financieras", "D1", 47911],
  ["1910000000030", "Bibliotecario", "D1", 47911],
  ["1920000000031", "Inspector / Afines", "D2", 47616],
  ["1920000000032", "Impulsador / Promotor / Demostrador", "D2", 47616],
  ["1920000000033", "Cocinero fuera del sector turismo y alimentación", "D2", 47616],
  ["1910000000034", "Mensajero / Repartidor", "E1", 47517],
  ["1910000000035", "Gestor de documentación", "E1", 47517],
  ["1910000000036", "Conserje / Portero", "E1", 47517],
  ["1910000000037", "Asistente / Auxiliar de bodega", "E1", 47517],
  ["1910000000038", "Asistente / Auxiliar de limpieza", "E1", 47517],
  ["1920000000039", "Empacador / Cargador", "E2", 47004],
  ["1920000000040", "Despachador / Perchero", "E2", 47004],
  ["1920000000041", "Asistente / Auxiliar de servicios generales", "E2", 47004],
];

const profesionales: FilaBase[] = [
  ["1910000000042", "Profesional con título de cuarto nivel", "A1", 51720],
  ["1910000000043", "Profesional con título de tercer nivel / Tecnólogo", "B1", 51665],
  ["1911730000010", "Director de arte", "B3", 48822],
  ["1911740000030", "Trabajador / Trabajadora social", "C1", 48657],
  ["1920000000044", "Publicista / Creativo", "C2", 48409],
];

const seguridad: FilaBase[] = [
  ["1911740000032", "Investigador", "C2", 48409],
  ["1911740000051", "Guardia", "E1", 47517],
];

const serviciosTecnicos: FilaBase[] = [
  ["1910000000074", "Traductor", "C1", 48657],
  ["1910000000091", "Chofer de camioneta liviana / Reparto", "C1", 48657],
  ["1910000000092", "Chofer de camión pesado hasta 4,5 toneladas", "C1", 48657],
  ["1920000000075", "Enfermera fuera de instituciones de salud", "B1", 49071],
  ["1920000000076", "Médico fuera de instituciones de salud", "B1", 49071],
  ["1920000000077", "Psicólogo industrial", "B1", 49071],
  ["1920000000090", "Chofer de automóvil o camioneta particular", "C2", 48409],
  ["1920000000091", "Auxiliar de enfermería fuera de instituciones de salud", "D1", 47911],
  ["1910000000089", "Chofer de motocicleta o triciclo motorizado", "D1", 47911],
  ["1920000000078", "Mecánico en general", "D2", 47616],
  ["1920000000079", "Carpintero en general", "D2", 47616],
  ["1920000000080", "Cerrajero en general", "D2", 47616],
  ["1920000000081", "Electricista en general", "D2", 47616],
  ["1920000000082", "Soldador en general", "D2", 47616],
  ["1920000000083", "Plomero en general", "D2", 47616],
  ["1920000000084", "Tornero en general", "D2", 47616],
  ["1920000000085", "Utilero", "D2", 47616],
  ["1920000000086", "Operador de montacarga de hasta 94 HP", "C2", 48409],
  ["1920000000087", "Asistente / Auxiliar de servicios técnicos", "E2", 47004],
  ["1920000000088", "Jardinero", "E2", 47004],
];

function completar(filas: FilaBase[], comision: string, rama: string): FilaSectorial2025[] {
  return filas.map(([codigo, denominacion, estructura, minimoCent]) => ({
    codigo,
    denominacion,
    estructura,
    minimoCent,
    comision,
    rama,
  }));
}

/**
 * Subcatálogo oficial útil para una empresa de software. Se excluye telefonía
 * móvil porque tiene una rama y valores propios que no corresponden a una
 * empresa ordinaria de desarrollo de software.
 */
export const CATALOGO_SECTORIAL_SOFTWARE_2025: FilaSectorial2025[] = [
  ...completar(tic, COMISION_TIC, RAMA_TIC),
  ...completar(administrativos, COMISION_SERVICIOS, RAMA_ADMIN),
  ...completar(profesionales, COMISION_SERVICIOS, RAMA_PROFESIONAL),
  ...completar(seguridad, COMISION_SERVICIOS, RAMA_SEGURIDAD),
  ...completar(serviciosTecnicos, COMISION_SERVICIOS, RAMA_TECNICA),
];

export const FUENTE_CATALOGO_SECTORIAL_2025 =
  "https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/12/Anexo-1-Salarios-Minimos-Sectoriales-y-Tarifas-2025-2-1-1.pdf";
