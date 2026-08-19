import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../services/supabaseClient';
import { calcularClasesEnRango } from './membresiaUtils';

export const generarHistorialPDF = async (alumnoId) => {
  try {
    // 1. Obtener datos del alumno
    const { data: alumno, error } = await supabase
      .from('alumnos')
      .select(`
        *,
        pagos (*),
        asistencias (*),
        horarios ( dias )
      `)
      .eq('id', alumnoId)
      .single();

    if (error) throw error;
    if (!alumno) throw new Error('Alumno no encontrado');

    // Inicializar documento PDF (A4)
    const doc = new jsPDF();
    
    // Variables de estilo
    const brandRed = [139, 13, 26]; // #8B0D1A
    const darkGray = [30, 41, 59];
    const lightGray = [100, 116, 139];

    // --- ENCABEZADO ---
    // Cargar y añadir logo de Fertex (esquina superior derecha)
    await new Promise((resolve) => {
      const img = new Image();
      img.src = '/logo-fertex.webp';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          // A4 ancho es 210mm. Colocamos en X: 170, Y: 10, ancho: 25, alto: 25
          doc.addImage(dataUrl, 'PNG', 170, 10, 25, 25);
        } catch (e) {
          console.warn('Error procesando logo para PDF:', e);
        }
        resolve();
      };
      img.onerror = () => {
        console.warn('Error cargando logo-fertex.webp para el PDF');
        resolve();
      };
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...brandRed);
    doc.text('Taekwondo Fertex', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    doc.text('Reporte Oficial de Historial', 14, 28);
    
    // Fecha de generación
    const todayStr = new Date().toLocaleDateString('es-PE', { 
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Generado el: ${todayStr}`, 14, 34);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    // --- DATOS DEL ALUMNO ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...darkGray);
    doc.text('Información del Alumno', 14, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Nombre: ${alumno.nombre} ${alumno.apellidos}`, 14, 56);
    doc.text(`Disciplina: ${alumno.disciplina || 'Taekwondo'}`, 14, 62);
    doc.text(`Grado/Cinturón: ${alumno.cinturon}`, 14, 68);
    doc.text(`Teléfono: ${alumno.telefono_padres || 'No registrado'}`, 105, 56);
    doc.text(`Fecha de Ingreso: ${alumno.fecha_registro ? new Date(alumno.fecha_registro).toLocaleDateString() : 'N/A'}`, 105, 62);

    // --- RESUMEN DEL MES ACTUAL ---
    let startY = 80;

    const pagosOrdenados = (alumno.pagos || []).sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));
    const ultimoPago = pagosOrdenados[0];
    
    if (ultimoPago && alumno.horarios?.dias) {
      const hoy = new Date();
      // Formatear hoy a YYYY-MM-DD
      const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      
      const fechaFinCalculo = (hoyStr < ultimoPago.fecha_vencimiento) ? hoyStr : ultimoPago.fecha_vencimiento;
      
      const clasesPasadas = calcularClasesEnRango(ultimoPago.fecha_inicio, fechaFinCalculo, alumno.horarios.dias);
      
      const targetStart = new Date(`${ultimoPago.fecha_inicio}T00:00:00`).getTime();
      const targetEnd = new Date(`${fechaFinCalculo}T23:59:59`).getTime();

      const asistenciasEnPeriodo = (alumno.asistencias || []).filter(a => {
        if (!a.fecha_asistencia) return false;
        const t = new Date(a.fecha_asistencia).getTime();
        return t >= targetStart && t <= targetEnd;
      }).length;

      const faltas = Math.max(0, clasesPasadas - asistenciasEnPeriodo);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...darkGray);
      doc.text('Resumen del Mes Actual', 14, startY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...darkGray);
      doc.text(`Periodo: ${new Date(ultimoPago.fecha_inicio).toLocaleDateString()} al ${new Date(ultimoPago.fecha_vencimiento).toLocaleDateString()}`, 14, startY + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Clases Totales: ${clasesPasadas}   |   Asistencias: ${asistenciasEnPeriodo}   |   Faltas: ${faltas}`, 14, startY + 14);
      
      startY += 26;
    }

    // --- TABLA DE PAGOS ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...darkGray);
    doc.text('Historial de Pagos', 14, startY);

    const pagosData = (alumno.pagos || [])
      .sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago))
      .map(p => [
        p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString() : 'N/A',
        `S/ ${p.monto}`,
        p.metodo_pago || 'N/A',
        `${p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : 'N/A'} - ${p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString() : 'N/A'}`
      ]);

    autoTable(doc, {
      startY: startY + 5,
      head: [['Fecha de Pago', 'Monto', 'Método', 'Periodo Cubierto']],
      body: pagosData.length > 0 ? pagosData : [['No hay pagos registrados', '', '', '']],
      headStyles: { fillColor: brandRed, textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: darkGray },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 }
    });

    startY = doc.lastAutoTable.finalY + 15;

    // --- TABLA DE ASISTENCIAS ---
    // Chequear si hay espacio en la página, si no, crear nueva página
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...darkGray);
    doc.text('Historial de Asistencias', 14, startY);

    const asistenciasData = (alumno.asistencias || [])
      .sort((a, b) => new Date(b.fecha_asistencia) - new Date(a.fecha_asistencia))
      .map((a, index) => [
        index + 1,
        a.fecha_asistencia ? new Date(a.fecha_asistencia).toLocaleDateString('es-PE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'N/A',
        a.fecha_asistencia ? new Date(a.fecha_asistencia).toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A'
      ]);

    autoTable(doc, {
      startY: startY + 5,
      head: [['N°', 'Día y Fecha', 'Hora de Registro']],
      body: asistenciasData.length > 0 ? asistenciasData : [['No hay asistencias registradas', '', '']],
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' }, // Dark Slate header for attendance
      bodyStyles: { textColor: darkGray },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // --- PIE DE PÁGINA ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento generado automáticamente por el Sistema Taekwondo Fertex - Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // --- DESCARGAR ---
    const fileName = `Historial_${alumno.nombre.replace(/\s+/g, '_')}_${alumno.apellidos.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    return { success: true };
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return { success: false, error };
  }
};
