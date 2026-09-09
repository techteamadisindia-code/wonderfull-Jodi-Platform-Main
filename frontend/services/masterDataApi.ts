import { apiClient } from './api';

export interface CountryItem {
  _id: string;
  name: string;
  code: string;
  isoCode: string;
  phoneCode?: string;
  sortOrder: number;
}

export interface StateItem {
  _id: string;
  countryId: string;
  name: string;
  code: string;
  type: 'State' | 'Union Territory';
  lgdCode?: string;
  censusCode?: string;
  sortOrder: number;
}

export interface DistrictItem {
  _id: string;
  stateId: string;
  name: string;
  code?: string;
  lgdCode?: string;
  headquarters?: string;
}

export interface SubDistrictItem {
  _id: string;
  districtId: string;
  stateId: string;
  name: string;
  type: string;
  lgdCode?: string;
}

export interface CityItem {
  _id: string;
  districtId: string;
  stateId: string;
  subDistrictId?: string;
  name: string;
  type: string;
  pincode?: string;
  lgdCode?: string;
}

export interface VillageItem {
  _id: string;
  subDistrictId: string;
  districtId: string;
  stateId: string;
  name: string;
  lgdCode?: string;
  pincode?: string;
}

export interface ReligionItem {
  _id: string;
  name: string;
  code: string;
  sortOrder: number;
}

export interface CasteItem {
  _id: string;
  religionId: any;
  name: string;
  category: string;
  aliases?: string[];
  source?: string;
  sourceType?: string;
  sourceReference?: string;
}

export interface SubCasteItem {
  _id: string;
  casteId: string;
  name: string;
  aliases?: string[];
}

export interface LanguageItem {
  _id: string;
  name: string;
  code: string;
  nativeNames: string[];
  isScheduled: boolean;
  sortOrder: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ImportReport {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ─── PUBLIC LOCATION APIS ───

export async function fetchCountries(search?: string): Promise<CountryItem[]> {
  const params: any = {};
  if (search) params.search = search;
  const res = await apiClient.get('/locations/countries', { params });
  return res.data?.data || [];
}

export async function fetchStates(countryId?: string, search?: string): Promise<StateItem[]> {
  const params: any = {};
  if (countryId) params.countryId = countryId;
  if (search) params.search = search;
  const res = await apiClient.get('/locations/states', { params });
  return res.data?.data || [];
}

export async function fetchDistricts(stateId: string, search?: string): Promise<DistrictItem[]> {
  if (!stateId) return [];
  const params: any = { stateId };
  if (search) params.search = search;
  const res = await apiClient.get('/locations/districts', { params });
  return res.data?.data || [];
}

export async function fetchSubDistricts(districtId: string, search?: string): Promise<SubDistrictItem[]> {
  if (!districtId) return [];
  const params: any = { districtId };
  if (search) params.search = search;
  const res = await apiClient.get('/locations/sub-districts', { params });
  return res.data?.data || [];
}

export async function fetchCities(params: {
  districtId?: string;
  subDistrictId?: string;
  stateId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<CityItem>> {
  const res = await apiClient.get('/locations/cities', { params });
  return {
    data: res.data?.data || [],
    pagination: res.data?.pagination || { total: 0, page: 1, limit: 30, pages: 1 },
  };
}

export async function fetchVillages(params: {
  subDistrictId: string;
  districtId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<VillageItem>> {
  if (!params.subDistrictId) {
    return { data: [], pagination: { total: 0, page: 1, limit: 30, pages: 1 } };
  }
  const res = await apiClient.get('/locations/villages', { params });
  return {
    data: res.data?.data || [],
    pagination: res.data?.pagination || { total: 0, page: 1, limit: 30, pages: 1 },
  };
}

// ─── COMMUNITY & LANGUAGE APIS ───

export async function fetchReligions(): Promise<ReligionItem[]> {
  const res = await apiClient.get('/community/religions');
  return res.data?.data || [];
}

export async function fetchCastes(params?: {
  religionId?: string;
  religionName?: string;
  category?: string;
  search?: string;
}): Promise<CasteItem[]> {
  const res = await apiClient.get('/community/castes', { params });
  return res.data?.data || [];
}

export async function fetchSubCastes(casteId: string, search?: string): Promise<SubCasteItem[]> {
  if (!casteId) return [];
  const params: any = { casteId };
  if (search) params.search = search;
  const res = await apiClient.get('/community/sub-castes', { params });
  return res.data?.data || [];
}

export async function fetchLanguages(search?: string): Promise<LanguageItem[]> {
  const params: any = {};
  if (search) params.search = search;
  const res = await apiClient.get('/community/languages', { params });
  return res.data?.data || [];
}

// ─── ADMIN MASTER DATA APIS ───

export async function fetchMasterDataSummary(): Promise<Record<string, number>> {
  const res = await apiClient.get('/admin/master-data/summary');
  return res.data?.data || {};
}

export async function fetchMasterDataItems(params: {
  entity: string;
  parentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<any>> {
  const res = await apiClient.get('/admin/master-data/items', { params });
  return {
    data: res.data?.data || [],
    pagination: res.data?.pagination || { total: 0, page: 1, limit: 50, pages: 1 },
  };
}

export async function createMasterDataItem(entity: string, data: any): Promise<any> {
  const res = await apiClient.post('/admin/master-data/items', { entity, data });
  return res.data?.data;
}

export async function updateMasterDataItem(entity: string, id: string, data: any): Promise<any> {
  const res = await apiClient.put(`/admin/master-data/items/${id}`, { entity, data });
  return res.data?.data;
}

export async function deleteMasterDataItem(entity: string, id: string, permanent: boolean = false): Promise<any> {
  const res = await apiClient.delete(`/admin/master-data/items/${id}`, {
    params: { entity, permanent: String(permanent) },
  });
  return res.data;
}

export async function importMasterData(type: 'locations' | 'castes', records: any[]): Promise<ImportReport> {
  const res = await apiClient.post('/admin/master-data/import', { type, records });
  return res.data?.report;
}
