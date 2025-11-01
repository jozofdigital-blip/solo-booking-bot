import { API_CONFIG } from './config';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Добавляем таймаут
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }));
        throw new Error(error.message || 'Request failed');
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Улучшенные сообщения об ошибках
      if (error.name === 'AbortError') {
        throw new Error('Превышено время ожидания. Проверьте соединение с сервером.');
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Не удалось подключиться к серверу. Проверьте, что API доступен на ' + API_CONFIG.baseUrl);
      }
      
      throw error;
    }
  }

  // Auth
  async signIn(email: string, password: string) {
    const data = await this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async signUp(email: string, password: string) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async signOut() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async getUser() {
    return this.request('/auth/user');
  }

  // Profiles
  async getProfile(userId: string) {
    return this.request(`/profiles/${userId}`);
  }

  async updateProfile(userId: string, data: any) {
    return this.request(`/profiles/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Services
  async getServices(profileId: string) {
    return this.request(`/services?profile_id=${profileId}`);
  }

  async createService(data: any) {
    return this.request('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: any) {
    return this.request(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string) {
    return this.request(`/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Appointments
  async getAppointments(profileId: string, startDate?: string, endDate?: string) {
    let url = `/appointments?profile_id=${profileId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return this.request(url);
  }

  async createAppointment(data: any) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(id: string, data: any) {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAppointment(id: string) {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  // Clients
  async getClients(profileId: string) {
    return this.request(`/clients?profile_id=${profileId}`);
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Booking
  async getBookingData(slug: string) {
    return this.request(`/booking/${slug}`);
  }

  async getAvailableSlots(profileId: string, date: string, serviceId: string) {
    return this.request(`/booking/slots?profile_id=${profileId}&date=${date}&service_id=${serviceId}`);
  }

  async getBusyDays(profileId: string, year: number, month: number) {
    return this.request(`/booking/busy-days?profile_id=${profileId}&year=${year}&month=${month}`);
  }

  async createBooking(data: any) {
    return this.request('/booking', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Working Hours
  async getWorkingHours(profileId: string) {
    return this.request(`/working-hours?profile_id=${profileId}`);
  }

  async updateWorkingHours(data: any) {
    return this.request('/working-hours', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payments
  async createPayment(data: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayments(profileId: string) {
    return this.request(`/payments?profile_id=${profileId}`);
  }
}

export const apiClient = new ApiClient();
