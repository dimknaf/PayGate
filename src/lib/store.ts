import {
  Invoice,
  VendorProfile,
  Transaction,
  ActivityEvent,
  CrossInvoicePattern,
  ProcessingResult,
} from './types';
import { activityEmitter } from './events';

class InMemoryStore {
  invoices: Map<string, Invoice> = new Map();
  vendors: Map<string, VendorProfile> = new Map();
  transactions: Map<string, Transaction> = new Map();
  activityLog: ActivityEvent[] = [];
  processingResults: Map<string, ProcessingResult> = new Map();
  patterns: CrossInvoicePattern[] = [];

  constructor() {
    activityEmitter.subscribe((event) => {
      this.activityLog.push(event);
    });
  }

  addInvoice(invoice: Invoice): void {
    this.invoices.set(invoice.id, invoice);
  }

  getInvoice(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    const updated = { ...invoice, ...updates };
    this.invoices.set(id, updated);
    return updated;
  }

  getAllInvoices(): Invoice[] {
    return Array.from(this.invoices.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getVendor(name: string): VendorProfile | undefined {
    return this.vendors.get(name.toLowerCase());
  }

  upsertVendor(profile: VendorProfile): void {
    this.vendors.set(profile.name.toLowerCase(), profile);
  }

  getAllVendors(): VendorProfile[] {
    return Array.from(this.vendors.values());
  }

  addTransaction(tx: Transaction): void {
    this.transactions.set(tx.id, tx);
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  getTransactionByInvoice(invoiceId: string): Transaction | undefined {
    return Array.from(this.transactions.values()).find(
      (tx) => tx.invoiceId === invoiceId
    );
  }

  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()
    );
  }

  setProcessingResult(invoiceId: string, result: ProcessingResult): void {
    this.processingResults.set(invoiceId, result);
  }

  getProcessingResult(invoiceId: string): ProcessingResult | undefined {
    return this.processingResults.get(invoiceId);
  }

  getActivityLog(invoiceId?: string): ActivityEvent[] {
    if (invoiceId) {
      return this.activityLog.filter((e) => e.invoiceId === invoiceId);
    }
    return [...this.activityLog];
  }

  addPattern(pattern: CrossInvoicePattern): void {
    this.patterns.push(pattern);
  }

  getPatterns(): CrossInvoicePattern[] {
    return [...this.patterns];
  }
}

// Persist across HMR in development
const globalForStore = globalThis as unknown as { __store?: InMemoryStore };
export const store = globalForStore.__store ?? new InMemoryStore();
globalForStore.__store = store;
