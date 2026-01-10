import { Injectable, signal, computed, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import {
    Employee,
    Department,
    EmployeeStatus,
    CreateEmployeeDto,
    UpdateEmployeeDto,
    EmployeeFilters,
    EmployeeStats,
    SortField
} from '../models/employee.model';
import { StorageService } from './storage.service';
import { CryptoService } from './crypto.service';

/**
 * Employee service for managing employee data with LocalStorage persistence
 */
@Injectable({
    providedIn: 'root'
})
export class EmployeeService {
    private readonly STORAGE_KEY = 'employee-dashboard-data-v1';
    private crypto = inject(CryptoService);

    // BehaviorSubject for reactive employee list
    private employeesSubject = new BehaviorSubject<Employee[]>([]);
    public employees$ = this.employeesSubject.asObservable();

    // Signal-based filters for reactive filtering
    private filtersSignal = signal<EmployeeFilters>({
        searchQuery: '',
        departments: [],
        status: [],
        genders: [],
        sortBy: 'name',
        sortOrder: 'asc'
    });

    // Computed filtered and sorted employees
    public filteredEmployees$ = combineLatest([
        this.employees$,
        this.employeesSubject.asObservable()
    ]).pipe(
        map(() => this.applyFilters(this.employeesSubject.value, this.filtersSignal()))
    );

    constructor(private storage: StorageService) {
        this.loadEmployees();
    }

    /**
     * Get all employees
     */
    getEmployees(): Observable<Employee[]> {
        return this.employees$;
    }

    /**
     * Get employee by ID
     */
    getEmployeeById(id: string): Employee | undefined {
        return this.employeesSubject.value.find(emp => emp.id === id);
    }

    /**
     * Add new employee
     * @throws Error if employee with same name or email already exists
     */
    addEmployee(dto: CreateEmployeeDto): Employee {
        // CRITICAL: Service-level duplicate prevention as final safety layer
        if (this.nameExists(dto.name)) {
            throw new Error('Name already taken');
        }
        if (this.emailExists(dto.email)) {
            throw new Error('Email already in use');
        }

        // CRITICAL: Service-level age validation as final safety layer
        const age = Number(dto.age);
        if (isNaN(age) || age < 18 || age > 59) {
            throw new Error('Age must be 18-59 years');
        }

        const newEmployee: Employee = {
            id: this.generateId(),
            name: this.sanitizeInput(dto.name),
            email: this.sanitizeInput(dto.email),
            department: dto.department,
            dateOfJoining: dto.dateOfJoining,
            age: dto.age,
            gender: dto.gender,
            avatar: dto.avatar || this.generateAvatar(dto.name),
            performance: dto.performance ?? Math.floor(Math.random() * 30) + 70, // 70-100 or user provided
            status: dto.status || EmployeeStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const employees = [...this.employeesSubject.value, newEmployee];
        this.updateEmployees(employees);
        return newEmployee;
    }

    /**
     * Update existing employee
     * @throws Error if trying to update to an existing name or email
     */
    updateEmployee(id: string, dto: Partial<CreateEmployeeDto>): Employee | null {
        const employees = this.employeesSubject.value;
        const index = employees.findIndex(emp => emp.id === id);

        if (index === -1) {
            return null;
        }

        // CRITICAL: Validate no duplicate name/email (excluding current employee)
        if (dto.name && this.nameExists(dto.name, id)) {
            throw new Error('Name already taken');
        }
        if (dto.email && this.emailExists(dto.email, id)) {
            throw new Error('Email already in use');
        }

        // CRITICAL: Service-level age validation as final safety layer
        if (dto.age !== undefined) {
            const age = Number(dto.age);
            if (isNaN(age) || age < 18 || age > 59) {
                throw new Error('Age must be 18-59 years');
            }
        }

        const updatedEmployee: Employee = {
            ...employees[index],
            ...dto,
            name: dto.name ? this.sanitizeInput(dto.name) : employees[index].name,
            email: dto.email ? this.sanitizeInput(dto.email) : employees[index].email,
            updatedAt: new Date()
        };

        const newEmployees = [...employees];
        newEmployees[index] = updatedEmployee;
        this.updateEmployees(newEmployees);

        return updatedEmployee;
    }

    /**
     * Delete employee
     */
    deleteEmployee(id: string): boolean {
        const employees = this.employeesSubject.value;
        const filtered = employees.filter(emp => emp.id !== id);

        if (filtered.length === employees.length) {
            return false; // Employee not found
        }

        this.updateEmployees(filtered);
        return true;
    }

    /**
     * Set filters
     */
    setFilters(filters: Partial<EmployeeFilters>): void {
        this.filtersSignal.set({
            ...this.filtersSignal(),
            ...filters
        });
        // Trigger filter recalculation
        this.employeesSubject.next(this.employeesSubject.value);
    }

    /**
     * Get current filters
     */
    getFilters(): EmployeeFilters {
        return this.filtersSignal();
    }

    /**
     * Get employee statistics
     */
    getStatistics(): Observable<EmployeeStats> {
        return this.employees$.pipe(
            map(employees => {
                const stats: EmployeeStats = {
                    total: employees.length,
                    active: employees.filter(e => e.status === EmployeeStatus.Active).length,
                    onLeave: employees.filter(e => e.status === EmployeeStatus.OnLeave).length,
                    inactive: employees.filter(e => e.status === EmployeeStatus.Inactive).length,
                    byDepartment: {}
                };

                // Calculate department distribution
                Object.values(Department).forEach(dept => {
                    stats.byDepartment[dept as Department] = employees.filter(
                        e => e.department === dept
                    ).length;
                });

                return stats;
            })
        );
    }

    /**
     * Export employees to CSV with Save As dialog
     */
    async exportToCSV(): Promise<boolean> {
        const employees = this.employeesSubject.value;

        if (employees.length === 0) {
            console.warn('No employees to export');
            return false;
        }

        const headers = ['Name', 'Email', 'Department', 'Date of Joining', 'Gender', 'Age', 'Status', 'Performance'];

        // Escape helper for CSV injection prevention
        const escapeCsv = (str: string | number | undefined): string => {
            if (str === undefined || str === null) return '';
            const stringValue = String(str);
            // Escape double quotes and wrap in double quotes
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const rows = employees.map(emp => [
            escapeCsv(emp.name),
            escapeCsv(emp.email),
            escapeCsv(emp.department),
            escapeCsv(this.formatDate(emp.dateOfJoining)),
            escapeCsv(emp.gender),
            escapeCsv(emp.age),
            escapeCsv(emp.status),
            escapeCsv((emp.performance ?? 0) + '%')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Generate professional default filename
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const defaultFilename = `Employee_Report_${dateStr}`;

        // Try to use File System Access API for "Save As" dialog
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await (window as any).showSaveFilePicker({
                    suggestedName: defaultFilename,
                    types: [{
                        description: 'CSV Files',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });

                const writable = await fileHandle.createWritable();
                await writable.write(csvContent);
                await writable.close();
                return true;
            } catch (err: any) {
                // User cancelled the save dialog
                if (err.name === 'AbortError') {
                    return false;
                }
                console.error('Error using File System Access API:', err);
                // Fall through to legacy download
            }
        }

        // Fallback for browsers that don't support File System Access API
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${defaultFilename}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    }

    /**
     * Normalize name for consistent comparison
     * Handles: case-insensitivity, whitespace normalization, hyphen/apostrophe removal, diacritics
     */
    private normalizeName(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')          // Collapse multiple spaces to single
            .replace(/['\-]/g, '')          // Remove hyphens and apostrophes
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics (accents)
    }

    /**
     * Normalize email for consistent comparison
     */
    private normalizeEmail(email: string): string {
        return email.toLowerCase().trim();
    }

    /**
     * Check if name exists (case-insensitive, whitespace-normalized)
     */
    nameExists(name: string, excludeId?: string): boolean {
        const normalizedInput = this.normalizeName(name);
        return this.employeesSubject.value.some(
            emp => this.normalizeName(emp.name) === normalizedInput && emp.id !== excludeId
        );
    }

    /**
     * Check if email exists
     */
    emailExists(email: string, excludeId?: string): boolean {
        const normalizedInput = this.normalizeEmail(email);
        return this.employeesSubject.value.some(
            emp => this.normalizeEmail(emp.email) === normalizedInput && emp.id !== excludeId
        );
    }

    /**
     * Apply filters to employee list
     */
    private applyFilters(employees: Employee[], filters: EmployeeFilters): Employee[] {
        let filtered = [...employees];

        // Search filter
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(emp =>
                emp.name.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query)
            );
        }

        // Department filter
        if (filters.departments && filters.departments.length > 0) {
            filtered = filtered.filter(emp =>
                filters.departments!.includes(emp.department)
            );
        }

        // Status filter
        if (filters.status && filters.status.length > 0) {
            filtered = filtered.filter(emp =>
                filters.status!.includes(emp.status)
            );
        }

        // Gender filter
        if (filters.genders && filters.genders.length > 0) {
            filtered = filtered.filter(emp =>
                filters.genders!.includes(emp.gender)
            );
        }

        // Sort
        if (filters.sortBy) {
            filtered = this.sortEmployees(filtered, filters.sortBy, filters.sortOrder || 'asc');
        }

        return filtered;
    }

    /**
     * Sort employees by field
     * Security fix: Use spread operator to avoid mutating original array
     */
    private sortEmployees(employees: Employee[], field: SortField, order: 'asc' | 'desc'): Employee[] {
        return [...employees].sort((a, b) => { // Use copy
            let aVal: any = a[field];
            let bVal: any = b[field];

            // Handle dates
            if (aVal instanceof Date) aVal = aVal.getTime();
            if (bVal instanceof Date) bVal = bVal.getTime();

            // Handle strings
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Update employees and save to storage
     */
    private async updateEmployees(employees: Employee[]): Promise<void> {
        this.employeesSubject.next(employees);
        await this.saveEmployees();
    }

    /**
     * Load employees from LocalStorage
     */
    private async loadEmployees(): Promise<void> {
        const stored = await this.storage.get<any[]>(this.STORAGE_KEY);

        if (stored && Array.isArray(stored)) {
            // Convert date strings back to Date objects
            const employees = stored.map(emp => ({
                ...emp,
                dateOfJoining: new Date(emp.dateOfJoining),
                createdAt: new Date(emp.createdAt),
                updatedAt: new Date(emp.updatedAt)
            }));

            this.employeesSubject.next(employees);
        } else {
            this.seedDataIfEmpty();
        }
    }

    /**
     * Save employees to LocalStorage
     */
    private async saveEmployees(): Promise<void> {
        await this.storage.set(this.STORAGE_KEY, this.employeesSubject.value);
    }

    /**
     * Generate secure unique ID
     */
    private generateId(): string {
        return this.crypto.generateSecureId();
    }

    /**
     * Generate avatar URL based on name
     */
    private generateAvatar(name: string): string {
        try {
            const initials = name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2); // Use substring instead of deprecated substr

            // Use UI Avatars API for generating avatars
            const bgColor = this.stringToColor(name);
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=200&bold=true`;
        } catch {
            // Fallback if avatar generation fails
            return `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=200&bold=true`;
        }
    }

    /**
     * Convert string to color
     */
    private stringToColor(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = hash % 360;
        return `${hue}4080`; // Vibrant color with 40% saturation and 80% lightness
    }

    /**
     * Format date to string
     */
    private formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Sanitize user input to prevent XSS
     */
    private sanitizeInput(input: string): string {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Seed initial data if empty
     */
    private seedDataIfEmpty(): void {
        if (this.employeesSubject.value.length === 0) {
            const seedEmployees: CreateEmployeeDto[] = [
                {
                    name: 'Aarav Patel',
                    email: 'aarav.patel@company.com',
                    department: Department.Engineering,
                    dateOfJoining: new Date('2022-03-15'),
                    age: 29,
                    gender: 'Male',
                    performance: 92,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Diya Sharma',
                    email: 'diya.sharma@company.com',
                    department: Department.Design,
                    dateOfJoining: new Date('2023-01-10'),
                    age: 26,
                    gender: 'Female',
                    performance: 88,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Vihaan Singh',
                    email: 'vihaan.singh@company.com',
                    department: Department.Marketing,
                    dateOfJoining: new Date('2021-11-05'),
                    age: 31,
                    gender: 'Male',
                    performance: 94,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Aditi Rao',
                    email: 'aditi.rao@company.com',
                    department: Department.HR,
                    dateOfJoining: new Date('2023-06-20'),
                    age: 25,
                    gender: 'Female',
                    performance: 85,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Rohan Gupta',
                    email: 'rohan.gupta@company.com',
                    department: Department.Finance,
                    dateOfJoining: new Date('2020-08-12'),
                    age: 34,
                    gender: 'Male',
                    performance: 91,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Ananya Iyer',
                    email: 'ananya.iyer@company.com',
                    department: Department.Operations,
                    dateOfJoining: new Date('2022-09-01'),
                    age: 28,
                    gender: 'Female',
                    performance: 89,
                    status: EmployeeStatus.OnLeave
                },
                {
                    name: 'Kabir Mehta',
                    email: 'kabir.mehta@company.com',
                    department: Department.Support,
                    dateOfJoining: new Date('2023-04-18'),
                    age: 24,
                    gender: 'Male',
                    performance: 82,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Saanvi Reddy',
                    email: 'saanvi.reddy@company.com',
                    department: Department.Engineering,
                    dateOfJoining: new Date('2021-02-25'),
                    age: 30,
                    gender: 'Female',
                    performance: 96,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Arjun Nair',
                    email: 'arjun.nair@company.com',
                    department: Department.Sales,
                    dateOfJoining: new Date('2022-12-05'),
                    age: 27,
                    gender: 'Male',
                    performance: 87,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Zara Khan',
                    email: 'zara.khan@company.com',
                    department: Department.Design,
                    dateOfJoining: new Date('2023-07-15'),
                    age: 23,
                    gender: 'Female',
                    performance: 84,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Vivaan Joshi',
                    email: 'vivaan.joshi@company.com',
                    department: Department.Engineering,
                    dateOfJoining: new Date('2019-05-10'),
                    age: 35,
                    gender: 'Male',
                    performance: 93,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Ishaan Verma',
                    email: 'ishaan.verma@company.com',
                    department: Department.Marketing,
                    dateOfJoining: new Date('2022-01-20'),
                    age: 29,
                    gender: 'Male',
                    performance: 86,
                    status: EmployeeStatus.Inactive
                },
                {
                    name: 'Myra Malhotra',
                    email: 'myra.malhotra@company.com',
                    department: Department.HR,
                    dateOfJoining: new Date('2023-03-01'),
                    age: 26,
                    gender: 'Female',
                    performance: 90,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Reyansh Kumar',
                    email: 'reyansh.kumar@company.com',
                    department: Department.Finance,
                    dateOfJoining: new Date('2021-06-15'),
                    age: 32,
                    gender: 'Male',
                    performance: 88,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Aadhya Chatterjee',
                    email: 'aadhya.chatterjee@company.com',
                    department: Department.Operations,
                    dateOfJoining: new Date('2020-11-20'),
                    age: 33,
                    gender: 'Female',
                    performance: 95,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Aryan Das',
                    email: 'aryan.das@company.com',
                    department: Department.Support,
                    dateOfJoining: new Date('2023-05-10'),
                    age: 22,
                    gender: 'Male',
                    performance: 80,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Pari Kapoor',
                    email: 'pari.kapoor@company.com',
                    department: Department.Sales,
                    dateOfJoining: new Date('2022-08-05'),
                    age: 25,
                    gender: 'Female',
                    performance: 91,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Mohammed Zeeshan',
                    email: 'mohammed.zeeshan@company.com',
                    department: Department.Engineering,
                    dateOfJoining: new Date('2021-04-12'),
                    age: 30,
                    gender: 'Male',
                    performance: 89,
                    status: EmployeeStatus.Active
                },
                {
                    name: 'Krishna Venkatesh',
                    email: 'krishna.venkatesh@company.com',
                    department: Department.Design,
                    dateOfJoining: new Date('2022-10-30'),
                    age: 28,
                    gender: 'Male',
                    performance: 85,
                    status: EmployeeStatus.OnLeave
                },
                {
                    name: 'Meera Chopra',
                    email: 'meera.chopra@company.com',
                    department: Department.Marketing,
                    dateOfJoining: new Date('2023-02-14'),
                    age: 27,
                    gender: 'Female',
                    performance: 92,
                    status: EmployeeStatus.Active
                }
            ];

            // Only seed if empty, and do it one by one to trigger save
            // Note: seedDataIfEmpty is synchronous in constructor, but addEmployee calls updateEmployees which calls async save.
            // This is fine as BehaviorSubject is updated synchronously.
            seedEmployees.forEach(dto => this.addEmployee(dto));
        }
    }
}
