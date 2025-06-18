import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withDebugTracing, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';
// COMMENTED OUT SSR - This was causing the logout/login issue
// import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { importProvidersFrom } from '@angular/core';
import { 
  SocialLoginModule, 
  SocialAuthServiceConfig,
  GoogleLoginProvider,
  FacebookLoginProvider 
} from '@abacritt/angularx-social-login';

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
    },
    // ADD THIS NEW SOCIAL AUTH CONFIG
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' // Replace with your actual Google client ID
            )
          },
          {
            id: FacebookLoginProvider.PROVIDER_ID,
            provider: new FacebookLoginProvider('YOUR_FACEBOOK_APP_ID') // Replace with your actual Facebook app ID
          }
        ],
        onError: (err) => {
          console.error(err);
        }
      } as SocialAuthServiceConfig,
    },
    importProvidersFrom(SocialLoginModule)
  ],
};