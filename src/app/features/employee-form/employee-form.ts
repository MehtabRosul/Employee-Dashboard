import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Employee, Department, EmployeeStatus, CreateEmployeeDto } from '@core/models/employee.model';
import { EmployeeService } from '@core/services/employee.service';
import { nameValidator, emailValidator, notFutureDateValidator, uniqueEmailValidator, uniqueNameValidator, ageValidator, getErrorMessage } from '@core/validators/custom-validators';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeForm implements OnInit {
  @Input() employee?: Employee;
  @Output() save = new EventEmitter<CreateEmployeeDto>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);

  employeeForm!: FormGroup;
  departments = Object.values(Department);
  statuses = Object.values(EmployeeStatus);
  isSubmitting = false;

  ngOnInit(): void {
    this.initForm();

    if (this.employee) {
      this.patchFormValues();
    }
  }

  private initForm(): void {
    this.employeeForm = this.fb.group({
      name: ['',
        [Validators.required, Validators.minLength(3), nameValidator()],
        [uniqueNameValidator(this.employeeService, this.employee?.id)]
      ],
      email: ['',
        [Validators.required, Validators.email, emailValidator()],
        [uniqueEmailValidator(this.employeeService, this.employee?.id)]
      ],
      department: ['', Validators.required],
      dateOfJoining: ['', [Validators.required, notFutureDateValidator()]],
      status: [EmployeeStatus.Active],
      performance: [85, [Validators.min(0), Validators.max(100)]],
      age: [null, [Validators.required, ageValidator()]],
      gender: ['Male', Validators.required]
    });
  }

  private patchFormValues(): void {
    if (this.employee) {
      this.employeeForm.patchValue({
        name: this.employee.name,
        email: this.employee.email,
        department: this.employee.department,
        dateOfJoining: this.formatDateForInput(this.employee.dateOfJoining),
        status: this.employee.status,
        performance: this.employee.performance || 85,
        age: this.employee.age || 30,
        gender: this.employee.gender || 'Male'
      });
    }
  }

  onSubmit(): void {
    // Block submission if form is invalid OR async validators are still pending
    if (this.employeeForm.pending) {
      // Wait for async validators to complete, then retry
      this.employeeForm.statusChanges.pipe(
        first((status: string) => status !== 'PENDING')
      ).subscribe(() => this.onSubmit());
      return;
    }

    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;

      // CRITICAL: Double-check for duplicates at service level as safety net
      const nameExists = this.employeeService.nameExists(formValue.name, this.employee?.id);
      const emailExists = this.employeeService.emailExists(formValue.email, this.employee?.id);

      // CRITICAL: Explicit age validation as final safety net
      const ageValue = Number(formValue.age);
      const ageInvalid = isNaN(ageValue) || ageValue < 18 || ageValue > 59;

      if (nameExists || emailExists || ageInvalid) {
        // Trigger validation display
        this.markFormGroupTouched(this.employeeForm);
        // Force revalidation to show the error
        this.employeeForm.get('name')?.updateValueAndValidity();
        this.employeeForm.get('email')?.updateValueAndValidity();
        this.employeeForm.get('age')?.updateValueAndValidity();
        return;
      }

      this.isSubmitting = true;

      const employeeData: CreateEmployeeDto = {
        name: formValue.name,
        email: formValue.email,
        department: formValue.department,
        dateOfJoining: new Date(formValue.dateOfJoining),
        status: formValue.status,
        performance: formValue.performance,
        age: formValue.age,
        gender: formValue.gender
      };

      this.save.emit(employeeData);
      this.isSubmitting = false;
    } else {
      this.markFormGroupTouched(this.employeeForm);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  getError(fieldName: string): string {
    const control = this.employeeForm.get(fieldName);
    if (control && control.touched && control.errors) {
      const friendlyName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
      return getErrorMessage(control.errors, friendlyName);
    }
    return '';
  }

  hasError(fieldName: string): boolean {
    const control = this.employeeForm.get(fieldName);
    return !!(control && control.touched && control.invalid);
  }

  isValid(fieldName: string): boolean {
    const control = this.employeeForm.get(fieldName);
    // Only show valid if not pending async validation
    return !!(control && control.touched && control.valid && !control.pending);
  }

  isPending(fieldName: string): boolean {
    const control = this.employeeForm.get(fieldName);
    return !!(control && control.pending);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  get maxDate(): string {
    return this.formatDateForInput(new Date());
  }
}
