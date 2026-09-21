export const initialSemesters = [
  { id: 'sem-3-1', name: '3-1', title: 'Third Year - Semester 1', description: 'Data Warehousing, Computer Networks, Operating Systems & Machine Learning' },
  { id: 'sem-3-2', name: '3-2', title: 'Third Year - Semester 2', description: 'Web Technologies, Compiler Design, AI, Cryptography & Cloud Computing' },
  { id: 'sem-4-1', name: '4-1', title: 'Fourth Year - Semester 1', description: 'Information Security, Big Data, Distributed Systems & Project Management' },
  { id: 'sem-4-2', name: '4-2', title: 'Fourth Year - Semester 2', description: 'IoT, Cyber Forensics, Mobile Computing & Major Capstone Project' }
];

export const initialSubjects = [
  // 3-1 (Detailed sample subjects)
  { id: 'subj-31-1', code: 'DW301', name: 'Data Warehousing & Data Mining', semester: '3-1' },
  { id: 'subj-31-2', code: 'CN302', name: 'Computer Networks', semester: '3-1' },
  { id: 'subj-31-3', code: 'OS303', name: 'Operating Systems', semester: '3-1' },
  { id: 'subj-31-4', code: 'ML304', name: 'Machine Learning', semester: '3-1' },
  { id: 'subj-31-5', code: 'PE305', name: 'Professional Ethics & Human Values', semester: '3-1' },

  // 3-2
  { id: 'subj-32-1', code: 'WT306', name: 'Web Technologies', semester: '3-2' },
  { id: 'subj-32-2', code: 'CD307', name: 'Compiler Design', semester: '3-2' },
  { id: 'subj-32-3', code: 'AI308', name: 'Artificial Intelligence', semester: '3-2' },
  { id: 'subj-32-4', code: 'CNS309', name: 'Cryptography & Network Security', semester: '3-2' },

  // 4-1
  { id: 'subj-41-1', code: 'IS401', name: 'Information Security', semester: '4-1' },
  { id: 'subj-41-2', code: 'BDA402', name: 'Big Data Analytics', semester: '4-1' },
  { id: 'subj-41-3', code: 'DS403', name: 'Distributed Systems', semester: '4-1' },

  // 4-2
  { id: 'subj-42-1', code: 'IOT404', name: 'Internet of Things (IoT)', semester: '4-2' },
  { id: 'subj-42-2', code: 'MC405', name: 'Mobile Computing', semester: '4-2' },
  { id: 'subj-42-3', code: 'CSF406', name: 'Cyber Security & Digital Forensics', semester: '4-2' }
];

export const initialResources = [
  // DWDM Resources (3-1)
  {
    id: 'res-dwdm-1',
    name: 'DWDM Comprehensive Question Bank 2026',
    semester: '3-1',
    subjectId: 'subj-31-1',
    subjectName: 'Data Warehousing & Data Mining',
    category: 'Question Bank',
    fileName: 'sample-dwdm-qb1.pdf',
    fileUrl: '/uploads/sample-dwdm-qb1.pdf',
    fileSize: '1.4 MB',
    uploadedDate: '2026-02-15',
    downloadsCount: 142
  },
  {
    id: 'res-dwdm-2',
    name: 'DWDM Previous Semester Exam Paper 2025',
    semester: '3-1',
    subjectId: 'subj-31-1',
    subjectName: 'Data Warehousing & Data Mining',
    category: 'Previous Question Paper',
    fileName: 'sample-dwdm-paper2025.pdf',
    fileUrl: '/uploads/sample-dwdm-paper2025.pdf',
    fileSize: '850 KB',
    uploadedDate: '2026-01-10',
    downloadsCount: 310
  },
  {
    id: 'res-dwdm-3',
    name: 'Unit 1 & Unit 2 Data Mining Important Questions',
    semester: '3-1',
    subjectId: 'subj-31-1',
    subjectName: 'Data Warehousing & Data Mining',
    category: 'Important Questions',
    fileName: 'sample-dwdm-unit1-imp.pdf',
    fileUrl: '/uploads/sample-dwdm-unit1-imp.pdf',
    fileSize: '620 KB',
    uploadedDate: '2026-03-01',
    downloadsCount: 98
  },

  // Computer Networks Resources (3-1)
  {
    id: 'res-cn-1',
    name: 'Computer Networks All Units Notes & Question Bank',
    semester: '3-1',
    subjectId: 'subj-31-2',
    subjectName: 'Computer Networks',
    category: 'Study Material',
    fileName: 'sample-cn-notes.pdf',
    fileUrl: '/uploads/sample-cn-notes.pdf',
    fileSize: '2.1 MB',
    uploadedDate: '2026-02-20',
    downloadsCount: 220
  },

  // Operating Systems Resources (3-1)
  {
    id: 'res-os-1',
    name: 'Operating Systems Semester Paper 2024',
    semester: '3-1',
    subjectId: 'subj-31-3',
    subjectName: 'Operating Systems',
    category: 'Previous Question Paper',
    fileName: 'sample-os-paper2024.pdf',
    fileUrl: '/uploads/sample-os-paper2024.pdf',
    fileSize: '980 KB',
    uploadedDate: '2025-11-14',
    downloadsCount: 175
  },

  // Machine Learning Resources (3-1)
  {
    id: 'res-ml-1',
    name: 'Machine Learning Unit-wise Important Questions',
    semester: '3-1',
    subjectId: 'subj-31-4',
    subjectName: 'Machine Learning',
    category: 'Important Questions',
    fileName: 'sample-ml-qb.pdf',
    fileUrl: '/uploads/sample-ml-qb.pdf',
    fileSize: '1.8 MB',
    uploadedDate: '2026-02-28',
    downloadsCount: 189
  }
];
