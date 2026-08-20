'use client';

import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Search,
  Filter,
  ShieldCheck,
  Eye,
  Edit,
  RefreshCw,
  X,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Heart,
  Image as ImageIcon
} from 'lucide-react';
import {
  fetchProfiles,
  fetchProfileById,
  updateProfile,
  AdminProfileItem
} from '../../../services/profileApi';

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<AdminProfileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [religionFilter, setReligionFilter] = useState('');
  const [verifFilter, setVerifFilter] = useState('');

  // Profile Viewer / Editor Modal
  const [selectedProfile, setSelectedProfile] = useState<AdminProfileItem | null>(null);
  const [editingProfile, setEditingProfile] = useState<AdminProfileItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await fetchProfiles({
        search: search.trim(),
        gender: genderFilter || undefined,
        religion: religionFilter || undefined,
        verificationStatus: verifFilter || undefined,
        page,
        limit: 15,
      });
      setProfiles(data.profiles);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [page, genderFilter, religionFilter, verifFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProfiles();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSaveLoading(true);
    try {
      const updated = await updateProfile(editingProfile._id, editingProfile);
      setProfiles((prev) => prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)));
      setEditingProfile(null);
      setNotice('Profile updated successfully!');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Matrimonial Profiles Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {total} doctor and professional matrimonial profiles published
          </p>
        </div>
        <button
          onClick={loadProfiles}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, profession, city, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Genders</option>
            <option value="Female">Female (Brides)</option>
            <option value="Male">Male (Grooms)</option>
          </select>

          <select
            value={religionFilter}
            onChange={(e) => {
              setReligionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Religions</option>
            <option value="Hindu">Hindu</option>
            <option value="Muslim">Muslim</option>
            <option value="Sikh">Sikh</option>
            <option value="Christian">Christian</option>
            <option value="Jain">Jain</option>
          </select>

          <select
            value={verifFilter}
            onChange={(e) => {
              setVerifFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Verification</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="PENDING">Pending Review</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Profile</th>
                <th className="py-3.5 px-5">Profession & Degree</th>
                <th className="py-3.5 px-5">Location</th>
                <th className="py-3.5 px-5">Community</th>
                <th className="py-3.5 px-5">Annual Income</th>
                <th className="py-3.5 px-5">KYC Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading profiles directory...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matrimonial profiles found.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {profile.primaryPhoto ? (
                          <img
                            src={profile.primaryPhoto}
                            alt={profile.displayName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {profile.displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{profile.displayName}</p>
                          <p className="text-[11px] text-slate-400">
                            {profile.gender} • {profile.height || '5ft 8in'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-800">{profile.profession}</p>
                      <p className="text-[11px] text-slate-500">{profile.degree || profile.education}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="text-slate-700 font-medium">{profile.city}</p>
                      <p className="text-[11px] text-slate-400">{profile.state || profile.country}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="text-slate-700">{profile.religion}</p>
                      <p className="text-[11px] text-slate-400">{profile.caste || profile.motherTongue}</p>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">
                      {profile.annualIncome || 'Confidential'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          profile.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : profile.verificationStatus === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {profile.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedProfile(profile)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                        title="View Full Profile Bio"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingProfile({ ...profile })}
                        className="p-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 text-blue-600 transition"
                        title="Edit Profile"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {pages || 1} ({total} profiles)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-700"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* View Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                {selectedProfile.primaryPhoto ? (
                  <img
                    src={selectedProfile.primaryPhoto}
                    alt={selectedProfile.displayName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center">
                    {selectedProfile.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedProfile.displayName}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedProfile.profession} • {selectedProfile.city}, {selectedProfile.state}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* About section */}
              {selectedProfile.about && (
                <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100">
                  <h4 className="font-bold text-slate-900 mb-1">About Bio</h4>
                  <p className="text-slate-600 leading-relaxed">{selectedProfile.about}</p>
                </div>
              )}

              {/* Comprehensive Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div><span className="font-semibold text-slate-500">Gender:</span> {selectedProfile.gender}</div>
                <div><span className="font-semibold text-slate-500">Marital Status:</span> {selectedProfile.maritalStatus || 'Never Married'}</div>
                <div><span className="font-semibold text-slate-500">Degree:</span> {selectedProfile.degree || selectedProfile.education}</div>
                <div><span className="font-semibold text-slate-500">Company:</span> {selectedProfile.company || 'N/A'}</div>
                <div><span className="font-semibold text-slate-500">Religion & Caste:</span> {selectedProfile.religion} ({selectedProfile.caste})</div>
                <div><span className="font-semibold text-slate-500">Mother Tongue:</span> {selectedProfile.motherTongue}</div>
                <div><span className="font-semibold text-slate-500">Annual Package:</span> {selectedProfile.annualIncome}</div>
                <div><span className="font-semibold text-slate-500">Food Preference:</span> {selectedProfile.foodPreference || 'Vegetarian'}</div>
              </div>

              {/* Photos Preview */}
              {selectedProfile.photos && selectedProfile.photos.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-red-600" />
                    <span>Uploaded Photos ({selectedProfile.photos.length})</span>
                  </h4>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {selectedProfile.photos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Profile photo"
                        className="w-24 h-24 rounded-xl object-cover border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <form onSubmit={handleSaveEdit}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 bg-white">
                <h3 className="text-base font-bold text-slate-900">
                  Edit Profile: {editingProfile.displayName}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editingProfile.displayName}
                      onChange={(e) => setEditingProfile({ ...editingProfile, displayName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Profession</label>
                    <input
                      type="text"
                      value={editingProfile.profession}
                      onChange={(e) => setEditingProfile({ ...editingProfile, profession: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={editingProfile.company || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, company: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Annual Income</label>
                    <input
                      type="text"
                      value={editingProfile.annualIncome || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, annualIncome: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editingProfile.city}
                      onChange={(e) => setEditingProfile({ ...editingProfile, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
                    <select
                      value={editingProfile.verificationStatus}
                      onChange={(e) => setEditingProfile({ ...editingProfile, verificationStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    >
                      <option value="UNVERIFIED">UNVERIFIED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">About Bio</label>
                  <textarea
                    rows={4}
                    value={editingProfile.about || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, about: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20"
                >
                  {saveLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
