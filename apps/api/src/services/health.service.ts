export class HealthService {
  public async getHealthStatus() {
    return { status: 'ok' };
  }
}

export function createHealthService() {
  return new HealthService();
}

export const healthService = createHealthService();
