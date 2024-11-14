import { APP_INITIALIZER, ApplicationConfig, ErrorHandler } from '@angular/core';
import { InMemoryScrollingFeature, InMemoryScrollingOptions, provideRouter, Router, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { WINDOW, windowProvider } from './providers/window';
import { DOCUMENT } from '@angular/common';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

import * as Sentry from "@sentry/angular";

import { environment } from '../environments/environment.loader';

const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

const inMemoryScrollingFeature: InMemoryScrollingFeature =
  withInMemoryScrolling(scrollConfig);

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler(),
    },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
    provideRouter(routes, inMemoryScrollingFeature),
    provideClientHydration(),
    {
      provide: WINDOW,
      useFactory: (document: Document) => windowProvider(document),
      deps: [DOCUMENT],
    },
    provideFirebaseApp(() => initializeApp({
      apiKey: 'AIzaSyBzegpGaNrC-KHupiuNXnjI2XxkoaXzm2o',
      authDomain: environment.authDomain,
      databaseURL: 'https://ai-audiobook.firebaseio.com',
      projectId: 'ai-audiobook',
    })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ]
};
