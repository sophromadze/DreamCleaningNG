// src/app/services/mail.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ScheduledMail {
  id?: number;
  subject: string;
  content: string;
  targetRoles: string[];
  scheduleType: string;
  scheduledDate?: Date | string | null | undefined;
  scheduledTime?: string | null | undefined;
  dayOfWeek?: number | null | undefined;
  dayOfMonth?: number | null | undefined;
  weekOfMonth?: number | null | undefined;
  frequency?: string | null | undefined;
  status: string;
  scheduleTimezone?: string | null; // Added timezone field
  createdBy?: string;
  createdAt?: Date;
  sentAt?: Date;
  recipientCount?: number;
  timesSent?: number;
  sentLogs?: SentMailLog[];
}

export interface SentMailLog {
  recipientEmail: string;
  recipientName: string;
  recipientRole: string;
  sentAt: Date;
  isDelivered: boolean;
  errorMessage?: string;
}

export interface MailStats {
  totalSent: number;
  scheduledCount: number;
  draftCount: number;
  recipientsByRole: { role: string; count: number }[];
  sentByMonth: { month: string; count: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class MailService {
  private apiUrl = `${environment.apiUrl}/admin/mails`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getScheduledMails(): Observable<ScheduledMail[]> {
    return this.http.get<ScheduledMail[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getScheduledMail(id: number): Observable<ScheduledMail> {
    return this.http.get<ScheduledMail>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createScheduledMail(mail: ScheduledMail): Observable<any> {
    return this.http.post(this.apiUrl, mail, { headers: this.getHeaders() });
  }

  updateScheduledMail(id: number, mail: ScheduledMail): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, mail, { headers: this.getHeaders() });
  }

  deleteScheduledMail(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  sendMail(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/send`, {}, { headers: this.getHeaders() });
  }

  cancelScheduledMail(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancel`, {}, { headers: this.getHeaders() });
  }

  getMailStats(): Observable<MailStats> {
    return this.http.get<MailStats>(`${this.apiUrl}/stats`, { headers: this.getHeaders() });
  }

  getUserCountsByRole(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/user-counts`, { headers: this.getHeaders() });
  }

  testEmail(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/test/email`, { email }, { headers: this.getHeaders() });
  }
}