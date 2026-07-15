"use server";

import { supabaseAdmin } from "@/lib/supabase/client";

export type OperationStatus = "success" | "error" | "skipped" | "pending";

export type LeadDeliveryStatus = {
  destination: "app" | "sheets" | "kommo" | "whatsapp";
  status: OperationStatus;
  error?: string;
  timestamp?: string;
};

export type OperationLead = {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
  status: string;
  sellerId: string | null;
  createdAt: string;
  workspaceId: string;
  deliveries: Record<"app" | "sheets" | "kommo" | "whatsapp", LeadDeliveryStatus>;
};

export type OperationQueueResult = {
  success: true;
  leads: OperationLead[];
  summary: {
    total: number;
    completed: number; // all destinations non-pending/error (success or skipped)
    pending: number;   // at least one pending
    error: number;     // at least one error
  };
} | { success: false; error: string };

export async function getOperationQueue(workspaceId?: string): Promise<OperationQueueResult> {
  try {
    // 1. Fetch recent leads
    let leadsQuery = supabaseAdmin
      .from("gestao_leads")
      .select("id, name, phone, source, status, seller_id, created_at, workspace_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (workspaceId) {
      leadsQuery = leadsQuery.eq("workspace_id", workspaceId);
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      return { success: false, error: leadsError.message };
    }

    if (!leads || leads.length === 0) {
      return { 
        success: true, 
        leads: [], 
        summary: { total: 0, completed: 0, pending: 0, error: 0 } 
      };
    }

    const leadIds = leads.map(l => l.id);

    // 2. Fetch audit logs for these leads
    // Based on contract: action="delivery" with details.destination / details.status
    // OR action="round_robin_distribution" for App (CRM)
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("gestao_leads_audit_logs")
      .select("lead_id, action, details, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: true }); // true so latest overwrites earlier in reduce

    if (logsError) {
      return { success: false, error: logsError.message };
    }

    // 3. Process logs per lead
    const logsByLead = (logs || []).reduce((acc, log) => {
      if (!acc[log.lead_id]) {
        acc[log.lead_id] = {
          app: null,
          sheets: null,
          kommo: null,
          whatsapp: null
        };
      }

      // App (CRM)
      if (log.action === "round_robin_distribution") {
        acc[log.lead_id].app = {
          status: "success",
          timestamp: log.created_at
        };
      }

      // Deliveries
      if (log.action === "delivery" && log.details) {
        const details = log.details as any;
        const dest = details.destination as "app" | "sheets" | "kommo" | "whatsapp";
        const status = details.status as OperationStatus;
        
        if (dest && ["app", "sheets", "kommo", "whatsapp"].includes(dest)) {
          acc[log.lead_id][dest] = {
            status: status || "success",
            error: details.error,
            timestamp: log.created_at
          };
        }
      }

      return acc;
    }, {} as Record<string, any>);

    // 4. Build final result and summary
    let completed = 0;
    let pending = 0;
    let errCount = 0;

    const mappedLeads: OperationLead[] = leads.map(lead => {
      const leadLogs = logsByLead[lead.id] || {};
      
      const deliveries = {
        app: {
          destination: "app",
          status: leadLogs.app?.status || "pending",
          error: leadLogs.app?.error,
          timestamp: leadLogs.app?.timestamp
        },
        sheets: {
          destination: "sheets",
          status: leadLogs.sheets?.status || "pending",
          error: leadLogs.sheets?.error,
          timestamp: leadLogs.sheets?.timestamp
        },
        kommo: {
          destination: "kommo",
          status: leadLogs.kommo?.status || "pending",
          error: leadLogs.kommo?.error,
          timestamp: leadLogs.kommo?.timestamp
        },
        whatsapp: {
          destination: "whatsapp",
          status: leadLogs.whatsapp?.status || "pending",
          error: leadLogs.whatsapp?.error,
          timestamp: leadLogs.whatsapp?.timestamp
        }
      } as Record<"app" | "sheets" | "kommo" | "whatsapp", LeadDeliveryStatus>;

      const statuses = Object.values(deliveries).map(d => d.status);
      
      if (statuses.includes("error")) {
        errCount++;
      } else if (statuses.includes("pending")) {
        pending++;
      } else {
        completed++;
      }

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        sellerId: lead.seller_id,
        createdAt: lead.created_at,
        workspaceId: lead.workspace_id,
        deliveries
      };
    });

    return {
      success: true,
      leads: mappedLeads,
      summary: {
        total: leads.length,
        completed,
        pending,
        error: errCount
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
