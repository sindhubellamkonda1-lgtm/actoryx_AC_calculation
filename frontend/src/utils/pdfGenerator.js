import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const generateReport = async (results, chartElementId, aiInsight) => {
  if (!results) {
    alert("No diagnostic results available to generate a report.");
    return;
  }

  // Initialize jsPDF (Portrait, Millimeters, A4)
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14; 
  
  // --- Header ---
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 145, 178); // cyan-600
  doc.text('Actoryx BEMS Thermal Report', margin, 20);

  // --- Table 1: Diagnostic Results ---
  autoTable(doc, {
    startY: 30,
    head: [['Diagnostic Metric', 'Value']],
    body: [
      ['Total Heat Load', `${results.total_heat_load_btu.toLocaleString()} BTU/hr`],
      ['Required AC Capacity', `${results.required_ac_ton} Tons`],
      ['Recommended Equipment', `${results.recommended_unit_qty} Units (${results.recommended_standard_unit} Tons Each)`],
      ['Grid Power Demand', `${results.required_ac_kw} kW_t`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [8, 145, 178] },
    styles: { fontSize: 10, cellPadding: 4 }
  });

  // Get the Y position where the first table ended
  let finalY = doc.lastAutoTable.finalY || 30;

  // --- Table 2: Thermal Load Breakdown ---
  autoTable(doc, {
    startY: finalY + 10,
    head: [['Thermal Load Breakdown Component', 'BTU/hr']],
    body: [
      ['Structural Envelope Conduction (CLTD)', results.room_btu.toLocaleString()],
      ['Solar Radiant Aperture Transmittance', results.windows_total_btu.toLocaleString()],
      ['Human Metabolic Core Dissipation', results.occupant_btu.toLocaleString()],
      ['Internal Appliance & Luminaire Loss', (results.equipment_btu + results.lighting_btu).toLocaleString()]
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }, // slate-900 
    styles: { fontSize: 10, cellPadding: 4 }
  });

  finalY = doc.lastAutoTable.finalY || finalY + 40;

  // --- Section: Thermal Load Distribution Graph ---
  const chartElement = document.getElementById(chartElementId);
  if (chartElement) {
    // Wait 500ms to ensure chart animation/rendering is finished
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const canvas = await html2canvas(chartElement, {
      scale: 2, 
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff"
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - (margin * 2); 
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if the image will fit on the current page, otherwise add a new page
    if (finalY + 20 + imgHeight > pageHeight - margin) {
      doc.addPage();
      finalY = margin;
    } else {
      finalY += 15;
    }

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Thermal Distribution Analytics', margin, finalY);
    
    doc.addImage(imgData, 'PNG', margin, finalY + 5, imgWidth, imgHeight);
    finalY = finalY + imgHeight + 20; 
  } else {
    finalY += 15;
  }

  // --- Section: AI Grid Optimization Strategies ---
  if (finalY + 30 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 10;
  } else {
    finalY += 10;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 145, 178); // cyan-600
  doc.text('AI Grid Optimization Strategy', margin, finalY);
  finalY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // slate-700

  const insightText = aiInsight || "No AI optimization strategy was synthesized prior to document generation.";
  const textLines = doc.splitTextToSize(insightText, pageWidth - (margin * 2));
  
  doc.text(textLines, margin, finalY);

  // Calculate the approximate Y position after the text block ends (each line is ~4.5mm in height)
  finalY += (textLines.length * 4.5) + 15;

  // --- Section: Contact Information ---
  // Ensure we have enough space for the contact block
  if (finalY + 20 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 10;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Need Further Details?", margin, finalY);
  finalY += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text("Contact Actoryx for advanced optimization configurations and implementation support:", margin, finalY);
  finalY += 6;

  // Clickable link rendering
  const contactUrl = "https://actoryx.ai/contact.html";
  doc.setTextColor(8, 145, 178); // cyan-600
  doc.textWithLink(contactUrl, margin, finalY, { url: contactUrl });
  
  // Draw an underline for visual cue
  const textWidth = doc.getTextWidth(contactUrl);
  doc.setDrawColor(8, 145, 178);
  doc.line(margin, finalY + 1, margin + textWidth, finalY + 1);

  // --- Save File ---
  doc.save(`Actoryx_Report_${new Date().getTime()}.pdf`);
};