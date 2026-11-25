import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ConfiguracionNav } from "@/components/configuracion-nav";
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Guía de nómina" };

const conceptos = [
  ["Sueldo y horas extras", "Ingresos por el trabajo del periodo. Cada recargo y tipo de hora se muestra por separado con su cálculo."],
  ["IESS del empleado", "Se calcula sobre la base de aportación y se descuenta del rol. En el sector privado general la tasa es 9,45%."],
  ["IESS del empleador", "Lo asume la empresa; no reduce el neto del trabajador. En el sector privado general la tasa es 11,15%. La tabla muestra ambos aportes y su total."],
  ["Décimo tercero", "La doceava parte de la remuneración computable. Puede pagarse mensualmente o acumularse por elección del empleado."],
  ["Décimo cuarto", "La doceava parte del SBU, proporcional cuando corresponde. Su modalidad es independiente de la del décimo tercero."],
  ["Fondos de reserva", "Desde el segundo año de servicio: 8,33% de la base de aportación. Pago directo al empleado o depósito mensual al IESS, según su solicitud."],
  ["Impuesto a la renta", "Registre en Novedades la retención validada con la proyección fiscal y los antecedentes del empleado. El sistema la desglosa y descuenta; no realiza la proyección tributaria automática."],
  ["Otros descuentos", "En Novedades, pulse Detallar para agregar cada concepto y su importe: anticipo de sueldo, cuota de préstamo u otro descuento con un motivo específico. Aplique el detalle y guarde las novedades. El total se suma automáticamente y cada concepto aparece en el rol, PDF y Excel. Registre únicamente obligaciones respaldadas; el IESS y la retención IR tienen sus propios campos."],
];

export default function GuiaNominaPage() {
  return <>
    <PageHeader icon={BookOpen} title="Guía de nómina" description="Cómo leer el rol, elegir modalidades y distinguir los aportes de cada parte." />
    <ConfiguracionNav />
    <div className="mt-5 space-y-5">
      <Card><CardHeader><CardTitle>Ingresos, descuentos y obligaciones</CardTitle></CardHeader>
        <Table><THead><TR><TH>Concepto</TH><TH>Cómo se refleja en la nómina</TH></TR></THead><TBody>{conceptos.map(([nombre, descripcion]) => <TR key={nombre}><TD className="min-w-44 font-medium">{nombre}</TD><TD className="text-muted-foreground">{descripcion}</TD></TR>)}</TBody></Table>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Mensualizado o acumulado</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>En <Link href="/empleados" className="font-medium text-primary underline">Empleados</Link>, seleccione la modalidad de cada décimo y el destino de los fondos de reserva. Guarde la fecha de vigencia y conserve la solicitud del trabajador.</p>
          <p>El décimo mensualizado se suma a ingresos. El acumulado se muestra como devengado y saldo registrado, fuera del neto mensual. Cambiar la modalidad conserva los importes ya acumulados.</p>
          <p>Para pagar un acumulado, registre el importe de cada décimo en <Link href="/novedades" className="font-medium text-primary underline">Novedades</Link>. Al generar el rol, se valida que no exceda el saldo disponible, se suma una sola vez a ingresos y se reduce el saldo.</p>
          <p>Los saldos se reconstruyen con los roles guardados. Los meses no cargados no se calculan automáticamente. Generar un rol tampoco confirma una transferencia bancaria o un depósito al IESS.</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Leer la tabla detallada</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Nómina detallada:</strong> sueldo, recargos, cada décimo mensual y acumulado pagado, fondos directos, IESS personal, renta, descuentos y neto.</p>
          <p><strong className="text-foreground">IESS y beneficios:</strong> base, aporte del empleado, aporte del empleador, total de aportes, fondos con destino IESS y saldos de décimos.</p>
          <p>Abra una fila para consultar fórmulas y modalidades. El aporte del empleador es adicional al pago del trabajador; no se resta del neto. Los fondos enviados al IESS se muestran por separado del efectivo del rol.</p>
          <p>Las tasas se resuelven con los parámetros vigentes del régimen y periodo. Los roles históricos conservan los datos con los que se emitieron.</p>
        </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Calendario CT y fuentes</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Décimo tercero acumulado: hasta el 24 de diciembre. Décimo cuarto: hasta el 15 de marzo en Costa/Insular o el 15 de agosto en Sierra/Amazonía. La solicitud y sus cambios deben respetar los plazos aplicables.</p>
        <p>Consulta normativa: 26 de octubre de 2026. Las reglas de esta guía corresponden al trabajador privado general CT; LOSEP y LOEP conservan sus parámetros propios.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a className="text-primary underline" href="https://www.trabajo.gob.ec/wp-content/uploads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf" target="_blank" rel="noreferrer">Décimos · MDT-2023-140</a>
          <a className="text-primary underline" href="https://www.trabajo.gob.ec/wp-content/uploads/2025/06/ACUERDO-MINISTERIAL-MDT-2025-053.pdf" target="_blank" rel="noreferrer">Reforma 2025 y detalle del rol</a>
          <a className="text-primary underline" href="https://iess.gob.ec/web/afiliado/servicios-y-prestaciones" target="_blank" rel="noreferrer">Aportes IESS</a>
          <a className="text-primary underline" href="https://www.iess.gob.ec/es/web/afiliado/fondos-de-reserva" target="_blank" rel="noreferrer">Fondos de reserva</a>
          <a className="text-primary underline" href="https://www.sri.gob.ec/detalle-noticias?idnoticia=1324&marquesina=1" target="_blank" rel="noreferrer">Proyección fiscal 2026 · SRI</a>
        </div>
      </CardContent></Card>
    </div>
  </>;
}
