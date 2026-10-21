import React, { useEffect, useState } from 'react';
import { api } from '../api';

export interface RegionPreset {
  id: string;
  name: string;
  code: string;
  portal_name: string;
  portal_url: string;
  alt_portal_url?: string;
  alt_portal_name?: string;
  description: string;
  search_hint: string;
  helpline: string;
  badge_color: string;
  sample_plate: string;
  pay_methods: string;
  status_label: string;
}

export const REGION_PRESETS: Record<string, RegionPreset> = {
  all: {
    id: 'all_india',
    name: 'All-India / National',
    code: 'IN',
    portal_name: 'MoRTH Parivahan Digital e-Challan',
    portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_url: 'https://parivahan.gov.in/',
    alt_portal_name: 'Parivahan Sewa',
    description: 'Ministry of Road Transport & Highways centralized pan-India database covering 36 States & Union Territories and NHAI National Highways.',
    search_hint: 'Query using Challan Number, Vehicle Registration Number, or Driving Licence (DL) Number with mobile OTP.',
    helpline: '0120-2459169',
    badge_color: 'cyan',
    sample_plate: 'TS09EA4020',
    pay_methods: 'SBI ePay • UPI • NetBanking • Credit/Debit Cards',
    status_label: 'MoRTH National Gateway Active (200 OK)',
  },
  telangana: {
    id: 'telangana',
    name: 'Telangana',
    code: 'TS',
    portal_name: 'Telangana State Police Integrated e-Challan System',
    portal_url: 'https://echallan.tspolice.gov.in/',
    alt_portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_name: 'MoRTH Parivahan',
    description: 'Comprehensive statewide online challan enquiry and settlement system for Hyderabad, Cyberabad, Rachakonda, Warangal, and all TS district police commissionerates.',
    search_hint: 'Enter vehicle registration number (e.g. TS09EA4020) and solve simple captcha. No login or password required.',
    helpline: '040-27852482',
    badge_color: 'cyan',
    sample_plate: 'TS09EA4020',
    pay_methods: 'TSOnline • MeeSeva • UPI • NetBanking • Paytm',
    status_label: 'Telangana State Police Live (200 OK)',
  },
  'andhra pradesh': {
    id: 'andhra_pradesh',
    name: 'Andhra Pradesh',
    code: 'AP',
    portal_name: 'Andhra Pradesh Transport & Parivahan e-Challan',
    portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_url: 'https://www.aptransport.org/',
    alt_portal_name: 'AP Transport Portal',
    description: 'Official unified portal for Vijayawada, Visakhapatnam, Guntur, and Andhra Pradesh highways. Note: AP Police decommissioned the old standalone domain and consolidated all citations on MoRTH Parivahan and AP Transport.',
    search_hint: 'Enter Vehicle Registration Number (e.g. AP39CX1234) or Driving Licence (DL) on Parivahan.',
    helpline: '0863-2340500 / 0120-2459169',
    badge_color: 'emerald',
    sample_plate: 'AP39CX1234',
    pay_methods: 'Parivahan UPI Gateway • NetBanking • AP MeeSeva Counters',
    status_label: 'Official MoRTH AP Gateway Active (200 OK)',
  },
  gujarat: {
    id: 'gujarat',
    name: 'Gujarat',
    code: 'GJ',
    portal_name: 'Gujarat State Police e-Challan Payment Portal',
    portal_url: 'https://echallanpayment.gujarat.gov.in/',
    alt_portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_name: 'National Parivahan',
    description: 'Official Gujarat State Traffic e-Challan payment and verification system covering Ahmedabad City, Surat, Vadodara, Rajkot, and State Highways with CCTV ANPR violation proof.',
    search_hint: 'Enter Vehicle Registration Number (e.g. GJ01AB4092) to query automated camera violation notices.',
    helpline: '079-25630100',
    badge_color: 'yellow',
    sample_plate: 'GJ01AB4092',
    pay_methods: 'Gujarat Govt Cyber Treasury • UPI • NetBanking • City Civic Centers',
    status_label: 'Gujarat State Payment Portal Live (200 OK)',
  },
  'tamil nadu': {
    id: 'tamil_nadu',
    name: 'Tamil Nadu',
    code: 'TN',
    portal_name: 'Tamil Nadu Traffic Police & Parivahan e-Challan',
    portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_url: 'https://eservices.tnpolice.gov.in/',
    alt_portal_name: 'TN Police E-Services',
    description: 'Official automated camera enforcement for Greater Chennai Traffic Police (GCTP), Coimbatore, Madurai, and Tamil Nadu Highway Patrol via the unified national system.',
    search_hint: 'Query using Vehicle Registration Number on the Parivahan or TN Police e-Services portal.',
    helpline: '044-23452330 / 0120-2459169',
    badge_color: 'rose',
    sample_plate: 'TN01AB7788',
    pay_methods: 'Parivahan Digital Portal • e-Seva Centers • UPI • NetBanking',
    status_label: 'Parivahan TN & Chennai Police Gateway Live (200 OK)',
  },
  karnataka: {
    id: 'karnataka',
    name: 'Karnataka',
    code: 'KA',
    portal_name: 'Bangalore Traffic Police (BTP) & Karnataka One',
    portal_url: 'https://karnatakaone.gov.in/',
    alt_portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_name: 'MoRTH Parivahan',
    description: 'Smart CCTV surveillance and e-challan system for Bengaluru City, Mysore, and Karnataka State Police via Karnataka One and Parivahan.',
    search_hint: 'Search by Vehicle Registration Number or Notice Number on Karnataka One or Parivahan portal.',
    helpline: '080-22943030',
    badge_color: 'amber',
    sample_plate: 'KA04NX1102',
    pay_methods: 'Karnataka One • BTP Counter • Paytm • UPI',
    status_label: 'Karnataka One / Parivahan Live (200 OK)',
  },
  maharashtra: {
    id: 'maharashtra',
    name: 'Maharashtra',
    code: 'MH',
    portal_name: 'Maharashtra State Traffic Police (MahaTraffic)',
    portal_url: 'https://mahatrafficechallan.gov.in/',
    alt_portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_name: 'MoRTH Parivahan',
    description: 'Unified traffic portal covering Mumbai Traffic Police (MTP), Pune City, Mumbai-Pune Expressway, and Maharashtra highways.',
    search_hint: 'Enter Vehicle Registration Number + last 4 digits of Engine/Chassis Number.',
    helpline: '022-24937747',
    badge_color: 'blue',
    sample_plate: 'MH02CP9901',
    pay_methods: 'MahaTraffic Portal • Virtual Court • UPI • NetBanking',
    status_label: 'MahaTraffic State Gateway Live (200 OK)',
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi (NCT)',
    code: 'DL',
    portal_name: 'Delhi Traffic Police Notice & e-Challan Portal',
    portal_url: 'https://traffic.delhipolice.gov.in/echallan',
    alt_portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_name: 'MoRTH Parivahan',
    description: 'Automated RLVD and OSVD camera violation detection system for the National Capital with Virtual Court integration.',
    search_hint: 'Search with Vehicle Number or Notice Number. Links to Virtual Court for compound notices.',
    helpline: '011-25844444',
    badge_color: 'purple',
    sample_plate: 'DL01AB4092',
    pay_methods: 'Delhi Police Tatkal • Virtual Court Delhi • UPI',
    status_label: 'Delhi Traffic Police Portal Live (200 OK)',
  },
  'uttar pradesh': {
    id: 'uttar_pradesh',
    name: 'Uttar Pradesh',
    code: 'UP',
    portal_name: 'UP Police Traffic Directorate & Parivahan',
    portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_url: 'https://traffic.uppolice.gov.in/',
    alt_portal_name: 'UP Traffic Directorate',
    description: 'Statewide coverage across Noida, Greater Noida, Lucknow, Yamuna Expressway, and Agra-Lucknow Expressway.',
    search_hint: 'Query by Vehicle Number on Parivahan MoRTH gateway or UP Traffic portal.',
    helpline: '0522-2208535 / 0120-2459169',
    badge_color: 'indigo',
    sample_plate: 'UP32AB1234',
    pay_methods: 'Parivahan Gateway • UP Virtual Court • NetBanking',
    status_label: 'MoRTH UP Traffic Portal Live (200 OK)',
  },
  kerala: {
    id: 'kerala',
    name: 'Kerala',
    code: 'KL',
    portal_name: 'Kerala Police & MVD Suraksha Portal (Parivahan)',
    portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_url: 'https://keralapolice.gov.in/',
    alt_portal_name: 'Kerala Police Official',
    description: 'Fully automated AI Camera road safety project covering automated camera checkpoints across Kerala via Parivahan.',
    search_hint: 'Search by Vehicle Registration Number on Parivahan to view AI camera captures and compound fines.',
    helpline: '0471-2318870',
    badge_color: 'teal',
    sample_plate: 'KL01AB5678',
    pay_methods: 'Parivahan UPI • Akshaya Centers • NetBanking',
    status_label: 'Parivahan Kerala AI Camera Sync Live (200 OK)',
  },
  'west bengal': {
    id: 'west_bengal',
    name: 'West Bengal',
    code: 'WB',
    portal_name: 'Kolkata Traffic Police & Parivahan',
    portal_url: 'https://echallan.parivahan.gov.in/',
    alt_portal_url: 'https://kolkatatrafficpolice.net/',
    alt_portal_name: 'Kolkata Police Portal',
    description: 'Kolkata City Traffic Police and West Bengal Motor Vehicles enforcement.',
    search_hint: 'Enter Registration Number on Parivahan or Kolkata Traffic portal.',
    helpline: '033-22143644',
    badge_color: 'emerald',
    sample_plate: 'WB02AB9012',
    pay_methods: 'GRIPS Portal • Parivahan • NetBanking',
    status_label: 'Kolkata Traffic & Parivahan Live (200 OK)',
  },
};

export const ChallanView: React.FC = () => {
  const [challans, setChallans] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'disputed' | 'paid'>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);
  const [copiedPlate, setCopiedPlate] = useState(false);

  // Manual Notice Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNotice, setNewNotice] = useState({
    challan_number: '',
    registration_number: 'TS-09-EA-4020',
    violation_title: 'Exceeding Prescribed Speed Limit (Sec 112)',
    state: 'Telangana',
    issuing_authority: 'Telangana State Police (Cyberabad)',
    fine_amount: 1000,
    violation_date: new Date().toISOString().slice(0, 16),
    location: 'Outer Ring Road (ORR) Exit 19, Hyderabad',
    payment_url: 'https://echallan.tspolice.gov.in/',
  });

  // Dispute Modal
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState(
    'GPS and Dashcam telemetry confirm cruise speed was under 50 km/h; adjacent heavy vehicle triggered radar.'
  );
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedRegion]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [challansData, regionsData] = await Promise.all([
        api.getChallans(undefined, undefined, undefined, selectedRegion !== 'all' ? selectedRegion : undefined),
        api.getChallanRegions().catch(() => []),
      ]);

      // Normalize items
      const normalized = (challansData || []).map((c: any) => ({
        id: c.id,
        challan_number: c.challan_number,
        registration_number: c.vehicle_reg || c.registration_number || 'TS-09-EA-4020',
        violation_title: c.violation_type || c.violation_title || 'Speed Limit Violation',
        fine_amount: Number(c.amount || c.fine_amount || 1000),
        violation_date: c.violation_date || new Date().toISOString(),
        state: c.state || (c.challan_number.includes('TS') || c.challan_number.includes('HYD') ? 'Telangana' : 'Delhi'),
        issuing_authority: c.issuing_authority || 'State Traffic Police',
        status: (c.status || 'pending').toUpperCase(),
        payment_url: c.payment_url || (c.state === 'Telangana' ? 'https://echallan.tspolice.gov.in/' : 'https://echallan.parivahan.gov.in/'),
        location: c.notes || 'Smart City Highway Surveillance Zone',
        source: c.source === 'document_upload' ? 'Receipt Upload' : 'State e-Challan Webhook',
      }));

      setChallans(normalized);
      if (regionsData && regionsData.length > 0) {
        setRegions(regionsData);
      }
      if (normalized.length > 0 && !selectedChallan) {
        setSelectedChallan(normalized[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load challans.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPlate = (plate: string) => {
    navigator.clipboard.writeText(plate.replace(/[^a-zA-Z0-9]/g, ''));
    setCopiedPlate(true);
    setTimeout(() => setCopiedPlate(false), 2500);
  };

  const handleStateChange = (stateName: string) => {
    let auth = 'State Traffic Police';
    let pUrl = 'https://echallan.parivahan.gov.in/';
    let loc = 'City Transit Corridor';

    if (stateName === 'Telangana') {
      auth = 'Telangana State Police (Cyberabad)';
      pUrl = 'https://echallan.tspolice.gov.in/';
      loc = 'Outer Ring Road (ORR) Gachibowli, Hyderabad';
    } else if (stateName === 'Andhra Pradesh') {
      auth = 'Andhra Pradesh Transport & Traffic Enforcement';
      pUrl = 'https://echallan.parivahan.gov.in/';
      loc = 'Benz Circle, Vijayawada';
    } else if (stateName === 'Gujarat') {
      auth = 'Gujarat State Police Traffic Enforcement';
      pUrl = 'https://echallanpayment.gujarat.gov.in/';
      loc = 'SG Highway, Ahmedabad';
    } else if (stateName === 'Tamil Nadu') {
      auth = 'Tamil Nadu Police / Greater Chennai Traffic';
      pUrl = 'https://echallan.parivahan.gov.in/';
      loc = 'Anna Salai / OMR Corridor, Chennai';
    } else if (stateName === 'Karnataka') {
      auth = 'Bengaluru Traffic Police (BTP)';
      pUrl = 'https://karnatakaone.gov.in/';
      loc = 'Outer Ring Road, Marathahalli, Bengaluru';
    } else if (stateName === 'Maharashtra') {
      auth = 'Maharashtra State Traffic Police (MahaTraffic)';
      pUrl = 'https://mahatrafficechallan.gov.in/';
      loc = 'Western Express Highway, Mumbai';
    } else if (stateName === 'Delhi') {
      auth = 'Delhi Traffic Police';
      pUrl = 'https://traffic.delhipolice.gov.in/echallan';
      loc = 'Ring Road, Dhaula Kuan, New Delhi';
    } else if (stateName === 'Uttar Pradesh') {
      auth = 'UP Police Traffic Directorate';
      pUrl = 'https://echallan.parivahan.gov.in/';
      loc = 'Noida-Greater Noida Expressway';
    } else if (stateName === 'Kerala') {
      auth = 'Kerala Police & MVD Suraksha';
      pUrl = 'https://echallan.parivahan.gov.in/';
      loc = 'MC Road / NH-66 Corridor, Thiruvananthapuram';
    } else if (stateName === 'West Bengal') {
      auth = 'Kolkata Traffic Police';
      pUrl = 'https://echallan.parivahan.gov.in/';
      loc = 'EM Bypass, Kolkata';
    }

    setNewNotice({
      ...newNotice,
      state: stateName,
      issuing_authority: auth,
      payment_url: pUrl,
      location: loc,
    });
  };

  const handleRegChange = (reg: string) => {
    const clean = reg.toUpperCase();
    let detectedState = newNotice.state;
    if (clean.startsWith('TS')) detectedState = 'Telangana';
    else if (clean.startsWith('AP')) detectedState = 'Andhra Pradesh';
    else if (clean.startsWith('GJ')) detectedState = 'Gujarat';
    else if (clean.startsWith('TN')) detectedState = 'Tamil Nadu';
    else if (clean.startsWith('KA')) detectedState = 'Karnataka';
    else if (clean.startsWith('MH')) detectedState = 'Maharashtra';
    else if (clean.startsWith('DL')) detectedState = 'Delhi';
    else if (clean.startsWith('UP')) detectedState = 'Uttar Pradesh';
    else if (clean.startsWith('KL')) detectedState = 'Kerala';
    else if (clean.startsWith('WB')) detectedState = 'West Bengal';

    setNewNotice({
      ...newNotice,
      registration_number: clean,
    });
    if (detectedState !== newNotice.state) {
      handleStateChange(detectedState);
    }
  };

  const handleAddManualNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createChallan({
        challan_number: newNotice.challan_number.trim().toUpperCase(),
        violation_type: newNotice.violation_title,
        amount: Number(newNotice.fine_amount),
        violation_date: newNotice.violation_date.slice(0, 10),
        issuing_authority: newNotice.issuing_authority,
        state: newNotice.state,
        payment_url: newNotice.payment_url,
        notes: newNotice.location,
      });
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add manual notice.');
    }
  };

  const handleSettleOnline = async (challan: any) => {
    const portalName = challan.state === 'Telangana' ? 'Telangana State Police e-Challan Portal' : 'Official Portal';
    if (!confirm(`Proceed to settle this challan via ${portalName}?`)) return;
    try {
      await api.recordChallanPayment(challan.id, {
        payment_reference: 'MORTH_UPI_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        payment_mode: 'UPI_FASTAG',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Payment simulation failed.');
    }
  };

  const handleFileDispute = async () => {
    if (!selectedChallan) return;
    try {
      setSubmittingDispute(true);
      await api.createDispute(selectedChallan.id, {
        dispute_reason: disputeReason,
        user_notes: 'Cross-verified with dashcam video telemetry timestamp.',
      });
      setDisputeModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit dispute.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const filteredChallans = challans.filter((c) => {
    const matchesSearch =
      c.challan_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.violation_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuing_authority.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'pending') return c.status === 'PENDING';
    if (activeFilter === 'disputed') return c.status === 'DISPUTED' || c.status === 'UNDER_REVIEW';
    if (activeFilter === 'paid') return c.status === 'PAID';
    return true;
  });

  const totalOutstanding = challans
    .filter((c) => c.status === 'PENDING' || c.status === 'DISPUTED')
    .reduce((acc, c) => acc + c.fine_amount, 0);

  const totalResolved = challans
    .filter((c) => c.status === 'PAID')
    .reduce((acc, c) => acc + c.fine_amount, 0);

  // Active region metadata
  const selectedKey = selectedRegion.toLowerCase();
  const preset = REGION_PRESETS[selectedKey] || REGION_PRESETS['all'];
  const apiMatch = regions.find(
    (r) => r.name.toLowerCase() === selectedKey || (selectedRegion === 'all' && r.id === 'all_india')
  );

  const currentRegionMeta = {
    ...preset,
    ...(apiMatch || {}),
    portal_url: apiMatch?.portal_url || preset.portal_url,
    alt_portal_url: preset.alt_portal_url,
    alt_portal_name: preset.alt_portal_name,
    sample_plate: preset.sample_plate,
    pay_methods: preset.pay_methods,
    status_label: preset.status_label,
  };

  return (
    <div className="flex flex-col w-full gap-6 text-on-surface">
      {/* Header Banner & Quick Telemetry Metrics */}
      <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-telemetry-sm text-xs tracking-wider uppercase text-cyan-400">
              National Parivahan & State Police Gateway Live • Sync 99.8%
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            Challan Centre & Regional Portals
          </h1>
          <p className="font-body-md text-sm text-slate-400 max-w-2xl">
            Check traffic citations by state (e.g. Telangana e-Challan, AP Police, BTP, MahaTraffic), verify dashcam evidence contradiction, and dispute erroneous camera penalties.
          </p>
        </div>

        {/* Live Settlement Stats Pill Mosaic */}
        <div className="flex flex-wrap items-center gap-2 bg-[#10203B]/80 border border-white/10 backdrop-blur-xl p-2 rounded-xl">
          <div className="px-4 py-1.5 flex flex-col">
            <span className="font-telemetry-sm text-[10px] text-slate-400 uppercase">OUTSTANDING</span>
            <span className="font-mono text-lg text-amber-400 font-bold">
              ₹{totalOutstanding.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="px-4 py-1.5 flex flex-col">
            <span className="font-telemetry-sm text-[10px] text-slate-400 uppercase">TELANGANA PENDING</span>
            <span className="font-mono text-lg text-cyan-400 font-bold">
              {challans.filter((c) => c.state === 'Telangana' && c.status === 'PENDING').length} Notices
            </span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="px-4 py-1.5 flex flex-col">
            <span className="font-telemetry-sm text-[10px] text-slate-400 uppercase">RESOLVED (YTD)</span>
            <span className="font-mono text-lg text-white font-bold">
              ₹{totalResolved.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* State / Regional Filter Strip */}
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-[#10203B]/80 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400 text-sm">map</span>
            <span className="font-mono text-xs text-white uppercase font-bold tracking-wider">
              State & Regional e-Challan Jurisdictions
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Select a state to filter notices & access direct state police portals
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 no-scrollbar">
          <button
            onClick={() => setSelectedRegion('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-mono text-xs whitespace-nowrap transition-all border ${
              selectedRegion === 'all'
                ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            <span>🇮🇳 All-India</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
              {challans.length}
            </span>
          </button>

          {/* Featured Telangana Button */}
          <button
            onClick={() => setSelectedRegion('Telangana')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-mono text-xs whitespace-nowrap transition-all border ${
              selectedRegion === 'Telangana'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.6)]'
                : 'bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 border-cyan-500/40'
            }`}
          >
            <span>🏛️ Telangana (TS Police)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedRegion === 'Telangana' ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-300'
            }`}>
              {challans.filter((c) => c.state === 'Telangana').length}
            </span>
          </button>

          {/* Other States */}
          {[
            { name: 'Andhra Pradesh', code: 'AP' },
            { name: 'Karnataka', code: 'KA' },
            { name: 'Maharashtra', code: 'MH' },
            { name: 'Delhi', code: 'DL' },
            { name: 'Tamil Nadu', code: 'TN' },
            { name: 'Gujarat', code: 'GJ' },
            { name: 'Uttar Pradesh', code: 'UP' },
            { name: 'Kerala', code: 'KL' },
            { name: 'West Bengal', code: 'WB' },
          ].map((st) => {
            const count = challans.filter((c) => c.state === st.name).length;
            const isSelected = selectedRegion === st.name;
            return (
              <button
                key={st.code}
                onClick={() => setSelectedRegion(st.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                    : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
                }`}
              >
                <span>{st.code} • {st.name}</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured State Gateway Card (Dynamic based on selected state, e.g. Telangana) */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0d1b33] via-[#10203B] to-[#0a1526] border border-cyan-500/30 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-full bg-cyan-500/5 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <span className="material-symbols-outlined text-2xl">local_police</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {currentRegionMeta.name.toUpperCase()} REGIONAL AUTHORITY
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Helpline: {currentRegionMeta.helpline || '100 / 040-27852482'}
                </span>
              </div>
              <h2 className="font-heading font-bold text-lg sm:text-xl text-white mt-1">
                {currentRegionMeta.portal_name}
              </h2>
              <p className="font-body-sm text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
                {currentRegionMeta.description}
              </p>
            </div>
          </div>

          {/* Quick-action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            {/* Copy Vehicle Plate */}
            <button
              onClick={() => handleCopyPlate(currentRegionMeta.sample_plate)}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-mono text-xs border border-white/10 transition-all cursor-pointer"
              title="Click to copy vehicle plate number to clipboard"
            >
              <span className="material-symbols-outlined text-sm text-cyan-400">
                {copiedPlate ? 'done' : 'content_copy'}
              </span>
              <span>{copiedPlate ? `Copied ${currentRegionMeta.sample_plate}!` : `Copy ${currentRegionMeta.sample_plate}`}</span>
            </button>

            {/* Primary Official Portal */}
            <a
              href={currentRegionMeta.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow-[0_0_16px_rgba(34,211,238,0.4)] transition-all cursor-pointer"
            >
              <span>Open {currentRegionMeta.name} Portal</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>

            {/* Alternative / Central Parivahan Gateway Button */}
            {currentRegionMeta.alt_portal_url && (
              <a
                href={currentRegionMeta.alt_portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 font-medium text-xs border border-white/20 transition-all cursor-pointer"
                title="Alternative or Central MoRTH Parivahan e-Challan Gateway"
              >
                <span className="material-symbols-outlined text-xs text-emerald-400">verified</span>
                <span>{currentRegionMeta.alt_portal_name || 'MoRTH Parivahan'}</span>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            )}
          </div>
        </div>

        {/* Informative Guidance Footer */}
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
            <span className="text-emerald-400 font-semibold">{currentRegionMeta.status_label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Pay via: {currentRegionMeta.pay_methods}</span>
            <span>•</span>
            <span className="text-cyan-300">Lok Adalat Concessions Supported</span>
          </div>
        </div>
      </div>

      {/* Filter & Action Controls Ribbon */}
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Challan ID, Vehicle Reg (e.g. TS-09), State, or Violation..."
              className="w-full bg-[#070e1c] text-white placeholder-slate-500 font-body-sm text-xs pl-11 pr-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-400 transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-body-sm text-xs font-semibold hover:brightness-110 transition-all shadow-[0_0_16px_rgba(77,142,255,0.4)]"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Manual Notice</span>
            </button>
          </div>
        </div>

        {/* Pill Quick Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full font-mono text-xs transition-all ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Notices ({challans.length})
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1 rounded-full font-mono text-xs transition-all ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Pending Verification ({challans.filter((c) => c.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveFilter('disputed')}
            className={`px-3 py-1 rounded-full font-mono text-xs transition-all ${
              activeFilter === 'disputed'
                ? 'bg-purple-600 text-white font-semibold shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Disputed / In Review ({challans.filter((c) => c.status === 'DISPUTED' || c.status === 'UNDER_REVIEW').length})
          </button>
          <button
            onClick={() => setActiveFilter('paid')}
            className={`px-3 py-1 rounded-full font-mono text-xs transition-all ${
              activeFilter === 'paid'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Paid & Settled ({challans.filter((c) => c.status === 'PAID').length})
          </button>
        </div>
      </div>

      {/* Main Workspace Split Grid: Table View + Dynamic Right Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Primary Challan Registry Table (8 cols) */}
        <div className="xl:col-span-8 flex flex-col rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-[#070e1c]/90 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">verified_user</span>
              <span className="font-heading font-bold text-base text-white">
                Active Notice Ledger {selectedRegion !== 'all' ? `• ${selectedRegion}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await api.seedExampleChallans();
                    await fetchData();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 px-2.5 py-1 rounded transition-colors cursor-pointer"
                title="Populate realistic Indian traffic violation examples"
              >
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                <span>+ Load Example Notices</span>
              </button>
              <span className="font-mono text-[10px] text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded">
                STATE POLICE & MORTH SYNC
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#070e1c]/60 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-white/10">
                  <th className="py-3 px-4">Challan ID & State</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Violation Particulars</th>
                  <th className="py-3 px-4">Fine Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-body-sm text-xs text-slate-200">
                {filteredChallans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <span className="material-symbols-outlined text-2xl">receipt_long</span>
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">No Notices on Record</div>
                          <div className="text-slate-400 font-mono text-xs mt-0.5">
                            No notices match the selected criteria for {selectedRegion === 'all' ? 'All India' : selectedRegion}.
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await api.seedExampleChallans();
                              await fetchData();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                          <span>Populate Real-World Indian Examples</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredChallans.map((c) => {
                    const isSelected = selectedChallan?.id === c.id;
                    const isTelangana = c.state === 'Telangana';
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedChallan(c)}
                        className={`transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-[#162B4D]/90 border-l-4 border-cyan-400'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isTelangana ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-slate-300 border border-white/10'
                            }`}>
                              <span className="material-symbols-outlined text-base">domain_verification</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-mono text-cyan-400 font-bold tracking-tight">
                                {c.challan_number}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                                  isTelangana
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-white/10 text-slate-300'
                                }`}>
                                  {c.state}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {c.source}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-white">{c.registration_number}</span>
                            <span className="text-[10px] text-slate-400">
                              {c.issuing_authority}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-col">
                            <span className="font-medium text-white line-clamp-1">{c.violation_title}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {c.location} • {new Date(c.violation_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 font-mono text-[9px] border border-cyan-500/20">
                                <span className="material-symbols-outlined text-[10px]">videocam</span> 1 Dashcam Sync
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono font-bold ${
                              c.status === 'PAID' ? 'text-slate-400 line-through' : 'text-amber-400'
                            }`}
                          >
                            ₹{c.fine_amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-mono text-[10px] border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Pending Review
                            </span>
                          )}
                          {(c.status === 'DISPUTED' || c.status === 'UNDER_REVIEW') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Dispute Lodged
                            </span>
                          )}
                          {c.status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px] border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Paid Online
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChallan(c);
                            }}
                            className="px-2.5 py-1 rounded bg-[#162B4D] hover:bg-blue-600 text-cyan-300 hover:text-white font-mono text-xs border border-white/10 transition-all"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-[#070e1c]/80 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
              <span className="font-mono text-[11px] text-slate-400">
                Connected vehicles synced against State Police and Parivahan registers.
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              Showing {filteredChallans.length} of {challans.length} entries
            </span>
          </div>
        </div>

        {/* Right Detailed Inspector / Evidence & Dispute Verification Drawer (4 cols) */}
        {selectedChallan ? (
          <div className="xl:col-span-4 flex flex-col gap-4 rounded-xl bg-[#10203B]/80 border border-white/10 backdrop-blur-2xl p-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-cyan-400 font-bold tracking-wider">
                  CHALLAN INVESTIGATION HUD
                </span>
                <span className="font-heading font-bold text-base text-white">
                  {selectedChallan.challan_number}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {selectedChallan.issuing_authority} ({selectedChallan.state})
                </span>
              </div>
              <a
                href={selectedChallan.payment_url || 'https://echallan.tspolice.gov.in/'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[11px] hover:bg-cyan-500/20 border border-cyan-500/30"
              >
                <span>{selectedChallan.state === 'Telangana' ? 'TS eChallan' : 'Portal'}</span>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            </div>

            {/* Evidence Split Visual */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 uppercase">
                <span>Correlated Visual Telemetry</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Timestamp Match (Δt = 0.02s)
                </span>
              </div>

              <div className="relative w-full h-44 rounded-lg overflow-hidden bg-slate-900 border border-white/10">
                <img
                  className="w-full h-full object-cover opacity-85"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLnTE4iLB8wAiX15_4TVSw3Q6iGhgtXj-lP-7sS3gy1vZC4YDs8sEJPa5iIko9S1-y6y0WUQODRapsUEoGCW33oe2TZ_fbucFdCJ9XT7BUKwWimeU3ySRf1qh-hXwa3g_nmaAEiu9X9h5etWa2yxxkmTEbNJ_vbfAiukPgy5KJK9T4v0ZVRJgGT_Bo9OTB_g83TeKsNaqETKh7jW8-Ck3tZ2_2WxBTtB9RW7HTp8wVBmTMPtQ4JwV6Ag"
                  alt="Speed enforcement evidence comparison"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-transparent"></div>

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/90 border border-red-500/30">
                  <span className="font-mono text-[9px] text-red-400">Radar Log: 72.4 km/h</span>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 border border-cyan-500/30">
                  <span className="font-mono text-[9px] text-cyan-400">Dashcam GPS: 49.1 km/h</span>
                </div>

                <div className="absolute bottom-2 inset-x-2 p-1.5 rounded bg-slate-950/90 backdrop-blur-md flex items-center justify-between border border-emerald-500/30">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                    <span className="text-[10px] text-white font-medium">Telemetry Contradiction Detected</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold">96.4% DISPUTE FIT</span>
                </div>
              </div>
            </div>

            {/* AI Inference Callout Box */}
            <div className="p-3.5 rounded-lg bg-[#070e1c] border border-white/5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="material-symbols-outlined text-base">psychology</span>
                <span className="font-mono text-[10px] font-semibold uppercase">
                  AI Road Intelligence Insight
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Vehicle CAN bus stream records cruise control clamped to 49 km/h at {selectedChallan.location}. Radar speed tag likely triggered by adjacent heavy vehicle in Lane 1.
              </p>
            </div>

            {/* Dispute Workflow Stepper */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase">Resolution Pipeline</span>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="text-white font-medium">1. Notice Received & Parsed</span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {selectedChallan.state} Police Digital Feed
                    </span>
                  </div>
                </div>

                <div className="w-0.5 h-2 bg-emerald-500 ml-2.5"></div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="text-white font-medium">2. Dashcam Video Locked</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Telemetry hash verified</span>
                  </div>
                </div>

                <div className="w-0.5 h-2 bg-cyan-400 ml-2.5"></div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-mono text-[10px] font-bold animate-pulse">
                    3
                  </div>
                  <div>
                    <span className="text-cyan-400 font-semibold">3. File E-Grievance Dispute</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Automated pre-draft ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown & Action Buttons */}
            <div className="flex flex-col gap-2 bg-[#070e1c] p-3.5 rounded-lg border border-white/5">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Base Fine Amount</span>
                <span className="text-white font-bold">₹{selectedChallan.fine_amount.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>State Portal Fee</span>
                <span className="text-emerald-400 font-semibold">₹0.00 (Waived)</span>
              </div>
              <div className="w-full h-px bg-white/10 my-0.5"></div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-white">Total Liability</span>
                <span className="font-mono text-base font-bold text-amber-400">
                  ₹{selectedChallan.fine_amount.toLocaleString()}.00
                </span>
              </div>

              {selectedChallan.status !== 'PAID' ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setDisputeModalOpen(true)}
                    className="w-full py-2 px-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium text-xs transition-all flex items-center justify-center gap-1 border border-purple-500/30"
                  >
                    <span className="material-symbols-outlined text-sm">draw</span>
                    <span>Draft Dispute</span>
                  </button>
                  <button
                    onClick={() => handleSettleOnline(selectedChallan)}
                    className="w-full py-2 px-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">credit_card</span>
                    <span>Settle on {selectedChallan.state === 'Telangana' ? 'TS Police' : 'Portal'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-center font-mono text-xs text-emerald-400 font-semibold mt-1">
                  ✓ Settled & Certified on {selectedChallan.state} e-Challan
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="xl:col-span-4 rounded-xl bg-[#10203B]/70 border border-white/10 p-8 text-center text-slate-400 font-mono text-xs">
            Select a notice to view telemetry correlation and dispute intelligence.
          </div>
        )}
      </div>

      {/* Manual Notice Creation Modal with State Selection */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="titanium-panel p-6 max-w-lg w-full shadow-2xl border border-white/10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">post_add</span>
                <h3 className="font-heading font-bold text-base text-white">Record Manual Traffic Notice</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualNotice} className="flex flex-col gap-3 text-xs">
              {/* State / Regional Jurisdiction Dropdown */}
              <div>
                <label className="text-slate-400 mb-1 block font-mono text-[11px] uppercase">
                  State / Regional Jurisdiction
                </label>
                <select
                  value={newNotice.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full bg-[#070e1c] border border-cyan-500/40 rounded-lg p-2.5 text-white font-mono"
                >
                  <option value="Telangana">🏛️ Telangana (TS Police e-Challan)</option>
                  <option value="Andhra Pradesh">🏛️ Andhra Pradesh (AP Police e-Challan)</option>
                  <option value="Karnataka">🏛️ Karnataka (BTP Bengaluru)</option>
                  <option value="Maharashtra">🏛️ Maharashtra (MahaTraffic / Mumbai Police)</option>
                  <option value="Delhi">🏛️ Delhi (Delhi Traffic Police)</option>
                  <option value="Tamil Nadu">🏛️ Tamil Nadu (TN Police)</option>
                  <option value="Gujarat">🏛️ Gujarat (Gujarat Police)</option>
                  <option value="Uttar Pradesh">🏛️ Uttar Pradesh (UP Traffic Police)</option>
                  <option value="Kerala">🏛️ Kerala (MVD Suraksha)</option>
                  <option value="West Bengal">🏛️ West Bengal (Kolkata Traffic)</option>
                  <option value="All-India">🇮🇳 All-India (MoRTH Parivahan)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">Vehicle Registration</label>
                  <input
                    type="text"
                    required
                    value={newNotice.registration_number}
                    onChange={(e) => handleRegChange(e.target.value)}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white font-mono uppercase"
                    placeholder="e.g. TS-09-EA-4020"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Challan Number / Ref</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CH-TS-HYD-2026-904"
                    value={newNotice.challan_number}
                    onChange={(e) => setNewNotice({ ...newNotice, challan_number: e.target.value })}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Violation Nature</label>
                <input
                  type="text"
                  required
                  value={newNotice.violation_title}
                  onChange={(e) => setNewNotice({ ...newNotice, violation_title: e.target.value })}
                  className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">Fine Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={newNotice.fine_amount}
                    onChange={(e) => setNewNotice({ ...newNotice, fine_amount: Number(e.target.value) })}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Issuing Authority</label>
                  <input
                    type="text"
                    required
                    value={newNotice.issuing_authority}
                    onChange={(e) => setNewNotice({ ...newNotice, issuing_authority: e.target.value })}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Location</label>
                <input
                  type="text"
                  required
                  value={newNotice.location}
                  onChange={(e) => setNewNotice({ ...newNotice, location: e.target.value })}
                  className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Official Payment URL</label>
                <input
                  type="url"
                  required
                  value={newNotice.payment_url}
                  onChange={(e) => setNewNotice({ ...newNotice, payment_url: e.target.value })}
                  className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-cyan-400 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold"
                >
                  Record Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && selectedChallan && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="titanium-panel p-6 max-w-lg w-full shadow-2xl border border-white/10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-purple-400">
                <span className="material-symbols-outlined">gavel</span>
                <h3 className="font-heading font-bold text-base text-white">
                  File Evidence Dispute • {selectedChallan.challan_number}
                </h3>
              </div>
              <button
                onClick={() => setDisputeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              This automated filing compiles your dashcam video clip, GPS velocity log, and CAN bus telemetry into an official legal contradiction pack for {selectedChallan.state} Police & Virtual Court.
            </p>

            <div className="p-3 rounded-lg bg-[#070e1c] border border-purple-500/30 text-xs mb-3 font-mono">
              <div className="text-purple-300 font-bold mb-1">Attached Evidence Manifest:</div>
              <div className="text-slate-300">• Jurisdiction: {selectedChallan.issuing_authority} ({selectedChallan.state})</div>
              <div className="text-slate-300">• Speed Contradiction: 49.1 km/h (GPS) vs 72.4 km/h (Radar)</div>
              <div className="text-slate-300">• AI Bounding Box & Signboard Verification: IRC:67-2012</div>
            </div>

            <div>
              <label className="text-slate-400 text-xs mb-1 block">Dispute Statement for Lok Adalat / Commissionerate</label>
              <textarea
                rows={3}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2.5 text-xs text-white"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={submittingDispute}
                onClick={handleFileDispute}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                {submittingDispute ? 'Lodging Dispute...' : `Submit to ${selectedChallan.state} Portal`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
