import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../services/order.service';
import { BookingService, Service, ExtraService } from '../../../services/booking.service';
import { DurationUtils } from '../../../utils/duration.utils';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss']
})
export class OrderDetailsComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  isLoading = true;
  errorMessage = '';
  showCancelModal = false;
  cancelReason = '';
  now = new Date();
  private timeUpdateInterval?: any;

  constructor(
    private orderService: OrderService,
    private bookingService: BookingService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const orderId = this.route.snapshot.params['id'];
    this.loadOrder(orderId);
    // Update current time every minute
    this.timeUpdateInterval = setInterval(() => {
      this.now = new Date();
    }, 60000);

    if (this.order) {
      const serviceDate = new Date(this.order.serviceDate);
      const now = new Date();
      const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilService <= 48) {
          this.errorMessage = 'This order cannot be edited. Orders must be edited at least 48 hours before the scheduled service.';
          // Optionally redirect back
          setTimeout(() => {
              this.router.navigate(['/order', this.order!.id]);
          }, 3000);
      }
    }
  }

  ngOnDestroy() {
    // Clear the interval to prevent memory leaks and infinite loops
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  loadOrder(orderId: number) {
    this.isLoading = true;
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading order:', error);
        this.errorMessage = 'Failed to load order details';
        this.isLoading = false;
      }
    });
  }

  getServiceDuration(): number {
    if (!this.order) return 0;

    // Check for Cleaners service
    const cleanersService = this.order.services.find(s => 
      s.serviceName.toLowerCase().includes('cleaner')
    );
    
    if (cleanersService) {
      return cleanersService.duration; // This is already in minutes
    }
    
    // If no cleaners service, use the fallback calculation
    const fallbackDuration = Math.ceil(this.order.totalDuration / (this.order.maidsCount || 1));
    return fallbackDuration;
  }

  isCustomServiceType(): boolean {
    if (!this.order) return false;
    
    // Check if this order has a service with ServiceId = 0 (custom service marker)
    // OR check if all services arrays are empty (another indicator of custom pricing)
    const hasCustomServiceMarker = this.order.services.some(s => s.serviceId === 0);
    const hasNoRegularServices = this.order.services.length === 0 || 
      (this.order.services.length === 1 && this.order.services[0].serviceId === 0);
    
    return hasCustomServiceMarker || hasNoRegularServices;
  }

  openCancelModal() {
    this.showCancelModal = true;
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.cancelReason = '';
  }

  confirmCancelOrder() {
    if (!this.order || !this.cancelReason.trim()) return;

    this.orderService.cancelOrder(this.order.id, { reason: this.cancelReason }).subscribe({
      next: (response) => {
        this.closeCancelModal();
        alert(response.message);
        this.router.navigate(['/profile/orders']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to cancel order';
      }
    });
  }

  canEditOrder(): boolean {
    if (!this.order) return false;

    // Don't allow editing custom service type orders
    if (this.isCustomServiceType()) return false;

    const serviceDate = new Date(this.order.serviceDate);
    const now = new Date();
    const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return this.order.status === 'Active' && hoursUntilService > 48;
  }

  canCancelOrder(): boolean {
    if (!this.order) return false;
    const serviceDate = new Date(this.order.serviceDate);
    const now = new Date();
    const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return this.order.status === 'Active' && hoursUntilService > 48;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'done':
        return 'status-done';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString();
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  formatDuration(minutes: number): string {
    // Ensure minimum 1 hour (60 minutes) before formatting
    const adjustedMinutes = Math.max(minutes, 60);
    return DurationUtils.formatDurationRounded(adjustedMinutes);
  }

  formatServiceDuration(minutes: number): string {
    // Use actual duration for individual services
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  getHoursUntilService(): number {
    if (!this.order?.serviceDate) return 0;
    const serviceDate = new Date(this.order.serviceDate);
    const diffMs = serviceDate.getTime() - this.now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  getServiceQuantity(service: Service): number {
    const orderService = this.order?.services.find(s => s.serviceId === service.id);
    return orderService ? orderService.quantity : 0;
  }

  getCleaningTypeText(): string {
    if (!this.order) return 'Normal Cleaning';
    
    const deepCleaning = this.order.extraServices.find(s => 
      s.extraServiceName.toLowerCase().includes('deep cleaning') && 
      !s.extraServiceName.toLowerCase().includes('super')
    );
    
    const superDeepCleaning = this.order.extraServices.find(s => 
      s.extraServiceName.toLowerCase().includes('super deep cleaning')
    );
    
    if (superDeepCleaning) {
      return 'Super Deep Cleaning';
    } else if (deepCleaning) {
      return 'Deep Cleaning';
    }
    return 'Normal Cleaning';
  }

  hasCleanerService(): boolean {
    if (!this.order) return false;
    return this.order.services.some(s => s.serviceName.toLowerCase().includes('cleaner'));
  }
}