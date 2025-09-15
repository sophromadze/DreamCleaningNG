// src/app/auth/admin/mails/mails.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { MailService, ScheduledMail, SentMailLog } from '../../../services/mail.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

Chart.register(...registerables);

interface MailStats {
  totalSent: number;
  scheduledCount: number;
  draftCount: number;
  recipientsByRole: { role: string; count: number }[];
  sentByMonth: { month: string; count: number }[];
}

interface TimezoneRegion {
  label: string;
  timezones: { value: string; label: string }[];
}

@Component({
  selector: 'app-mails',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mails.component.html',
  styleUrls: ['./mails.component.scss']
})
export class MailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // User permissions
  userRole: string = '';
  canCreateMails: boolean = false;
  canViewMails: boolean = false;
  canDeleteMails: boolean = false;
  
  // Mail management
  mails: ScheduledMail[] = [];
  selectedMail: ScheduledMail | null = null;
  isCreatingMail: boolean = false;
  isEditingMail: boolean = false;
  
  // New mail form with timezone support
  newMail: ScheduledMail = {
    subject: '',
    content: '',
    targetRoles: [],
    scheduleType: 'scheduled',
    status: 'draft',
    frequency: 'once',
    scheduleTimezone: 'America/New_York' // Default to NYC timezone
  };
  
  // Timezone regions for better organization
  timezoneRegions: TimezoneRegion[] = [
    {
      label: 'North America',
      timezones: [
        { value: 'America/New_York', label: 'Eastern Time (NYC)' },
        { value: 'America/Chicago', label: 'Central Time' },
        { value: 'America/Denver', label: 'Mountain Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time' },
        { value: 'America/Toronto', label: 'Toronto' },
        { value: 'America/Mexico_City', label: 'Mexico City' }
      ]
    },
    {
      label: 'Europe',
      timezones: [
        { value: 'Europe/London', label: 'London (GMT)' },
        { value: 'Europe/Paris', label: 'Paris/Berlin' },
        { value: 'Europe/Moscow', label: 'Moscow' },
        { value: 'Europe/Istanbul', label: 'Istanbul' }
      ]
    },
    {
      label: 'Asia/Pacific',
      timezones: [
        { value: 'Asia/Tbilisi', label: 'Tbilisi (Georgia)' },
        { value: 'Asia/Dubai', label: 'Dubai' },
        { value: 'Asia/Kolkata', label: 'India' },
        { value: 'Asia/Shanghai', label: 'China' },
        { value: 'Asia/Tokyo', label: 'Tokyo' },
        { value: 'Australia/Sydney', label: 'Sydney' }
      ]
    }
  ];
  
  // Available roles
  availableRoles = [
    { value: 'all', label: 'All Users', icon: '👥' },
    { value: 'Customer', label: 'Customers Only', icon: '🛍️' },
    { value: 'Cleaner', label: 'Cleaners Only', icon: '🧹' },
    { value: 'Admin', label: 'Admins', icon: '👨‍💼' },
    { value: 'SuperAdmin', label: 'Super Admins', icon: '👑' },
    { value: 'Moderator', label: 'Moderators', icon: '👮' }
  ];
  
  // Schedule options
  daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];
  
  // UI State
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  activeTab: 'compose' | 'scheduled' | 'sent' | 'stats' = 'compose';
  
  // Filtering and pagination
  filterStatus: string = 'all';
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Chart
  chart: Chart | null = null;
  mailStats: MailStats | null = null;
  
  // Preview mode
  isPreviewMode: boolean = false;
  previewData: ScheduledMail | null = null;
  
  // User counts
  userCounts: { [key: string]: number } = {};
  
  constructor(
    private adminService: AdminService,
    private mailService: MailService
  ) {}
  
  ngOnInit(): void {
    this.checkPermissions();
    this.loadMailStats();
    this.loadUserCounts();
    this.detectUserTimezone();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  // Detect user's timezone on initialization
  detectUserTimezone(): void {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Check if user's timezone is in our list
      for (const region of this.timezoneRegions) {
        const found = region.timezones.find(tz => tz.value === userTimezone);
        if (found) {
          this.newMail.scheduleTimezone = userTimezone;
          break;
        }
      }
    } catch (error) {
      console.log('Could not detect user timezone, using default');
    }
  }
  
  // Timezone helper methods
  getCurrentTimeInTimezone(timezone: string): string {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      return new Date().toLocaleTimeString('en-US', options);
    } catch (error) {
      return '';
    }
  }
  
  getCurrentLocalTime(): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return new Date().toLocaleTimeString('en-US', options);
  }
  
  getCurrentServerTime(): string {
    return this.getCurrentTimeInTimezone('America/New_York');
  }
  
  getTimezoneAbbreviation(): string {
    if (!this.newMail.scheduleTimezone) return '';
    
    const abbr: { [key: string]: string } = {
      'America/New_York': 'EST/EDT',
      'America/Chicago': 'CST/CDT',
      'America/Denver': 'MST/MDT',
      'America/Los_Angeles': 'PST/PDT',
      'Europe/London': 'GMT/BST',
      'Europe/Paris': 'CET/CEST',
      'Asia/Tbilisi': 'GET',
      'Asia/Tokyo': 'JST'
    };
    
    return abbr[this.newMail.scheduleTimezone] || this.newMail.scheduleTimezone;
  }
  
  getScheduledTimeDisplay(): string {
    if (!this.newMail.scheduledDate || !this.newMail.scheduleTimezone) {
      return 'Not scheduled';
    }
    
    try {
      // Parse the datetime-local input value
      const localDate = new Date(this.newMail.scheduledDate);
      
      // Format for display in multiple timezones
      const selectedTzOptions: Intl.DateTimeFormatOptions = {
        timeZone: this.newMail.scheduleTimezone,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      
      const serverTzOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      
      const selectedTzTime = localDate.toLocaleString('en-US', selectedTzOptions);
      const serverTzTime = localDate.toLocaleString('en-US', serverTzOptions);
      
      return `${selectedTzTime} (Server time: ${serverTzTime})`;
    } catch (error) {
      return 'Invalid date';
    }
  }
  
  getSelectedDayName(): string {
    if (this.newMail.dayOfWeek === null || this.newMail.dayOfWeek === undefined) return '';
    const day = this.daysOfWeek.find(d => d.value === this.newMail.dayOfWeek);
    return day ? day.label : '';
  }
  
  checkPermissions(): void {
    this.adminService.getUserPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (permissions) => {
          this.userRole = permissions.role;
          this.canCreateMails = permissions.role === 'SuperAdmin' || permissions.role === 'Admin';
          this.canViewMails = permissions.role === 'SuperAdmin' || permissions.role === 'Admin' || permissions.role === 'Moderator';
          this.canDeleteMails = permissions.role === 'SuperAdmin';
          
          if (!this.canViewMails) {
            this.errorMessage = 'You do not have permission to access this feature.';
          } else {
            this.loadMails();
          }
        },
        error: (error) => {
          console.error('Error checking permissions:', error);
          this.errorMessage = 'Failed to load permissions.';
        }
      });
  }
  
  loadMails(): void {
    if (!this.canViewMails) return;
    
    this.loading = true;
    this.mailService.getScheduledMails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mails) => {
          this.mails = mails;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading mails:', error);
          this.errorMessage = 'Failed to load scheduled mails.';
          this.loading = false;
        }
      });
  }
  
  loadMailStats(): void {
    if (!this.canViewMails) return;
    
    this.mailService.getMailStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.mailStats = stats;
          if (this.activeTab === 'stats') {
            setTimeout(() => this.initializeChart(), 100);
          }
        },
        error: (error) => {
          console.error('Error loading mail stats:', error);
          this.errorMessage = 'Failed to load mail statistics.';
        }
      });
  }

  loadUserCounts(): void {
    if (!this.canViewMails) return;
    
    this.mailService.getUserCountsByRole()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (counts) => {
          this.userCounts = counts;
          this.updateRecipientCountDisplay();
        },
        error: (error) => {
          console.error('Error loading user counts:', error);
          this.errorMessage = 'Failed to load user counts.';
        }
      });
  }

  updateRecipientCountDisplay(): void {
    // This method can be called to update any UI elements that show recipient counts
  }
  
  initializeChart(): void {
    if (!this.mailStats) return;
    
    const ctx = document.getElementById('mailChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.chart) {
      this.chart.destroy();
    }
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.mailStats.sentByMonth.map(m => m.month),
        datasets: [{
          label: 'Emails Sent',
          data: this.mailStats.sentByMonth.map(m => m.count),
          backgroundColor: '#4CAF50',
          borderColor: '#45a049',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Email Activity by Month',
            font: {
              size: 16
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 5
            }
          }
        }
      }
    };
    
    this.chart = new Chart(ctx, config);
  }
  
  switchTab(tab: 'compose' | 'scheduled' | 'sent' | 'stats'): void {
    this.activeTab = tab;
    if (tab === 'stats' && this.mailStats) {
      setTimeout(() => this.initializeChart(), 100);
    }
  }
  
  startNewMail(): void {
    this.isCreatingMail = true;
    this.isEditingMail = false;
    this.detectUserTimezone(); // Detect timezone when starting new mail
    this.newMail = {
      subject: '',
      content: '',
      targetRoles: [],
      scheduleType: 'scheduled',
      status: 'draft',
      frequency: 'once',
      scheduleTimezone: this.newMail.scheduleTimezone // Keep detected timezone
    };
    this.clearMessages();
  }
  
  cancelMailCreation(): void {
    this.isCreatingMail = false;
    this.isEditingMail = false;
    this.newMail = {
      subject: '',
      content: '',
      targetRoles: [],
      scheduleType: 'scheduled',
      status: 'draft',
      frequency: 'once',
      scheduleTimezone: 'America/New_York'
    };
    this.clearMessages();
  }
  
  toggleRole(role: string): void {
    if (role === 'all') {
      if (this.newMail.targetRoles.includes('all')) {
        this.newMail.targetRoles = [];
      } else {
        this.newMail.targetRoles = ['all'];
      }
    } else {
      const index = this.newMail.targetRoles.indexOf(role);
      if (index > -1) {
        this.newMail.targetRoles.splice(index, 1);
      } else {
        this.newMail.targetRoles = this.newMail.targetRoles.filter(r => r !== 'all');
        this.newMail.targetRoles.push(role);
      }
    }
  }
  
  isRoleSelected(role: string): boolean {
    return this.newMail.targetRoles.includes(role) || 
           (role !== 'all' && this.newMail.targetRoles.includes('all'));
  }
  
  validateMail(): boolean {
    if (!this.newMail.subject.trim()) {
      this.errorMessage = 'Please enter a subject for the email.';
      return false;
    }
    
    if (!this.newMail.content.trim()) {
      this.errorMessage = 'Please enter content for the email.';
      return false;
    }
    
    if (this.newMail.targetRoles.length === 0) {
      this.errorMessage = 'Please select at least one recipient group.';
      return false;
    }
    
    // Always validate scheduled email requirements since immediate is removed
    if (!this.newMail.scheduleTimezone) {
      this.errorMessage = 'Please select a timezone for the scheduled email.';
      return false;
    }
    
    if (this.newMail.frequency === 'once' && !this.newMail.scheduledDate) {
      this.errorMessage = 'Please select a date and time for the scheduled email.';
      return false;
    }
    
    if (this.newMail.frequency === 'weekly' && this.newMail.dayOfWeek === undefined) {
      this.errorMessage = 'Please select a day of the week for weekly emails.';
      return false;
    }
    
    if (this.newMail.frequency === 'monthly' && !this.newMail.dayOfMonth) {
      this.errorMessage = 'Please select a day of the month for monthly emails.';
      return false;
    }
    
    if ((this.newMail.frequency === 'weekly' || this.newMail.frequency === 'monthly') && !this.newMail.scheduledTime) {
      this.errorMessage = 'Please select a time for recurring emails.';
      return false;
    }
    
    return true;
  }
  
  previewMail(): void {
    if (!this.validateMail()) return;
    
    if (Object.keys(this.userCounts).length === 0) {
      this.loadUserCounts();
      setTimeout(() => {
        this.previewData = { ...this.newMail };
        this.isPreviewMode = true;
      }, 1000);
    } else {
      this.previewData = { ...this.newMail };
      this.isPreviewMode = true;
    }
  }
  
  closePreview(): void {
    this.isPreviewMode = false;
    this.previewData = null;
  }
  
  // Convert local datetime to UTC considering timezone
  convertToUTC(localDatetime: string, timezone: string): string {
    try {
      // Parse the datetime-local input (which is in the format YYYY-MM-DDTHH:mm)
      const [datePart, timePart] = localDatetime.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Create a date string with timezone information
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      
      // Use Intl.DateTimeFormat to get the UTC offset for the timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Create date in the specified timezone and convert to UTC
      const localDate = new Date(dateStr);
      return localDate.toISOString();
    } catch (error) {
      console.error('Error converting to UTC:', error);
      return new Date(localDatetime).toISOString();
    }
  }
  
  saveDraft(): void {
    if (!this.validateMail()) return;
    
    this.loading = true;
    
    const mailData = {
      ...this.newMail,
      status: 'draft',
      scheduleType: 'scheduled',
      scheduledDate: this.newMail.scheduledDate ? 
        this.convertToUTC(String(this.newMail.scheduledDate), this.newMail.scheduleTimezone!) : null,
      scheduledTime: this.newMail.scheduledTime || null,
      dayOfWeek: this.newMail.dayOfWeek,
      dayOfMonth: this.newMail.dayOfMonth,
      frequency: this.newMail.frequency || ''
    };
    
    this.mailService.createScheduledMail(mailData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Mail saved as draft successfully!';
          this.loadMails();
          this.loadUserCounts();
          this.cancelMailCreation();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error saving draft:', error);
          this.errorMessage = 'Failed to save draft.';
          this.loading = false;
        }
      });
  }
  
  scheduleMail(): void {
    if (!this.validateMail()) return;
    
    this.loading = true;
    
    let scheduledDateUTC = null;
    
    if (this.newMail.frequency === 'once' && this.newMail.scheduledDate) {
      scheduledDateUTC = this.convertToUTC(String(this.newMail.scheduledDate), this.newMail.scheduleTimezone!);
    }
    
    const mailData = {
      ...this.newMail,
      scheduleType: 'scheduled',
      status: 'scheduled',
      scheduledDate: scheduledDateUTC,
      scheduledTime: this.newMail.scheduledTime || '12:00:00',
      dayOfWeek: this.newMail.dayOfWeek,
      dayOfMonth: this.newMail.dayOfMonth,
      frequency: this.newMail.frequency || ''
    };
    
    this.mailService.createScheduledMail(mailData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Mail scheduled successfully!';
          this.loadMails();
          this.loadUserCounts();
          this.cancelMailCreation();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error scheduling mail:', error);
          this.errorMessage = 'Failed to schedule mail.';
          this.loading = false;
        }
      });
  }
  
  
  editMail(mail: ScheduledMail): void {
    if (mail.status === 'sent') {
      this.errorMessage = 'Cannot edit sent emails.';
      return;
    }
    
    this.newMail = { ...mail };
    this.isCreatingMail = true;
    this.isEditingMail = true;
    this.clearMessages();
  }
  
  deleteMail(mail: ScheduledMail): void {
    if (!this.canDeleteMails) {
      this.errorMessage = 'You do not have permission to delete mails.';
      return;
    }
    
    if (!confirm(`Are you sure you want to delete this ${mail.status} email?`)) {
      return;
    }
    
    this.loading = true;
    this.mailService.deleteScheduledMail(mail.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Mail deleted successfully!';
          this.loadMails();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting mail:', error);
          this.errorMessage = 'Failed to delete mail.';
          this.loading = false;
        }
      });
  }
  
  cancelScheduledMail(mail: ScheduledMail): void {
    if (mail.status !== 'scheduled') {
      this.errorMessage = 'Can only cancel scheduled emails.';
      return;
    }
    
    if (!confirm('Are you sure you want to cancel this scheduled email?')) {
      return;
    }
    
    this.loading = true;
    this.mailService.cancelScheduledMail(mail.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Scheduled mail cancelled successfully!';
          this.loadMails();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cancelling mail:', error);
          this.errorMessage = 'Failed to cancel scheduled mail.';
          this.loading = false;
        }
      });
  }
  
  calculateRecipientCount(): number {
    if (this.newMail.targetRoles.includes('all')) {
      return this.userCounts['all'] || 0;
    }
    
    let count = 0;
    if (this.newMail.targetRoles.includes('Customer')) count += this.userCounts['Customer'] || 0;
    if (this.newMail.targetRoles.includes('Cleaner')) count += this.userCounts['Cleaner'] || 0;
    if (this.newMail.targetRoles.includes('Admin')) count += this.userCounts['Admin'] || 0;
    if (this.newMail.targetRoles.includes('SuperAdmin')) count += this.userCounts['SuperAdmin'] || 0;
    if (this.newMail.targetRoles.includes('Moderator')) count += this.userCounts['Moderator'] || 0;
    
    return count;
  }
  
  getFilteredMails(): ScheduledMail[] {
    let filtered = [...this.mails];
    
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === this.filterStatus);
    }
    
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.subject.toLowerCase().includes(search) ||
        m.content.toLowerCase().includes(search)
      );
    }
    
    if (this.activeTab === 'scheduled') {
      filtered = filtered.filter(m => m.status?.toLowerCase() === 'scheduled');
    } else if (this.activeTab === 'sent') {
      filtered = filtered.filter(m => m.status?.toLowerCase() === 'sent');
    }
    
    return filtered;
  }
  
  getPaginatedMails(): ScheduledMail[] {
    const filtered = this.getFilteredMails();
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return filtered.slice(start, end);
  }
  
  getTotalPages(): number {
    return Math.ceil(this.getFilteredMails().length / this.itemsPerPage);
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }
  
  formatScheduleInfo(mail: ScheduledMail): string {
    let info = '';
    
    if (mail.frequency?.toLowerCase() === 'once' && mail.scheduledDate) {
      const date = new Date(mail.scheduledDate);
      info = `Scheduled for ${date.toLocaleDateString()}`;
    } else if (mail.frequency?.toLowerCase() === 'weekly' && mail.dayOfWeek !== undefined) {
      const day = this.daysOfWeek.find(d => d.value === mail.dayOfWeek)?.label;
      info = `Every ${day}`;
    } else if (mail.frequency?.toLowerCase() === 'monthly' && mail.dayOfMonth) {
      info = `Monthly on day ${mail.dayOfMonth}`;
    } else {
      return 'Not scheduled';
    }
    
    if (mail.scheduleTimezone) {
      info += ` (${mail.scheduleTimezone})`;
    }
    
    return info;
  }
  
  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'draft': return 'badge-draft';
      case 'scheduled': return 'badge-scheduled';
      case 'sent': return 'badge-sent';
      case 'cancelled': return 'badge-cancelled';
      default: return '';
    }
  }
  
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}