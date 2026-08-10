import { apiGet, apiPost } from '../api-client';
import { ModelDrift, FeatureDrift, ModelVersion, AuditLog } from '../types';

export const monitoringRepository = {
  getModelDrift: () => 
    apiGet<ModelDrift>('/api/monitoring/model-drift'),
    
  getFeatureDrift: () => 
    apiGet<FeatureDrift>('/api/monitoring/feature-drift'),
    
  getModelVersions: () => 
    apiGet<{ versions: ModelVersion[] }>('/api/monitoring/model-versions'),
    
  promoteModel: (runId: string) => 
    apiPost<{ message: string; run_id: string; promoted_at: string }>('/api/monitoring/promote-model', { run_id: runId }),
    
  getAuditLogs: (params?: { action?: string; user_id?: string; limite?: number }) => 
    apiGet<{ total: number; limite: number; logs: AuditLog[]; actions_disponibles: string[] }>('/api/monitoring/audit-logs', params),
};