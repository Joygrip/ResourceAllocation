/**
 * Planning API calls - Demand and Supply
 */
import { apiClient } from './client';

export interface DemandLine {
  id: string;
  tenant_id: string;
  period_id: string;
  project_id: string;
  resource_id?: string;
  placeholder_id?: string;
  year: number;
  month: number;
  fte_percent: number;
  created_by: string;
  created_at: string;
}

export interface SupplyLine {
  id: string;
  tenant_id: string;
  period_id: string;
  resource_id: string;
  year: number;
  month: number;
  fte_percent: number;
  created_by: string;
  created_at: string;
}

export interface CreateDemandLine {
  period_id: string;
  project_id: string;
  resource_id?: string;
  placeholder_id?: string;
  fte_percent: number;
  // year/month are optional and derived from period_id server-side
  year?: number;
  month?: number;
}

export interface CreateSupplyLine {
  period_id: string;
  resource_id: string;
  fte_percent: number;
  // year/month are optional and derived from period_id server-side
  year?: number;
  month?: number;
}

export const planningApi = {
  // Demand Lines
  async getDemandLines(periodId?: string): Promise<DemandLine[]> {
    const params = periodId ? `?period_id=${periodId}` : '';
    return apiClient.get<DemandLine[]>(`/demand-lines${params}`);
  },
  
  async createDemandLine(data: CreateDemandLine): Promise<DemandLine> {
    return apiClient.post<DemandLine>('/demand-lines', data);
  },
  
  async updateDemandLine(id: string, data: Partial<CreateDemandLine>): Promise<DemandLine> {
    return apiClient.put<DemandLine>(`/demand-lines/${id}`, data);
  },
  
  async deleteDemandLine(id: string): Promise<void> {
    return apiClient.delete(`/demand-lines/${id}`);
  },
  
  // Supply Lines
  async getSupplyLines(periodId?: string): Promise<SupplyLine[]> {
    const params = periodId ? `?period_id=${periodId}` : '';
    return apiClient.get<SupplyLine[]>(`/supply-lines${params}`);
  },
  
  async createSupplyLine(data: CreateSupplyLine): Promise<SupplyLine> {
    return apiClient.post<SupplyLine>('/supply-lines', data);
  },
  
  async updateSupplyLine(id: string, data: Partial<CreateSupplyLine>): Promise<SupplyLine> {
    return apiClient.put<SupplyLine>(`/supply-lines/${id}`, data);
  },
  
  async deleteSupplyLine(id: string): Promise<void> {
    return apiClient.delete(`/supply-lines/${id}`);
  },
  
  // Planning Insights
  async getInsights(periodId: string): Promise<PlanningInsights> {
    return apiClient.get<PlanningInsights>(`/insights?period_id=${periodId}`);
  },
};

export interface PlanningInsights {
  period: {
    id: string;
    year: number;
    month: number;
    status: string;
  };
  by_cost_center: Array<{
    cost_center_id: string;
    cost_center_name: string;
    demand_total: number;
    supply_total: number;
    gap: number;
  }>;
  orphan_demand: Array<{
    demand_line_id: string;
    project_name: string;
    resource_or_placeholder: string;
    fte_percent: number;
    reason: string;
  }>;
  stats: {
    total_demand: number;
    total_supply: number;
    total_gap: number;
    gaps_count: number;
    orphans_count: number;
  };
}
