export type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

export type TagOption = {
  id: string;
  name: string;
  color: string;
};

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  ownerId: string | null;
  ownerName: string | null;
  tags: string[];
  notes: string | null;
  dealsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DealRow = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  probability: number;
  customerId: string;
  customerName: string;
  customerTags: string[];
  ownerId: string | null;
  ownerName: string | null;
  expectedCloseDate: string | null;
  description: string | null;
  lostReason: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTo: string | null;
  assigneeName: string | null;
  relatedTo: string | null;
  createdAt: string;
};

export type ActivityRow = {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';
  content: string;
  customerId: string | null;
  customerName: string | null;
  dealId: string | null;
  dealTitle: string | null;
  userId: string;
  userName: string | null;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
};
