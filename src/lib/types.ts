export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type InvoiceStatus = 'pending' | 'processing' | 'auto_approved' | 'flagged' | 'blocked' | 'manually_approved' | 'manually_rejected';
export type PaymentStatus = 'pending' | 'executed' | 'blocked' | 'flagged_for_review';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  vendorName: string;
  vendorDomain?: string;
  vendorAddress?: string;
  amount: number;
  currency: string;
  lineItems: LineItem[];
  dueDate: string;
  invoiceDate: string;
  invoiceNumber: string;
  description: string;
  rawText: string;
  status: InvoiceStatus;
  createdAt: string;
  processedAt?: string;
}

export interface SpecterCompany {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  foundedYear?: number;
  employeeCount?: number;
  employeeCountRange?: string;
  growthStage?: string;
  operatingStatus?: string;
  totalFundingUsd?: number;
  lastFundingDate?: string;
  lastFundingRound?: string;
  investors?: string[];
  highlights?: string[];
  website?: string;
  headquarters?: string;
  industry?: string;
  news?: Array<{ title: string; url: string; date: string }>;
  webVisits?: number;
  socialLinks?: Record<string, string>;
}

export interface SpecterPerson {
  name: string;
  title?: string;
  seniority?: string;
  department?: string;
  linkedinUrl?: string;
  isCeo?: boolean;
  isFounder?: boolean;
}

export interface WebsiteCheck {
  url: string;
  visited: boolean;
  looksLegitimate: boolean;
  description: string;
  screenshotDescription?: string;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number; // 0-1, where 1 is highest risk
  reasoning: string;
  recommendation: 'auto_approve' | 'flag_for_review' | 'block';
  thresholdsTriggered: string[];
  brief: string; // analyst-grade risk brief
  confidence: number; // 0-1
}

export interface VendorProfile {
  name: string;
  domain?: string;
  specterData?: SpecterCompany;
  keyPeople?: SpecterPerson[];
  websiteCheck?: WebsiteCheck;
  webSearchFindings?: string;
  trustScore: number; // 0-100, evolves over time
  invoiceCount: number;
  totalPaid: number;
  lastAssessment?: RiskAssessment;
  firstSeen: string;
  lastSeen: string;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  vendorName: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  approvedBy: 'agent' | 'human';
  approvedAt: string;
  brief: string;
  processingTimeMs: number;
}

export type ActivityEventType =
  | 'invoice_received'
  | 'parsing_started'
  | 'parsing_complete'
  | 'specter_company_search'
  | 'specter_company_found'
  | 'specter_company_not_found'
  | 'specter_people_search'
  | 'specter_people_found'
  | 'web_search_started'
  | 'web_search_complete'
  | 'browser_visit_started'
  | 'browser_visit_complete'
  | 'risk_assessment_started'
  | 'risk_assessment_complete'
  | 'decision_made'
  | 'payment_executed'
  | 'payment_blocked'
  | 'payment_flagged'
  | 'human_approved'
  | 'human_rejected'
  | 'error'
  | 'agent_thinking'
  | 'stage_marker'
  | 'pipeline_summary'
  | 'notification_routing'
  | 'notification_complete'
  | 'pool_waiting'
  | 'pool_acquired';

export interface ActivityEvent {
  id: string;
  invoiceId: string;
  type: ActivityEventType;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  description: string;
}

export interface NotificationRecipient {
  employee: Employee;
  reason: string;
  priority: 'required' | 'recommended' | 'fyi';
  selected: boolean;
}

export interface ProcessingResult {
  invoice: Invoice;
  vendorProfile: VendorProfile;
  riskAssessment: RiskAssessment;
  transaction?: Transaction;
  suggestedRecipients?: NotificationRecipient[];
}

export interface CrossInvoicePattern {
  id: string;
  type: 'same_registration_period' | 'similar_amounts' | 'rapid_onboarding' | 'geographic_cluster';
  description: string;
  invoiceIds: string[];
  severity: RiskLevel;
  detectedAt: string;
}
