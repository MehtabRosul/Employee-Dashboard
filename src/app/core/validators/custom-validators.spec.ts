import { FormControl } from '@angular/forms';
import { emailValidator, nameValidator, notFutureDateValidator, performanceValidator } from './custom-validators';

describe('Custom Validators', () => {

    describe('emailValidator', () => {
        const validator = emailValidator();

        it('should return null for valid email', () => {
            const control = new FormControl('test@example.com');
            expect(validator(control)).toBeNull();
        });

        it('should return error for invalid email', () => {
            const control = new FormControl('invalid-email');
            expect(validator(control)).toEqual({ emailFormat: true });
        });

        it('should return error for email without domain', () => {
            const control = new FormControl('test@');
            expect(validator(control)).toEqual({ emailFormat: true });
        });
    });

    describe('nameValidator', () => {
        const validator = nameValidator();

        it('should return null for valid name', () => {
            const control = new FormControl('John Doe');
            expect(validator(control)).toBeNull();
        });

        it('should return error for short name', () => {
            const control = new FormControl('Jo');
            expect(validator(control)).toEqual({ minLength: { requiredLength: 3, actualLength: 2 } });
        });

        it('should return error for special characters', () => {
            const control = new FormControl('John123');
            expect(validator(control)).toEqual({ nameFormat: true });
        });
    });

    describe('notFutureDateValidator', () => {
        const validator = notFutureDateValidator();

        it('should return null for past date', () => {
            const pastDate = new Date();
            pastDate.setFullYear(pastDate.getFullYear() - 1);
            const control = new FormControl(pastDate.toISOString());
            expect(validator(control)).toBeNull();
        });

        it('should return error for future date', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const control = new FormControl(futureDate.toISOString());
            expect(validator(control)).toEqual({ futureDate: true });
        });
    });

    describe('performanceValidator', () => {
        const validator = performanceValidator();

        it('should return null for valid performance', () => {
            const control = new FormControl(85);
            expect(validator(control)).toBeNull();
        });

        it('should return error for negative performance', () => {
            const control = new FormControl(-5);
            expect(validator(control)).toEqual({ outOfRange: { min: 0, max: 100, actual: -5 } });
        });

        it('should return error for performance > 100', () => {
            const control = new FormControl(101);
            expect(validator(control)).toEqual({ outOfRange: { min: 0, max: 100, actual: 101 } });
        });
    });
});
