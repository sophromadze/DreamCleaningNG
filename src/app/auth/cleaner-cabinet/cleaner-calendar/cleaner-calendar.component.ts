import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CleanerService, CleanerCalendarItem, CleanerOrderDetail } from '../../../services/cleaner.service';
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
  
  constructor(private cleanerService: CleanerService) {}

  ngOnInit() {
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
      
      const dateString = date.toISOString().split('T')[0];
      const ordersForDay = this.calendarItems.filter(item => 
        item.serviceDate.split('T')[0] === dateString
      );
      
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
    return DurationUtils.formatDurationRounded(minutes);
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