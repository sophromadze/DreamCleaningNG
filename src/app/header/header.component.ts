// src/app/header/header.component.ts
import { Component, OnInit } from '@angular/core';
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
  currentUser: any = null;
  userInitials: string = '';
  isAuthInitialized = false; // Add this to prevent flickering

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
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
    // Close user menu when mobile menu is toggled
    if (this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  closeMobileMenu() {
    this.isUserMenuOpen = false;
    this.isMenuOpen = false;
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      navLinks.classList.remove('active');
    }
  }

  closeDropdownMenu() {
    this.isUserMenuOpen = true;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isMenuOpen = false;
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      navLinks.classList.remove('active');
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