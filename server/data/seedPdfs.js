import fs from 'fs';
import path from 'path';

// Helper to create a minimal valid PDF binary buffer containing structured text
function createMinimalPdfBuffer(title, subtitle, contentLines = []) {
  const sanitizeText = (text) => text.replace(/[()\\]/g, '\\$&');

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Length 500 >>
stream
BT
/F1 22 Tf
50 730 Td
(${sanitizeText(title)}) Tj
0 -30 Td
/F2 14 Tf
0 0 0 rg
(${sanitizeText(subtitle)}) Tj
0 -40 Td
/F2 11 Tf
(---------------------------------------------------------------------------------------------------) Tj
0 -25 Td
(Official Academic Resource - Question Bank Exchange) Tj
0 -20 Td
(Semester Study Material & Examination Reference Document) Tj
0 -35 Td
/F1 14 Tf
(Resource Content Preview:) Tj
0 -25 Td
/F2 11 Tf
(1. Unit 1: Foundations, Key Definitions, and Core Concepts) Tj
0 -20 Td
(2. Unit 2: Architecture, Methods, and Algorithmic Workflows) Tj
0 -20 Td
(3. Unit 3: Previous Semester Examination Questions & Solutions) Tj
0 -20 Td
(4. Unit 4: Model Questions & Expected 10-Mark Questions) Tj
0 -20 Td
(5. Unit 5: Case Studies, Diagrams, and Summary Formulae) Tj
0 -40 Td
/F2 9 Tf
(Generated for Question Bank Exchange Platform - Verified Academic Material) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000249 00000 n 
0000000325 00000 n 
0000000396 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
960
%%EOF`;

  return Buffer.from(pdfContent, 'utf-8');
}

export function ensureSamplePdfs(uploadsDir) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const sampleFiles = [
    {
      fileName: 'sample-dwdm-qb1.pdf',
      title: 'Data Warehousing & Mining - Question Bank 1',
      subtitle: 'Course Code: DW301 | Semester 3-1 | Academic Year 2025-2026'
    },
    {
      fileName: 'sample-dwdm-paper2025.pdf',
      title: 'DWDM Previous Semester Paper - Nov 2025',
      subtitle: 'End Semester Examination Question Paper | Max Marks: 70'
    },
    {
      fileName: 'sample-dwdm-unit1-imp.pdf',
      title: 'DWDM Unit 1 Important Questions & Formulae',
      subtitle: 'Data Cube, OLAP Operations & Preprocessing Notes'
    },
    {
      fileName: 'sample-cn-notes.pdf',
      title: 'Computer Networks Complete Unit-Wise Study Material',
      subtitle: 'OSI Layer Model, TCP/IP, Routing Algorithms Notes'
    },
    {
      fileName: 'sample-os-paper2024.pdf',
      title: 'Operating Systems Semester Exam Paper 2024',
      subtitle: 'Previous Year Question Paper with Answer Hints'
    },
    {
      fileName: 'sample-ml-qb.pdf',
      title: 'Machine Learning Comprehensive Question Bank',
      subtitle: 'Supervised, Unsupervised & Neural Networks Questions'
    }
  ];

  sampleFiles.forEach(item => {
    const filePath = path.join(uploadsDir, item.fileName);
    if (!fs.existsSync(filePath)) {
      const pdfBuffer = createMinimalPdfBuffer(item.title, item.subtitle);
      fs.writeFileSync(filePath, pdfBuffer);
      console.log(`Created sample PDF: ${item.fileName}`);
    }
  });
}
