'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ChevronDown,
  Globe,
  Home,
  User,
  HeartHandshake,
  DollarSign,
  Compass,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { DobInput } from './DobInput';
import { SearchableSelectionModal, SelectionItem } from './SearchableSelectionModal';
import {
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchSubDistricts,
  fetchCities,
  fetchVillages,
  fetchReligions,
  fetchCastes,
  fetchSubCastes,
  fetchLanguages,
  CountryItem,
  StateItem,
  DistrictItem,
  SubDistrictItem,
  CityItem,
  VillageItem,
  ReligionItem,
  CasteItem,
  SubCasteItem,
  LanguageItem,
} from '../services/masterDataApi';

const HEIGHTS = [
  `5' 0"`, `5' 1"`, `5' 2"`, `5' 3"`, `5' 4"`, `5' 5"`, `5' 6"`, `5' 7"`, `5' 8"`, `5' 9"`, `5' 10"`, `5' 11"`, `6' 0"`, `6' 1"`, `6' 2"`, `6' 3"`, `6' 4"`
];

const MARITAL_STATUSES = ['Never Married', 'Divorced', 'Widowed', 'Separated', 'Awaiting Divorce'];

interface BasicDetailsEditSectionProps {
  formData: any;
  onChange: (updatedFields: Record<string, any>) => void;
}

export function BasicDetailsEditSection({ formData, onChange }: BasicDetailsEditSectionProps) {
  // Modal Selector State
  const [activeSelector, setActiveSelector] = useState<string | null>(null);
  const [selectorItems, setSelectorItems] = useState<SelectionItem[]>([]);
  const [selectorTitle, setSelectorTitle] = useState('');
  const [selectorLoading, setSelectorLoading] = useState(false);

  // Master Data Cache
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [religions, setReligions] = useState<ReligionItem[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);

  // Initial Preloads
  useEffect(() => {
    fetchCountries().then(setCountries).catch(() => {});
    fetchReligions().then(setReligions).catch(() => {});
    fetchLanguages().then(setLanguages).catch(() => {});
  }, []);

  // Helper getters for display names
  const curCountryName = formData.currentLocation?.countryName || formData.country || 'India';
  const curStateName = formData.currentLocation?.stateName || formData.state || '';
  const curDistrictName = formData.currentLocation?.districtName || '';
  const curSubDistrictName = formData.currentLocation?.subDistrictName || '';
  const curCityName = formData.currentLocation?.cityName || formData.city || '';
  const curVillageName = formData.currentLocation?.villageName || '';

  const natCountryName = formData.nativePlaceDetails?.countryName || 'India';
  const natStateName = formData.nativePlaceDetails?.stateName || '';
  const natDistrictName = formData.nativePlaceDetails?.districtName || '';
  const natSubDistrictName = formData.nativePlaceDetails?.subDistrictName || '';
  const natCityName = formData.nativePlaceDetails?.cityName || '';
  const natVillageName = formData.nativePlaceDetails?.villageName || '';

  const religionName = formData.religion || 'Hindu';
  const casteName = formData.caste || '';
  const subCasteName = formData.subCaste || '';
  const motherTongueName = formData.motherTongue || '';

  // ─── MODAL OPENERS WITH CASCADING CONSTRAINTS ───

  // 1. Current Country
  const openCurrentCountryModal = () => {
    setSelectorTitle('Select Current Country');
    const items: SelectionItem[] = countries.map((c) => ({
      id: c._id,
      name: c.name,
      badge: c.phoneCode,
      isTop: c.sortOrder <= 6,
    }));
    setSelectorItems(items);
    setActiveSelector('currentCountry');
  };

  // 2. Current State
  const openCurrentStateModal = async () => {
    setSelectorTitle('Select Current State / Union Territory');
    setSelectorLoading(true);
    setActiveSelector('currentState');
    try {
      const states = await fetchStates(formData.currentLocation?.countryId);
      setSelectorItems(
        states.map((s) => ({
          id: s._id,
          name: s.name,
          badge: s.type === 'Union Territory' ? 'UT' : 'State',
          isTop: s.sortOrder <= 6,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  // 3. Current District
  const openCurrentDistrictModal = async () => {
    if (!formData.currentLocation?.stateId) {
      alert('Please select a State / UT first.');
      return;
    }
    setSelectorTitle(`Select District (${curStateName})`);
    setSelectorLoading(true);
    setActiveSelector('currentDistrict');
    try {
      const districts = await fetchDistricts(formData.currentLocation.stateId);
      setSelectorItems(
        districts.map((d) => ({
          id: d._id,
          name: d.name,
          badge: d.lgdCode ? `LGD: ${d.lgdCode}` : undefined,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  // 4. Current Sub-District / Taluka
  const openCurrentSubDistrictModal = async () => {
    if (!formData.currentLocation?.districtId) {
      alert('Please select a District first.');
      return;
    }
    setSelectorTitle(`Select Taluka / Tehsil (${curDistrictName})`);
    setSelectorLoading(true);
    setActiveSelector('currentSubDistrict');
    try {
      const subDistricts = await fetchSubDistricts(formData.currentLocation.districtId);
      setSelectorItems(
        subDistricts.map((sd) => ({
          id: sd._id,
          name: sd.name,
          badge: sd.type || 'Taluka',
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  // 5. Current City / Town
  const openCurrentCityModal = async () => {
    if (!formData.currentLocation?.districtId) {
      alert('Please select a District first.');
      return;
    }
    setSelectorTitle(`Select City / Town (${curDistrictName})`);
    setSelectorLoading(true);
    setActiveSelector('currentCity');
    try {
      const res = await fetchCities({
        districtId: formData.currentLocation.districtId,
        subDistrictId: formData.currentLocation.subDistrictId,
        limit: 50,
      });
      setSelectorItems(
        res.data.map((c) => ({
          id: c._id,
          name: c.name,
          badge: c.type || 'City',
          secondaryText: c.pincode ? `PIN: ${c.pincode}` : undefined,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  // 6. Current Village (Optional)
  const openCurrentVillageModal = async () => {
    if (!formData.currentLocation?.subDistrictId) {
      alert('Please select a Taluka / Tehsil first to browse villages.');
      return;
    }
    setSelectorTitle(`Select Village (${curSubDistrictName})`);
    setSelectorLoading(true);
    setActiveSelector('currentVillage');
    try {
      const res = await fetchVillages({
        subDistrictId: formData.currentLocation.subDistrictId,
        districtId: formData.currentLocation.districtId,
        limit: 50,
      });
      setSelectorItems(
        res.data.map((v) => ({
          id: v._id,
          name: v.name,
          badge: v.lgdCode ? `LGD: ${v.lgdCode}` : undefined,
          secondaryText: v.pincode ? `PIN: ${v.pincode}` : undefined,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  // ─── NATIVE PLACE MODAL OPENERS ───

  const openNativeStateModal = async () => {
    setSelectorTitle('Select Native State / Union Territory');
    setSelectorLoading(true);
    setActiveSelector('nativeState');
    try {
      const states = await fetchStates(formData.nativePlaceDetails?.countryId);
      setSelectorItems(
        states.map((s) => ({
          id: s._id,
          name: s.name,
          badge: s.type === 'Union Territory' ? 'UT' : 'State',
          isTop: s.sortOrder <= 6,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  const openNativeDistrictModal = async () => {
    if (!formData.nativePlaceDetails?.stateId) {
      alert('Please select a Native State first.');
      return;
    }
    setSelectorTitle(`Select Native District (${natStateName})`);
    setSelectorLoading(true);
    setActiveSelector('nativeDistrict');
    try {
      const districts = await fetchDistricts(formData.nativePlaceDetails.stateId);
      setSelectorItems(
        districts.map((d) => ({
          id: d._id,
          name: d.name,
          badge: d.lgdCode ? `LGD: ${d.lgdCode}` : undefined,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  const openNativeSubDistrictModal = async () => {
    if (!formData.nativePlaceDetails?.districtId) {
      alert('Please select a Native District first.');
      return;
    }
    setSelectorTitle(`Select Native Taluka / Tehsil (${natDistrictName})`);
    setSelectorLoading(true);
    setActiveSelector('nativeSubDistrict');
    try {
      const subDistricts = await fetchSubDistricts(formData.nativePlaceDetails.districtId);
      setSelectorItems(
        subDistricts.map((sd) => ({
          id: sd._id,
          name: sd.name,
          badge: sd.type || 'Taluka',
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  const openNativeCityModal = async () => {
    if (!formData.nativePlaceDetails?.districtId) {
      alert('Please select a Native District first.');
      return;
    }
    setSelectorTitle(`Select Native City / Town`);
    setSelectorLoading(true);
    setActiveSelector('nativeCity');
    try {
      const res = await fetchCities({
        districtId: formData.nativePlaceDetails.districtId,
        subDistrictId: formData.nativePlaceDetails.subDistrictId,
        limit: 50,
      });
      setSelectorItems(
        res.data.map((c) => ({
          id: c._id,
          name: c.name,
          badge: c.type || 'City',
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  const openNativeVillageModal = async () => {
    if (!formData.nativePlaceDetails?.subDistrictId) {
      alert('Please select a Native Taluka first.');
      return;
    }
    setSelectorTitle(`Select Native Village`);
    setSelectorLoading(true);
    setActiveSelector('nativeVillage');
    try {
      const res = await fetchVillages({
        subDistrictId: formData.nativePlaceDetails.subDistrictId,
        limit: 50,
      });
      setSelectorItems(
        res.data.map((v) => ({
          id: v._id,
          name: v.name,
          badge: v.lgdCode ? `LGD: ${v.lgdCode}` : undefined,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  // ─── COMMUNITY & LANGUAGE MODALS ───

  const openCasteModal = async () => {
    setSelectorTitle(`Select Caste / Community (${religionName})`);
    setSelectorLoading(true);
    setActiveSelector('caste');
    try {
      const castes = await fetchCastes({
        religionId: formData.communityDetails?.religionId,
        religionName: religionName,
      });
      setSelectorItems(
        castes.map((c) => ({
          id: c._id,
          name: c.name,
          badge: c.category || undefined,
          secondaryText: c.source ? `Source: ${c.source}` : undefined,
        }))
      );
    } finally {
      setSelectorLoading(false);
    }
  };

  const openSubCasteModal = async () => {
    if (!formData.communityDetails?.casteId) {
      alert('Please select a Caste first.');
      return;
    }
    setSelectorTitle(`Select Sub-Caste (${casteName})`);
    setSelectorLoading(true);
    setActiveSelector('subCaste');
    try {
      const subCastes = await fetchSubCastes(formData.communityDetails.casteId);
      const items: SelectionItem[] = subCastes.map((sc) => ({
        id: sc._id,
        name: sc.name,
      }));
      // Always add "No specific sub-caste" at the top
      items.unshift({
        id: 'none',
        name: 'No specific sub-caste',
        badge: 'General',
        isTop: true,
      });
      setSelectorItems(items);
    } finally {
      setSelectorLoading(false);
    }
  };

  const openMotherTongueModal = () => {
    setSelectorTitle('Select Mother Tongue / Native Language');
    setSelectorItems(
      languages.map((l) => ({
        id: l._id,
        name: l.name,
        badge: l.isScheduled ? 'Scheduled' : undefined,
        secondaryText: l.nativeNames?.join(', '),
        isTop: l.sortOrder <= 6,
      }))
    );
    setActiveSelector('motherTongue');
  };

  // ─── SELECTION HANDLER WITH STRICT CASCADING RESETS ───

  const handleSelection = (item: SelectionItem) => {
    switch (activeSelector) {
      // CURRENT LOCATION CASCADES
      case 'currentCountry': {
        // Changing Country -> Reset State, District, SubDistrict, City, Village
        onChange({
          country: item.name,
          state: '',
          city: '',
          currentLocation: {
            countryId: item.id,
            countryName: item.name,
            stateId: undefined,
            stateName: undefined,
            districtId: undefined,
            districtName: undefined,
            subDistrictId: undefined,
            subDistrictName: undefined,
            cityId: undefined,
            cityName: undefined,
            villageId: undefined,
            villageName: undefined,
            pincode: formData.currentLocation?.pincode || '',
          },
        });
        break;
      }
      case 'currentState': {
        // Changing State -> Reset District, SubDistrict, City, Village
        onChange({
          state: item.name,
          city: '',
          currentLocation: {
            ...formData.currentLocation,
            stateId: item.id,
            stateName: item.name,
            districtId: undefined,
            districtName: undefined,
            subDistrictId: undefined,
            subDistrictName: undefined,
            cityId: undefined,
            cityName: undefined,
            villageId: undefined,
            villageName: undefined,
          },
        });
        break;
      }
      case 'currentDistrict': {
        // Changing District -> Reset SubDistrict, City, Village
        onChange({
          city: '',
          currentLocation: {
            ...formData.currentLocation,
            districtId: item.id,
            districtName: item.name,
            subDistrictId: undefined,
            subDistrictName: undefined,
            cityId: undefined,
            cityName: undefined,
            villageId: undefined,
            villageName: undefined,
          },
        });
        break;
      }
      case 'currentSubDistrict': {
        // Changing SubDistrict -> Reset City, Village
        onChange({
          currentLocation: {
            ...formData.currentLocation,
            subDistrictId: item.id,
            subDistrictName: item.name,
            cityId: undefined,
            cityName: undefined,
            villageId: undefined,
            villageName: undefined,
          },
        });
        break;
      }
      case 'currentCity': {
        onChange({
          city: item.name,
          currentLocation: {
            ...formData.currentLocation,
            cityId: item.id,
            cityName: item.name,
          },
        });
        break;
      }
      case 'currentVillage': {
        onChange({
          currentLocation: {
            ...formData.currentLocation,
            villageId: item.id,
            villageName: item.name,
          },
        });
        break;
      }

      // NATIVE PLACE CASCADES
      case 'nativeState': {
        onChange({
          nativePlaceDetails: {
            ...formData.nativePlaceDetails,
            stateId: item.id,
            stateName: item.name,
            districtId: undefined,
            districtName: undefined,
            subDistrictId: undefined,
            subDistrictName: undefined,
            cityId: undefined,
            cityName: undefined,
            villageId: undefined,
            villageName: undefined,
          },
        });
        break;
      }
      case 'nativeDistrict': {
        onChange({
          nativePlaceDetails: {
            ...formData.nativePlaceDetails,
            districtId: item.id,
            districtName: item.name,
            subDistrictId: undefined,
            subDistrictName: undefined,
            cityId: undefined,
            cityName: undefined,
            villageId: undefined,
            villageName: undefined,
          },
        });
        break;
      }
      case 'nativeSubDistrict': {
        onChange({
          nativePlaceDetails: {
            ...formData.nativePlaceDetails,
            subDistrictId: item.id,
            subDistrictName: item.name,
            cityId: undefined,
            cityName: undefined,
            villageId: undefined,
            villageName: undefined,
          },
        });
        break;
      }
      case 'nativeCity': {
        onChange({
          nativePlaceDetails: {
            ...formData.nativePlaceDetails,
            cityId: item.id,
            cityName: item.name,
          },
        });
        break;
      }
      case 'nativeVillage': {
        onChange({
          nativePlaceDetails: {
            ...formData.nativePlaceDetails,
            villageId: item.id,
            villageName: item.name,
          },
        });
        break;
      }

      // COMMUNITY & CASTE CASCADES
      case 'caste': {
        // Changing Caste -> Reset Sub-Caste
        onChange({
          caste: item.name,
          subCaste: '',
          communityDetails: {
            ...formData.communityDetails,
            casteId: item.id,
            casteName: item.name,
            casteCategory: item.badge,
            subCasteId: undefined,
            subCasteName: undefined,
          },
        });
        break;
      }
      case 'subCaste': {
        if (item.id === 'none') {
          onChange({
            subCaste: 'No specific sub-caste',
            communityDetails: {
              ...formData.communityDetails,
              subCasteId: undefined,
              subCasteName: 'No specific sub-caste',
            },
          });
        } else {
          onChange({
            subCaste: item.name,
            communityDetails: {
              ...formData.communityDetails,
              subCasteId: item.id,
              subCasteName: item.name,
            },
          });
        }
        break;
      }
      case 'motherTongue': {
        onChange({
          motherTongue: item.name,
          languageDetails: {
            ...formData.languageDetails,
            motherTongueId: item.id,
            motherTongueName: item.name,
          },
        });
        break;
      }
    }
  };

  const handleCustomSubmit = (customText: string) => {
    if (activeSelector === 'caste') {
      onChange({
        caste: customText,
        subCaste: '',
        communityDetails: {
          ...formData.communityDetails,
          casteId: undefined,
          casteName: customText,
          subCasteId: undefined,
        },
      });
    } else if (activeSelector === 'subCaste') {
      onChange({
        subCaste: customText,
        communityDetails: {
          ...formData.communityDetails,
          subCasteId: undefined,
          subCasteText: customText,
        },
      });
    } else if (activeSelector === 'currentCity') {
      onChange({
        city: customText,
        currentLocation: {
          ...formData.currentLocation,
          cityId: undefined,
          cityName: customText,
        },
      });
    } else if (activeSelector === 'currentVillage') {
      onChange({
        currentLocation: {
          ...formData.currentLocation,
          villageId: undefined,
          villageName: customText,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── SECTION 1: PERSONAL DETAILS ─── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <User className="w-4 h-4 text-[#E51F3E]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Personal Details</h4>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={formData.displayName || ''}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="e.g. Dr. Rohan Mehta"
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Gender *</label>
            <select
              value={formData.gender || 'Male'}
              onChange={(e) => onChange({ gender: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Height *</label>
            <select
              value={formData.height || `5' 10"`}
              onChange={(e) => onChange({ height: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
            >
              {HEIGHTS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <DobInput
            label="Date of Birth"
            value={formData.dob || ''}
            required={true}
            onChange={(isoDate) => onChange({ dob: isoDate })}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Marital Status *</label>
          <select
            value={formData.maritalStatus || 'Never Married'}
            onChange={(e) => onChange({ maritalStatus: e.target.value })}
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
          >
            {MARITAL_STATUSES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── SECTION 2: COMMUNITY & LANGUAGE ─── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <HeartHandshake className="w-4 h-4 text-[#E51F3E]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Community & Language</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Religion</label>
            <select
              value={formData.religion || 'Hindu'}
              onChange={(e) => {
                const newRel = e.target.value;
                const relObj = religions.find((r) => r.name === newRel);
                onChange({
                  religion: newRel,
                  caste: '',
                  subCaste: '',
                  communityDetails: {
                    religionId: relObj?._id,
                    casteId: undefined,
                    subCasteId: undefined,
                  },
                });
              }}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
            >
              {religions.length > 0
                ? religions.map((r) => <option key={r._id} value={r.name}>{r.name}</option>)
                : ['Hindu', 'Jain', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Parsi', 'Other'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Mother Tongue</label>
            <button
              type="button"
              onClick={openMotherTongueModal}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 flex items-center justify-between hover:bg-slate-100/80 transition"
            >
              <span className="truncate">{motherTongueName || 'Select Language'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Community / Caste</label>
            <button
              type="button"
              onClick={openCasteModal}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 flex items-center justify-between hover:bg-slate-100/80 transition"
            >
              <span className="truncate">{casteName || 'Select Caste'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Sub-Caste</label>
            <button
              type="button"
              onClick={openSubCasteModal}
              disabled={!casteName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                casteName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{subCasteName || (casteName ? 'Select Sub-Caste' : 'Select Caste first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: CURRENT LOCATION (Hierarchical LGD Directory) ─── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Current Location</h4>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            LGD Verified
          </span>
        </div>

        {/* Country & State */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Country</label>
            <button
              type="button"
              onClick={openCurrentCountryModal}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 flex items-center justify-between hover:bg-slate-100/80 transition"
            >
              <span className="truncate">{curCountryName}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">State / Union Territory</label>
            <button
              type="button"
              onClick={openCurrentStateModal}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 flex items-center justify-between hover:bg-slate-100/80 transition"
            >
              <span className="truncate">{curStateName || 'Select State'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* District & Sub-District / Taluka */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">District</label>
            <button
              type="button"
              onClick={openCurrentDistrictModal}
              disabled={!curStateName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                curStateName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{curDistrictName || (curStateName ? 'Select District' : 'Select State first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Taluka / Tehsil / Sub-District</label>
            <button
              type="button"
              onClick={openCurrentSubDistrictModal}
              disabled={!curDistrictName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                curDistrictName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{curSubDistrictName || (curDistrictName ? 'Select Taluka' : 'Select District first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* City & Village */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">City / Town</label>
            <button
              type="button"
              onClick={openCurrentCityModal}
              disabled={!curDistrictName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                curDistrictName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{curCityName || (curDistrictName ? 'Select City / Town' : 'Select District first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Village <span className="font-normal text-slate-400">(Optional for Urban)</span>
            </label>
            <button
              type="button"
              onClick={openCurrentVillageModal}
              disabled={!curSubDistrictName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                curSubDistrictName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{curVillageName || (curSubDistrictName ? 'Select Village' : 'Select Taluka first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* PIN Code */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">PIN Code</label>
          <input
            type="text"
            value={formData.currentLocation?.pincode || ''}
            onChange={(e) =>
              onChange({
                currentLocation: {
                  ...formData.currentLocation,
                  pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                },
              })
            }
            placeholder="e.g. 411001"
            maxLength={6}
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
          />
        </div>
      </div>

      {/* ─── SECTION 4: NATIVE PLACE ─── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Home className="w-4 h-4 text-[#E51F3E]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Native Place / Roots</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Native State / UT</label>
            <button
              type="button"
              onClick={openNativeStateModal}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 flex items-center justify-between hover:bg-slate-100/80 transition"
            >
              <span className="truncate">{natStateName || 'Select Native State'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Native District</label>
            <button
              type="button"
              onClick={openNativeDistrictModal}
              disabled={!natStateName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                natStateName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{natDistrictName || (natStateName ? 'Select District' : 'Select State first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Native Taluka / Tehsil</label>
            <button
              type="button"
              onClick={openNativeSubDistrictModal}
              disabled={!natDistrictName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                natDistrictName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{natSubDistrictName || (natDistrictName ? 'Select Taluka' : 'Select District first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Native City or Village</label>
            <button
              type="button"
              onClick={openNativeCityModal}
              disabled={!natDistrictName}
              className={`w-full h-11 rounded-xl border px-3.5 text-xs font-semibold flex items-center justify-between transition ${
                natDistrictName
                  ? 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100/80'
                  : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">{natCityName || natVillageName || (natDistrictName ? 'Select Town / Village' : 'Select District first')}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Native Place Description (Optional note)</label>
          <input
            type="text"
            value={formData.nativePlaceDetails?.description || formData.nativePlace || ''}
            onChange={(e) =>
              onChange({
                nativePlace: e.target.value,
                nativePlaceDetails: {
                  ...formData.nativePlaceDetails,
                  description: e.target.value,
                },
              })
            }
            placeholder="e.g. Ancestral home in Karad, Satara"
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
          />
        </div>
      </div>

      {/* ─── SECTION 5: FINANCIAL & PROFILE MANAGEMENT ─── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <DollarSign className="w-4 h-4 text-[#E51F3E]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Financial & Management</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Annual Income Range</label>
            <input
              type="text"
              value={formData.annualIncome || ''}
              onChange={(e) => onChange({ annualIncome: e.target.value })}
              placeholder="e.g. ₹ 35 - 50 Lakhs"
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Profile Managed By</label>
            <select
              value={formData.profileManagedBy || 'Self'}
              onChange={(e) => onChange({ profileManagedBy: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
            >
              <option value="Self">Self (Doctor)</option>
              <option value="Parents">Parents</option>
              <option value="Sibling">Sibling</option>
              <option value="Relative">Relative</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── REUSABLE SEARCHABLE SELECTION MODAL ─── */}
      <SearchableSelectionModal
        isOpen={activeSelector !== null}
        onClose={() => setActiveSelector(null)}
        title={selectorTitle}
        items={selectorItems}
        loading={selectorLoading}
        onSelect={handleSelection}
        allowCustom={['caste', 'subCaste', 'currentCity', 'currentVillage'].includes(activeSelector || '')}
        customPrompt="Not in list? Add custom name"
        onCustomSubmit={handleCustomSubmit}
      />
    </div>
  );
}
