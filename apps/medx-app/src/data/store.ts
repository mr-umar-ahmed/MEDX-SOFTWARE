import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { verifyLicenseToken, checkLicenseHeartbeat, type LicenseData } from "../core/licensing";
import { parseAnalyzerFrame } from "../core/interfacing";
import type {
  LabSettings, Patient, Doctor, StaffUser, Order, OrderItem, Payment, ResultValue,
  OrderSource, OrderPriority, SampleStatus, QueueToken, Estimate, EstimateItem,
  TpaClaim, MouClient, CorporateBill, CommissionPayout, Appointment, HomeVisit,
  Reagent, StockMovement, Supplier, QcLog, TemperatureLog, Calibration, SopDoc, AuditEntry,
  UserRole,
} from "./types";
import type { Sex } from "../core/ranges";
import { IS_DISPLAY_WINDOW } from "../lib/windowMode";
import { evaluate, ageInDays } from "../core/ranges";
import { computeInvoice, type LineInput } from "../core/gst";
import { financialYear, formatInvoiceNo, formatAccessionNo, dayKey } from "../core/numbering";
import { getTest } from "../catalog";

declare global {
  interface Window {
    medx?: {
      getStore: (key: string) => Promise<string | null>;
      setStore: (key: string, value: string) => Promise<void>;
      removeStore: (key: string) => Promise<void>;
      getHostname?: () => Promise<string>;
      onAnalyzerRawData?: (callback: (data: string) => void) => void;
      simulateTcpTransmission?: (data: string) => Promise<void>;
      onUpdaterStatus?: (cb: (status: { status: string }) => void) => void;
      onUpdaterProgress?: (cb: (percent: number) => void) => void;
      installUpdate?: () => Promise<void>;
      listSerialPorts?: () => Promise<Array<{ path: string; manufacturer?: string }>>;
      connectSerialPort?: (path: string, baudRate: number) => Promise<{ success: boolean; error?: string }>;
      disconnectSerialPort?: () => Promise<{ success: boolean; error?: string }>;
      onSerialError?: (cb: (err: string) => void) => void;
      broadcast?: (payload: string) => void;
      onBroadcast?: (cb: (payload: string) => void) => void;
    };
  }
}

const DEFAULT_SETTINGS: LabSettings = {
  name: "MedX Diagnostic Laboratory",
  tagline: "Accurate. Trusted. On time.",
  addressLine: "123 Health Street, Near Bus Stand",
  city: "Nagpur",
  stateCode: "27",
  stateName: "Maharashtra",
  phone: "+91 98765 43210",
  email: "lab@medx.example",
  gstin: "27ABCDE1234F1Z5",
  invoicePrefix: "MEDX",
  footerNote: "This is an electronically generated report. Kindly correlate clinically.",
  defaultGstRatePct: 0,
  reportPathologist: "Dr. A. Sharma, MD (Pathology)",
  reportPathologistQual: "Consultant Pathologist",
  reportTechnologist: "Lab Technologist",
  reportShowLogo: true,
  abdmEnabled: false,
  abdmHipId: "",
};

function uid(prefix: string): string {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function patientAgeDays(p: Pick<Patient, "dob" | "ageYears" | "ageMonths" | "ageDays">): number {
  if (p.dob) return ageInDays(new Date(p.dob));
  const y = p.ageYears ?? 0, m = p.ageMonths ?? 0, d = p.ageDays ?? 0;
  return Math.round(y * 365.25 + m * 30.44 + d);
}

export function monthKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export interface NewOrderInput {
  patient: Omit<Patient, "id" | "uhid" | "createdAt"> & { id?: string };
  doctorId?: string;
  source: OrderSource;
  priority: OrderPriority;
  items: Array<{ testCode: string; testName: string; category: string; sampleType: string; pricePaise: number; discountPaise?: number }>;
  billDiscountPaise?: number;
  gstRatePct: number; // 0 = exempt
  payment?: { amountPaise: number; mode: Payment["mode"] };
}

interface StoreState {
  settings: LabSettings;
  patients: Patient[];
  doctors: Doctor[];
  users: StaffUser[];
  currentUserId: string;
  orders: Order[];
  tokens: QueueToken[];
  estimates: Estimate[];
  tpaClaims: TpaClaim[];
  mouClients: MouClient[];
  corporateBills: CorporateBill[];
  commissionPayouts: CommissionPayout[];
  appointments: Appointment[];
  homeVisits: HomeVisit[];
  reagents: Reagent[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
  qcLogs: QcLog[];
  temperatureLogs: TemperatureLog[];
  calibrations: Calibration[];
  sops: SopDoc[];
  audit: AuditEntry[];
  seq: Record<string, number>;
  rolePermissions: Record<UserRole, string[]>;
  licenseToken?: string;
  activeLicense: LicenseData | null;
  lastCloudSync?: number;
  /** Message pushed by the software vendor (admin panel) via heartbeat. */
  adminNotice: string | null;
  dismissAdminNotice: () => void;
  interfacingLogs: Array<{ id: string; at: string; barcode: string; protocol: string; status: "success" | "error" | "not_found"; results: Record<string, string>; raw: string }>;

  // settings & users
  updateSettings: (s: Partial<LabSettings>) => void;
  addUser: (name: string, role: StaffUser["role"]) => void;
  setUserActive: (id: string, active: boolean) => void;
  setCurrentUser: (id: string) => void;
  currentUserName: () => string;
  updateRolePermissions: (role: UserRole, permissions: string[]) => void;
  activateLicense: (token: string) => Promise<boolean>;
  importAnalyzerResults: (barcode: string, results: Record<string, string>, raw: string, protocol: "HL7" | "ASTM") => void;

  // people
  upsertPatient: (p: Omit<Patient, "id" | "uhid" | "createdAt"> & { id?: string }) => Patient;
  addDoctor: (d: Omit<Doctor, "id" | "createdAt">) => Doctor;
  updateDoctor: (id: string, d: Partial<Doctor>) => void;

  // orders
  nextInvoiceNo: (date: Date) => string;
  nextAccessionNo: (date: Date) => string;
  createOrder: (input: NewOrderInput) => Order;
  setResult: (orderId: string, testCode: string, analyteCode: string, value: string) => void;
  verifyOrder: (orderId: string) => void;
  addPayment: (orderId: string, p: Payment) => void;
  setSampleStatus: (orderId: string, testCode: string, status: SampleStatus) => void;
  markDelivered: (orderId: string, via: NonNullable<Order["deliveredVia"]>) => void;

  // queue
  issueToken: (name: string | undefined, purpose: string) => QueueToken;
  callNextToken: () => void;
  completeToken: (id: string) => void;

  // estimates
  addEstimate: (name: string, phone: string, items: EstimateItem[], discountPaise: number) => Estimate;
  deleteEstimate: (id: string) => void;
  markEstimateConverted: (id: string, orderId: string) => void;

  // billing extras
  addTpaClaim: (c: Omit<TpaClaim, "id" | "filedAt">) => void;
  updateTpaClaim: (id: string, patch: Partial<TpaClaim>) => void;
  addMouClient: (c: Omit<MouClient, "id" | "createdAt">) => void;
  addCorporateBill: (b: Omit<CorporateBill, "id" | "createdAt">) => void;
  setCorporateBillStatus: (id: string, status: CorporateBill["status"]) => void;
  addCommissionPayout: (doctorId: string, mk: string, amountPaise: number) => void;

  // appointments
  addAppointment: (a: Omit<Appointment, "id">) => void;
  setAppointmentStatus: (id: string, status: Appointment["status"]) => void;
  addHomeVisit: (v: Omit<HomeVisit, "id">) => void;
  setHomeVisitStatus: (id: string, status: HomeVisit["status"]) => void;

  // inventory
  addReagent: (r: Omit<Reagent, "id">) => void;
  moveStock: (reagentId: string, delta: number, reason: string) => void;
  addSupplier: (s: Omit<Supplier, "id">) => void;

  // quality
  addQcLog: (q: Omit<QcLog, "id">) => void;
  addTemperatureLog: (t: Omit<TemperatureLog, "id">) => void;
  addCalibration: (c: Omit<Calibration, "id">) => void;
  updateCalibration: (id: string, patch: Partial<Calibration>) => void;
  addSop: (s: Omit<SopDoc, "id">) => void;

  // audit
  log: (action: string, detail: string) => void;

  // lookups
  getPatient: (id: string) => Patient | undefined;
  getDoctor: (id: string | undefined) => Doctor | undefined;
  getOrder: (id: string) => Order | undefined;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      patients: [],
      doctors: [],
      users: [{ id: "U-admin", name: "Administrator", role: "Owner", active: true, createdAt: new Date().toISOString() }],
      currentUserId: "U-admin",
      orders: [],
      tokens: [],
      estimates: [],
      tpaClaims: [],
      mouClients: [],
      corporateBills: [],
      commissionPayouts: [],
      appointments: [],
      homeVisits: [],
      reagents: [],
      stockMovements: [],
      suppliers: [],
      qcLogs: [],
      temperatureLogs: [],
      calibrations: [],
      sops: [],
      audit: [],
      seq: {},
      rolePermissions: {
        Owner: ["/", "/queue", "/patients/new", "/patients", "/new", "/estimates", "/samples", "/results", "/verification", "/reports", "/delivery", "/invoices", "/payments", "/outstanding", "/tpa", "/doctors", "/commission", "/mou", "/corporate", "/calendar", "/home-collection", "/reagents", "/suppliers", "/qc", "/temperature", "/calibrations", "/sops", "/interfacing", "/audit", "/analytics", "/mis", "/settings", "/users", "/report-template", "/backup", "/abdm"],
        Receptionist: ["/", "/queue", "/patients/new", "/patients", "/new", "/estimates", "/reports", "/delivery", "/invoices", "/payments", "/outstanding", "/tpa", "/calendar", "/home-collection"],
        Technician: ["/", "/samples", "/results", "/reports", "/reagents", "/suppliers", "/qc", "/temperature", "/calibrations", "/interfacing"],
        Pathologist: ["/", "/results", "/verification", "/reports", "/qc", "/temperature", "/calibrations", "/sops", "/interfacing"]
      },
      licenseToken: "",
      activeLicense: null,
      adminNotice: null,
      dismissAdminNotice: () => set({ adminNotice: null }),
      interfacingLogs: [],

      /* ---------- settings & users ---------- */
      updateSettings: (s) => {
        set((st) => ({ settings: { ...st.settings, ...s } }));
        get().log("settings.update", Object.keys(s).join(", "));
      },
      addUser: (name, role) => {
        set((st) => ({ users: [...st.users, { id: uid("U"), name, role, active: true, createdAt: new Date().toISOString() }] }));
        get().log("user.add", `${name} (${role})`);
      },
      setUserActive: (id, active) => set((st) => ({ users: st.users.map((u) => (u.id === id ? { ...u, active } : u)) })),
      setCurrentUser: (id) => set({ currentUserId: id }),
      currentUserName: () => get().users.find((u) => u.id === get().currentUserId)?.name ?? "Unknown",
      updateRolePermissions: (role, permissions) => {
        set((st) => ({
          rolePermissions: { ...st.rolePermissions, [role]: permissions }
        }));
        get().log("permissions.update", `Updated permissions for ${role}`);
      },
      activateLicense: async (token) => {
        const verified = await verifyLicenseToken(token);
        if (verified) {
          set({ licenseToken: token, activeLicense: verified });
          get().log("license.activate", `Activated ${verified.tier} license for ${verified.labName}`);
          
          // Instantly connect to the admin panel and register this device
          try {
            await checkLicenseHeartbeat(verified.licenseKey, token, {
              onRevoked: (reason) => {
                set({ licenseToken: "", activeLicense: null });
                alert(reason || "Your license has been deactivated.");
              },
              onTokenRefresh: (newToken, license) => {
                set({ licenseToken: newToken, activeLicense: license });
                get().log("license.renew", `License updated by vendor: ${license.tier} tier, valid until ${license.validUntil}`);
              },
              onMessage: (message) => set({ adminNotice: message }),
            });
          } catch (e) {}

          return true;
        }
        return false;
      },
      importAnalyzerResults: (barcode, results, raw, protocol) => {
        const list = get().orders;
        const index = list.findIndex((o) => o.accessionNo === barcode);
        let status: "success" | "error" | "not_found" = "success";
        
        if (index === -1) {
          status = "not_found";
        } else {
          const order = list[index];
          const updatedItems = order.items.map((it) => {
            let hasUpdate = false;
            const updatedResults = it.results.map((rv) => {
              const matchKey = Object.keys(results).find(
                (k) => k.toUpperCase() === rv.analyteCode.toUpperCase()
              );
              if (matchKey) {
                hasUpdate = true;
                return { ...rv, value: results[matchKey] };
              }

              const testMatchKey = Object.keys(results).find(
                (k) => k.toUpperCase() === it.testCode.toUpperCase()
              );
              if (testMatchKey && it.results.length === 1) {
                hasUpdate = true;
                return { ...rv, value: results[testMatchKey] };
              }

              return rv;
            });

            if (hasUpdate) {
              return { ...it, results: updatedResults, sampleStatus: "collected" as const };
            }
            return it;
          });

          const updatedOrder = { ...order, items: updatedItems, status: "collected" as const };
          set((st) => ({
            orders: st.orders.map((o) => (o.id === order.id ? updatedOrder : o))
          }));
          get().log("interfacing.import", `Imported results for barcode ${barcode} from ${protocol}`);
        }

        const newLog = {
          id: "IFL-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          at: new Date().toISOString(),
          barcode,
          protocol,
          status,
          results,
          raw
        };
        set((st) => ({
          interfacingLogs: [newLog, ...(st.interfacingLogs || [])].slice(0, 100)
        }));
      },

      /* ---------- people ---------- */
      upsertPatient: (p) => {
        const existing = p.id ? get().patients.find((x) => x.id === p.id) : undefined;
        if (existing) {
          const patient = { ...existing, ...p, id: existing.id, uhid: existing.uhid, createdAt: existing.createdAt };
          set((st) => ({ patients: st.patients.map((x) => (x.id === patient.id ? patient : x)) }));
          return patient;
        }
        const n = (get().seq["uhid"] ?? 0) + 1;
        set((st) => ({ seq: { ...st.seq, uhid: n } }));
        const patient: Patient = { ...p, id: uid("PT"), uhid: `MDX-${String(n).padStart(6, "0")}`, createdAt: new Date().toISOString() } as Patient;
        set((st) => ({ patients: [patient, ...st.patients] }));
        return patient;
      },
      addDoctor: (d) => {
        const doc: Doctor = { ...d, id: uid("DR"), createdAt: new Date().toISOString() };
        set((st) => ({ doctors: [doc, ...st.doctors] }));
        return doc;
      },
      updateDoctor: (id, d) => set((st) => ({ doctors: st.doctors.map((x) => (x.id === id ? { ...x, ...d } : x)) })),

      /* ---------- numbering ---------- */
      nextInvoiceNo: (date) => {
        const fy = financialYear(date);
        const key = `inv:${fy.key}`;
        const n = (get().seq[key] ?? 0) + 1;
        set((st) => ({ seq: { ...st.seq, [key]: n } }));
        return formatInvoiceNo(get().settings.invoicePrefix, fy, n);
      },
      nextAccessionNo: (date) => {
        const key = `acc:${dayKey(date)}`;
        const n = (get().seq[key] ?? 0) + 1;
        set((st) => ({ seq: { ...st.seq, [key]: n } }));
        return formatAccessionNo(date, n);
      },

      /* ---------- orders ---------- */
      createOrder: (input) => {
        const now = new Date();
        const patient = get().upsertPatient(input.patient);
        const exempt = input.gstRatePct <= 0;

        const lines: LineInput[] = input.items.map((it) => ({
          name: it.testName,
          unitPricePaise: it.pricePaise,
          discountPaise: it.discountPaise ?? 0,
          exempt,
          gstRatePct: input.gstRatePct,
          ref: it.testCode,
        }));
        const bill = computeInvoice({
          supplierStateCode: get().settings.stateCode,
          placeOfSupplyStateCode: get().settings.stateCode,
          billDiscountPaise: input.billDiscountPaise ?? 0,
          lines,
        });

        const items: OrderItem[] = input.items.map((it, i) => {
          const def = getTest(it.testCode);
          const results: ResultValue[] = (def?.analytes ?? [{ code: it.testCode, name: it.testName }]).map((a) => ({
            analyteCode: a.code,
            value: "",
            unit: (a as { unit?: string }).unit,
          }));
          return {
            testCode: it.testCode,
            testName: it.testName,
            category: it.category,
            sampleType: it.sampleType,
            pricePaise: it.pricePaise,
            discountPaise: bill.lines[i].discountPaise,
            gstExempt: exempt,
            gstRatePct: input.gstRatePct,
            results,
            verified: false,
            sampleStatus: "pending" as SampleStatus,
          };
        });

        const payments: Payment[] = input.payment && input.payment.amountPaise > 0
          ? [{ amountPaise: input.payment.amountPaise, mode: input.payment.mode, at: now.toISOString() }]
          : [];

        const order: Order = {
          id: uid("ORD"),
          invoiceNo: get().nextInvoiceNo(now),
          accessionNo: get().nextAccessionNo(now),
          patientId: patient.id,
          doctorId: input.doctorId,
          source: input.source,
          priority: input.priority,
          createdAt: now.toISOString(),
          status: "registered",
          items,
          billDiscountPaise: input.billDiscountPaise ?? 0,
          grossPaise: bill.grossPaise,
          discountPaise: bill.totalDiscountPaise,
          taxablePaise: bill.taxablePaise,
          cgstPaise: bill.cgstPaise,
          sgstPaise: bill.sgstPaise,
          igstPaise: bill.igstPaise,
          roundOffPaise: bill.roundOffPaise,
          grandTotalPaise: bill.grandTotalPaise,
          payments,
        };
        set((st) => ({ orders: [order, ...st.orders] }));
        get().log("order.create", `${order.invoiceNo} · ${patient.name} · ${items.length} tests`);
        return order;
      },

      setResult: (orderId, testCode, analyteCode, value) => {
        set((st) => ({
          orders: st.orders.map((o) => {
            if (o.id !== orderId) return o;
            const patient = st.patients.find((p) => p.id === o.patientId);
            const sex: Sex = patient?.sex ?? "O";
            const ageDays = patient ? patientAgeDays(patient) : 0;
            const items = o.items.map((it) => {
              if (it.testCode !== testCode) return it;
              const def = getTest(testCode);
              const results = it.results.map((r) => {
                if (r.analyteCode !== analyteCode) return r;
                const analyte = def?.analytes.find((a) => a.code === analyteCode);
                const num = parseFloat(value);
                if (analyte?.ranges && analyte.ranges.length && isFinite(num)) {
                  const ev = evaluate(num, analyte.ranges, sex, ageDays);
                  return { ...r, value, flag: ev.flag, abnormal: ev.abnormal, critical: ev.critical, rangeText: ev.rangeText };
                }
                return { ...r, value, flag: null, abnormal: false, critical: false };
              });
              return { ...it, results };
            });
            const anyValue = items.some((it) => it.results.some((r) => r.value !== ""));
            return { ...o, items, status: anyValue && (o.status === "registered" || o.status === "collected") ? "in-process" : o.status };
          }),
        }));
      },

      verifyOrder: (orderId) => {
        const by = get().currentUserName();
        set((st) => ({
          orders: st.orders.map((o) =>
            o.id === orderId
              ? { ...o, items: o.items.map((it) => ({ ...it, verified: true })), status: "reported", verifiedAt: new Date().toISOString(), verifiedBy: by }
              : o,
          ),
        }));
        get().log("order.verify", get().orders.find((o) => o.id === orderId)?.invoiceNo ?? orderId);
      },

      addPayment: (orderId, p) => {
        set((st) => ({ orders: st.orders.map((o) => (o.id === orderId ? { ...o, payments: [...o.payments, p] } : o)) }));
        get().log("payment.add", `${get().orders.find((o) => o.id === orderId)?.invoiceNo ?? orderId} · ${p.mode}`);
      },

      setSampleStatus: (orderId, testCode, status) => {
        set((st) => ({
          orders: st.orders.map((o) => {
            if (o.id !== orderId) return o;
            const items = o.items.map((it) => (it.testCode === testCode ? { ...it, sampleStatus: status } : it));
            const allCollected = items.every((it) => it.sampleStatus !== "pending");
            return { ...o, items, status: o.status === "registered" && allCollected ? "collected" : o.status };
          }),
        }));
      },

      markDelivered: (orderId, via) => {
        set((st) => ({
          orders: st.orders.map((o) => (o.id === orderId ? { ...o, status: "delivered", deliveredAt: new Date().toISOString(), deliveredVia: via } : o)),
        }));
        get().log("report.deliver", `${get().orders.find((o) => o.id === orderId)?.invoiceNo ?? orderId} via ${via}`);
      },

      /* ---------- queue ---------- */
      issueToken: (name, purpose) => {
        const key = `tok:${dayKey(new Date())}`;
        const n = (get().seq[key] ?? 0) + 1;
        set((st) => ({ seq: { ...st.seq, [key]: n } }));
        const token: QueueToken = { id: uid("TK"), number: n, label: `T-${String(n).padStart(3, "0")}`, name, purpose, issuedAt: new Date().toISOString(), status: "waiting" };
        set((st) => ({ tokens: [...st.tokens, token] }));
        return token;
      },
      callNextToken: () => {
        set((st) => {
          const tokens = [...st.tokens];
          const servingIdx = tokens.findIndex((t) => t.status === "serving");
          if (servingIdx >= 0) tokens[servingIdx] = { ...tokens[servingIdx], status: "done" };
          const nextIdx = tokens.findIndex((t) => t.status === "waiting");
          if (nextIdx >= 0) tokens[nextIdx] = { ...tokens[nextIdx], status: "serving" };
          return { tokens };
        });
      },
      completeToken: (id) => set((st) => ({ tokens: st.tokens.map((t) => (t.id === id ? { ...t, status: "done" } : t)) })),

      /* ---------- estimates ---------- */
      addEstimate: (name, phone, items, discountPaise) => {
        const e: Estimate = { id: uid("EST"), name, phone, items, discountPaise, createdAt: new Date().toISOString() };
        set((st) => ({ estimates: [e, ...st.estimates] }));
        return e;
      },
      deleteEstimate: (id) => set((st) => ({ estimates: st.estimates.filter((e) => e.id !== id) })),
      markEstimateConverted: (id, orderId) => set((st) => ({ estimates: st.estimates.map((e) => (e.id === id ? { ...e, convertedOrderId: orderId } : e)) })),

      /* ---------- billing extras ---------- */
      addTpaClaim: (c) => {
        set((st) => ({ tpaClaims: [{ ...c, id: uid("TPA"), filedAt: new Date().toISOString() }, ...st.tpaClaims] }));
        get().log("tpa.add", `${c.tpaName} · ${c.patientName}`);
      },
      updateTpaClaim: (id, patch) => set((st) => ({ tpaClaims: st.tpaClaims.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      addMouClient: (c) => set((st) => ({ mouClients: [{ ...c, id: uid("MOU"), createdAt: new Date().toISOString() }, ...st.mouClients] })),
      addCorporateBill: (b) => set((st) => ({ corporateBills: [{ ...b, id: uid("CB"), createdAt: new Date().toISOString() }, ...st.corporateBills] })),
      setCorporateBillStatus: (id, status) => set((st) => ({ corporateBills: st.corporateBills.map((b) => (b.id === id ? { ...b, status } : b)) })),
      addCommissionPayout: (doctorId, mk, amountPaise) => {
        set((st) => ({ commissionPayouts: [...st.commissionPayouts, { id: uid("CP"), doctorId, monthKey: mk, amountPaise, paidAt: new Date().toISOString() }] }));
        get().log("commission.payout", `${get().doctors.find((d) => d.id === doctorId)?.name ?? doctorId} · ${mk}`);
      },

      /* ---------- appointments ---------- */
      addAppointment: (a) => set((st) => ({ appointments: [...st.appointments, { ...a, id: uid("AP") }] })),
      setAppointmentStatus: (id, status) => set((st) => ({ appointments: st.appointments.map((a) => (a.id === id ? { ...a, status } : a)) })),
      addHomeVisit: (v) => set((st) => ({ homeVisits: [...st.homeVisits, { ...v, id: uid("HV") }] })),
      setHomeVisitStatus: (id, status) => set((st) => ({ homeVisits: st.homeVisits.map((v) => (v.id === id ? { ...v, status } : v)) })),

      /* ---------- inventory ---------- */
      addReagent: (r) => set((st) => ({ reagents: [...st.reagents, { ...r, id: uid("RG") }] })),
      moveStock: (reagentId, delta, reason) => {
        set((st) => ({
          reagents: st.reagents.map((r) => (r.id === reagentId ? { ...r, stockQty: Math.max(0, r.stockQty + delta) } : r)),
          stockMovements: [{ id: uid("SM"), reagentId, delta, reason, at: new Date().toISOString() }, ...st.stockMovements],
        }));
      },
      addSupplier: (s) => set((st) => ({ suppliers: [...st.suppliers, { ...s, id: uid("SP") }] })),

      /* ---------- quality ---------- */
      addQcLog: (q) => set((st) => ({ qcLogs: [{ ...q, id: uid("QC") }, ...st.qcLogs] })),
      addTemperatureLog: (t) => set((st) => ({ temperatureLogs: [{ ...t, id: uid("TL") }, ...st.temperatureLogs] })),
      addCalibration: (c) => set((st) => ({ calibrations: [{ ...c, id: uid("CAL") }, ...st.calibrations] })),
      updateCalibration: (id, patch) => set((st) => ({ calibrations: st.calibrations.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      addSop: (s) => set((st) => ({ sops: [{ ...s, id: uid("SOP") }, ...st.sops] })),

      /* ---------- audit ---------- */
      log: (action, detail) => {
        const user = get().currentUserName();
        set((st) => ({ audit: [{ id: uid("AU"), at: new Date().toISOString(), user, action, detail }, ...st.audit].slice(0, 2000) }));
      },

      /* ---------- lookups ---------- */
      getPatient: (id) => get().patients.find((p) => p.id === id),
      getDoctor: (id) => (id ? get().doctors.find((d) => d.id === id) : undefined),
      getOrder: (id) => get().orders.find((o) => o.id === id),
    }),
    {
      name: "medx-store-v1",
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          if (window.medx) return window.medx.getStore(name);
          return localStorage.getItem(name);
        },
        setItem: (name, value) => {
          // The counter display window is read-only: persisting its stale
          // snapshot would overwrite newer data saved by the main window.
          if (IS_DISPLAY_WINDOW) return;
          if (window.medx) return window.medx.setStore(name, value);
          localStorage.setItem(name, value);
        },
        removeItem: (name) => {
          if (IS_DISPLAY_WINDOW) return;
          if (window.medx) return window.medx.removeStore(name);
          localStorage.removeItem(name);
        }
      }))
    },
  ),
);

export function orderPaidPaise(o: Order): number {
  return o.payments.filter((p) => p.mode !== "Due").reduce((s, p) => s + p.amountPaise, 0);
}
export function orderDuePaise(o: Order): number {
  return Math.max(0, o.grandTotalPaise - orderPaidPaise(o));
}

// Auto-run license token verification on startup
if (typeof window !== "undefined") {
  const checkLicense = async () => {
    try {
      const token = useStore.getState().licenseToken;
      if (token) {
        const verified = await verifyLicenseToken(token);
        if (verified) {
          useStore.setState({ activeLicense: verified });
          console.log(`✓ Active license verified: ${verified.tier} Tier for ${verified.labName}`);
          // Check-in heartbeat: revocation check + renewal/message delivery
          checkLicenseHeartbeat(verified.licenseKey, token, {
            onRevoked: (reason) => {
              useStore.setState({ licenseToken: "", activeLicense: null });
              alert(reason || "Your MedX License key has been revoked by the system administrator.");
            },
            onTokenRefresh: (newToken, license) => {
              useStore.setState({ licenseToken: newToken, activeLicense: license });
              console.log(`✓ License refreshed by vendor: ${license.tier} tier, valid until ${license.validUntil}`);
            },
            onMessage: (message) => useStore.setState({ adminNotice: message }),
          });
        } else {
          useStore.setState({ licenseToken: "", activeLicense: null });
          console.warn("⚠️ Stored license token failed verification.");
        }
      }
    } catch (err) {
      console.error("Startup license check failed:", err);
    }
  };

  // Run validation when Zustand hydration finishes, or immediately if already hydrated
  if (useStore.persist?.hasHydrated()) {
    checkLicense();
  } else {
    const unsub = useStore.persist?.onFinishHydration(() => {
      checkLicense();
      unsub();
    });
  }

  // Backup timer in case onFinishHydration triggers early or is bypassed
  setTimeout(() => {
    checkLicense();
  }, 1000);

  // Bind TCP Interfacing event receiver callback
  setTimeout(() => {
    if (window.medx?.onAnalyzerRawData) {
      window.medx.onAnalyzerRawData((raw) => {
        try {
          const parsed = parseAnalyzerFrame(raw);
          if (parsed) {
            useStore.getState().importAnalyzerResults(parsed.barcode, parsed.results, raw, parsed.protocol);
            console.log(`✓ Automatically imported machine results from ${parsed.protocol} for barcode: ${parsed.barcode}`);
          } else {
            console.warn("⚠️ Received analyzer data could not be parsed successfully.", raw);
          }
        } catch (err) {
          console.error("Error handling incoming analyzer stream:", err);
        }
      });
    }
  }, 300);
}
