import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Briefcase, 
  Flame, 
  CheckCircle2, 
  Lock, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { jobsApi } from '../api/jobs';
import JobCard from '../components/JobCard';
import ThreeDCard from '../components/ThreeDCard';
import ThreeDArtifactViewer from '../components/ThreeDArtifactViewer';
import ApplyModal from '../components/ApplyModal';
import AkatsukiCloud from '../assets/AkatsukiCloud';
import { AKATSUKI_BACKGROUNDS } from '../constants/backgrounds';

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'INTERNSHIP', label: 'Internships' },
  { value: 'PROJECT_COLLAB', label: 'Project Collabs' },
  { value: 'RESEARCH_ASSISTANT', label: 'Research Labs' },
  { value: 'CAMPUS_GIG', label: 'Campus Gigs' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'TUTORING', label: 'Peer Tutoring' },
];

const LOCATION_TYPES = [
  { value: 'ALL', label: 'Any Location' },
  { value: 'ON_CAMPUS', label: 'On Campus' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Only Open' },
  { value: 'CLOSED', label: 'Only Closed' },
];

export const HomePage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [locationType, setLocationType] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  // Apply Modal state
  const [applyingJob, setApplyingJob] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await jobsApi.getJobs({
        search: search.trim() || undefined,
        category: category !== 'ALL' ? category : undefined,
        location_type: locationType !== 'ALL' ? locationType : undefined,
        status: status !== 'ALL' ? status : undefined,
      });
      setJobs(data);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      setError('Failed to connect to the backend server. Verify the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }, [search, category, locationType, status]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const openCount = jobs.filter((j) => j.status === 'OPEN').length;

  return (
    <div className="min-h-screen text-white bg-black">
      {/* Hero Section with Pinterest-inspired Dark Crimson Ambience */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-red-950/40">
        {/* Background Image with Dark Gradient Veil */}
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-30 mix-blend-screen scale-105"
          style={{ backgroundImage: `url(${AKATSUKI_BACKGROUNDS.marketplace.url})` }}
        />
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: AKATSUKI_BACKGROUNDS.marketplace.overlay }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 border border-red-600/50 text-red-400 text-xs font-semibold shadow-[0_0_20px_rgba(229,9,20,0.3)] animate-pulse">
              <AkatsukiCloud size={20} glow={false} />
              <span>OFFICIAL COLLEGE ERP INTEGRATED PLATFORM</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              Where Peer Talent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-600 drop-shadow-[0_0_25px_rgba(229,9,20,0.6)]">
                Ignites Opportunities
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Post and discover student startups, campus labs, peer gigs, and research openings.
              Every listing features <strong>job-specific DMs</strong> and instant <strong>open/closed locking</strong>.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                to="/post-job"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(229,9,20,0.5)] transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                <Flame className="w-4 h-4 text-yellow-300" />
                <span>Create Opportunity</span>
              </Link>

              <a
                href="#marketplace-grid"
                className="px-6 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-red-500/40 font-semibold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-red-500" />
                <span>Browse {jobs.length} Listings</span>
              </a>
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-3 gap-6 pt-6 w-full max-w-lg border-t border-zinc-800/80">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-white">{jobs.length}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Total Listings</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-emerald-400">{openCount}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Open Positions</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-red-500">100%</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">ERP Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Discovery Section */}
      <section id="marketplace-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Interactive 3D WebGL Matrix Showcase */}
        <div className="mb-8">
          <ThreeDArtifactViewer />
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-zinc-950/80 border border-red-950/50 shadow-xl backdrop-blur-md">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by role title, required skills (e.g. React, Python, ROS2), or keywords..."
                className="w-full pl-11 pr-28 py-3 bg-black/70 border border-zinc-800 focus:border-red-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Search
              </button>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-zinc-900 text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Type */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Location Type
                </label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                >
                  {LOCATION_TYPES.map((loc) => (
                    <option key={loc.value} value={loc.value} className="bg-zinc-900 text-white">
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Status (Open/Closed)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                >
                  {STATUS_FILTERS.map((st) => (
                    <option key={st.value} value={st.value} className="bg-zinc-900 text-white">
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchJobs}
              className="px-3 py-1 bg-red-600 rounded-lg text-white font-bold text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Listings Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-bold text-white tracking-wide uppercase">
              Opportunity Marketplace ({jobs.length})
            </h2>
          </div>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl bg-zinc-950/40 border border-zinc-900 animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-24 h-4 bg-zinc-900 rounded" />
                  <div className="w-48 h-6 bg-zinc-800 rounded" />
                  <div className="w-full h-10 bg-zinc-900/60 rounded" />
                </div>
                <div className="w-full h-8 bg-zinc-900 rounded" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl">
            <AkatsukiCloud size={48} glow={false} />
            <h3 className="text-lg font-bold text-zinc-300">No Opportunities Match Your Filter</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              Try broadening your search term or reset filters to explore all available student roles.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setCategory('ALL');
                setLocationType('ALL');
                setStatus('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white border border-zinc-800 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <ThreeDCard key={job.id} depth={15}>
                <JobCard
                  job={job}
                  onOpenApply={(targetJob) => setApplyingJob(targetJob)}
                />
              </ThreeDCard>
            ))}
          </div>
        )}
      </section>

      {/* Apply Modal */}
      {applyingJob && (
        <ApplyModal
          job={applyingJob}
          isOpen={!!applyingJob}
          onClose={() => setApplyingJob(null)}
          onApplied={() => {
            fetchJobs();
          }}
        />
      )}
    </div>
  );
};

export default HomePage;
