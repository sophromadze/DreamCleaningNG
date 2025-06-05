import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderService, Order } from '../../../services/order.service';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss']
})
export class OrderDetailsComponent implements OnInit {
  order: Order | null = null;
  isLoading = true;
  errorMessage = '';
  showCancelModal = false;
  cancelReason = '';

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const orderId = this.route.snapshot.params['id'];
    this.loadOrder(orderId);
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
    return this.order?.status === 'Active' && new Date(this.order.serviceDate) > new Date();
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
}