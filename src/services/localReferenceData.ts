// Local reference data from Excel file
export const organizations = [
  { id: '1PWR LESOTHO', name: '1PWR LESOTHO', isActive: true },
  { id: 'SMP', name: 'SMP', isActive: true },
  { id: 'PUECO', name: 'PUECO', isActive: true }
];

// SMP-specific departments
const smpDepartments = [
  { id: "smp_operations", name: "Operations", isActive: true, organization: "SMP" },
  { id: "smp_engineering", name: "Engineering", isActive: true, organization: "SMP" },
  { id: "smp_finance", name: "Finance", isActive: true, organization: "SMP" },
  { id: "smp_procurement", name: "Procurement", isActive: true, organization: "SMP" },
  { id: "smp_hr", name: "HR", isActive: true, organization: "SMP" }
];

// SMP-specific project categories
const smpProjectCategories = [
  { id: "smp_maintenance", name: "Maintenance", isActive: true, organization: "SMP" },
  { id: "smp_expansion", name: "Expansion", isActive: true, organization: "SMP" },
  { id: "smp_operations", name: "Operations", isActive: true, organization: "SMP" }
];

// SMP-specific sites
const smpSites = [
  { id: "smp_factory", name: "Factory", code: "FAC", isActive: true, organization: "SMP" },
  { id: "smp_warehouse", name: "Warehouse", code: "WH", isActive: true, organization: "SMP" },
  { id: "smp_office", name: "Head Office", code: "HO", isActive: true, organization: "SMP" }
];

// Combine all reference data
export const departments = [
  { id: "c_level", name: "C Level", isActive: true, organization: "1PWR LESOTHO" },
  { id: "dpo", name: "DPO", isActive: true, organization: "1PWR LESOTHO" },
  { id: "project_management", name: "Project Management", isActive: true, organization: "1PWR LESOTHO" },
  { id: "engineering", name: "Engineering", isActive: true, organization: "1PWR LESOTHO" },
  { id: "procurement", name: "Procurement", isActive: true, organization: "1PWR LESOTHO" },
  { id: "finance", name: "Finance", isActive: true, organization: "1PWR LESOTHO" },
  { id: "hr", name: "HR", isActive: true, organization: "1PWR LESOTHO" },
  { id: "legal", name: "Legal", isActive: true, organization: "1PWR LESOTHO" },
  { id: "it", name: "IT", isActive: true, organization: "1PWR LESOTHO" },
  { id: "operations", name: "Operations", isActive: true, organization: "1PWR LESOTHO" },
  { id: "ehs", name: "EHS", isActive: true, organization: "1PWR LESOTHO" },
  { id: "communications", name: "Communications", isActive: true, organization: "1PWR LESOTHO" }
];

export const projectCategories = [
  { id: "1:20mw", name: "1:20MW", isActive: true, organization: "1PWR LESOTHO" },
  { id: "2:engineering_randd", name: "2:Engineering R&D", isActive: true, organization: "1PWR LESOTHO" },
  { id: "4:minigrids", name: "4:Minigrids", isActive: true, organization: "1PWR LESOTHO" },
  { id: "5:general", name: "5:General", isActive: true, organization: "1PWR LESOTHO" }
];

export const sites = [
  { id: "ha_makebe", name: "Ha Makebe", code: "MAK", isActive: true, organization: "1PWR LESOTHO" },
  { id: "ha_raliemere", name: "Ha Raliemere", code: "RAL", isActive: true, organization: "1PWR LESOTHO" },
  { id: "tosing", name: "Tosing", code: "TOS", isActive: true, organization: "1PWR LESOTHO" },
  { id: "sebapala", name: "Sebapala", code: "SEB", isActive: true, organization: "1PWR LESOTHO" },
  { id: "sehlabathebe", name: "Sehlabathebe", code: "SEH", isActive: true, organization: "1PWR LESOTHO" },
  { id: "sehonghong", name: "Sehonghong", code: "SHG", isActive: true, organization: "1PWR LESOTHO" },
  { id: "mashai", name: "Mashai", code: "MAS", isActive: true, organization: "1PWR LESOTHO" },
  { id: "matsoaing", name: "Matsoaing", code: "MAT", isActive: true, organization: "1PWR LESOTHO" },
  { id: "lebakeng", name: "Lebakeng", code: "LEB", isActive: true, organization: "1PWR LESOTHO" },
  { id: "tlhanyaku", name: "Tlhanyaku", code: "TLH", isActive: true, organization: "1PWR LESOTHO" },
  { id: "ribaneng", name: "Ribaneng", code: "RIB", isActive: true, organization: "1PWR LESOTHO" },
  { id: "ketane", name: "Ketane", code: "KET", isActive: true, organization: "1PWR LESOTHO" },
  { id: "ha_nkau", name: "Ha Nkau", code: "NKU", isActive: true, organization: "1PWR LESOTHO" },
  { id: "methalaneng", name: "Methalaneng", code: "MET", isActive: true, organization: "1PWR LESOTHO" },
  { id: "manamaneng", name: "Manamaneng", code: "MAN", isActive: true, organization: "1PWR LESOTHO" },
  { id: "bobete", name: "Bobete", code: "BOB", isActive: true, organization: "1PWR LESOTHO" },
  { id: "1pwr_headquarters", name: "1PWR Headquarters", code: "HQ", isActive: true, organization: "1PWR LESOTHO" }
];

export const expenseTypes = [
  { id: "audit_+_accounting_fees", name: "1 - Audit + Accounting Fees", code: "1", isActive: true, organization: "1PWR LESOTHO" },
  { id: "bank_fees", name: "2 - Bank Fees", code: "2", isActive: true, organization: "1PWR LESOTHO" },
  { id: "materials_and_supplies_(including_fees_to_clearing_agents)", name: "3A - Materials and supplies (including fees to clearing agents)", code: "3A", isActive: true, organization: "1PWR LESOTHO" },
  { id: "materials_and_supplies_-_ehs_items_(other_than_ppe)", name: "3B - Materials and supplies - EHS items (other than PPE)", code: "3B", isActive: true, organization: "1PWR LESOTHO" },
  { id: "materials_and_supplies_-_ppe_(only_group_issue:_goggles,_hard_hats,_gloves)", name: "3C - Materials and supplies - PPE (ONLY group issue: goggles, hard hats, gloves)", code: "3C", isActive: true, organization: "1PWR LESOTHO" },
  { id: "vehicle", name: "4 - Vehicle", code: "4", isActive: true, organization: "1PWR LESOTHO" },
  { id: "office_supplies_-_except_it_items", name: "5A - Office Supplies - except IT items", code: "5A", isActive: true, organization: "1PWR LESOTHO" },
  { id: "office_supplies_-_it_items_(keyboard,_mouse,_usb_stick,_phone,_tablet,_etc.)", name: "5B - Office Supplies - IT items (keyboard, mouse, USB stick, phone, tablet, etc.)", code: "5B", isActive: true, organization: "1PWR LESOTHO" },
  { id: "training", name: "6 - Training", code: "6", isActive: true, organization: "1PWR LESOTHO" },
  { id: "communications", name: "7 - Communications", code: "7", isActive: true, organization: "1PWR LESOTHO" },
  { id: "postage_+_shipping", name: "8 - Postage + Shipping", code: "8", isActive: true, organization: "1PWR LESOTHO" },
  { id: "travel_(includes_accommodation,_meals,_tolls)", name: "9 - Travel (includes accommodation, meals, tolls)", code: "9", isActive: true, organization: "1PWR LESOTHO" },
  { id: "insurance", name: "10 - Insurance", code: "10", isActive: true, organization: "1PWR LESOTHO" },
  { id: "fuel", name: "11 - Fuel", code: "11", isActive: true, organization: "1PWR LESOTHO" },
  { id: "legal_fees", name: "12 - Legal fees", code: "12", isActive: true, organization: "1PWR LESOTHO" },
  { id: "license_and_permits", name: "13 - License and permits", code: "13", isActive: true, organization: "1PWR LESOTHO" },
  { id: "rent", name: "14 - Rent", code: "14", isActive: true, organization: "1PWR LESOTHO" },
  { id: "salaries_and_wages", name: "15 - Salaries and wages", code: "15", isActive: true, organization: "1PWR LESOTHO" },
  { id: "general", name: "16 - General", code: "16", isActive: true, organization: "1PWR LESOTHO" },
  { id: "equipment_(including_computers,_electric_tools,_generators,_etc.)_-_should_be_>_m_2000", name: "17A - Equipment (including computers, electric tools, generators, etc.) - should be > M 2000", code: "17A", isActive: true, organization: "1PWR LESOTHO" },
  { id: "parts_for_constructing_an_asset_(parts_for_pv_tracker,_minigrid_infrastructure)", name: "17B - Parts for constructing an asset (parts for PV tracker, minigrid infrastructure)", code: "17B", isActive: true, organization: "1PWR LESOTHO" },
  { id: "sub-contractors", name: "18 - Sub-contractors", code: "18", isActive: true, organization: "1PWR LESOTHO" },
  { id: "reimbursable", name: "19 - Reimbursable", code: "19", isActive: true, organization: "1PWR LESOTHO" },
  { id: "vat_(paid_to_sars_or_lra_for_clearing)", name: "220 - VAT (paid to SARS or LRA for clearing)", code: "220", isActive: true, organization: "1PWR LESOTHO" },
  { id: "equipment_rental", name: "26 - Equipment rental", code: "26", isActive: true, organization: "1PWR LESOTHO" },
  { id: "meals_and_meetings", name: "28 - Meals and meetings", code: "28", isActive: true, organization: "1PWR LESOTHO" },
  { id: "utilities_(lec,_lewa)", name: "30 - Utilities (LEC, LEWA)", code: "30", isActive: true, organization: "1PWR LESOTHO" },
  { id: "property_maintenance_(lndc_factory,_minigrid_powerhouse)", name: "31 - Property maintenance (LNDC factory, minigrid powerhouse)", code: "31", isActive: true, organization: "1PWR LESOTHO" },
  { id: "other", name: "X - Other", code: "X", isActive: true, organization: "1PWR LESOTHO" }
];

export const vehicles = [
  { id: "36", name: "36", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "compressor", name: "Compressor", registration: "", isActive: true, organization: "1PWR LESOTHO" },
  { id: "drill_rig", name: "Drill rig", registration: "", isActive: true, organization: "1PWR LESOTHO" },
  { id: "forklift", name: "Forklift", registration: "", isActive: true, organization: "1PWR LESOTHO" },
  { id: "generator", name: "Generator", registration: "", isActive: true, organization: "1PWR LESOTHO" },
  { id: "isuzu", name: "Isuzu", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "land_cruiser", name: "Land Cruiser", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "mazda", name: "Mazda", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "mercedes_benz", name: "Mercedes Benz", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "nissan", name: "Nissan", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "toyota", name: "Toyota", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "trailer", name: "Trailer", registration: "", isActive: true, organization: "1PWR LESOTHO" },
  { id: "truck", name: "Truck", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" },
  { id: "van", name: "Van", registration: "RLL415J", isActive: true, organization: "1PWR LESOTHO" }
];

export const vendors = [
  { id: "other", name: "Other", isActive: true, organization: "1PWR LESOTHO" },
  { id: "herholdts", name: "Herholdts", isActive: true, organization: "1PWR LESOTHO" },
  { id: "revenue_services_lesotho", name: "Revenue Services Lesotho", isActive: true, organization: "1PWR LESOTHO" },
  { id: "lesotho_electricity_company", name: "Lesotho Electricity Company", isActive: true, organization: "1PWR LESOTHO" },
  { id: "vodacom_lesotho", name: "Vodacom Lesotho", isActive: true, organization: "1PWR LESOTHO" },
  { id: "econet", name: "Econet", isActive: true, organization: "1PWR LESOTHO" },
  { id: "afrox", name: "Afrox", isActive: true, organization: "1PWR LESOTHO" },
  { id: "vyfster", name: "Vyfster", isActive: true, organization: "1PWR LESOTHO" },
  { id: "thetsane_hardware", name: "Thetsane Hardware", isActive: true, organization: "1PWR LESOTHO" },
  { id: "bbcdc", name: "BBCDC", isActive: true, organization: "1PWR LESOTHO" }
];

export const approvers = [
  { id: "smp_manager", name: "SMP Manager", role: "MANAGER", isActive: true, organization: "SMP" },
  { id: "smp_director", name: "SMP Director", role: "DIRECTOR", isActive: true, organization: "SMP" },
];

export const currencies = [
  { id: "lsl", name: "Lesotho Loti", code: "LSL", isActive: true, organization: "1PWR LESOTHO" },
  { id: "zar", name: "South African Rand", code: "ZAR", isActive: true, organization: "1PWR LESOTHO" },
  { id: "usd", name: "US Dollar", code: "USD", isActive: true, organization: "1PWR LESOTHO" },
  { id: "eur", name: "Euro", code: "EUR", isActive: true, organization: "1PWR LESOTHO" },
  { id: "gbp", name: "British Pound", code: "GBP", isActive: true, organization: "1PWR LESOTHO" }
];
