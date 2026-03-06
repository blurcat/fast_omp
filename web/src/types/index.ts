export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  role_id: number | null;
  role?: Role;
  created_at: string;
  updated_at: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
}

export interface Menu {
  id: number;
  title: string;
  icon?: string;
  path?: string;
  order: number;
  parent_id?: number;
  children?: Menu[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Record<string, any>;
}

export interface Resource {
  id: number;
  name: string;
  type: string;
  category?: string;
  provider: string;
  region?: string;
  ip_address?: string;
  description?: string;
  location?: string;
  status: string;
  business_unit?: string;
  owner?: string;
  data: Record<string, any>;
  tags: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ResourceParams {
  skip?: number;
  limit?: number;
  type?: string;
  category?: string;
  provider?: string;
  status?: string;
  name?: string;
  keyword?: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
  updated_at: string;
}

