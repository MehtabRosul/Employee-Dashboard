import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { Dashboard } from './features/dashboard/dashboard';
import { EmployeeList } from './features/employee-list/employee-list';

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
                component: Dashboard,
                title: 'Dashboard | Employee Management'
            },
            {
                path: 'employees',
                component: EmployeeList,
                title: 'Employees | Employee Management'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
