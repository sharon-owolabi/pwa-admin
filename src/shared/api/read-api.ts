import type {
  AuditEvent,
  AuditQuery,
  ConnectorsResponse,
  MappingQuery,
  MappingRun,
  Me,
  Overview,
  Page,
  RunQuery,
  SyncRun,
  TenantDetail,
  TenantQuery,
  TenantRow,
} from "./contract.draft";

/** Every read the console makes. One implementation is the mock, one is HTTP. */
export interface ReadApi {
  me(): Promise<Me>;
  overview(): Promise<Overview>;
  tenants(query: TenantQuery): Promise<Page<TenantRow>>;
  tenant(id: string): Promise<TenantDetail>;
  connectors(): Promise<ConnectorsResponse>;
  runs(query: RunQuery): Promise<Page<SyncRun>>;
  run(id: string): Promise<SyncRun>;
  mapping(query: MappingQuery): Promise<Page<MappingRun>>;
  audit(query: AuditQuery): Promise<Page<AuditEvent>>;
}
