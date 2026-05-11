export type PartnerRole = "ADMIN" | "PARTNER";

export interface PartnerUser {
  id: string;
  email: string;
  name: string;
  role: PartnerRole;
  partnerId?: string;
  companyName?: string;
  commissionRate?: number;
}

export interface Partner {
  id: string;
  userId: string;
  companyName: string;
  contactPhone?: string;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  user: { id: string; email: string; name: string };
}

export interface Lead {
  id: string;
  partnerId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "LOST";
  notes?: string;
  convertedToClientId?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  partnerId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: string;
  convertedFromLead?: { id: string; name: string };
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface Deal {
  id: string;
  partnerId: string;
  clientId: string;
  serviceId: string;
  value: number;
  status: "PENDING" | "WON" | "LOST";
  notes?: string;
  wonAt?: string;
  createdAt: string;
  client?: { id: string; name: string; email?: string };
  service?: { id: string; name: string; basePrice?: number };
}

export interface Contract {
  id: string;
  partnerId: string;
  dealId: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  pdfUrl?: string;
  createdAt: string;
  deal?: {
    id: string;
    value: number;
    client?: { id: string; name: string };
    service?: { id: string; name: string };
  };
}

export interface Invoice {
  id: string;
  partnerId: string;
  dealId: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED";
  amount: number;
  rejectionReason?: string;
  pdfUrl?: string;
  createdAt: string;
  deal?: {
    id: string;
    value: number;
    client?: { id: string; name: string };
    service?: { id: string; name: string };
  };
}

export interface Commission {
  id: string;
  partnerId: string;
  dealId: string;
  amount: number;
  rate: number;
  status: "PENDING" | "APPROVED" | "PAID";
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  deal?: { id: string; value: number; client?: { id: string; name: string } };
  partner?: { id: string; companyName: string };
}

export interface PartnerNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
