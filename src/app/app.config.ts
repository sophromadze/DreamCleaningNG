import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withDebugTracing, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
// COMMENTED OUT SSR - This was causing the logout/login issue
// import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AuthInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi() // Enable legacy interceptor support
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // COMMENTED OUT - This was causing the multiple SSR instances
    // provideClientHydration(withEventReplay()),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    // Add the auth interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
};