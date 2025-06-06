import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../services/order.service';

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
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const orderId = params['id'];
      this.loadOrder(orderId);
    });
    // Update current time every minute
    setInterval(() => {
      this.now = new Date();
    }, 60000);
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

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  getHoursUntilService(): number {
    if (!this.order?.serviceDate) return 0;
    const serviceDate = new Date(this.order.serviceDate);
    const diffMs = serviceDate.getTime() - this.now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }
}