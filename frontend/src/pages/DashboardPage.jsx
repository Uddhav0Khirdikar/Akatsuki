import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Briefcase, 
  Send, 
  MessageSquare, 
  Lock, 
  Unlock, 
  ExternalLink, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';
import { jobsApi } from '../api/jobs';
import { applicationsApi } from '../api/applications';
import { useAuth } from '../context/AuthContext';
import JobStatusBadge from '../components/JobStatusBadge';
import AvatarSelector from '../components/AvatarSelector';
import AkatsukiCloud from '../assets/AkatsukiCloud';

export const DashboardPage = () => {
  const { user, profileStats, currentAvatar, selectedAvatarId, setAvatar, refreshUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('posted'); // 'posted' | 'applications' | 'persona'
  
  const [myJobs, setMyJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);
      await refreshUser();
      const [jobsData, appsData] = await Promise.all([
        jobsApi.getMyPostedJobs().catch(() => []),
        applicationsApi.getMyApplications().catch(() => []),
      ]);
      setMyJobs(jobsData);
      setMyApplications(appsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleToggleJobStatus = async (jobId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
      const res = await jobsApi.updateJobStatus(jobId, newStatus);
      setMyJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: res.job.status } : j))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle job status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return 'text-emerald-400 bg-emerald-950/50 border-emerald-500/40';
      case 'SHORTLISTED':
        return 'text-cyan-400 bg-cyan-950/50 border-cyan-500/40';
      case 'REJECTED':
        return 'text-red-400 bg-red-950/50 border-red-500/40';
      default:
        return 'text-amber-400 bg-amber-950/50 border-amber-500/40';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Profile Card with Akatsuki Member Persona */}
        <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-zinc-950/85 border border-red-950/60 shadow-[0_0_50px_rgba(229,9,20,0.18)] backdrop-blur-md">
          {/* Subtle Red Cloud Watermark */}
          <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
            <AkatsukiCloud size={160} glow={false} />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {/* Member Avatar */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-red-500 shadow-[0_0_25px_rgba(229,9,20,0.4)] shrink-0">
                <img
                  src={currentAvatar?.image}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = currentAvatar?.avatarUrl;
                  }}
                />
              </div>

              {/* Student Bio & Metadata */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.name}</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-600/50 text-red-400 font-mono font-bold">
                    {user?.roll_number}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  {user?.department} • Batch of {user?.graduation_year}
                </p>
                <p className="text-xs text-zinc-500">{user?.email}</p>

                {currentAvatar && (
                  <div className="pt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="text-red-400 font-bold">Persona:</span>
                    <span>{currentAvatar.name} ({currentAvatar.title})</span>
                    <span className="text-zinc-600">•</span>
                    <span className="font-mono text-zinc-500">{currentAvatar.ring}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Post Button */}
            <Link
              to="/post-job"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all flex items-center gap-2 self-start sm:self-center"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post New Role</span>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-zinc-900/90 max-w-lg">
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white">
                {profileStats?.postedJobsCount ?? myJobs.length}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Posted Opportunities</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-red-500">
                {profileStats?.applicationsCount ?? myApplications.length}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Submitted Applications</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-emerald-400">
                {profileStats?.activeChatsCount ?? 0}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Active DM Inquiries</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('posted')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'posted'
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-red-500" />
            <span>My Posted Opportunities ({myJobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-red-500" />
            <span>My Applications ({myApplications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('persona')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'persona'
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>Persona Avatar</span>
          </button>
        </div>

        {/* Tab 1: My Posted Jobs */}
        {activeTab === 'posted' && (
          <div className="space-y-4">
            {myJobs.length === 0 ? (
              <div className="py-16 text-center bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6">
                <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-300">You Haven't Posted Any Roles Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                  Need a collaborator for a hackathon, research paper, or campus startup? Create your first listing.
                </p>
                <Link
                  to="/post-job"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Post an Opportunity</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-red-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                          {(job.category || 'GIG').replace(/_/g, ' ')}
                        </span>
                        <JobStatusBadge status={job.status} size="sm" />
                      </div>

                      <Link to={`/jobs/${job.id}`}>
                        <h3 className="text-base font-bold text-white hover:text-red-400 transition-colors line-clamp-1">
                          {job.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 mb-3">
                        {job.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/jobs/${job.id}?tab=applicants`}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-1.5"
                        >
                          <span>{job.applications_count || 0} Applicants</span>
                        </Link>

                        <Link
                          to={`/jobs/${job.id}?tab=dms`}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3 h-3 text-red-500" />
                          <span>Inquiries</span>
                        </Link>
                      </div>

                      {/* Instant Toggle Button */}
                      <button
                        onClick={() => handleToggleJobStatus(job.id, job.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                          job.status === 'OPEN'
                            ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border-red-500/30'
                            : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-500/30'
                        }`}
                        title={job.status === 'OPEN' ? 'Close job (lock inquiries)' : 'Re-open job'}
                      >
                        {job.status === 'OPEN' ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Close</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Open</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {myApplications.length === 0 ? (
              <div className="py-16 text-center bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6">
                <Send className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-300">No Submitted Applications</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                  Browse the marketplace to find research assistantships, hackathon teams, and internships.
                </p>
                <Link
                  to="/"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  Explore Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link to={`/jobs/${app.job_id}`}>
                            <h3 className="text-sm font-bold text-white hover:text-red-400 transition-colors">
                              {app.job_title}
                            </h3>
                          </Link>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                            {app.job_category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Compensation: {app.job_stipend || 'Unpaid / Experience'} • Status of Job: {app.job_status}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-center ${getStatusColor(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-300 bg-black/50 p-3 rounded-lg border border-zinc-900">
                      <span className="text-zinc-500 block mb-0.5 font-medium">Your Pitch:</span>
                      {app.pitch_note}
                    </div>

                    {app.resume_url && (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Attached Portfolio Link</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Persona Customization */}
        {activeTab === 'persona' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Select Your Akatsuki Identity</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Choose from the 10 legendary members curated from Pinterest aesthetic boards.
                Your chosen member icon is displayed across all marketplace listings and message threads.
              </p>
            </div>

            <AvatarSelector
              selectedId={selectedAvatarId}
              onSelect={setAvatar}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
