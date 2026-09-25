'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  MapPin,
  Globe,
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Filter,
  FileText,
  ShieldCheck,
  Building,
  Home,
  BookOpen,
  Clock,
  History,
  CheckCircle,
} from 'lucide-react';
import {
  fetchMasterDataSummary,
  fetchMasterDataItems,
  createMasterDataItem,
  updateMasterDataItem,
  deleteMasterDataItem,
  importMasterData,
  fetchStates,
  fetchDistricts,
  fetchSubDistricts,
  fetchReligions,
  fetchCastes,
  fetchImportHistory,
  getImportErrorReportUrl,
} from '../../../services/masterDataApi';
import LocationPdfUploadModal from '../../../components/admin/LocationPdfUploadModal';

type TabType = 'locations' | 'castes' | 'languages' | 'importer' | 'history';
type LocationLevel = 'countries' | 'states' | 'districts' | 'sub-districts' | 'cities' | 'villages';

export default function AdminMasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>('locations');
  const [locationLevel, setLocationLevel] = useState<LocationLevel>('districts');

  // Summary counts
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Table items state
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Parent Filters for Locations
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedSubDistrictId, setSelectedSubDistrictId] = useState<string>('');
  const [statesList, setStatesList] = useState<any[]>([]);
  const [districtsList, setDistrictsList] = useState<any[]>([]);
  const [subDistrictsList, setSubDistrictsList] = useState<any[]>([]);

  // Community Filters
  const [religionsList, setReligionsList] = useState<any[]>([]);
  const [selectedReligionId, setSelectedReligionId] = useState<string>('');
  const [selectedCasteId, setSelectedCasteId] = useState<string>('');
  const [castesList, setCastesList] = useState<any[]>([]);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalFormData, setModalFormData] = useState<any>({});
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Bulk Importer State
  const [importType, setImportType] = useState<'locations' | 'castes'>('locations');
  const [importInput, setImportInput] = useState('');
  const [importRunning, setImportRunning] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);

  // PDF Location Upload Modal State
  const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] = useState(false);

  // Import History & Audit State
  const [importHistoryList, setImportHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchImportHistory(historyPage, 20);
      setImportHistoryList(res.data || []);
      setHistoryTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, historyPage]);

  // Load summary and initial parents on mount
  useEffect(() => {
    loadSummary();
    fetchStates().then((states) => {
      setStatesList(states);
      // Default to Maharashtra if present
      const mh = states.find((s) => s.code === 'MH');
      if (mh) setSelectedStateId(mh._id);
    });
    fetchReligions().then((rels) => {
      setReligionsList(rels);
      const hindu = rels.find((r) => r.name === 'Hindu');
      if (hindu) setSelectedReligionId(hindu._id);
    });
  }, []);

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await fetchMasterDataSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load master data summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Load districts when selectedStateId changes
  useEffect(() => {
    if (selectedStateId) {
      fetchDistricts(selectedStateId).then((districts) => {
        setDistrictsList(districts);
        const pune = districts.find((d) => d.name === 'Pune');
        if (pune) {
          setSelectedDistrictId(pune._id);
        } else if (districts.length > 0) {
          setSelectedDistrictId(districts[0]._id);
        } else {
          setSelectedDistrictId('');
        }
      });
    } else {
      setDistrictsList([]);
      setSelectedDistrictId('');
    }
  }, [selectedStateId]);

  // Load sub-districts when selectedDistrictId changes
  useEffect(() => {
    if (selectedDistrictId) {
      fetchSubDistricts(selectedDistrictId).then((subs) => {
        setSubDistrictsList(subs);
        const haveli = subs.find((s) => s.name === 'Haveli');
        if (haveli) {
          setSelectedSubDistrictId(haveli._id);
        } else if (subs.length > 0) {
          setSelectedSubDistrictId(subs[0]._id);
        } else {
          setSelectedSubDistrictId('');
        }
      });
    } else {
      setSubDistrictsList([]);
      setSelectedSubDistrictId('');
    }
  }, [selectedDistrictId]);

  // Load castes when selectedReligionId changes
  useEffect(() => {
    if (selectedReligionId) {
      fetchCastes({ religionId: selectedReligionId }).then((castes) => {
        setCastesList(castes);
        if (castes.length > 0) setSelectedCasteId(castes[0]._id);
        else setSelectedCasteId('');
      });
    } else {
      setCastesList([]);
      setSelectedCasteId('');
    }
  }, [selectedReligionId]);

  // Determine current entity and parentId for table fetch
  const { currentEntity, currentParentId } = useMemo(() => {
    if (activeTab === 'locations') {
      let parentId: string | undefined;
      if (locationLevel === 'districts') parentId = selectedStateId;
      if (locationLevel === 'sub-districts' || locationLevel === 'cities') parentId = selectedDistrictId;
      if (locationLevel === 'villages') parentId = selectedSubDistrictId;
      return { currentEntity: locationLevel, currentParentId: parentId };
    }
    if (activeTab === 'castes') {
      return { currentEntity: 'castes', currentParentId: selectedReligionId };
    }
    if (activeTab === 'languages') {
      return { currentEntity: 'languages', currentParentId: undefined };
    }
    return { currentEntity: 'districts', currentParentId: undefined };
  }, [activeTab, locationLevel, selectedStateId, selectedDistrictId, selectedSubDistrictId, selectedReligionId]);

  // Fetch table items
  useEffect(() => {
    if (activeTab === 'importer') return;
    loadTableItems();
  }, [currentEntity, currentParentId, searchQuery, currentPage]);

  const loadTableItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetchMasterDataItems({
        entity: currentEntity,
        parentId: currentParentId,
        search: searchQuery,
        page: currentPage,
        limit: 50,
      });
      setItems(res.data);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to load table items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (id: string) => {
    try {
      await deleteMasterDataItem(currentEntity, id, false);
      loadTableItems();
      loadSummary();
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setModalError('');
    const initialData: any = { isActive: true };

    if (currentEntity === 'states') initialData.countryId = statesList[0]?.countryId;
    if (currentEntity === 'districts') initialData.stateId = selectedStateId;
    if (currentEntity === 'sub-districts') {
      initialData.districtId = selectedDistrictId;
      initialData.stateId = selectedStateId;
      initialData.type = 'Taluka';
    }
    if (currentEntity === 'cities') {
      initialData.districtId = selectedDistrictId;
      initialData.stateId = selectedStateId;
      initialData.subDistrictId = selectedSubDistrictId;
      initialData.type = 'City';
    }
    if (currentEntity === 'villages') {
      initialData.subDistrictId = selectedSubDistrictId;
      initialData.districtId = selectedDistrictId;
      initialData.stateId = selectedStateId;
    }
    if (currentEntity === 'castes') {
      initialData.religionId = selectedReligionId;
      initialData.category = 'General';
      initialData.sourceType = 'COMMUNITY_MASTER';
    }

    setModalFormData(initialData);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setModalError('');
    setModalFormData({ ...item });
    setIsModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError('');

    try {
      if (editingItem) {
        await updateMasterDataItem(currentEntity, editingItem._id, modalFormData);
      } else {
        await createMasterDataItem(currentEntity, modalFormData);
      }
      setIsModalOpen(false);
      loadTableItems();
      loadSummary();
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Failed to save record.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Run Bulk Import
  const handleExecuteImport = async () => {
    if (!importInput.trim()) {
      alert('Please paste or upload CSV or JSON data first.');
      return;
    }

    setImportRunning(true);
    setImportReport(null);

    try {
      let records: any[] = [];
      const trimmed = importInput.trim();

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Simple CSV parse
        const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\s"-]/g, '_'));
          records = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx] || '';
            });
            return row;
          });
        }
      }

      if (records.length === 0) {
        alert('No valid records found in input.');
        setImportRunning(false);
        return;
      }

      const report = await importMasterData(importType, records);
      setImportReport(report);
      loadSummary();
      loadTableItems();
    } catch (err: any) {
      alert(`Import error: ${err.message || 'Invalid format'}`);
    } finally {
      setImportRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER & PROVENANCE BADGES ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 flex items-center justify-center text-[#E51F3E]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                Master Data Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Authoritative Indian geographical hierarchy & Community master directory
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons & Provenance */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPdfUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-[#E51F3E] text-white text-xs sm:text-sm font-bold shadow-md hover:from-red-700 hover:to-[#CC1432] transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Location Data (PDF)</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            LGD Government Directory
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <Building className="w-3.5 h-3.5" />
            Census India Codes
          </span>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'States / UTs', count: summary.states, icon: Globe, color: 'text-indigo-600' },
          { label: 'Districts', count: summary.districts, icon: MapPin, color: 'text-emerald-600' },
          { label: 'Talukas', count: summary.subDistricts, icon: Layers, color: 'text-blue-600' },
          { label: 'Cities/Towns', count: summary.cities, icon: Building, color: 'text-violet-600' },
          { label: 'Villages', count: summary.villages, icon: Home, color: 'text-amber-600' },
          { label: 'Languages', count: summary.languages, icon: BookOpen, color: 'text-rose-600' },
          { label: 'Castes', count: summary.castes, icon: ShieldCheck, color: 'text-teal-600' },
          { label: 'Sub-Castes', count: summary.subCastes, icon: Database, color: 'text-orange-600' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  {kpi.label}
                </span>
                <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              </div>
              <span className="text-lg font-bold text-slate-900 mt-1 block">
                {loadingSummary ? '...' : kpi.count || 0}
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── TABS NAVIGATION ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'locations', label: 'Geographical Hierarchy (LGD)', icon: MapPin },
          { id: 'castes', label: 'Community & Castes', icon: ShieldCheck },
          { id: 'languages', label: 'Languages (Eighth Schedule)', icon: BookOpen },
          { id: 'importer', label: 'Bulk Importer (CSV / JSON)', icon: Upload },
          { id: 'history', label: 'PDF Import History & Audit', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setCurrentPage(1);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                isActive
                  ? 'border-[#E51F3E] text-[#E51F3E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: GEOGRAPHICAL LOCATIONS ─── */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          {/* Hierarchy Level Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'countries', label: '1. Countries' },
              { id: 'states', label: '2. States / UTs' },
              { id: 'districts', label: '3. Districts' },
              { id: 'sub-districts', label: '4. Talukas / Tehsils' },
              { id: 'cities', label: '5. Cities & Towns' },
              { id: 'villages', label: '6. Villages (LGD)' },
            ].map((lvl) => {
              const isLvl = locationLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    setLocationLevel(lvl.id as LocationLevel);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isLvl
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>

          {/* Cascading Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* State Selector */}
              {['districts', 'sub-districts', 'cities', 'villages'].includes(locationLevel) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">State:</span>
                  <select
                    value={selectedStateId}
                    onChange={(e) => setSelectedStateId(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                  >
                    {statesList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* District Selector */}
              {['sub-districts', 'cities', 'villages'].includes(locationLevel) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">District:</span>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => setSelectedDistrictId(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                  >
                    {districtsList.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sub-District Selector */}
              {locationLevel === 'villages' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Taluka:</span>
                  <select
                    value={selectedSubDistrictId}
                    onChange={(e) => setSelectedSubDistrictId(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                  >
                    {subDistrictsList.map((sd) => (
                      <option key={sd._id} value={sd._id}>
                        {sd.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${locationLevel}...`}
                  className="h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E] w-48 sm:w-64"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Location Data (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add {locationLevel.slice(0, -1)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: COMMUNITY & CASTES ─── */}
      {activeTab === 'castes' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Religion:</span>
              <select
                value={selectedReligionId}
                onChange={(e) => setSelectedReligionId(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
              >
                {religionsList.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search caste or aliases..."
                className="h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E] w-52 sm:w-64"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Caste</span>
          </button>
        </div>
      )}

      {/* ─── TAB 3: LANGUAGES ─── */}
      {activeTab === 'languages' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages or native script..."
              className="h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E] w-64 sm:w-80"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Language</span>
          </button>
        </div>
      )}

      {/* ─── DATA TABLE (For Locations, Castes, Languages) ─── */}
      {activeTab !== 'importer' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  {currentEntity === 'states' && <th className="px-5 py-3">Code / Type</th>}
                  {currentEntity === 'districts' && <th className="px-5 py-3">Headquarters</th>}
                  {currentEntity === 'sub-districts' && <th className="px-5 py-3">Type</th>}
                  {currentEntity === 'cities' && (
                    <>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">PIN Code</th>
                    </>
                  )}
                  {currentEntity === 'villages' && <th className="px-5 py-3">PIN Code</th>}
                  {currentEntity === 'castes' && (
                    <>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Source & Provenance</th>
                    </>
                  )}
                  {currentEntity === 'languages' && (
                    <>
                      <th className="px-5 py-3">ISO Code</th>
                      <th className="px-5 py-3">Native Script</th>
                      <th className="px-5 py-3">8th Schedule</th>
                    </>
                  )}
                  <th className="px-5 py-3">Official LGD Code</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {loadingItems ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-[#E51F3E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading records...</span>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {item.name}
                        {item.aliases && item.aliases.length > 0 && (
                          <span className="block text-[10.5px] font-normal text-slate-400">
                            aka: {item.aliases.join(', ')}
                          </span>
                        )}
                      </td>
                      {currentEntity === 'states' && (
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-700 mr-2">{item.code}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-bold">
                            {item.type}
                          </span>
                        </td>
                      )}
                      {currentEntity === 'districts' && (
                        <td className="px-5 py-3.5 text-slate-600">{item.headquarters || '—'}</td>
                      )}
                      {currentEntity === 'sub-districts' && (
                        <td className="px-5 py-3.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-bold">
                            {item.type || 'Taluka'}
                          </span>
                        </td>
                      )}
                      {currentEntity === 'cities' && (
                        <>
                          <td className="px-5 py-3.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-bold">
                              {item.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{item.pincode || '—'}</td>
                        </>
                      )}
                      {currentEntity === 'villages' && (
                        <td className="px-5 py-3.5 text-slate-600">{item.pincode || '—'}</td>
                      )}
                      {currentEntity === 'castes' && (
                        <>
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                item.category === 'SC'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.category === 'ST'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.category === 'OBC'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                            <span className="font-bold block text-slate-700">{item.sourceType || 'Master'}</span>
                            <span className="truncate block max-w-xs">{item.source}</span>
                          </td>
                        </>
                      )}
                      {currentEntity === 'languages' && (
                        <>
                          <td className="px-5 py-3.5 font-bold text-slate-700">{item.code}</td>
                          <td className="px-5 py-3.5 text-slate-600">{item.nativeNames?.join(', ') || '—'}</td>
                          <td className="px-5 py-3.5">
                            {item.isScheduled ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ 8th Schedule
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Regional</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                        {item.lgdCode ? `LGD: ${item.lgdCode}` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item._id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                            item.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {item.isActive !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>
              Showing {items.length} of {totalCount} total records
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2">Page {currentPage}</span>
              <button
                type="button"
                disabled={items.length < 50}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: BULK IMPORTER ─── */}
      {activeTab === 'importer' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Bulk Master Data Importer
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Import thousands of official Census / LGD villages, talukas, or castes via CSV / JSON with automated parent relationship checks and duplicate prevention.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Import Entity:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImportType('locations')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      importType === 'locations'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Geographical Locations (State, District, Taluka, Village)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType('castes')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      importType === 'castes'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Castes & Sub-Castes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Paste CSV or JSON payload:
                </label>
                <textarea
                  rows={10}
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder={
                    importType === 'locations'
                      ? 'state_name,district_name,subdistrict_name,village_name,lgd_code,pincode\nMaharashtra,Pune,Haveli,Keshavnagar,556110,411036'
                      : 'religion,caste,subcaste,category,source\nHindu,Maratha,96 Kuli Maratha,General,Government Gazette'
                  }
                  className="w-full p-3 font-mono text-xs rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importRunning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs disabled:opacity-50 transition"
                >
                  {importRunning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{importRunning ? 'Processing Batch...' : 'Validate & Import Batch'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportInput('');
                    setImportReport(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Importer Report Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#E51F3E]" />
                Execution Report
              </h4>

              {importReport ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Imported</span>
                      <span className="text-sm font-bold text-emerald-600">{importReport.imported}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Updated</span>
                      <span className="text-sm font-bold text-blue-600">{importReport.updated}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Skipped</span>
                      <span className="text-sm font-bold text-amber-600">{importReport.skipped}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Total</span>
                      <span className="text-sm font-bold text-slate-900">{importReport.total}</span>
                    </div>
                  </div>

                  {importReport.errors && importReport.errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-1 max-h-36 overflow-y-auto">
                      <span className="font-bold block">Validation Errors ({importReport.errors.length}):</span>
                      {importReport.errors.map((err: string, i: number) => (
                        <p key={i} className="leading-snug">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Run an import to view statistics, parent validations, duplicate resolutions, and error diagnostics.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: PDF IMPORT HISTORY & AUDIT TRAIL ─── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-red-600" />
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  PDF Location Data Import History & Audit Trail
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Audit logs for all uploaded administrative directory documents, parsing metrics, and database insertion results.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPdfUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload New PDF</span>
              </button>
            </div>
          </div>

          {/* History Content */}
          {loadingHistory ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
              <p className="text-xs font-semibold">Loading import audit history...</p>
            </div>
          ) : importHistoryList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">No Location PDF Imports Recorded Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Upload your first official LGD or administrative directory PDF to populate master geographical entities.
              </p>
              <button
                type="button"
                onClick={() => setIsPdfUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-sm transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Location Data (PDF)</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">File Details</th>
                    <th className="px-5 py-3.5">Import ID & Admin</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Total</th>
                    <th className="px-5 py-3.5 text-center">Inserted</th>
                    <th className="px-5 py-3.5 text-center">Updated</th>
                    <th className="px-5 py-3.5 text-center">Skipped</th>
                    <th className="px-5 py-3.5 text-center">Failed</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {importHistoryList.map((item) => {
                    const statusColors: Record<string, string> = {
                      IMPORTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      PARTIALLY_IMPORTED: 'bg-amber-50 text-amber-700 border-amber-200',
                      PREVIEW_READY: 'bg-blue-50 text-blue-700 border-blue-200',
                      PROCESSING: 'bg-purple-50 text-purple-700 border-purple-200',
                      UPLOADED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
                      CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
                    };
                    const statusClass = statusColors[item.status] || 'bg-slate-100 text-slate-600 border-slate-200';
                    const hasErrors = (item.metrics?.invalid > 0) || (item.importErrors?.length > 0);

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{item.fileName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {(item.fileSize / 1024).toFixed(1)} KB • {item.source || 'LGD_GOV_IN'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 block w-fit">
                            {item.importId}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {item.uploadedBy?.name || item.uploadedBy?.email || 'Admin'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : 'N/A'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-800">
                          {item.metrics?.totalRecords || 0}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-emerald-600">
                          {item.metrics?.inserted || 0}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-blue-600">
                          {item.metrics?.updated || 0}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-amber-600">
                          {item.metrics?.duplicates || 0}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-rose-600">
                          {item.metrics?.invalid || 0}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {hasErrors ? (
                            <button
                              type="button"
                              onClick={() => window.open(getImportErrorReportUrl(item.importId), '_blank')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-[10.5px] font-bold transition cursor-pointer"
                              title="Download Error Report CSV"
                            >
                              <Download className="w-3 h-3" />
                              <span>Error CSV</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Clean
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* History Pagination */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>
                  Showing {importHistoryList.length} of {historyTotal} import audit records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2">Page {historyPage}</span>
                  <button
                    type="button"
                    disabled={importHistoryList.length < 20}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ADD / EDIT MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                {editingItem ? `Edit ${currentEntity.slice(0, -1)}` : `Add New ${currentEntity.slice(0, -1)}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={modalFormData.name || ''}
                  onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              {currentEntity === 'states' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">State Code (e.g. MH)</label>
                    <input
                      type="text"
                      required
                      value={modalFormData.code || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, code: e.target.value.toUpperCase() })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Type</label>
                    <select
                      value={modalFormData.type || 'State'}
                      onChange={(e) => setModalFormData({ ...modalFormData, type: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="State">State</option>
                      <option value="Union Territory">Union Territory</option>
                    </select>
                  </div>
                </div>
              )}

              {currentEntity === 'castes' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category *</label>
                    <select
                      value={modalFormData.category || 'General'}
                      onChange={(e) => setModalFormData({ ...modalFormData, category: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC (Scheduled Caste)</option>
                      <option value="ST">ST (Scheduled Tribe)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Source Type</label>
                    <select
                      value={modalFormData.sourceType || 'COMMUNITY_MASTER'}
                      onChange={(e) => setModalFormData({ ...modalFormData, sourceType: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="COMMUNITY_MASTER">Community Master</option>
                      <option value="GOVERNMENT">Government Gazette</option>
                      <option value="DEPARTMENT_OF_SOCIAL_JUSTICE">Dept of Social Justice (SC List)</option>
                      <option value="HISTORICAL_REFERENCE">Historical Reference (1956 Order)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">LGD Code</label>
                  <input
                    type="text"
                    value={modalFormData.lgdCode || ''}
                    onChange={(e) => setModalFormData({ ...modalFormData, lgdCode: e.target.value })}
                    placeholder="e.g. 4143"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>
                {['cities', 'villages'].includes(currentEntity) && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={modalFormData.pincode || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, pincode: e.target.value })}
                      placeholder="e.g. 411001"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#E51F3E] text-white font-bold hover:bg-[#CC1432] disabled:opacity-50"
                >
                  {modalSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PDF LOCATION UPLOAD MODAL ─── */}
      <LocationPdfUploadModal
        isOpen={isPdfUploadModalOpen}
        onClose={() => setIsPdfUploadModalOpen(false)}
        onSuccess={() => {
          loadSummary();
          loadTableItems();
          loadHistory();
          fetchStates().then(setStatesList);
        }}
      />
    </div>
  );
}
