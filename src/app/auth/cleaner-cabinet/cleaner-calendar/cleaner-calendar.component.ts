import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CleanerService, CleanerCalendarItem, CleanerOrderDetail } from '../../../services/cleaner.service';
import { AuthService } from '../../../services/auth.service';
import { DurationUtils } from '../../../utils/duration.utils';

@Component({
  selector: 'app-cleaner-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cleaner-calendar.component.html',
  styleUrls: ['./cleaner-calendar.component.scss']
})
export class CleanerCalendarComponent implements OnInit {
  calendarItems: CleanerCalendarItem[] = [];
  calendarDays: any[] = [];
  selectedOrderDetail: CleanerOrderDetail | null = null;
  showOrderModal = false;
  currentUserRole: string = '';
  
  constructor(
    private cleanerService: CleanerService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUserRole = this.authService.currentUserValue?.role || '';
    this.loadCalendar();
    this.generateCalendar();
  }

  loadCalendar() {
    this.cleanerService.getCleanerCalendar().subscribe({
      next: (items) => {
        this.calendarItems = items;
        this.generateCalendar();
      },
      error: (error) => {
        console.error('Error loading calendar:', error);
      }
    });
  }

  generateCalendar() {
    const today = new Date();
    const calendar = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Use local date formatting to avoid timezone issues
      const dateString = this.formatDateToLocalString(date);
      const ordersForDay = this.calendarItems.filter(item => {
        // Parse the service date and convert to local date to avoid timezone issues
        const serviceDate = this.parseServiceDate(item.serviceDate);
        const serviceDateString = this.formatDateToLocalString(serviceDate);
                
        return serviceDateString === dateString;
      });
      
      calendar.push({
        date: date,
        dateString: dateString,
        day: date.getDate(),
        month: date.getMonth(),
        isToday: this.isToday(date),
        isWeekend: this.isWeekend(date),
        orders: ordersForDay
      });
    }
    
    this.calendarDays = calendar;
  }

  // Helper method to format date to local string (YYYY-MM-DD)
  formatDateToLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper method to parse service date string and convert to local date
  parseServiceDate(serviceDateString: string): Date {
    // Parse the string to a Date object
    const date = new Date(serviceDateString);
    
    // Create a new date using local components to avoid timezone issues
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0; // 0 = Sunday only
  }

  onOrderClick(orderId: number) {
    this.cleanerService.getOrderDetails(orderId).subscribe({
      next: (detail) => {
        this.selectedOrderDetail = detail;
        this.showOrderModal = true;
      },
      error: (error) => {
        console.error('Error loading order details:', error);
      }
    });
  }

  closeOrderModal() {
    this.showOrderModal = false;
    this.selectedOrderDetail = null;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  formatDuration(minutes: number): string {
    // Ensure minimum 1 hour (60 minutes) before formatting
    const adjustedMinutes = Math.max(minutes, 60);
    return DurationUtils.formatDurationRounded(adjustedMinutes);
  }

  getServiceDuration(): number {
    if (!this.selectedOrderDetail) return 0;

    const hasCleanerService = this.selectedOrderDetail.services.some(s => 
      s.toLowerCase().includes('cleaner')
    );
    
    const hasHoursService = this.selectedOrderDetail.services.some(s => 
      s.toLowerCase().includes('hour')
    );
    
    if (hasCleanerService && hasHoursService) {
      return this.selectedOrderDetail.totalDuration;
    } else if (hasCleanerService) {
      return this.selectedOrderDetail.totalDuration;
    } else {
      const fallbackDuration = Math.ceil(this.selectedOrderDetail.totalDuration / (this.selectedOrderDetail.maidsCount || 1));
      return fallbackDuration;
    }
  }

  hasCleanerService(): boolean {
    if (!this.selectedOrderDetail) return false;
    return this.selectedOrderDetail.services.some(s => s.toLowerCase().includes('cleaner'));
  }

  hasHoursService(): boolean {
    if (!this.selectedOrderDetail) return false;
    return this.selectedOrderDetail.services.some(s => s.toLowerCase().includes('hour'));
  }

  formatServiceDisplay(service: string): string {
    // Check if it's a bedroom service with quantity 0
    if (service.toLowerCase().includes('bedroom') && service.includes('(x0)')) {
      return 'Studio';
    }
    return service;
  }
}