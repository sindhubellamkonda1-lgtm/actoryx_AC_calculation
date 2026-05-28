import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const generateReport = async (results, chartElementId) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(8, 145, 178);
  doc.text('Actoryx BEMS Report', 20, 20);

  // Table
  autoTable(doc, {
    startY: 40,
    head: [['Metric', 'Value']],
    body: [
      ['Total Heat Load', `${results.total_heat_load_btu.toLocaleString()} BTU/hr`],
      ['Required AC Capacity', `${results.required_ac_ton} Tons`],
      ['Recommended Unit', `${results.recommended_unit_qty} Units (${results.recommended_standard_unit} Tons Each)`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [8, 145, 178] }
  });

  // Capture the Chart Element with a small delay
  const chartElement = document.getElementById(chartElementId);
  
  if (chartElement) {
    // Wait 500ms to ensure chart animation/rendering is finished
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const canvas = await html2canvas(chartElement, {
      scale: 2, // Increases quality
      logging: false,
      useCORS: true
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Thermal Distribution Analytics', 20, 120);
    doc.addImage(imgData, 'PNG', 20, 130, 160, 90); 
  }

  doc.save(`Actoryx_Report_${new Date().getTime()}.pdf`);
};