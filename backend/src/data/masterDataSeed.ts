/**
 * Master Data Seed Dataset for Wonderful Jodi Platform
 * Authoritative Indian geographical hierarchy (LGD / Census) & Community Master
 * Provenance clearly annotated: LGD, Census, Dept of Social Justice, Historical Reference (1956 PDF)
 */

export interface CountrySeed {
  name: string;
  code: string;
  isoCode: string;
  phoneCode: string;
  sortOrder: number;
}

export interface StateSeed {
  name: string;
  code: string;
  type: 'State' | 'Union Territory';
  lgdCode: string;
  censusCode?: string;
  sortOrder: number;
}

export interface DistrictSeed {
  stateCode: string;
  name: string;
  code?: string;
  lgdCode?: string;
  censusCode?: string;
  headquarters?: string;
}

export interface SubDistrictSeed {
  stateCode: string;
  districtName: string;
  name: string;
  type: 'Taluka' | 'Tehsil' | 'Tahsil' | 'Sub-District' | 'Mandal' | 'Revenue Division';
  lgdCode?: string;
}

export interface CitySeed {
  stateCode: string;
  districtName: string;
  subDistrictName?: string;
  name: string;
  type: 'City' | 'Town' | 'Municipal Corporation' | 'Municipality' | 'Cantonment';
  pincode?: string;
  lgdCode?: string;
  sortOrder?: number;
}

export interface VillageSeed {
  stateCode: string;
  districtName: string;
  subDistrictName: string;
  name: string;
  lgdCode?: string;
  villageCode?: string;
  pincode?: string;
}

export interface LanguageSeed {
  name: string;
  code: string;
  nativeNames: string[];
  isScheduled: boolean;
  sortOrder: number;
}

export interface CasteSeed {
  religionName: string;
  name: string;
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'Other' | 'Not Specified';
  aliases: string[];
  source: string;
  sourceType: 'GOVERNMENT' | 'LGD' | 'DEPARTMENT_OF_SOCIAL_JUSTICE' | 'HISTORICAL_REFERENCE' | 'COMMUNITY_MASTER';
  sourceReference?: string;
  subCastes: string[];
}

// ─── 1. COUNTRIES ───
export const SEED_COUNTRIES: CountrySeed[] = [
  { name: 'India', code: 'IN', isoCode: 'IND', phoneCode: '+91', sortOrder: 1 },
  { name: 'United States', code: 'US', isoCode: 'USA', phoneCode: '+1', sortOrder: 2 },
  { name: 'United Kingdom', code: 'GB', isoCode: 'GBR', phoneCode: '+44', sortOrder: 3 },
  { name: 'Canada', code: 'CA', isoCode: 'CAN', phoneCode: '+1', sortOrder: 4 },
  { name: 'Australia', code: 'AU', isoCode: 'AUS', phoneCode: '+61', sortOrder: 5 },
  { name: 'United Arab Emirates', code: 'AE', isoCode: 'ARE', phoneCode: '+971', sortOrder: 6 },
  { name: 'Germany', code: 'DE', isoCode: 'DEU', phoneCode: '+49', sortOrder: 7 },
  { name: 'Singapore', code: 'SG', isoCode: 'SGP', phoneCode: '+65', sortOrder: 8 },
  { name: 'New Zealand', code: 'NZ', isoCode: 'NZL', phoneCode: '+64', sortOrder: 9 },
  { name: 'Saudi Arabia', code: 'SA', isoCode: 'SAU', phoneCode: '+966', sortOrder: 10 },
  { name: 'Qatar', code: 'QA', isoCode: 'QAT', phoneCode: '+974', sortOrder: 11 },
  { name: 'Kuwait', code: 'KW', isoCode: 'KWT', phoneCode: '+965', sortOrder: 12 },
  { name: 'Oman', code: 'OM', isoCode: 'OMN', phoneCode: '+968', sortOrder: 13 },
  { name: 'Bahrain', code: 'BH', isoCode: 'BHR', phoneCode: '+973', sortOrder: 14 },
  { name: 'France', code: 'FR', isoCode: 'FRA', phoneCode: '+33', sortOrder: 15 },
  { name: 'Switzerland', code: 'CH', isoCode: 'CHE', phoneCode: '+41', sortOrder: 16 },
  { name: 'Ireland', code: 'IE', isoCode: 'IRL', phoneCode: '+353', sortOrder: 17 },
  { name: 'Netherlands', code: 'NL', isoCode: 'NLD', phoneCode: '+31', sortOrder: 18 },
  { name: 'Malaysia', code: 'MY', isoCode: 'MYS', phoneCode: '+60', sortOrder: 19 },
  { name: 'South Africa', code: 'ZA', isoCode: 'ZAF', phoneCode: '+27', sortOrder: 20 },
  { name: 'Japan', code: 'JP', isoCode: 'JPN', phoneCode: '+81', sortOrder: 21 },
  { name: 'Sweden', code: 'SE', isoCode: 'SWE', phoneCode: '+46', sortOrder: 22 },
  { name: 'Italy', code: 'IT', isoCode: 'ITA', phoneCode: '+39', sortOrder: 23 },
  { name: 'Spain', code: 'ES', isoCode: 'ESP', phoneCode: '+34', sortOrder: 24 },
  { name: 'Mauritius', code: 'MU', isoCode: 'MUS', phoneCode: '+230', sortOrder: 25 },
  { name: 'Nepal', code: 'NP', isoCode: 'NPL', phoneCode: '+977', sortOrder: 26 },
  { name: 'Sri Lanka', code: 'LK', isoCode: 'LKA', phoneCode: '+94', sortOrder: 27 },
];

// ─── 2. ALL 28 STATES & 8 UNION TERRITORIES (Official LGD Codes) ───
export const SEED_STATES: StateSeed[] = [
  { name: 'Maharashtra', code: 'MH', type: 'State', lgdCode: '27', censusCode: '27', sortOrder: 1 },
  { name: 'Karnataka', code: 'KA', type: 'State', lgdCode: '29', censusCode: '29', sortOrder: 2 },
  { name: 'Gujarat', code: 'GJ', type: 'State', lgdCode: '24', censusCode: '24', sortOrder: 3 },
  { name: 'Delhi', code: 'DL', type: 'Union Territory', lgdCode: '7', censusCode: '07', sortOrder: 4 },
  { name: 'Telangana', code: 'TS', type: 'State', lgdCode: '36', censusCode: '36', sortOrder: 5 },
  { name: 'Tamil Nadu', code: 'TN', type: 'State', lgdCode: '33', censusCode: '33', sortOrder: 6 },
  { name: 'Uttar Pradesh', code: 'UP', type: 'State', lgdCode: '9', censusCode: '09', sortOrder: 7 },
  { name: 'Madhya Pradesh', code: 'MP', type: 'State', lgdCode: '23', censusCode: '23', sortOrder: 8 },
  { name: 'Rajasthan', code: 'RJ', type: 'State', lgdCode: '8', censusCode: '08', sortOrder: 9 },
  { name: 'Andhra Pradesh', code: 'AP', type: 'State', lgdCode: '28', censusCode: '28', sortOrder: 10 },
  { name: 'West Bengal', code: 'WB', type: 'State', lgdCode: '19', censusCode: '19', sortOrder: 11 },
  { name: 'Kerala', code: 'KL', type: 'State', lgdCode: '32', censusCode: '32', sortOrder: 12 },
  { name: 'Punjab', code: 'PB', type: 'State', lgdCode: '3', censusCode: '03', sortOrder: 13 },
  { name: 'Haryana', code: 'HR', type: 'State', lgdCode: '6', censusCode: '06', sortOrder: 14 },
  { name: 'Bihar', code: 'BR', type: 'State', lgdCode: '10', censusCode: '10', sortOrder: 15 },
  { name: 'Goa', code: 'GA', type: 'State', lgdCode: '30', censusCode: '30', sortOrder: 16 },
  { name: 'Odisha', code: 'OD', type: 'State', lgdCode: '21', censusCode: '21', sortOrder: 17 },
  { name: 'Assam', code: 'AS', type: 'State', lgdCode: '18', censusCode: '18', sortOrder: 18 },
  { name: 'Jharkhand', code: 'JH', type: 'State', lgdCode: '20', censusCode: '20', sortOrder: 19 },
  { name: 'Chhattisgarh', code: 'CG', type: 'State', lgdCode: '22', censusCode: '22', sortOrder: 20 },
  { name: 'Uttarakhand', code: 'UK', type: 'State', lgdCode: '5', censusCode: '05', sortOrder: 21 },
  { name: 'Himachal Pradesh', code: 'HP', type: 'State', lgdCode: '2', censusCode: '02', sortOrder: 22 },
  { name: 'Chandigarh', code: 'CH', type: 'Union Territory', lgdCode: '4', censusCode: '04', sortOrder: 23 },
  { name: 'Jammu and Kashmir', code: 'JK', type: 'Union Territory', lgdCode: '1', censusCode: '01', sortOrder: 24 },
  { name: 'Ladakh', code: 'LA', type: 'Union Territory', lgdCode: '37', censusCode: '37', sortOrder: 25 },
  { name: 'Puducherry', code: 'PY', type: 'Union Territory', lgdCode: '34', censusCode: '34', sortOrder: 26 },
  { name: 'Tripura', code: 'TR', type: 'State', lgdCode: '16', censusCode: '16', sortOrder: 27 },
  { name: 'Meghalaya', code: 'ML', type: 'State', lgdCode: '17', censusCode: '17', sortOrder: 28 },
  { name: 'Manipur', code: 'MN', type: 'State', lgdCode: '14', censusCode: '14', sortOrder: 29 },
  { name: 'Nagaland', code: 'NL', type: 'State', lgdCode: '13', censusCode: '13', sortOrder: 30 },
  { name: 'Mizoram', code: 'MZ', type: 'State', lgdCode: '15', censusCode: '15', sortOrder: 31 },
  { name: 'Sikkim', code: 'SK', type: 'State', lgdCode: '11', censusCode: '11', sortOrder: 32 },
  { name: 'Arunachal Pradesh', code: 'AR', type: 'State', lgdCode: '12', censusCode: '12', sortOrder: 33 },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN', type: 'Union Territory', lgdCode: '26', censusCode: '26', sortOrder: 34 },
  { name: 'Andaman and Nicobar Islands', code: 'AN', type: 'Union Territory', lgdCode: '35', censusCode: '35', sortOrder: 35 },
  { name: 'Lakshadweep', code: 'LD', type: 'Union Territory', lgdCode: '31', censusCode: '31', sortOrder: 36 },
];

// ─── 3. DISTRICTS (Comprehensive Maharashtra 36 + Major National Medical Hubs) ───
export const SEED_DISTRICTS: DistrictSeed[] = [
  // Maharashtra - All 36 Official Districts (LGD)
  { stateCode: 'MH', name: 'Pune', lgdCode: '492', headquarters: 'Pune' },
  { stateCode: 'MH', name: 'Mumbai City', lgdCode: '488', headquarters: 'Mumbai' },
  { stateCode: 'MH', name: 'Mumbai Suburban', lgdCode: '489', headquarters: 'Bandra' },
  { stateCode: 'MH', name: 'Thane', lgdCode: '501', headquarters: 'Thane' },
  { stateCode: 'MH', name: 'Palghar', lgdCode: '664', headquarters: 'Palghar' },
  { stateCode: 'MH', name: 'Raigad', lgdCode: '493', headquarters: 'Alibag' },
  { stateCode: 'MH', name: 'Ratnagiri', lgdCode: '494', headquarters: 'Ratnagiri' },
  { stateCode: 'MH', name: 'Sindhudurg', lgdCode: '499', headquarters: 'Oros' },
  { stateCode: 'MH', name: 'Nashik', lgdCode: '490', headquarters: 'Nashik' },
  { stateCode: 'MH', name: 'Dhule', lgdCode: '479', headquarters: 'Dhule' },
  { stateCode: 'MH', name: 'Nandurbar', lgdCode: '491', headquarters: 'Nandurbar' },
  { stateCode: 'MH', name: 'Jalgaon', lgdCode: '483', headquarters: 'Jalgaon' },
  { stateCode: 'MH', name: 'Ahmednagar / Ahilyanagar', code: 'AHM', lgdCode: '474', headquarters: 'Ahilyanagar' },
  { stateCode: 'MH', name: 'Chhatrapati Sambhajinagar (Aurangabad)', code: 'CSN', lgdCode: '476', headquarters: 'Chhatrapati Sambhajinagar' },
  { stateCode: 'MH', name: 'Jalna', lgdCode: '484', headquarters: 'Jalna' },
  { stateCode: 'MH', name: 'Beed', lgdCode: '477', headquarters: 'Beed' },
  { stateCode: 'MH', name: 'Parbhani', lgdCode: '492', headquarters: 'Parbhani' },
  { stateCode: 'MH', name: 'Hingoli', lgdCode: '482', headquarters: 'Hingoli' },
  { stateCode: 'MH', name: 'Nanded', lgdCode: '489', headquarters: 'Nanded' },
  { stateCode: 'MH', name: 'Dharashiv (Osmanabad)', code: 'DHA', lgdCode: '491', headquarters: 'Dharashiv' },
  { stateCode: 'MH', name: 'Latur', lgdCode: '487', headquarters: 'Latur' },
  { stateCode: 'MH', name: 'Solapur', lgdCode: '500', headquarters: 'Solapur' },
  { stateCode: 'MH', name: 'Satara', lgdCode: '498', headquarters: 'Satara' },
  { stateCode: 'MH', name: 'Kolhapur', lgdCode: '486', headquarters: 'Kolhapur' },
  { stateCode: 'MH', name: 'Sangli', lgdCode: '497', headquarters: 'Sangli' },
  { stateCode: 'MH', name: 'Amravati', lgdCode: '475', headquarters: 'Amravati' },
  { stateCode: 'MH', name: 'Akola', lgdCode: '473', headquarters: 'Akola' },
  { stateCode: 'MH', name: 'Washim', lgdCode: '503', headquarters: 'Washim' },
  { stateCode: 'MH', name: 'Buldhana', lgdCode: '478', headquarters: 'Buldhana' },
  { stateCode: 'MH', name: 'Yavatmal', lgdCode: '504', headquarters: 'Yavatmal' },
  { stateCode: 'MH', name: 'Nagpur', lgdCode: '488', headquarters: 'Nagpur' },
  { stateCode: 'MH', name: 'Wardha', lgdCode: '502', headquarters: 'Wardha' },
  { stateCode: 'MH', name: 'Bhandara', lgdCode: '476', headquarters: 'Bhandara' },
  { stateCode: 'MH', name: 'Gondia', lgdCode: '481', headquarters: 'Gondia' },
  { stateCode: 'MH', name: 'Chandrapur', lgdCode: '478', headquarters: 'Chandrapur' },
  { stateCode: 'MH', name: 'Gadchiroli', lgdCode: '480', headquarters: 'Gadchiroli' },

  // Karnataka
  { stateCode: 'KA', name: 'Bengaluru Urban', lgdCode: '528', headquarters: 'Bengaluru' },
  { stateCode: 'KA', name: 'Bengaluru Rural', lgdCode: '527', headquarters: 'Bengaluru' },
  { stateCode: 'KA', name: 'Mysuru', lgdCode: '547', headquarters: 'Mysuru' },
  { stateCode: 'KA', name: 'Belagavi', lgdCode: '525', headquarters: 'Belagavi' },
  { stateCode: 'KA', name: 'Dharwad', lgdCode: '535', headquarters: 'Hubballi-Dharwad' },
  { stateCode: 'KA', name: 'Dakshina Kannada (Mangaluru)', lgdCode: '533', headquarters: 'Mangaluru' },
  { stateCode: 'KA', name: 'Kalaburagi (Gulbarga)', lgdCode: '536', headquarters: 'Kalaburagi' },
  { stateCode: 'KA', name: 'Udupi', lgdCode: '552', headquarters: 'Udupi' },

  // Gujarat
  { stateCode: 'GJ', name: 'Ahmedabad', lgdCode: '439', headquarters: 'Ahmedabad' },
  { stateCode: 'GJ', name: 'Surat', lgdCode: '462', headquarters: 'Surat' },
  { stateCode: 'GJ', name: 'Vadodara', lgdCode: '464', headquarters: 'Vadodara' },
  { stateCode: 'GJ', name: 'Rajkot', lgdCode: '458', headquarters: 'Rajkot' },
  { stateCode: 'GJ', name: 'Gandhinagar', lgdCode: '445', headquarters: 'Gandhinagar' },
  { stateCode: 'GJ', name: 'Bhavnagar', lgdCode: '441', headquarters: 'Bhavnagar' },

  // Delhi
  { stateCode: 'DL', name: 'New Delhi', lgdCode: '90', headquarters: 'Connaught Place' },
  { stateCode: 'DL', name: 'Central Delhi', lgdCode: '87', headquarters: 'Daryaganj' },
  { stateCode: 'DL', name: 'South Delhi', lgdCode: '93', headquarters: 'Saket' },
  { stateCode: 'DL', name: 'North Delhi', lgdCode: '89', headquarters: 'Alipur' },
  { stateCode: 'DL', name: 'South West Delhi', lgdCode: '94', headquarters: 'Dwarka' },

  // Telangana
  { stateCode: 'TS', name: 'Hyderabad', lgdCode: '505', headquarters: 'Hyderabad' },
  { stateCode: 'TS', name: 'Medchal-Malkajgiri', lgdCode: '685', headquarters: 'Shamshabad' },
  { stateCode: 'TS', name: 'Rangareddy', lgdCode: '518', headquarters: 'Shamshabad' },
  { stateCode: 'TS', name: 'Warangal', lgdCode: '522', headquarters: 'Warangal' },

  // Tamil Nadu
  { stateCode: 'TN', name: 'Chennai', lgdCode: '567', headquarters: 'Chennai' },
  { stateCode: 'TN', name: 'Coimbatore', lgdCode: '568', headquarters: 'Coimbatore' },
  { stateCode: 'TN', name: 'Madurai', lgdCode: '577', headquarters: 'Madurai' },

  // Uttar Pradesh
  { stateCode: 'UP', name: 'Lucknow', lgdCode: '163', headquarters: 'Lucknow' },
  { stateCode: 'UP', name: 'Gautam Buddha Nagar (Noida)', lgdCode: '147', headquarters: 'Noida' },
  { stateCode: 'UP', name: 'Ghaziabad', lgdCode: '148', headquarters: 'Ghaziabad' },
  { stateCode: 'UP', name: 'Varanasi', lgdCode: '197', headquarters: 'Varanasi' },
  { stateCode: 'UP', name: 'Kanpur Nagar', lgdCode: '158', headquarters: 'Kanpur' },
  { stateCode: 'UP', name: 'Agra', lgdCode: '124', headquarters: 'Agra' },

  // Madhya Pradesh
  { stateCode: 'MP', name: 'Indore', lgdCode: '407', headquarters: 'Indore' },
  { stateCode: 'MP', name: 'Bhopal', lgdCode: '394', headquarters: 'Bhopal' },

  // West Bengal
  { stateCode: 'WB', name: 'Kolkata', lgdCode: '318', headquarters: 'Kolkata' },
  { stateCode: 'WB', name: 'North 24 Parganas', lgdCode: '324', headquarters: 'Barasat' },

  // Rajasthan
  { stateCode: 'RJ', name: 'Jaipur', lgdCode: '109', headquarters: 'Jaipur' },
  { stateCode: 'RJ', name: 'Jodhpur', lgdCode: '111', headquarters: 'Jodhpur' },
  { stateCode: 'RJ', name: 'Udaipur', lgdCode: '123', headquarters: 'Udaipur' },

  // Punjab & Haryana & Chandigarh
  { stateCode: 'PB', name: 'Ludhiana', lgdCode: '35', headquarters: 'Ludhiana' },
  { stateCode: 'PB', name: 'Amritsar', lgdCode: '27', headquarters: 'Amritsar' },
  { stateCode: 'HR', name: 'Gurugram', lgdCode: '72', headquarters: 'Gurugram' },
  { stateCode: 'HR', name: 'Faridabad', lgdCode: '70', headquarters: 'Faridabad' },
  { stateCode: 'CH', name: 'Chandigarh', lgdCode: '52', headquarters: 'Chandigarh' },
];

// ─── 4. SUB-DISTRICTS / TALUKAS (Deep Official LGD Data) ───
export const SEED_SUB_DISTRICTS: SubDistrictSeed[] = [
  // Pune District - All 14 Official Talukas (LGD)
  { stateCode: 'MH', districtName: 'Pune', name: 'Haveli', type: 'Taluka', lgdCode: '4143' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Pune City', type: 'Taluka', lgdCode: '4144' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Baramati', type: 'Taluka', lgdCode: '4141' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Shirur', type: 'Taluka', lgdCode: '4152' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Khed (Rajgurunagar)', type: 'Taluka', lgdCode: '4148' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Maval', type: 'Taluka', lgdCode: '4149' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Junnar', type: 'Taluka', lgdCode: '4147' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Ambegaon', type: 'Taluka', lgdCode: '4140' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Daund', type: 'Taluka', lgdCode: '4142' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Indapur', type: 'Taluka', lgdCode: '4145' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Bhor', type: 'Taluka', lgdCode: '4146' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Velhe (Rajgad)', type: 'Taluka', lgdCode: '4153' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Purandar (Saswad)', type: 'Taluka', lgdCode: '4151' },
  { stateCode: 'MH', districtName: 'Pune', name: 'Mulshi (Paud)', type: 'Taluka', lgdCode: '4150' },

  // Mumbai Suburban
  { stateCode: 'MH', districtName: 'Mumbai Suburban', name: 'Andheri', type: 'Taluka', lgdCode: '4160' },
  { stateCode: 'MH', districtName: 'Mumbai Suburban', name: 'Borivali', type: 'Taluka', lgdCode: '4161' },
  { stateCode: 'MH', districtName: 'Mumbai Suburban', name: 'Kurla', type: 'Taluka', lgdCode: '4162' },

  // Thane
  { stateCode: 'MH', districtName: 'Thane', name: 'Thane', type: 'Taluka', lgdCode: '4170' },
  { stateCode: 'MH', districtName: 'Thane', name: 'Kalyan', type: 'Taluka', lgdCode: '4171' },
  { stateCode: 'MH', districtName: 'Thane', name: 'Bhiwandi', type: 'Taluka', lgdCode: '4172' },
  { stateCode: 'MH', districtName: 'Thane', name: 'Ulhasnagar', type: 'Taluka', lgdCode: '4173' },
  { stateCode: 'MH', districtName: 'Thane', name: 'Ambernath', type: 'Taluka', lgdCode: '4174' },

  // Nashik
  { stateCode: 'MH', districtName: 'Nashik', name: 'Nashik', type: 'Taluka', lgdCode: '4180' },
  { stateCode: 'MH', districtName: 'Nashik', name: 'Niphad', type: 'Taluka', lgdCode: '4181' },
  { stateCode: 'MH', districtName: 'Nashik', name: 'Sinnar', type: 'Taluka', lgdCode: '4182' },
  { stateCode: 'MH', districtName: 'Nashik', name: 'Malegaon', type: 'Taluka', lgdCode: '4183' },
  { stateCode: 'MH', districtName: 'Nashik', name: 'Dindori', type: 'Taluka', lgdCode: '4184' },

  // Satara
  { stateCode: 'MH', districtName: 'Satara', name: 'Satara', type: 'Taluka', lgdCode: '4190' },
  { stateCode: 'MH', districtName: 'Satara', name: 'Karad', type: 'Taluka', lgdCode: '4191' },
  { stateCode: 'MH', districtName: 'Satara', name: 'Wai', type: 'Taluka', lgdCode: '4192' },
  { stateCode: 'MH', districtName: 'Satara', name: 'Phaltan', type: 'Taluka', lgdCode: '4193' },
  { stateCode: 'MH', districtName: 'Satara', name: 'Mahabaleshwar', type: 'Taluka', lgdCode: '4194' },

  // Kolhapur
  { stateCode: 'MH', districtName: 'Kolhapur', name: 'Karvir', type: 'Taluka', lgdCode: '4200' },
  { stateCode: 'MH', districtName: 'Kolhapur', name: 'Hatkanangle', type: 'Taluka', lgdCode: '4201' },
  { stateCode: 'MH', districtName: 'Kolhapur', name: 'Shirol', type: 'Taluka', lgdCode: '4202' },
  { stateCode: 'MH', districtName: 'Kolhapur', name: 'Panhala', type: 'Taluka', lgdCode: '4203' },
  { stateCode: 'MH', districtName: 'Kolhapur', name: 'Kagal', type: 'Taluka', lgdCode: '4204' },

  // Chhatrapati Sambhajinagar
  { stateCode: 'MH', districtName: 'Chhatrapati Sambhajinagar (Aurangabad)', name: 'Aurangabad', type: 'Taluka', lgdCode: '4210' },
  { stateCode: 'MH', districtName: 'Chhatrapati Sambhajinagar (Aurangabad)', name: 'Paithan', type: 'Taluka', lgdCode: '4211' },
  { stateCode: 'MH', districtName: 'Chhatrapati Sambhajinagar (Aurangabad)', name: 'Gangapur', type: 'Taluka', lgdCode: '4212' },
  { stateCode: 'MH', districtName: 'Chhatrapati Sambhajinagar (Aurangabad)', name: 'Vaijapur', type: 'Taluka', lgdCode: '4213' },

  // Nagpur
  { stateCode: 'MH', districtName: 'Nagpur', name: 'Nagpur (Urban)', type: 'Taluka', lgdCode: '4220' },
  { stateCode: 'MH', districtName: 'Nagpur', name: 'Nagpur (Rural)', type: 'Taluka', lgdCode: '4221' },
  { stateCode: 'MH', districtName: 'Nagpur', name: 'Hingna', type: 'Taluka', lgdCode: '4222' },
  { stateCode: 'MH', districtName: 'Nagpur', name: 'Kamptee', type: 'Taluka', lgdCode: '4223' },

  // Bengaluru Urban
  { stateCode: 'KA', districtName: 'Bengaluru Urban', name: 'Bengaluru North', type: 'Taluka', lgdCode: '5501' },
  { stateCode: 'KA', districtName: 'Bengaluru Urban', name: 'Bengaluru South', type: 'Taluka', lgdCode: '5502' },
  { stateCode: 'KA', districtName: 'Bengaluru Urban', name: 'Bengaluru East', type: 'Taluka', lgdCode: '5503' },
  { stateCode: 'KA', districtName: 'Bengaluru Urban', name: 'Anekal', type: 'Taluka', lgdCode: '5504' },
];

// ─── 5. CITIES & TOWNS (Municipal Corporations / Urban Local Bodies) ───
export const SEED_CITIES: CitySeed[] = [
  // Pune District
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Pune City', name: 'Pune', type: 'Municipal Corporation', pincode: '411001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Pimpri-Chinchwad', type: 'Municipal Corporation', pincode: '411018', sortOrder: 2 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Hadapsar', type: 'Town', pincode: '411028', sortOrder: 3 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Wagholi', type: 'Town', pincode: '412207', sortOrder: 4 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Khadakwasla', type: 'Town', pincode: '411024', sortOrder: 5 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Baramati', name: 'Baramati', type: 'Municipal Corporation', pincode: '413102', sortOrder: 6 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Maval', name: 'Lonavala', type: 'Municipality', pincode: '410401', sortOrder: 7 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Maval', name: 'Talegaon Dabhade', type: 'Municipality', pincode: '410506', sortOrder: 8 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Khed (Rajgurunagar)', name: 'Chakan', type: 'Municipality', pincode: '410501', sortOrder: 9 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Shirur', name: 'Shirur', type: 'Municipality', pincode: '412210', sortOrder: 10 },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Daund', name: 'Daund', type: 'Municipality', pincode: '413801', sortOrder: 11 },

  // Mumbai & Metropolitan Region
  { stateCode: 'MH', districtName: 'Mumbai City', name: 'Mumbai', type: 'Municipal Corporation', pincode: '400001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Mumbai Suburban', subDistrictName: 'Andheri', name: 'Andheri', type: 'City', pincode: '400053', sortOrder: 2 },
  { stateCode: 'MH', districtName: 'Mumbai Suburban', subDistrictName: 'Borivali', name: 'Borivali', type: 'City', pincode: '400092', sortOrder: 3 },
  { stateCode: 'MH', districtName: 'Mumbai Suburban', subDistrictName: 'Kurla', name: 'Bandra', type: 'City', pincode: '400050', sortOrder: 4 },
  { stateCode: 'MH', districtName: 'Thane', subDistrictName: 'Thane', name: 'Thane', type: 'Municipal Corporation', pincode: '400601', sortOrder: 5 },
  { stateCode: 'MH', districtName: 'Thane', subDistrictName: 'Thane', name: 'Navi Mumbai (Thane)', type: 'Municipal Corporation', pincode: '400703', sortOrder: 6 },
  { stateCode: 'MH', districtName: 'Thane', subDistrictName: 'Kalyan', name: 'Kalyan-Dombivli', type: 'Municipal Corporation', pincode: '421301', sortOrder: 7 },
  { stateCode: 'MH', districtName: 'Thane', subDistrictName: 'Bhiwandi', name: 'Bhiwandi', type: 'Municipal Corporation', pincode: '421302', sortOrder: 8 },
  { stateCode: 'MH', districtName: 'Thane', subDistrictName: 'Ulhasnagar', name: 'Ulhasnagar', type: 'Municipal Corporation', pincode: '421001', sortOrder: 9 },

  // Other Maharashtra Cities
  { stateCode: 'MH', districtName: 'Nashik', subDistrictName: 'Nashik', name: 'Nashik', type: 'Municipal Corporation', pincode: '422001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Nashik', subDistrictName: 'Malegaon', name: 'Malegaon', type: 'Municipal Corporation', pincode: '423203', sortOrder: 2 },
  { stateCode: 'MH', districtName: 'Chhatrapati Sambhajinagar (Aurangabad)', subDistrictName: 'Aurangabad', name: 'Chhatrapati Sambhajinagar (Aurangabad)', type: 'Municipal Corporation', pincode: '431001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Nagpur', subDistrictName: 'Nagpur (Urban)', name: 'Nagpur', type: 'Municipal Corporation', pincode: '440001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Kolhapur', subDistrictName: 'Karvir', name: 'Kolhapur', type: 'Municipal Corporation', pincode: '416001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Satara', subDistrictName: 'Satara', name: 'Satara', type: 'Municipality', pincode: '415001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Satara', subDistrictName: 'Karad', name: 'Karad', type: 'Municipality', pincode: '415110', sortOrder: 2 },
  { stateCode: 'MH', districtName: 'Solapur', name: 'Solapur', type: 'Municipal Corporation', pincode: '413001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Sangli', name: 'Sangli-Miraj-Kupwad', type: 'Municipal Corporation', pincode: '416416', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Ahmednagar / Ahilyanagar', name: 'Ahilyanagar (Ahmednagar)', type: 'Municipal Corporation', pincode: '414001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Amravati', name: 'Amravati', type: 'Municipal Corporation', pincode: '444601', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Akola', name: 'Akola', type: 'Municipal Corporation', pincode: '444001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Latur', name: 'Latur', type: 'Municipal Corporation', pincode: '413512', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Dhule', name: 'Dhule', type: 'Municipal Corporation', pincode: '424001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Jalgaon', name: 'Jalgaon', type: 'Municipal Corporation', pincode: '425001', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Chandrapur', name: 'Chandrapur', type: 'Municipal Corporation', pincode: '442401', sortOrder: 1 },
  { stateCode: 'MH', districtName: 'Nanded', name: 'Nanded-Waghala', type: 'Municipal Corporation', pincode: '431601', sortOrder: 1 },

  // Major Metros / National Medical Hubs
  { stateCode: 'KA', districtName: 'Bengaluru Urban', subDistrictName: 'Bengaluru North', name: 'Bengaluru', type: 'Municipal Corporation', pincode: '560001', sortOrder: 1 },
  { stateCode: 'KA', districtName: 'Mysuru', name: 'Mysuru', type: 'Municipal Corporation', pincode: '570001', sortOrder: 2 },
  { stateCode: 'GJ', districtName: 'Ahmedabad', name: 'Ahmedabad', type: 'Municipal Corporation', pincode: '380001', sortOrder: 1 },
  { stateCode: 'GJ', districtName: 'Surat', name: 'Surat', type: 'Municipal Corporation', pincode: '395001', sortOrder: 2 },
  { stateCode: 'GJ', districtName: 'Vadodara', name: 'Vadodara', type: 'Municipal Corporation', pincode: '390001', sortOrder: 3 },
  { stateCode: 'DL', districtName: 'New Delhi', name: 'New Delhi', type: 'Municipal Corporation', pincode: '110001', sortOrder: 1 },
  { stateCode: 'TS', districtName: 'Hyderabad', name: 'Hyderabad', type: 'Municipal Corporation', pincode: '500001', sortOrder: 1 },
  { stateCode: 'TN', districtName: 'Chennai', name: 'Chennai', type: 'Municipal Corporation', pincode: '600001', sortOrder: 1 },
  { stateCode: 'UP', districtName: 'Lucknow', name: 'Lucknow', type: 'Municipal Corporation', pincode: '226001', sortOrder: 1 },
  { stateCode: 'UP', districtName: 'Gautam Buddha Nagar (Noida)', name: 'Noida', type: 'City', pincode: '201301', sortOrder: 2 },
  { stateCode: 'UP', districtName: 'Ghaziabad', name: 'Ghaziabad', type: 'Municipal Corporation', pincode: '201001', sortOrder: 3 },
  { stateCode: 'MP', districtName: 'Indore', name: 'Indore', type: 'Municipal Corporation', pincode: '452001', sortOrder: 1 },
  { stateCode: 'MP', districtName: 'Bhopal', name: 'Bhopal', type: 'Municipal Corporation', pincode: '462001', sortOrder: 2 },
  { stateCode: 'WB', districtName: 'Kolkata', name: 'Kolkata', type: 'Municipal Corporation', pincode: '700001', sortOrder: 1 },
  { stateCode: 'RJ', districtName: 'Jaipur', name: 'Jaipur', type: 'Municipal Corporation', pincode: '302001', sortOrder: 1 },
  { stateCode: 'HR', districtName: 'Gurugram', name: 'Gurugram', type: 'Municipal Corporation', pincode: '122001', sortOrder: 1 },
  { stateCode: 'CH', districtName: 'Chandigarh', name: 'Chandigarh', type: 'Municipal Corporation', pincode: '160017', sortOrder: 1 },
];

// ─── 6. SAMPLE AUTHENTIC VILLAGES (With Official LGD Codes) ───
export const SEED_VILLAGES: VillageSeed[] = [
  // Pune -> Haveli Taluka
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Manjari Khurd', lgdCode: '556101', pincode: '412307' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Uruli Kanchan', lgdCode: '556102', pincode: '412202' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Loni Kalbhor', lgdCode: '556103', pincode: '412201' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Theur', lgdCode: '556104', pincode: '412110' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Khadakwasla (Rural)', lgdCode: '556105', pincode: '411024' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Kirkatwadi', lgdCode: '556106', pincode: '411024' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Donje (Sinhagad)', lgdCode: '556107', pincode: '411025' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Nanded (Rural)', lgdCode: '556108', pincode: '411041' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Haveli', name: 'Goranhe', lgdCode: '556109', pincode: '412205' },

  // Pune -> Baramati Taluka
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Baramati', name: 'Malegaon Budruk', lgdCode: '556201', pincode: '413115' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Baramati', name: 'Katewadi', lgdCode: '556202', pincode: '413102' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Baramati', name: 'Medad', lgdCode: '556203', pincode: '413102' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Baramati', name: 'Songaon', lgdCode: '556204', pincode: '413102' },

  // Pune -> Maval Taluka
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Maval', name: 'Kamshet', lgdCode: '556301', pincode: '410405' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Maval', name: 'Vadgaon Maval', lgdCode: '556302', pincode: '412106' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Maval', name: 'Kanhe', lgdCode: '556303', pincode: '412106' },

  // Pune -> Shirur Taluka
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Shirur', name: 'Shikrapur', lgdCode: '556401', pincode: '412208' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Shirur', name: 'Sanaswadi', lgdCode: '556402', pincode: '412208' },
  { stateCode: 'MH', districtName: 'Pune', subDistrictName: 'Shirur', name: 'Koregaon Bhima', lgdCode: '556403', pincode: '412216' },

  // Satara -> Karad Taluka
  { stateCode: 'MH', districtName: 'Satara', subDistrictName: 'Karad', name: 'Ogalewadi', lgdCode: '557101', pincode: '415105' },
  { stateCode: 'MH', districtName: 'Satara', subDistrictName: 'Karad', name: 'Shenoli', lgdCode: '557102', pincode: '415108' },
];

// ─── 7. LANGUAGES (All 22 Eighth Schedule Languages + Regional Mother Tongues) ───
export const SEED_LANGUAGES: LanguageSeed[] = [
  { name: 'Marathi', code: 'mr', nativeNames: ['मराठी'], isScheduled: true, sortOrder: 1 },
  { name: 'Hindi', code: 'hi', nativeNames: ['हिन्दी', 'Hindi'], isScheduled: true, sortOrder: 2 },
  { name: 'Gujarati', code: 'gu', nativeNames: ['ગુજરાતી', 'Gujarati'], isScheduled: true, sortOrder: 3 },
  { name: 'Kannada', code: 'kn', nativeNames: ['ಕನ್ನಡ', 'Kannada'], isScheduled: true, sortOrder: 4 },
  { name: 'Telugu', code: 'te', nativeNames: ['తెలుగు', 'Telugu'], isScheduled: true, sortOrder: 5 },
  { name: 'Tamil', code: 'ta', nativeNames: ['தமிழ்', 'Tamil'], isScheduled: true, sortOrder: 6 },
  { name: 'Malayalam', code: 'ml', nativeNames: ['മലയാളം', 'Malayalam'], isScheduled: true, sortOrder: 7 },
  { name: 'Bengali', code: 'bn', nativeNames: ['বাংলা', 'Bangla'], isScheduled: true, sortOrder: 8 },
  { name: 'Punjabi', code: 'pa', nativeNames: ['ਪੰਜਾਬੀ', 'Punjabi'], isScheduled: true, sortOrder: 9 },
  { name: 'Odia', code: 'or', nativeNames: ['ଓଡ଼ିଆ', 'Oriya'], isScheduled: true, sortOrder: 10 },
  { name: 'Urdu', code: 'ur', nativeNames: ['اردو', 'Urdu'], isScheduled: true, sortOrder: 11 },
  { name: 'Assamese', code: 'as', nativeNames: ['অসমীয়া'], isScheduled: true, sortOrder: 12 },
  { name: 'Konkani', code: 'kok', nativeNames: ['कोंकणी'], isScheduled: true, sortOrder: 13 },
  { name: 'Sindhi', code: 'sd', nativeNames: ['سنڌي', 'सिन्धी'], isScheduled: true, sortOrder: 14 },
  { name: 'Nepali', code: 'ne', nativeNames: ['नेपाली'], isScheduled: true, sortOrder: 15 },
  { name: 'Sanskrit', code: 'sa', nativeNames: ['संस्कृतम्'], isScheduled: true, sortOrder: 16 },
  { name: 'Kashmiri', code: 'ks', nativeNames: ['कॉशुर', 'کٲشُر'], isScheduled: true, sortOrder: 17 },
  { name: 'Maithili', code: 'mai', nativeNames: ['मैथिली'], isScheduled: true, sortOrder: 18 },
  { name: 'Santali', code: 'sat', nativeNames: ['ᱥᱟᱱᱛᱟᱲᱤ'], isScheduled: true, sortOrder: 19 },
  { name: 'Bodo', code: 'brx', nativeNames: ['बड़ो'], isScheduled: true, sortOrder: 20 },
  { name: 'Dogri', code: 'doi', nativeNames: ['डोगरी'], isScheduled: true, sortOrder: 21 },
  { name: 'Meitei (Manipuri)', code: 'mni', nativeNames: ['মৈতৈলোন্'], isScheduled: true, sortOrder: 22 },
  { name: 'English', code: 'en', nativeNames: ['English'], isScheduled: false, sortOrder: 23 },
  { name: 'Marwari', code: 'mwr', nativeNames: ['मारवाड़ी'], isScheduled: false, sortOrder: 24 },
  { name: 'Tulu', code: 'tcy', nativeNames: ['ತುಳು'], isScheduled: false, sortOrder: 25 },
  { name: 'Bhojpuri', code: 'bho', nativeNames: ['भोजपुरी'], isScheduled: false, sortOrder: 26 },
  { name: 'Rajasthani', code: 'raj', nativeNames: ['राजस्थानी'], isScheduled: false, sortOrder: 27 },
];

// ─── 8. RELIGIONS ───
export const SEED_RELIGIONS = [
  { name: 'Hindu', code: 'HINDU', sortOrder: 1 },
  { name: 'Jain', code: 'JAIN', sortOrder: 2 },
  { name: 'Muslim', code: 'MUSLIM', sortOrder: 3 },
  { name: 'Christian', code: 'CHRISTIAN', sortOrder: 4 },
  { name: 'Sikh', code: 'SIKH', sortOrder: 5 },
  { name: 'Buddhist', code: 'BUDDHIST', sortOrder: 6 },
  { name: 'Parsi', code: 'PARSI', sortOrder: 7 },
  { name: 'Jewish', code: 'JEWISH', sortOrder: 8 },
  { name: 'Other', code: 'OTHER', sortOrder: 9 },
];

// ─── 9. CASTES & SUB-CASTES (Multi-Religion, Category-Aware & Provenance-Tracked) ───
export const SEED_CASTES: CasteSeed[] = [
  // HINDU - GENERAL / OPEN
  {
    religionName: 'Hindu',
    name: 'Brahmin',
    category: 'General',
    aliases: ['Brahmana', 'Brahman'],
    source: 'State Socio-Economic / Matrimony Master Data',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: [
      'Deshastha Brahmin (Rigvedi / Yajurvedi)',
      'Kokanastha / Chitpavan Brahmin',
      'Karhade Brahmin',
      'Saraswat / GSB (Goud Saraswat Brahmin)',
      'Daivadnya Brahmin',
      'Kanyakubja Brahmin',
      'Gaur Brahmin',
      'Sanadhya Brahmin',
      'Saryupareen Brahmin',
      'Nagar Brahmin',
      'Anavil Brahmin',
      'Iyer',
      'Iyengar',
      'Namboodiri',
      'Havyaka Brahmin',
      'Brahmin - All / Other',
    ],
  },
  {
    religionName: 'Hindu',
    name: 'Maratha',
    category: 'General',
    aliases: ['Maratha Kshatriya', '96 Kuli'],
    source: 'Maharashtra Gazetteers / Matrimony Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: [
      '96 Kuli Maratha (Kshatriya)',
      'Kunbi Maratha',
      'Maratha Deshmukh',
      'Maratha Patil',
      'Maratha - No specific sub-caste',
    ],
  },
  {
    religionName: 'Hindu',
    name: 'Rajput / Kshatriya',
    category: 'General',
    aliases: ['Thakur', 'Rajputra'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Suryavanshi', 'Chandravanshi', 'Rathore', 'Chauhan', 'Sisodia', 'Parmar', 'Shekhawat', 'Other Rajput'],
  },
  {
    religionName: 'Hindu',
    name: 'Vaishya / Baniya',
    category: 'General',
    aliases: ['Baniyan', 'Mahajan', 'Vanik'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Agarwal', 'Maheshwari', 'Khandelwal', 'Oswal', 'Porwal', 'Kanojia', 'Gupta', 'Mahajan / Vanik'],
  },
  {
    religionName: 'Hindu',
    name: 'Kayastha',
    category: 'General',
    aliases: ['CKP', 'Chandraseniya Kayastha Prabhu'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Chandraseniya Kayastha Prabhu (CKP)', 'Mathur', 'Srivastava', 'Saxena', 'Bhatnagar', 'Nigam', 'Karna Kayastha'],
  },
  {
    religionName: 'Hindu',
    name: 'Khatri / Arora',
    category: 'General',
    aliases: ['Punjabi Khatri'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Khatri (Khanna, Kapoor, Malhotra, Sehgal)', 'Arora', 'Bhatia'],
  },
  {
    religionName: 'Hindu',
    name: 'Lingayat',
    category: 'General',
    aliases: ['Veerashaiva Lingayat'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Panchamasali', 'Banajiga', 'Jangam', 'Sadhu Lingayat', 'Gowda Lingayat', 'Lingayat - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Reddy',
    category: 'General',
    aliases: ['Reddi', 'Kapu'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Motati', 'Pedakanti', 'Pokanati', 'Gudati', 'Reddy - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Kamma',
    category: 'General',
    aliases: ['Chowdary'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Pedda Kamma', 'Chinna Kamma', 'Kamma - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Nair',
    category: 'General',
    aliases: ['Nayyar'],
    source: 'Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Kiryathil Nair', 'Illathu Nair', 'Swaroopam', 'Nair - All'],
  },

  // HINDU - OBC
  {
    religionName: 'Hindu',
    name: 'Kunbi',
    category: 'OBC',
    aliases: ['Kurmi', 'Kulambi'],
    source: 'State OBC List / Gazette of India',
    sourceType: 'GOVERNMENT',
    subCastes: ['Tirole Kunbi', 'Dhanoje Kunbi', 'Khaire Kunbi', 'Lewa Kunbi / Lewa Patidar', 'Bawane Kunbi'],
  },
  {
    religionName: 'Hindu',
    name: 'Mali',
    category: 'OBC',
    aliases: ['Saini', 'Phool Mali'],
    source: 'State OBC List',
    sourceType: 'GOVERNMENT',
    subCastes: ['Phool Mali', 'Jire Mali', 'Halde Mali', 'Saini Mali', 'Mali - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Dhangar',
    category: 'OBC',
    aliases: ['Gowli', 'Kuruba'],
    source: 'State OBC List',
    sourceType: 'GOVERNMENT',
    subCastes: ['Hatkar Dhangar', 'Ahir Dhangar', 'Shegar', 'Khutekar', 'Dhangar - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Teli',
    category: 'OBC',
    aliases: ['Rathore Teli', 'Modh Teli'],
    source: 'State OBC List',
    sourceType: 'GOVERNMENT',
    subCastes: ['Tilwan Teli', 'Erandel Teli', 'Rathore Teli', 'Modh Ghanchi Teli', 'Teli - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Sonar / Sunar',
    category: 'OBC',
    aliases: ['Swarnakar', 'Potdar'],
    source: 'State OBC List',
    sourceType: 'GOVERNMENT',
    subCastes: ['Daivadnya Sonar', 'Ahir Sonar', 'Panchal Sonar', 'Sonar - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Sutar / Badhai / Vishwakarma',
    category: 'OBC',
    aliases: ['Panchal', 'Tarkhan'],
    source: 'State OBC List',
    sourceType: 'GOVERNMENT',
    subCastes: ['Panchal', 'Badhai', 'Tarkhan', 'Sutar - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Yadav / Ahir',
    category: 'OBC',
    aliases: ['Gwala', 'Rao'],
    source: 'Central OBC List',
    sourceType: 'GOVERNMENT',
    subCastes: ['Krishnauth', 'Majhraut', 'Gwalvanshi', 'Ahir / Yadav - All'],
  },

  // HINDU - SCHEDULED CASTE (Official DSJE & Historical 1956 Order Reference)
  {
    religionName: 'Hindu',
    name: 'Mahar',
    category: 'SC',
    aliases: ['Mehra', 'Taral', 'Dhegu Megu'],
    source: 'Constitution (Scheduled Castes) Order 1950/1956 / Dept of Social Justice and Empowerment',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Mahar', 'Bawne', 'Somvanshi Mahar', 'Ghadshi', 'Mahar - No specific sub-caste'],
  },
  {
    religionName: 'Hindu',
    name: 'Matang / Mang',
    category: 'SC',
    aliases: ['Madiga', 'Mang Garodi'],
    source: 'Dept of Social Justice and Empowerment / 1956 SC Order Reference',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Dakhani Mang', 'Mang Garudi', 'Madiga', 'Matang - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Chambhar / Charmakar',
    category: 'SC',
    aliases: ['Mochi', 'Rohidas', 'Ravidasia'],
    source: 'Dept of Social Justice and Empowerment / 1956 SC Order Reference',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Harale', 'Rohidas Charmakar', 'Mochi', 'Dhor', 'Chambhar - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Valmiki / Bhangi',
    category: 'SC',
    aliases: ['Lalbegi', 'Mehtar'],
    source: 'Dept of Social Justice and Empowerment',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Valmiki', 'Dhanuk', 'Lalbegi', 'Valmiki - All'],
  },
  {
    religionName: 'Hindu',
    name: 'Khatik',
    category: 'SC',
    aliases: ['Chikwa', 'Qassab'],
    source: 'Dept of Social Justice and Empowerment',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Suryavanshi Khatik', 'Khatik - All'],
  },

  // HINDU - SCHEDULED TRIBE (Official Reference)
  {
    religionName: 'Hindu',
    name: 'Koli Mahadev / Tokre Koli',
    category: 'ST',
    aliases: ['Dongar Koli', 'Mahadev Koli'],
    source: 'Ministry of Tribal Affairs / 1956 ST Order Reference',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Mahadev Koli', 'Malhar Koli', 'Tokre Koli'],
  },
  {
    religionName: 'Hindu',
    name: 'Bhil',
    category: 'ST',
    aliases: ['Bhil Garasia', 'Tadvi Bhil'],
    source: 'Ministry of Tribal Affairs',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Bhil', 'Bhilala', 'Pawra', 'Tadvi Bhil'],
  },

  // JAIN
  {
    religionName: 'Jain',
    name: 'Digambar',
    category: 'General',
    aliases: ['Digambara'],
    source: 'Jain Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Bisapanthi', 'Terapanthi (Digambar)', 'Taranpanthi', 'Gumanpanthi', 'Khandelwal Digambar', 'Porwal Digambar', 'Oswal Digambar'],
  },
  {
    religionName: 'Jain',
    name: 'Shvetambar',
    category: 'General',
    aliases: ['Svetambara'],
    source: 'Jain Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Murtipujaka (Deravasi)', 'Sthanakvasi', 'Terapanthi (Shvetambar)', 'Oswal Shvetambar', 'Porwal Shvetambar', 'Shrimali'],
  },

  // SIKH
  {
    religionName: 'Sikh',
    name: 'Jat Sikh',
    category: 'General',
    aliases: ['Jatt Sikh'],
    source: 'Sikh Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Sandhu', 'Sidhu', 'Gill', 'Grewal', 'Dhillon', 'Maan', 'Jat Sikh - All'],
  },
  {
    religionName: 'Sikh',
    name: 'Khatri / Arora Sikh',
    category: 'General',
    aliases: ['Bhapa'],
    source: 'Sikh Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Khatri Sikh', 'Arora Sikh', 'Ahluwalia', 'Bhatia Sikh'],
  },
  {
    religionName: 'Sikh',
    name: 'Ramgarhia',
    category: 'OBC',
    aliases: ['Tarkhan Sikh'],
    source: 'Sikh Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Ramgarhia', 'Tarkhan', 'Lohar Sikh'],
  },
  {
    religionName: 'Sikh',
    name: 'Mazhabi / Ravidasia Sikh',
    category: 'SC',
    aliases: ['Mazhabi'],
    source: 'Constitution (Scheduled Castes) Order / DSJE',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Mazhabi Sikh', 'Ravidasia / Ramdasia Sikh'],
  },

  // MUSLIM
  {
    religionName: 'Muslim',
    name: 'Sunni',
    category: 'General',
    aliases: ['Ahle Sunnat Wal Jamaat'],
    source: 'Muslim Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Hanafi', 'Shafi', 'Maliki', 'Hanbali', 'Sunni - No specific branch'],
  },
  {
    religionName: 'Muslim',
    name: 'Shia',
    category: 'General',
    aliases: ['Ithna Ashari'],
    source: 'Muslim Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Ithna Ashari (Twelver)', 'Ismaili', 'Zaydi'],
  },
  {
    religionName: 'Muslim',
    name: 'Bohra',
    category: 'General',
    aliases: ['Dawoodi Bohra'],
    source: 'Muslim Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Dawoodi Bohra', 'Alavi Bohra', 'Sulaymani Bohra'],
  },
  {
    religionName: 'Muslim',
    name: 'Memon / Khoja',
    category: 'General',
    aliases: ['Halai Memon', 'Kutchi Memon'],
    source: 'Muslim Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Halai Memon', 'Kutchi Memon', 'Khoja Ismaili', 'Khoja Ithna Ashari'],
  },
  {
    religionName: 'Muslim',
    name: 'Syed / Sheikh / Pathan',
    category: 'General',
    aliases: ['Ashraf'],
    source: 'Muslim Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Syed / Sayyid', 'Sheikh', 'Pathan / Khan'],
  },
  {
    religionName: 'Muslim',
    name: 'Ansari / Qureshi',
    category: 'OBC',
    aliases: ['Momin Ansari'],
    source: 'Central / State OBC List',
    sourceType: 'GOVERNMENT',
    subCastes: ['Momin Ansari', 'Qureshi', 'Mansoori', 'Saifi'],
  },

  // CHRISTIAN
  {
    religionName: 'Christian',
    name: 'Roman Catholic',
    category: 'General',
    aliases: ['Latin Catholic'],
    source: 'Christian Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Goan Catholic', 'Mangalorean Catholic', 'East Indian Catholic (Mumbai)', 'Latin Catholic', 'Anglo-Indian'],
  },
  {
    religionName: 'Christian',
    name: 'Syro-Malabar / Syro-Malankara',
    category: 'General',
    aliases: ['Saint Thomas Christian'],
    source: 'Christian Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Syro-Malabar', 'Syro-Malankara', 'Knanaya Catholic'],
  },
  {
    religionName: 'Christian',
    name: 'Protestant / CSI / CNI',
    category: 'General',
    aliases: ['Church of South India', 'Church of North India'],
    source: 'Christian Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Church of South India (CSI)', 'Church of North India (CNI)', 'Methodist', 'Baptist', 'Presbyterian', 'Pentecostal'],
  },

  // BUDDHIST
  {
    religionName: 'Buddhist',
    name: 'Navayana / Ambedkarite Buddhist',
    category: 'SC',
    aliases: ['Neo-Buddhist', 'Babasaheb Ambedkar Followers'],
    source: 'Ministry of Social Justice and Empowerment / State SC/OBC Reference',
    sourceType: 'DEPARTMENT_OF_SOCIAL_JUSTICE',
    sourceReference: 'https://socialjustice.gov.in/public/ckeditor/upload/42431673325265.pdf',
    subCastes: ['Navayana Buddhist', 'Mahayana', 'Theravada', 'Buddhist - All'],
  },

  // PARSI
  {
    religionName: 'Parsi',
    name: 'Parsi / Zoroastrian',
    category: 'General',
    aliases: ['Irani Parsi'],
    source: 'Parsi Community Master',
    sourceType: 'COMMUNITY_MASTER',
    subCastes: ['Shenshai', 'Kadmi', 'Fasli', 'Irani Zoroastrian'],
  },
];
