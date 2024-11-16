import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(c => c.HomeComponent)
  },
  {
    path: 'create',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/create/create.component').then(c => c.CreateComponent)
  },
  {
    path: 'novels',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/novels/novels.component').then(c => c.NovelsComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(c => c.RegisterComponent)
  },
  {
    path: 'demo',
    loadComponent: () => import('./pages/demo/demo.component').then(c => c.DemoComponent)
  },
  {
    path: 'news',
    loadComponent: () => import('./pages/news/news.component').then(c => c.NewsComponent)
  },
  {
    path: 'contact-us',
    loadComponent: () => import('./pages/contact-us/contact-us.component').then(c => c.ContactUsComponent)
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./pages/privacy-policy/privacy-policy.component').then(c => c.PrivacyPolicyComponent)
  },
  {
    path: 'terms-of-service',
    loadComponent: () => import('./pages/terms-of-service/terms-of-service.component').then(c => c.TermsOfServiceComponent)
  },
  {
    path: 'pov',
    loadComponent: () => import('./pages/pov/pov.component').then(c => c.PovComponent)
  },
  {
    path: 'payment-history',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/payment-history/payment-history.component').then(c => c.PaymentHistoryComponent)
  },
  {
    path: '__/auth/handler',
    children: [], // This route should be handled by Firebase Auth
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(c => c.NotFoundComponent)
  }
];
