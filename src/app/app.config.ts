import { ApplicationConfig, provideZoneChangeDetection, PLATFORM_ID, APP_ID, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withDebugTracing, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { importProvidersFrom } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './services/auth.service';
import { filter, take } from 'rxjs/operators';
import { 
  SocialLoginModule, 
  SocialAuthServiceConfig,
  GoogleLoginProvider,
  GoogleSigninButtonModule
} from '@abacritt/angularx-social-login';
import { environment } from '../environments/environment';

// App initializer factory function
export function initializeAuth(authService: AuthService, platformId: Object): () => Promise<void> {
  return () => new Promise((resolve) => {
    // For SSR, resolve immediately
    if (!isPlatformBrowser(platformId)) {
      resolve();
      return;
    }
    
    // For browser, wait for auth to be initialized
    authService.isInitialized$.pipe(
      filter(initialized => initialized),
      take(1)
    ).subscribe(() => {
      resolve();
    });
  });
}

// Environment detection for SSR
const getSocialAuthConfig = (platformId: Object): SocialAuthServiceConfig => {
  if (isPlatformBrowser(platformId)) {
    return {
      autoLogin: false,
      lang: 'en',
      providers: [
        {
          id: GoogleLoginProvider.PROVIDER_ID,
          provider: new GoogleLoginProvider(
            environment.googleClientId,
            {
              oneTapEnabled: false, // Disable One Tap to avoid FedCM issues for now
              prompt: 'select_account'
            }
          )
        }
      ],
      onError: (err) => {
        console.error('Social auth error:', err);
      }
    } as SocialAuthServiceConfig;
  }
  
  // Return empty config for server-side rendering
  return {
    autoLogin: false,
    providers: [],
    onError: (err) => {
      console.error(err);
    }
  } as SocialAuthServiceConfig;
};

export const appConfig: ApplicationConfig = {
  providers: [
    // Add APP_ID for SSR
    { provide: APP_ID, useValue: 'dream-cleaning-app' },
    
    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi()
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    
    // Re-enable client hydration with event replay
    provideClientHydration(withEventReplay()),
    
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    
    // Auth interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    
    // App initializer
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService, PLATFORM_ID],
      multi: true
    },
    
    // Social auth configuration with platform check
    {
      provide: 'SocialAuthServiceConfig',
      useFactory: (platformId: Object) => getSocialAuthConfig(platformId),
      deps: [PLATFORM_ID]
    },
    
    importProvidersFrom(SocialLoginModule, GoogleSigninButtonModule)
  ],
};