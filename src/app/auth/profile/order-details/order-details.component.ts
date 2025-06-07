import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../services/order.service';
import { BookingService, Service, ExtraService } from '../../../services/booking.service';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss']
})
export class OrderDetailsComponent implements OnInit {
  order: Order | null = null;
  isLoading = true;
  errorMessage = '';
  showCancelModal = false;
  cancelReason = '';
  now = new Date();

  constructor(
    private orderService: OrderService,
    private bookingService: BookingService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrderDetails(+orderId);
    }
  }

  loadOrderDetails(orderId: number) {
    this.isLoading = true;
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;
        
        // Calculate maid count if it's missing or 0
        if (!order.maidsCount || order.maidsCount === 0) {
          this.order.maidsCount = this.calculateMaidCount(order);
        }
        
        // Calculate display duration
        if (order.totalDuration) {
          this.order.totalDuration = this.calculateDisplayDuration(order);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load order details';
        this.isLoading = false;
      }
    });
  }

  calculateMaidCount(order: Order): number {
    // Check if cleaners are explicitly selected
    const cleanerService = order.services.find(s => 
      s.serviceName.toLowerCase().includes('cleaner')
    );
    
    if (cleanerService) {
      return cleanerService.quantity;
    }
    
    // Calculate based on duration (every 6 hours = 1 maid)
    const totalHours = order.totalDuration / 60;
    return Math.max(1, Math.ceil(totalHours / 6));
  }

  private calculateDisplayDuration(order: Order): number {
    // Check if hours service exists
    const hoursService = order.services.find(s => 
      s.serviceName.toLowerCase().includes('hour')
    );
    
    // If both cleaner and hours services exist, use hours service
    const cleanerService = order.services.find(s => 
      s.serviceName.toLowerCase().includes('cleaner')
    );
    
    if (cleanerService && hoursService) {
      // Duration is based on hours service only
      return hoursService.quantity * 60;
    }
    
    // If maid count > 1 and no explicit cleaner service, divide duration
    const maidCount = order.maidsCount || this.calculateMaidCount(order);
    if (maidCount > 1 && !cleanerService) {
      return Math.ceil(order.totalDuration / maidCount);
    }
    
    return order.totalDuration;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    } else if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
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
        this.errorMessage = 'Failed to load order details';
        this.isLoading = false;
      }
    });
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
    const serviceDate = new Date(this.order.serviceDate);
    const now = new Date();
    const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return this.order.status === 'Active' && hoursUntilService > 12;
  }

  canCancelOrder(): boolean {
    if (!this.order) return false;
    const serviceDate = new Date(this.order.serviceDate);
    const now = new Date();
    const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return this.order.status === 'Active' && hoursUntilService > 24;
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
}