import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceType, Service, ExtraService, Frequency } from './booking.service';

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
}

export interface UpdateServiceType {
  name: string;
  basePrice: number;
  description?: string;
  displayOrder: number;
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

export interface CreateFrequency {
  name: string;
  description?: string;
  discountPercentage: number;
  frequencyDays: number;
  displayOrder: number;
}

export interface UpdateFrequency {
  name: string;
  description?: string;
  discountPercentage: number;
  frequencyDays: number;
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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

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

  // Frequencies
  getFrequencies(): Observable<Frequency[]> {
    return this.http.get<Frequency[]>(`${this.apiUrl}/frequencies`);
  }

  createFrequency(frequency: CreateFrequency): Observable<Frequency> {
    return this.http.post<Frequency>(`${this.apiUrl}/frequencies`, frequency);
  }

  updateFrequency(id: number, frequency: UpdateFrequency): Observable<Frequency> {
    return this.http.put<Frequency>(`${this.apiUrl}/frequencies/${id}`, frequency);
  }

  deleteFrequency(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/frequencies/${id}`);
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

  // Users
  getUsers(): Observable<UserAdmin[]> {
    return this.http.get<UserAdmin[]>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: number, role: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  updateUserStatus(userId: number, isActive: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/status`, { isActive });
  }
}