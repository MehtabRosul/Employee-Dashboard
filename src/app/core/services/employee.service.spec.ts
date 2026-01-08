import '../../../test-setup';
import { TestBed } from '@angular/core/testing';
import { EmployeeService } from './employee.service';
import { StorageService } from './storage.service';
import { Department, EmployeeStatus, SortField } from '../models/employee.model';
import { of, firstValueFrom } from 'rxjs';
import { vi, Mock, describe, it, expect, beforeEach } from 'vitest';
import { CryptoService } from './crypto.service';

describe('EmployeeService', () => {
    let service: EmployeeService;
    let storageServiceSpy: { get: Mock; set: Mock };

    const mockEmployees = [
        {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            department: Department.Engineering,
            dateOfJoining: '2023-01-01',
            age: 30,
            gender: 'Male',
            status: EmployeeStatus.Active,
            performance: 90,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            department: Department.Design,
            dateOfJoining: '2023-02-01',
            age: 28,
            gender: 'Female',
            status: EmployeeStatus.OnLeave,
            performance: 95,
            createdAt: '2023-02-01T00:00:00.000Z',
            updatedAt: '2023-02-01T00:00:00.000Z'
        }
    ];

    beforeEach(() => {
        const spy = {
            get: vi.fn(),
            set: vi.fn()
        };

        const cryptoSpy = {
            generateSecureId: vi.fn().mockReturnValue('mock-id'),
            encrypt: vi.fn().mockResolvedValue('encrypted'),
            decrypt: vi.fn().mockResolvedValue('decrypted')
        };

        // Mock get to return mock data
        spy.get.mockResolvedValue(mockEmployees);
        // Mock set to resolve true
        spy.set.mockResolvedValue(true);

        TestBed.configureTestingModule({
            providers: [
                EmployeeService,
                { provide: StorageService, useValue: spy },
                { provide: CryptoService, useValue: cryptoSpy }
            ]
        });
        service = TestBed.inject(EmployeeService);
        storageServiceSpy = TestBed.inject(StorageService) as unknown as { get: Mock; set: Mock };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load employees from storage on init', async () => {
        // Wait for potential async load
        const employees = await firstValueFrom(service.getEmployees());
        expect(employees.length).toBe(2);
        expect(employees[0].name).toBe('John Doe');
        expect(storageServiceSpy.get).toHaveBeenCalled();
    });

    it('should add a new employee', () => {
        const newEmpDto = {
            name: 'Alice',
            email: 'alice@example.com',
            department: Department.Marketing,
            age: 25,
            gender: 'Female' as const,
            dateOfJoining: new Date()
        };

        const addedEmp = service.addEmployee(newEmpDto);

        expect(addedEmp.name).toBe('Alice');
        expect(addedEmp.id).toBeDefined();
        // Updated secure ID length check or pattern could go here
        expect(service.getEmployeeById(addedEmp.id)).toBeDefined();
    });

    it('should update an existing employee', () => {
        const updated = service.updateEmployee('1', { name: 'John Updated' });

        expect(updated).toBeDefined();
        expect(updated?.name).toBe('John Updated');
        expect(service.getEmployeeById('1')?.name).toBe('John Updated');
    });

    it('should delete an employee', () => {
        const result = service.deleteEmployee('1');

        expect(result).toBe(true);
        expect(service.getEmployeeById('1')).toBeUndefined();
    });

    describe('Filtering and Sorting', () => {
        it('should filter by search query', async () => {
            service.setFilters({ searchQuery: 'Jane' });

            const filtered = await firstValueFrom(service.filteredEmployees$);
            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('Jane Smith');
        });

        it('should filter by department', async () => {
            service.setFilters({ departments: [Department.Engineering] });

            const filtered = await firstValueFrom(service.filteredEmployees$);
            expect(filtered.length).toBe(1);
            expect(filtered[0].department).toBe(Department.Engineering);
        });

        it('should sort employees ascending', async () => {
            service.setFilters({ sortBy: 'performance', sortOrder: 'asc' });

            const filtered = await firstValueFrom(service.filteredEmployees$);
            expect(filtered[0].performance).toBe(90);
            expect(filtered[1].performance).toBe(95);
        });

        it('should sort employees descending', async () => {
            service.setFilters({ sortBy: 'performance', sortOrder: 'desc' });

            const filtered = await firstValueFrom(service.filteredEmployees$);
            expect(filtered[0].performance).toBe(95);
            expect(filtered[1].performance).toBe(90);
        });

        it('should not mutate original array when sorting', async () => {
            // Verify original order in employees$ (subject value) isn't changed when filtering/sorting
            service.setFilters({ sortBy: 'performance', sortOrder: 'desc' });

            const original = await firstValueFrom(service.employees$);
            // Original order from mock data (Id 1 then Id 2)
            expect(original[0].id).toBe('1');
        });
    });
});
