import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceType, Service, ExtraService, Subscription } from './booking.service';
import { Order, OrderList } from './order.service';
import { Apartment } from './profile.service';

export interface AdminOrderList {
  id: number;
  userId: number;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  serviceTypeName: string;
  serviceDate: Date;
  serviceTime: string;
  status: string;
  total: number;
  serviceAddress: string;
  orderDate: Date;
}

export interface AuditLog {
  id: number;
  entityType?: string;
  entityId?: number;
  action: string;
  createdAt: Date;
  changedBy?: string;
  changedByEmail?: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[] | null;
}

export interface UserPermissions {
  role: string;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canActivate: boolean;
    canDeactivate: boolean;
  };
}

export interface UsersResponse {
  users: UserAdmin[];
  currentUserRole: string;
}

// DTOs
export interface PromoCode {
  id: number;
  code: string;
  description?: string;
  isPercentage: boolean;
  discountValue: number;
  maxUsageCount?: number;
  currentUsageCount: number;
  maxUsagePerUser?: number;
  validFrom?: Date;
  validTo?: Date;
  minimumOrderAmount?: number;
  isActive: boolean;
}

export interface CreatePromoCode {
  code: string;
  description?: string;
  isPercentage: boolean;
  discountValue: number;
  maxUsageCount?: number;
  maxUsagePerUser?: number;
  validFrom?: Date;
  validTo?: Date;
  minimumOrderAmount?: number;
}

export interface UpdatePromoCode {
  description?: string;
  isPercentage: boolean;
  discountValue: number;
  maxUsageCount?: number;
  maxUsagePerUser?: number;
  validFrom?: Date;
  validTo?: Date;
  minimumOrderAmount?: number;
  isActive: boolean;
}

export interface UserAdmin {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  authProvider?: string;
  subscriptionName?: string;
  firstTimeOrder: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateServiceType {
  name: string;
  basePrice: number;
  description?: string;
  displayOrder: number;
  timeDuration: number;
  hasPoll?: boolean; 
  isCustom?: boolean;
}

export interface UpdateServiceType {
  name: string;
  basePrice: number;
  description?: string;
  displayOrder: number;
  timeDuration: number;
  hasPoll?: boolean; 
  isCustom?: boolean;
}

export interface CreateService {
  name: string;
  serviceKey: string;
  cost: number;
  timeDuration: number;
  serviceTypeId: number;
  inputType: string;
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  isRangeInput: boolean;
  unit?: string;
  serviceRelationType?: string;
  displayOrder: number;
}

export interface UpdateService {
  name: string;
  serviceKey: string;
  cost: number;
  timeDuration: number;
  serviceTypeId: number;
  inputType: string;
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  isRangeInput: boolean;
  unit?: string;
  serviceRelationType?: string; // Make sure this is included
  displayOrder: number;
}

export interface CreateExtraService {
  name: string;
  description?: string;
  price: number;
  duration: number;
  icon?: string;
  hasQuantity: boolean;
  hasHours: boolean;
  isDeepCleaning: boolean;
  isSuperDeepCleaning: boolean;
  isSameDayService: boolean;
  priceMultiplier: number;
  serviceTypeId?: number;
  isAvailableForAll: boolean;
  displayOrder: number;
}

export interface UpdateExtraService {
  name: string;
  description?: string;
  price: number;
  duration: number;
  icon?: string;
  hasQuantity: boolean;
  hasHours: boolean;
  isDeepCleaning: boolean;
  isSuperDeepCleaning: boolean;
  isSameDayService: boolean;
  priceMultiplier: number;
  serviceTypeId?: number;
  isAvailableForAll: boolean;
  displayOrder: number;
}

export interface CreateSubscription {
  name: string;
  description?: string;
  discountPercentage: number;
  subscriptionDays: number;
  displayOrder: number;
}

export interface UpdateSubscription {
  name: string;
  description?: string;
  discountPercentage: number;
  subscriptionDays: number;
  displayOrder: number;
}

export interface CopyService {
  sourceServiceId: number;
  targetServiceTypeId: number;
}

export interface CopyExtraService {
  sourceExtraServiceId: number;
  targetServiceTypeId: number;
}

export interface DetailedUser extends UserAdmin {
  orders?: OrderList[];
  apartments?: Apartment[];
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: Date;
  registrationDate?: Date;
}

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  authProvider?: string;
  isActive: boolean;
  firstTimeOrder: boolean;
  subscriptionId?: number;
  subscriptionName?: string;
  subscriptionExpiryDate?: Date;
  createdAt: Date;
  apartments: Apartment[];
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
}

export interface PollQuestion {
  id: number;
  question: string;
  questionType: string;
  options?: string;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  serviceTypeId: number;
}

export interface CreatePollQuestion {
  question: string;
  questionType: string;
  options?: string;
  isRequired: boolean;
  displayOrder: number;
  serviceTypeId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  getUserPermissions(): Observable<UserPermissions> {
    return this.http.get<UserPermissions>(`${this.apiUrl}/permissions`);
  }

  // Service Types
  getServiceTypes(): Observable<ServiceType[]> {
    return this.http.get<ServiceType[]>(`${this.apiUrl}/service-types`);
  }

  createServiceType(serviceType: CreateServiceType): Observable<ServiceType> {
    return this.http.post<ServiceType>(`${this.apiUrl}/service-types`, serviceType);
  }

  updateServiceType(id: number, serviceType: UpdateServiceType): Observable<ServiceType> {
    return this.http.put<ServiceType>(`${this.apiUrl}/service-types/${id}`, serviceType);
  }

  deactivateServiceType(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/service-types/${id}/deactivate`, {});
  }

  activateServiceType(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/service-types/${id}/activate`, {});
  }

  deleteServiceType(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/service-types/${id}`);
  }

  // Services
  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services`);
  }

  createService(service: CreateService): Observable<Service> {
    return this.http.post<Service>(`${this.apiUrl}/services`, service);
  }

  copyService(copyData: CopyService): Observable<Service> {
    return this.http.post<Service>(`${this.apiUrl}/services/copy`, copyData);
  }

  updateService(id: number, service: UpdateService): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/services/${id}`, service);
  }

  deactivateService(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/services/${id}/deactivate`, {});
  }

  activateService(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/services/${id}/activate`, {});
  }

  deleteService(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/services/${id}`);
  }

  // Extra Services
  getExtraServices(): Observable<ExtraService[]> {
    return this.http.get<ExtraService[]>(`${this.apiUrl}/extra-services`);
  }

  createExtraService(extraService: CreateExtraService): Observable<ExtraService> {
    return this.http.post<ExtraService>(`${this.apiUrl}/extra-services`, extraService);
  }

  copyExtraService(copyData: CopyExtraService): Observable<ExtraService> {
    return this.http.post<ExtraService>(`${this.apiUrl}/extra-services/copy`, copyData);
  }

  updateExtraService(id: number, extraService: UpdateExtraService): Observable<ExtraService> {
    return this.http.put<ExtraService>(`${this.apiUrl}/extra-services/${id}`, extraService);
  }

  deactivateExtraService(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/extra-services/${id}/deactivate`, {});
  }

  activateExtraService(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/extra-services/${id}/activate`, {});
  }

  deleteExtraService(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/extra-services/${id}`);
  }

  // Subscriptions
  getSubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/subscriptions`);
  }

  createSubscription(subscription: CreateSubscription): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.apiUrl}/subscriptions`, subscription);
  }

  updateSubscription(id: number, subscription: UpdateSubscription): Observable<Subscription> {
    return this.http.put<Subscription>(`${this.apiUrl}/subscriptions/${id}`, subscription);
  }

  deleteSubscription(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/subscriptions/${id}`);
  }

  deactivateSubscription(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/subscriptions/${id}/deactivate`, {});
  }

  activateSubscription(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/subscriptions/${id}/activate`, {});
  }

  // Promo Codes
  getPromoCodes(): Observable<PromoCode[]> {
    return this.http.get<PromoCode[]>(`${this.apiUrl}/promo-codes`);
  }

  createPromoCode(promoCode: CreatePromoCode): Observable<PromoCode> {
    // Ensure proper data types
    const payload = {
      ...promoCode,
      isPercentage: Boolean(promoCode.isPercentage),
      discountValue: Number(promoCode.discountValue),
      maxUsageCount: promoCode.maxUsageCount ? Number(promoCode.maxUsageCount) : null,
      maxUsagePerUser: promoCode.maxUsagePerUser ? Number(promoCode.maxUsagePerUser) : null,
      minimumOrderAmount: promoCode.minimumOrderAmount ? Number(promoCode.minimumOrderAmount) : null
    };
    
    return this.http.post<PromoCode>(`${this.apiUrl}/promo-codes`, payload);
  }

  updatePromoCode(id: number, promoCode: UpdatePromoCode): Observable<PromoCode> {
    // Ensure proper data types
    const payload = {
      ...promoCode,
      isPercentage: Boolean(promoCode.isPercentage),
      discountValue: Number(promoCode.discountValue),
      maxUsageCount: promoCode.maxUsageCount ? Number(promoCode.maxUsageCount) : null,
      maxUsagePerUser: promoCode.maxUsagePerUser ? Number(promoCode.maxUsagePerUser) : null,
      minimumOrderAmount: promoCode.minimumOrderAmount ? Number(promoCode.minimumOrderAmount) : null,
      isActive: Boolean(promoCode.isActive)
    };
    
    return this.http.put<PromoCode>(`${this.apiUrl}/promo-codes/${id}`, payload);
  }

  deletePromoCode(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/promo-codes/${id}`);
  }

  deactivatePromoCode(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/promo-codes/${id}/deactivate`, {});
  }

  activatePromoCode(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/promo-codes/${id}/activate`, {});
  }

  // Users
  getUsers(): Observable<UsersResponse | UserAdmin[]> {
    return this.http.get<UsersResponse | UserAdmin[]>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: number, role: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  updateUserStatus(userId: number, isActive: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/status`, { isActive });
  }

  // Orders Management
  getAllOrders(): Observable<AdminOrderList[]> {
    // Note: Just use /orders, not /admin/orders because apiUrl already includes /admin
    return this.http.get<AdminOrderList[]>(`${this.apiUrl}/orders`);
  }

  getOrderDetails(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`);
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/status`, { status });
  }

  cancelOrder(orderId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/${orderId}/cancel`, { reason });
  }

  getUserOnlineStatus(userId: number): Observable<{ userId: number, isOnline: boolean }> {
    return this.http.get<{ userId: number, isOnline: boolean }>(`${this.apiUrl}/admin/users/${userId}/online-status`);
  }

  // Get user's orders (admin endpoint)
  getUserOrders(userId: number): Observable<OrderList[]> {
    return this.http.get<OrderList[]>(`${this.apiUrl}/users/${userId}/orders`);
  }

  // Get user's apartments (admin endpoint)
  getUserApartments(userId: number): Observable<Apartment[]> {
    return this.http.get<Apartment[]>(`${this.apiUrl}/users/${userId}/apartments`);
  }

  // Get detailed user information (optional - combines profile, orders, and apartments)
  getUserDetails(userId: number): Observable<DetailedUser> {
    return this.http.get<DetailedUser>(`${this.apiUrl}/users/${userId}/details`);
  }

  // Alternative: Get user profile information
  getUserProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/${userId}/profile`);
  }

  // Gift Card methods - FIX THE URLS (remove extra /admin)
  getAllGiftCards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/gift-cards`); // NOT /admin/admin/gift-cards
  }

  getGiftCardDetails(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gift-cards/${id}`);
  }

  toggleGiftCardStatus(id: number, action: 'activate' | 'deactivate'): Observable<any> {
    return this.http.post(`${this.apiUrl}/gift-cards/${id}/${action}`, {});
  }

  getEntityAuditHistory(entityType: string, entityId: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs/${entityType}/${entityId}`);
  }
  
  // Get recent audit logs
  getRecentAuditLogs(days: number = 7): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs?days=${days}`);
  }
  
  // Get user's complete update history
  getUserCompleteHistory(userId: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/users/${userId}/history`);
  }

  getGiftCardConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/gift-card-config`);
  }

  uploadGiftCardBackground(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post(`${this.apiUrl}/upload-gift-card-background`, formData);
  }

  getAssignedCleanersWithIds(orderId: number): Observable<{id: number, name: string}[]> {
    return this.http.get<{id: number, name: string}[]>(`${this.apiUrl}/orders/${orderId}/assigned-cleaners-with-ids`);
  } 
  
  getAssignedCleaners(orderId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/orders/${orderId}/assigned-cleaners`);
  }

  // Poll Question Methods
  getPollQuestions(serviceTypeId: number): Observable<PollQuestion[]> {
    return this.http.get<PollQuestion[]>(`${environment.apiUrl}/poll/questions/${serviceTypeId}`);
  }
  
  createPollQuestion(pollQuestion: CreatePollQuestion): Observable<PollQuestion> {
    return this.http.post<PollQuestion>(`${this.apiUrl}/poll-questions`, pollQuestion);
  }
  
  updatePollQuestion(id: number, pollQuestion: Partial<PollQuestion>): Observable<any> {
    return this.http.put(`${this.apiUrl}/poll-questions/${id}`, pollQuestion);
  }
  
  deletePollQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/poll-questions/${id}`);
  }
}