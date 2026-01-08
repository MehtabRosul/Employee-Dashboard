/**
 * Employee Model - Core domain model for employee data
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: Department;
  dateOfJoining: Date;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  avatar?: string;
  performance?: number; // 0-100 percentage
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum Department {
  HR = 'HR',
  Engineering = 'Engineering',
  Sales = 'Sales',
  Marketing = 'Marketing',
  Finance = 'Finance',
  Operations = 'Operations',
  Design = 'Design',
  Support = 'Support'
}

export enum EmployeeStatus {
  Active = 'Active',
  OnLeave = 'On Leave',
  Inactive = 'Inactive'
}

export interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
  byDepartment: { [key in Department]?: number };
}

export interface EmployeeFilters {
  searchQuery?: string;
  departments?: Department[];
  status?: EmployeeStatus[];
  genders?: string[];
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
}

export type SortField = 'name' | 'email' | 'department' | 'dateOfJoining' | 'performance' | 'age' | 'gender';

export interface CreateEmployeeDto {
  name: string;
  email: string;
  department: Department;
  dateOfJoining: Date;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  avatar?: string;
  performance?: number;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  id: string;
}
