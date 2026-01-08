import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { EmployeeService } from '../services/employee.service';

/**
 * Custom validators for employee forms
 */

/**
 * Validate name (minimum 3 characters, letters and spaces only)
 */
export function nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) {
            return null; // Don't validate empty values (use required validator)
        }

        const value = control.value as string;

        if (value.length < 3) {
            return { minLength: { requiredLength: 3, actualLength: value.length } };
        }

        // Allow letters, spaces, hyphens, and apostrophes
        const namePattern = /^[a-zA-Z\s'-]+$/;
        if (!namePattern.test(value)) {
            return { nameFormat: true };
        }

        return null;
    };
}

/**
 * Validate email format (comprehensive)
 */
export function emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) {
            return null;
        }

        const value = control.value as string;

        // RFC 5322 compliant email regex
        const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (!emailPattern.test(value)) {
            return { emailFormat: true };
        }

        return null;
    };
}

/**
 * Validate that date is not in the future
 */
export function notFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) {
            return null;
        }

        const selectedDate = new Date(control.value);
        const today = new Date();

        // Reset time to compare only dates
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            return { futureDate: true };
        }

        return null;
    };
}

/**
 * Validate that email is unique (async validator)
 */
export function uniqueEmailValidator(
    employeeService: EmployeeService,
    currentEmployeeId?: string
): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
        if (!control.value) {
            return of(null);
        }

        // Use timer as debounce
        return timer(500).pipe(
            switchMap(() => {
                const exists = employeeService.emailExists(control.value, currentEmployeeId);
                return of(exists ? { emailExists: true } : null);
            }),
            take(1)
        );
    };
}

/**
 * Validate performance (0-100)
 */
export function performanceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value && control.value !== 0) {
            return null;
        }

        const value = Number(control.value);

        if (isNaN(value)) {
            return { notANumber: true };
        }

        if (value < 0 || value > 100) {
            return { outOfRange: { min: 0, max: 100, actual: value } };
        }

        return null;
    };
}

/**
 * Validate that string contains no special characters except spaces
 */
export function noSpecialCharactersValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) {
            return null;
        }

        const value = control.value as string;
        const pattern = /^[a-zA-Z0-9\s]+$/;

        if (!pattern.test(value)) {
            return { specialCharacters: true };
        }

        return null;
    };
}

/**
 * Get error message for validation error
 */
export function getErrorMessage(errors: ValidationErrors | null, fieldName: string = 'This field'): string {
    if (!errors) {
        return '';
    }

    if (errors['required']) {
        return `${fieldName} is required`;
    }

    if (errors['minLength']) {
        return `${fieldName} must be at least ${errors['minLength'].requiredLength} characters`;
    }

    if (errors['maxLength']) {
        return `${fieldName} must be at most ${errors['maxLength'].requiredLength} characters`;
    }

    if (errors['nameFormat']) {
        return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    if (errors['emailFormat']) {
        return 'Please enter a valid email address';
    }

    if (errors['email']) {
        return 'Please enter a valid email address';
    }

    if (errors['emailExists']) {
        return 'This email is already registered';
    }

    if (errors['futureDate']) {
        return 'Date cannot be in the future';
    }

    if (errors['notANumber']) {
        return `${fieldName} must be a number`;
    }

    if (errors['outOfRange']) {
        const { min, max } = errors['outOfRange'];
        return `${fieldName} must be between ${min} and ${max}`;
    }

    if (errors['specialCharacters']) {
        return `${fieldName} cannot contain special characters`;
    }

    if (errors['min']) {
        return `${fieldName} must be at least ${errors['min'].min}`;
    }

    if (errors['max']) {
        return `${fieldName} must be at most ${errors['max'].max}`;
    }

    if (errors['pattern']) {
        return `${fieldName} format is invalid`;
    }

    return `${fieldName} is invalid`;
}
