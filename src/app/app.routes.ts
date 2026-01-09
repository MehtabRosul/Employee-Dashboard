import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
                title: 'Dashboard | Employee Management'
            },
            {
                path: 'employees',
                loadComponent: () => import('./features/employee-list/employee-list').then(m => m.EmployeeList),
                title: 'Employees | Employee Management'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
