/**
 * Demo clinical records for the Patients / Reports pages.
 * Static demo data — no real PHI, matches the RetinaScan demo cases.
 */

export type DrStageLabel = "No DR" | "Mild" | "Moderate" | "Severe" | "Proliferative";

export const DR_LABELS: Record<number, DrStageLabel> = {
  0: "No DR",
  1: "Mild",
  2: "Moderate",
  3: "Severe",
  4: "Proliferative",
};

export interface ScreeningRecord {
  date: string;
  eye: "Right Eye (OD)" | "Left Eye (OS)";
  drStage: number;
  confidence: number;
  referable: boolean;
  status: "Complete" | "Pending Review" | "Clinician Verified";
  clinician?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "Male" | "Female";
  diabetesType: "Type 1" | "Type 2";
  diabetesDuration: string;
  hba1c: string;
  lastScreening: string;
  lastScreeningDaysAgo: number;
  eye: "Right Eye (OD)" | "Left Eye (OS)";
  drStage: number;
  confidence: number;
  referable: boolean;
  referralStatus: "Refer" | "Follow-up" | "Routine";
  lastUpdated: string;
  phone: string;
  mrn: string;
  screenings: ScreeningRecord[];
  clinicalNotes: string[];
}

export const PATIENTS: Patient[] = [
  {
    id: "PAT-10241",
    name: "Ananya Sharma",
    age: 54,
    sex: "Female",
    diabetesType: "Type 2",
    diabetesDuration: "12 years",
    hba1c: "7.8%",
    lastScreening: "Sep 8, 2026",
    lastScreeningDaysAgo: 2,
    eye: "Right Eye (OD)",
    drStage: 2,
    confidence: 93,
    referable: true,
    referralStatus: "Refer",
    lastUpdated: "Sep 8, 2026 · 10:42",
    phone: "+91 98••• ••210",
    mrn: "MRN-771204",
    screenings: [
      { date: "Sep 8, 2026", eye: "Right Eye (OD)", drStage: 2, confidence: 93, referable: true, status: "Pending Review" },
      { date: "Jun 2, 2026", eye: "Right Eye (OD)", drStage: 1, confidence: 91, referable: false, status: "Clinician Verified", clinician: "Dr. Mehta" },
      { date: "Feb 14, 2026", eye: "Right Eye (OD)", drStage: 1, confidence: 90, referable: false, status: "Clinician Verified", clinician: "Dr. Mehta" },
      { date: "Sep 20, 2025", eye: "Right Eye (OD)", drStage: 0, confidence: 96, referable: false, status: "Clinician Verified", clinician: "Dr. Rao" },
    ],
    clinicalNotes: [
      "Progression from Mild to Moderate NPDR over 6 months — accelerated relative to prior interval.",
      "HbA1c elevated; metabolic control discussed with endocrinology team.",
      "Ophthalmology referral issued Sep 8, 2026 (3-month window).",
    ],
  },
  {
    id: "PAT-10238",
    name: "Rahul Verma",
    age: 61,
    sex: "Male",
    diabetesType: "Type 2",
    diabetesDuration: "18 years",
    hba1c: "9.1%",
    lastScreening: "Sep 7, 2026",
    lastScreeningDaysAgo: 3,
    eye: "Left Eye (OS)",
    drStage: 4,
    confidence: 95,
    referable: true,
    referralStatus: "Refer",
    lastUpdated: "Sep 7, 2026 · 16:20",
    phone: "+91 97••• ••883",
    mrn: "MRN-669021",
    screenings: [
      { date: "Sep 7, 2026", eye: "Left Eye (OS)", drStage: 4, confidence: 95, referable: true, status: "Pending Review" },
      { date: "May 30, 2026", eye: "Left Eye (OS)", drStage: 3, confidence: 92, referable: true, status: "Clinician Verified", clinician: "Dr. Rao" },
      { date: "Dec 11, 2025", eye: "Left Eye (OS)", drStage: 2, confidence: 94, referable: true, status: "Clinician Verified", clinician: "Dr. Mehta" },
    ],
    clinicalNotes: [
      "Rapid progression Severe → Proliferative in 3 months. Urgent referral flagged.",
      "Neovascularization suspected on Grad-CAM review — correlation with FA recommended.",
      "Patient counseled on urgency; appointment requested within 2 weeks.",
    ],
  },
  {
    id: "PAT-10233",
    name: "Priya Nair",
    age: 47,
    sex: "Female",
    diabetesType: "Type 1",
    diabetesDuration: "22 years",
    hba1c: "6.9%",
    lastScreening: "Sep 5, 2026",
    lastScreeningDaysAgo: 5,
    eye: "Right Eye (OD)",
    drStage: 0,
    confidence: 96,
    referable: false,
    referralStatus: "Routine",
    lastUpdated: "Sep 5, 2026 · 09:15",
    phone: "+91 96••• ••407",
    mrn: "MRN-550388",
    screenings: [
      { date: "Sep 5, 2026", eye: "Right Eye (OD)", drStage: 0, confidence: 96, referable: false, status: "Clinician Verified", clinician: "Dr. Mehta" },
      { date: "Mar 18, 2026", eye: "Right Eye (OD)", drStage: 0, confidence: 95, referable: false, status: "Clinician Verified", clinician: "Dr. Mehta" },
      { date: "Sep 22, 2025", eye: "Right Eye (OD)", drStage: 0, confidence: 97, referable: false, status: "Clinician Verified", clinician: "Dr. Rao" },
    ],
    clinicalNotes: [
      "No retinopathy detected across three consecutive annual screenings.",
      "Well-controlled T1DM; continue routine annual screening protocol.",
    ],
  },
  {
    id: "PAT-10229",
    name: "Arjun Patel",
    age: 58,
    sex: "Male",
    diabetesType: "Type 2",
    diabetesDuration: "9 years",
    hba1c: "8.4%",
    lastScreening: "Sep 4, 2026",
    lastScreeningDaysAgo: 6,
    eye: "Left Eye (OS)",
    drStage: 2,
    confidence: 92,
    referable: true,
    referralStatus: "Follow-up",
    lastUpdated: "Sep 4, 2026 · 14:03",
    phone: "+91 98••• ••662",
    mrn: "MRN-482117",
    screenings: [
      { date: "Sep 4, 2026", eye: "Left Eye (OS)", drStage: 2, confidence: 92, referable: true, status: "Clinician Verified", clinician: "Dr. Rao" },
      { date: "Apr 9, 2026", eye: "Left Eye (OS)", drStage: 2, confidence: 93, referable: true, status: "Clinician Verified", clinician: "Dr. Mehta" },
      { date: "Nov 2, 2025", eye: "Left Eye (OS)", drStage: 1, confidence: 90, referable: false, status: "Clinician Verified", clinician: "Dr. Rao" },
    ],
    clinicalNotes: [
      "Stable Moderate NPDR over two consecutive screenings.",
      "Follow-up screening scheduled in 6 months per protocol.",
    ],
  },
  {
    id: "PAT-10217",
    name: "Meera Iyer",
    age: 66,
    sex: "Female",
    diabetesType: "Type 2",
    diabetesDuration: "15 years",
    hba1c: "7.2%",
    lastScreening: "Aug 30, 2026",
    lastScreeningDaysAgo: 11,
    eye: "Right Eye (OD)",
    drStage: 1,
    confidence: 91,
    referable: false,
    referralStatus: "Follow-up",
    lastUpdated: "Aug 30, 2026 · 11:37",
    phone: "+91 94••• ••129",
    mrn: "MRN-390455",
    screenings: [
      { date: "Aug 30, 2026", eye: "Right Eye (OD)", drStage: 1, confidence: 91, referable: false, status: "Complete" },
      { date: "Feb 6, 2026", eye: "Right Eye (OD)", drStage: 0, confidence: 94, referable: false, status: "Clinician Verified", clinician: "Dr. Mehta" },
    ],
    clinicalNotes: [
      "New-onset Mild NPDR; few microaneurysms only.",
      "Repeat screening in 6 months to monitor progression.",
    ],
  },
  {
    id: "PAT-10205",
    name: "Karan Malhotra",
    age: 43,
    sex: "Male",
    diabetesType: "Type 2",
    diabetesDuration: "6 years",
    hba1c: "6.5%",
    lastScreening: "Aug 27, 2026",
    lastScreeningDaysAgo: 14,
    eye: "Left Eye (OS)",
    drStage: 0,
    confidence: 97,
    referable: false,
    referralStatus: "Routine",
    lastUpdated: "Aug 27, 2026 · 08:55",
    phone: "+91 99••• ••546",
    mrn: "MRN-310982",
    screenings: [
      { date: "Aug 27, 2026", eye: "Left Eye (OS)", drStage: 0, confidence: 97, referable: false, status: "Clinician Verified", clinician: "Dr. Rao" },
      { date: "Aug 10, 2025", eye: "Left Eye (OS)", drStage: 0, confidence: 96, referable: false, status: "Clinician Verified", clinician: "Dr. Mehta" },
    ],
    clinicalNotes: [
      "Clear fundus bilaterally. Continue annual screening.",
    ],
  },
];

export interface ReportRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  drStage: number;
  confidence: number;
  referable: boolean;
  verification: "Pending Review" | "Clinician Verified" | "Archived";
  clinician: string;
  findings: string[];
  evidence: { title: string; type: string; relevance: number; ref: string }[];
  recommendation: string;
  generatedAt: string;
}

const EYESCAN_EVIDENCE = [
  {
    title: "International Clinical DR (ICDR) Severity Scale",
    type: "Clinical Guideline",
    relevance: 0.94,
    ref: "ICDR-2002-ETDRS",
  },
  {
    title: "AAO Preferred Practice Pattern — Diabetic Retinopathy",
    type: "Clinical Guideline",
    relevance: 0.91,
    ref: "AAO-PPP-DR-2025",
  },
  {
    title: "Deep learning for DR detection — Grad-CAM validation cohort",
    type: "Peer-reviewed Literature",
    relevance: 0.87,
    ref: "DOI:10.1001/jamaophthalmol.2016.5223",
  },
];

export const REPORTS: ReportRecord[] = [
  {
    id: "RPT-2026-0918",
    patientId: "PAT-10241",
    patientName: "Ananya Sharma",
    date: "Sep 8, 2026",
    drStage: 2,
    confidence: 93,
    referable: true,
    verification: "Pending Review",
    clinician: "—",
    findings: ["Microaneurysms detected", "Dot/blot hemorrhages detected", "Hard exudates detected", "No neovascularization"],
    evidence: EYESCAN_EVIDENCE,
    recommendation: "Refer to ophthalmology for clinical examination and confirmation within 3 months.",
    generatedAt: "Sep 8, 2026 · 10:42",
  },
  {
    id: "RPT-2026-0917",
    patientId: "PAT-10238",
    patientName: "Rahul Verma",
    date: "Sep 7, 2026",
    drStage: 4,
    confidence: 95,
    referable: true,
    verification: "Pending Review",
    clinician: "—",
    findings: ["Extensive hemorrhages detected", "Neovascularization suspected", "Venous beading", "Fibrovascular proliferation"],
    evidence: EYESCAN_EVIDENCE,
    recommendation: "Urgent ophthalmology referral recommended — proliferative changes detected.",
    generatedAt: "Sep 7, 2026 · 16:20",
  },
  {
    id: "RPT-2026-0915",
    patientId: "PAT-10233",
    patientName: "Priya Nair",
    date: "Sep 5, 2026",
    drStage: 0,
    confidence: 96,
    referable: false,
    verification: "Clinician Verified",
    clinician: "Dr. A. Mehta",
    findings: ["No microaneurysms", "No hemorrhages", "No exudates", "No neovascularization"],
    evidence: EYESCAN_EVIDENCE,
    recommendation: "No referral required. Routine annual screening recommended.",
    generatedAt: "Sep 5, 2026 · 09:15",
  },
  {
    id: "RPT-2026-0912",
    patientId: "PAT-10229",
    patientName: "Arjun Patel",
    date: "Sep 4, 2026",
    drStage: 2,
    confidence: 92,
    referable: true,
    verification: "Clinician Verified",
    clinician: "Dr. S. Rao",
    findings: ["Microaneurysms detected", "Dot/blot hemorrhages detected", "Hard exudates detected"],
    evidence: EYESCAN_EVIDENCE,
    recommendation: "Refer to ophthalmology for clinical examination and confirmation within 3 months.",
    generatedAt: "Sep 4, 2026 · 14:03",
  },
  {
    id: "RPT-2026-0908",
    patientId: "PAT-10217",
    patientName: "Meera Iyer",
    date: "Aug 30, 2026",
    drStage: 1,
    confidence: 91,
    referable: false,
    verification: "Pending Review",
    clinician: "—",
    findings: ["Few microaneurysms detected", "No hemorrhages", "No exudates"],
    evidence: EYESCAN_EVIDENCE,
    recommendation: "Non-referable. Repeat screening in 6 months to monitor progression.",
    generatedAt: "Aug 30, 2026 · 11:37",
  },
  {
    id: "RPT-2026-0901",
    patientId: "PAT-10205",
    patientName: "Karan Malhotra",
    date: "Aug 27, 2026",
    drStage: 0,
    confidence: 97,
    referable: false,
    verification: "Archived",
    clinician: "Dr. S. Rao",
    findings: ["No lesions detected", "Clear fundus"],
    evidence: EYESCAN_EVIDENCE,
    recommendation: "No referral required. Routine annual screening recommended.",
    generatedAt: "Aug 27, 2026 · 08:55",
  },
];
