export enum UserRole {
  SUPER_ADMIN = "super_admin",
  OWNER = "owner",
  STAFF = "staff",
  WAGER = "wager",
  TAILOR = "tailor",
  PACKAGER = "packager",
  PAAVU_OATI = "paavu_oati",
}

export enum TenantStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  TRIAL = "trial",
}

export enum Permission {
  GODOWN_MANAGEMENT = "godown_management",
  PRODUCTION_ENTRY = "production_entry",
  WAGE_PROCESSING = "wage_processing",
  SALES_INVOICING = "sales_invoicing",
  REPORTS = "reports",
  DAMAGE_APPROVAL = "damage_approval",
  MASTER_DATA = "master_data",
}

export enum LoomOwnership {
  OWNER = "owner",
  WAGER = "wager",
}

export enum MaintenanceStatus {
  OPERATIONAL = "operational",
  UNDER_MAINTENANCE = "under_maintenance",
  IDLE = "idle",
}

export enum ProductCategory {
  SINGLE = "single",
  DOUBLE = "double",
  TRIPLE = "triple",
  QUAD = "quad",
}

export enum ColorPricingMode {
  AVERAGE = "average",
  PER_COLOR = "per_color",
}

export enum Shift {
  MORNING = "morning",
  EVENING = "evening",
  NIGHT = "night",
}

export enum CustomerType {
  WHOLESALE_PARTIAL = "wholesale_partial",
  WHOLESALE_BILL_TO_BILL = "wholesale_bill_to_bill",
  RETAIL = "retail",
}

export enum GodownType {
  GODOWN = "godown",
  PAAVU_PATTARAI = "paavu_pattarai",
}

export enum DamageGrade {
  MINOR = "minor",
  MAJOR = "major",
  REJECT = "reject",
}

export enum InventoryStage {
  RAW = "raw",
  PAAVU = "paavu",
  WOVEN = "woven",
  TAILORED = "tailored",
  BUNDLED = "bundled",
  SOLD = "sold",
}

export enum DetectionPoint {
  LOOM = "loom",
  TAILORING = "tailoring",
  PACKAGING = "packaging",
  GODOWN = "godown",
}

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum AdvanceType {
  ADVANCE_GIVEN = "advance_given",
  ADVANCE_DEDUCTION = "advance_deduction",
  DISCRETIONARY_ADDITION = "discretionary_addition",
}

export enum WageCycleStatus {
  DRAFT = "draft",
  REVIEW = "review",
  APPROVED = "approved",
  PAID = "paid",
}

export enum WorkerType {
  WAGER = "wager",
  TAILOR = "tailor",
  PACKAGER = "packager",
  PAAVU_OATI = "paavu_oati",
}

export enum BundleType {
  SMALL = "small",
  LARGE = "large",
}

export enum TaxType {
  INTRA_STATE = "intra_state",
  INTER_STATE = "inter_state",
}

export enum InvoiceStatus {
  DRAFT = "draft",
  ISSUED = "issued",
  PARTIALLY_PAID = "partially_paid",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CASH = "cash",
  UPI = "upi",
  BANK_TRANSFER = "bank_transfer",
  CHEQUE = "cheque",
  OTHER = "other",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum FraudSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  APPROVE = "approve",
}
