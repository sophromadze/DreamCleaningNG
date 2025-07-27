import { Component, OnInit, HostListener, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { combineLatest } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  isMenuOpen = false;
  isUserMenuOpen = false;
  isServicesMenuOpen = false;
  isResidentialCleaningSubmenuOpen = false;
  currentUser: any = null;
  userInitials: string = '';
  isAuthInitialized = false;
  isMobile = false;
  showAuthUI = false; // Only show auth UI when we have a definitive answer
  public isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Only check screen size in browser environment
    if (this.isBrowser) {
      this.checkScreenSize();
    }
    // Immediately restore user data from cache to prevent flickering on refresh
    if (this.isBrowser && environment.useCookieAuth) {
      this.restoreFromCache();
    }
    // Get initial values from auth service (only if we don't have cached data)
    if (!this.currentUser) {
      const initialUser = this.authService.currentUserValue;
      if (initialUser) {
        this.currentUser = initialUser;
        this.userInitials = `${initialUser.firstName[0]}${initialUser.lastName[0]}`.toUpperCase();
      }
    }
    // Subscribe to auth state for updates
    combineLatest([
      this.authService.isInitialized$,
      this.authService.currentUser
    ]).subscribe(([isInitialized, user]) => {
      this.isAuthInitialized = isInitialized;
      // Update user data if changed
      if (user) {
        this.currentUser = user;
        this.userInitials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        // Cache the minimal user data for next refresh
        if (this.isBrowser) {
          this.cacheUserData(user);
        }
      } else if (isInitialized) {
        // Only clear user data if auth service is initialized and user is null
        this.currentUser = null;
        this.userInitials = '';
        if (this.isBrowser) {
          this.clearUserCache();
        }
      }
      // Show auth UI if we have definitive answer from backend
      if (isInitialized) {
        this.showAuthUI = true;
      }
    });
  }



  private cacheUserData(user: any): void {
    try {
      // Cache only minimal data needed for UI
      const cacheData = {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profilePictureUrl: user.profilePictureUrl
        },
        userInitials: this.userInitials,
        timestamp: Date.now()
      };
      
      localStorage.setItem('headerUserCache', JSON.stringify(cacheData));
    } catch (error) {
      // Ignore cache errors in production
    }
  }

  private restoreFromCache(): void {
    try {
      const cachedData = localStorage.getItem('headerUserCache');
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        const cacheAge = Date.now() - cached.timestamp;
        if (cacheAge < 24 * 60 * 60 * 1000) {
          this.currentUser = cached.user;
          this.userInitials = cached.userInitials;
          this.isAuthInitialized = true;
          this.showAuthUI = true;
        }
      }
    } catch (error) {
      // Ignore cache errors in production
    }
  }

  private clearUserCache(): void {
    this.authService.clearHeaderCache();
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isBrowser) {
      this.checkScreenSize();
    }
  }

  checkScreenSize() {
    if (this.isBrowser) {
      this.isMobile = window.innerWidth <= 768;
    }
  }

  // Listen for clicks outside the dropdown
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    const clickedInside = this.elementRef.nativeElement.querySelector('.user-menu')?.contains(targetElement);
    const clickedInsideServices = this.elementRef.nativeElement.querySelector('.dropdown')?.contains(targetElement);
    
    if (!clickedInside && this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
    
    if (!clickedInsideServices && this.isServicesMenuOpen) {
      this.isServicesMenuOpen = false;
      this.isResidentialCleaningSubmenuOpen = false;
    }
  }

  // Helper method to determine if we should show login button
  shouldShowLogin(): boolean {
    // Show login button if we have no user
    return !this.currentUser;
  }

  // Helper method to determine if we should show user menu
  shouldShowUserMenu(): boolean {
    // Show user menu if we have a user (from cache or auth service)
    return !!this.currentUser;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isBrowser) {
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.classList.toggle('active');
      }
    }
    // Close other menus when mobile menu is toggled
    if (!this.isMenuOpen) {
      this.isUserMenuOpen = false;
      this.isServicesMenuOpen = false;
      this.isResidentialCleaningSubmenuOpen = false;
    }
  }

  closeMobileMenu() {
    this.closeAllMenus();
  }

  closeDropdownMenu() {
    this.isUserMenuOpen = false;
  }

  toggleUserMenu(event?: Event) {
    // Prevent the document click listener from immediately closing the menu
    if (event) {
      event.stopPropagation();
    }
    
    this.isUserMenuOpen = !this.isUserMenuOpen;
    // Close other menus when user menu is opened
    if (this.isUserMenuOpen) {
      this.isMenuOpen = false;
      this.isServicesMenuOpen = false;
      this.isResidentialCleaningSubmenuOpen = false;
      if (this.isBrowser) {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
          navLinks.classList.remove('active');
        }
      }
    }
  }

  // Mobile-friendly services menu handlers
  toggleServicesMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (this.isMobile) {
      this.isServicesMenuOpen = !this.isServicesMenuOpen;
      if (!this.isServicesMenuOpen) {
        this.isResidentialCleaningSubmenuOpen = false;
      }
    }
  }

  toggleResidentialCleaningSubmenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (this.isMobile) {
      this.isResidentialCleaningSubmenuOpen = !this.isResidentialCleaningSubmenuOpen;
    }
  }

  // Handle services link click
  onServicesClick(event: Event) {
    if (this.isMobile) {
      // On mobile, only toggle menu, don't navigate
      event.preventDefault();
      this.toggleServicesMenu(event);
    } else {
      // On desktop, navigate to service page and close menu
      this.closeServicesMenu();
      this.router.navigate(['/service-page']);
    }
  }

  // Handle residential cleaning link click
  onResidentialCleaningClick(event: Event) {
    if (this.isMobile) {
      // On mobile, only toggle submenu, don't navigate
      event.preventDefault();
      this.toggleResidentialCleaningSubmenu(event);
    } else {
      // On desktop, navigate to residential cleaning page and close menu
      this.closeServicesMenu();
      this.router.navigate(['/services/residential-cleaning']);
    }
  }

  // Handle "All Services" link click (mobile only)
  onAllServicesClick(event: Event) {
    if (this.isMobile) {
      // On mobile, navigate to service page and close all menus
      this.closeAllMenus();
    } else {
      // On desktop, prevent navigation and close menu
      event.preventDefault();
      this.closeServicesMenu();
    }
  }

  // Close all menus and mobile menu
  closeAllMenus() {
    this.isServicesMenuOpen = false;
    this.isResidentialCleaningSubmenuOpen = false;
    this.isUserMenuOpen = false;
    this.isMenuOpen = false;
    if (this.isBrowser) {
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.classList.remove('active');
      }
    }
  }

  // Desktop hover handlers
  showServicesMenu() {
    if (!this.isMobile) {
      this.isServicesMenuOpen = true;
    }
  }

  hideServicesMenu() {
    if (!this.isMobile) {
      this.isServicesMenuOpen = false;
      this.isResidentialCleaningSubmenuOpen = false;
    }
  }

  closeServicesMenu() {
    this.isServicesMenuOpen = false;
    this.isResidentialCleaningSubmenuOpen = false;
  }

  showResidentialCleaningSubmenu() {
    if (!this.isMobile) {
      this.isResidentialCleaningSubmenuOpen = true;
    }
  }

  hideResidentialCleaningSubmenu() {
    if (!this.isMobile) {
      this.isResidentialCleaningSubmenuOpen = false;
    }
  }

  logout() {
    const currentUrl = this.router.url;
    // Clear the user cache on logout
    this.clearUserCache();
    this.authService.logout();
    if (currentUrl.startsWith('/profile')) {
      this.router.navigate(['/']);
    }
  }

  // Check if current route is a service route
  isServiceRoute(): boolean {
    const currentUrl = this.router.url;
    return currentUrl === '/service-page' || currentUrl.startsWith('/services/');
  }
}