import type {
  Approval,
  ApprovalQuery,
  AuditEvent,
  AuditQuery,
  Connector,
  MappingQuery,
  MappingRun,
  Me,
  Overview,
  Page,
  Paging,
  RunQuery,
  StaffMember,
  StaffQuery,
  StaffRole,
  StaffSession,
  SyncRun,
  TenantDetail,
  TenantQuery,
  TenantRow,
} from "./contract";

/** Every read the console makes. One implementation is the mock, one is HTTP. */
export interface ReadApi {
  me(): Promise<Me>;
  sessions(): Promise<StaffSession[]>;
  overview(): Promise<Overview>;
  tenants(query: TenantQuery & Paging): Promise<Page<TenantRow>>;
  tenant(id: string): Promise<TenantDetail>;
  connectors(): Promise<Connector[]>;
  runs(query: RunQuery & Paging): Promise<Page<SyncRun>>;
  run(id: string): Promise<SyncRun>;
  mapping(query: MappingQuery & Paging): Promise<Page<MappingRun>>;
  audit(query: AuditQuery & Paging): Promise<Page<AuditEvent>>;
  staff(query: StaffQuery & Paging): Promise<Page<StaffMember>>;
  roles(): Promise<StaffRole[]>;
  approvals(query: ApprovalQuery & Paging): Promise<Page<Approval>>;
}
