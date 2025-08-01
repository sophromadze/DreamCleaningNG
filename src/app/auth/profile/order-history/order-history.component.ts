import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService, OrderList } from '../../../services/order.service';


@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit {
  orders: OrderList[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load orders';
        this.isLoading = false;
      }
    });
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

  canEditOrder(order: OrderList): boolean {
    // Check if service type is custom
    if (order.isCustomServiceType) {
      return false;
    }
    
    // Check if order status is not Active
    if (order.status !== 'Active') return false;
    
    // Check if it's more than 48 hours before service date
    const serviceDate = new Date(order.serviceDate);
    const now = new Date();
    const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilService > 48;
  }
}