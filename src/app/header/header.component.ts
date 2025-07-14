// src/app/header/header.component.ts
import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { combineLatest } from 'rxjs';

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
  isBasicCleaningSubmenuOpen = false;
  currentUser: any = null;
  userInitials: string = '';
  isAuthInitialized = false;
  isMobile = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    // Wait for both auth initialization and user data
    combineLatest([
      this.authService.isInitialized$,
      this.authService.currentUser
    ]).subscribe(([isInitialized, user]) => {
      this.isAuthInitialized = isInitialized;
      this.currentUser = user;
      
      if (user) {
        this.userInitials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
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
      this.isBasicCleaningSubmenuOpen = false;
    }
  }

  // Helper method to determine if we should show login button
  shouldShowLogin(): boolean {
    return this.isAuthInitialized && !this.currentUser;
  }

  // Helper method to determine if we should show user menu
  shouldShowUserMenu(): boolean {
    return this.isAuthInitialized && !!this.currentUser;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      navLinks.classList.toggle('active');
    }
    // Close other menus when mobile menu is toggled
    if (!this.isMenuOpen) {
      this.isUserMenuOpen = false;
      this.isServicesMenuOpen = false;
      this.isBasicCleaningSubmenuOpen = false;
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
      this.isBasicCleaningSubmenuOpen = false;
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.classList.remove('active');
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
        this.isBasicCleaningSubmenuOpen = false;
      }
    }
  }

  toggleBasicCleaningSubmenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (this.isMobile) {
      this.isBasicCleaningSubmenuOpen = !this.isBasicCleaningSubmenuOpen;
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

  // Handle basic cleaning link click
  onBasicCleaningClick(event: Event) {
    if (this.isMobile) {
      // On mobile, only toggle submenu, don't navigate
      event.preventDefault();
      this.toggleBasicCleaningSubmenu(event);
    } else {
      // On desktop, navigate to basic cleaning page and close menu
      this.closeServicesMenu();
      this.router.navigate(['/services/basic-cleaning']);
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
    this.isBasicCleaningSubmenuOpen = false;
    this.isUserMenuOpen = false;
    this.isMenuOpen = false;
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      navLinks.classList.remove('active');
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
      this.isBasicCleaningSubmenuOpen = false;
    }
  }

  closeServicesMenu() {
    this.isServicesMenuOpen = false;
    this.isBasicCleaningSubmenuOpen = false;
  }

  showBasicCleaningSubmenu() {
    if (!this.isMobile) {
      this.isBasicCleaningSubmenuOpen = true;
    }
  }

  hideBasicCleaningSubmenu() {
    if (!this.isMobile) {
      this.isBasicCleaningSubmenuOpen = false;
    }
  }

  logout() {
    const currentUrl = this.router.url;
    this.authService.logout();
    if (currentUrl.startsWith('/profile')) {
      this.router.navigate(['/']);
    }
  }
}