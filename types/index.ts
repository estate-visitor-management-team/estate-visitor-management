
export type UserRole = 'resident' | 'security' | 'admin';

export type AppUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  phone: string;
  estateId: string;
  houseId?: string | null;
  houseNumber?: string | null;
  staffId?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: {
    id: string;
    role: 'ADMIN' | 'RESIDENT' | 'SECURITY';
  };
};

export type AuthMeResponse = {
  user: {
    id: string;
    estateId: string;
    role: 'ADMIN' | 'RESIDENT' | 'SECURITY';
    fullName: string;
    username: string;
    phone: string;
    staffId: string | null;
    mustChangePassword: boolean;
    houseId: string | null;
    houseNumber: string | null;
  };
};

export type VisitStatus =
  | 'EXPECTED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'INSIDE'
  | 'EXIT_REQUESTED'
  | 'EXITED'
  | 'COMPLETED'
  | 'EXPIRED';

export type Visitor = {
  id: string;
  fullName: string;
  phone: string;
  purpose: string;
  expectedAt: string;
  additionalInfo?: string;
  houseNumber: string;
  residentName: string;
  residentPhone: string;
  status: VisitStatus;
  entryToken: string;
  exitToken?: string;
  createdAt: string;
  entryAt?: string;
  exitAt?: string;
  entryOfficer?: string;
  exitOfficer?: string;
  residentAcknowledged?: boolean;
};