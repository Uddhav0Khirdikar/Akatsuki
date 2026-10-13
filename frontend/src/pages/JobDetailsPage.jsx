import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Users, 
  MessageSquare, 
  Lock, 
  Unlock, 
  Sparkles, 
  FileText, 
  Trash2, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { jobsApi } from '../api/jobs';
import { applicationsApi } from '../api/applications';
import { conversationsApi } from '../api/conversations';
import { useAuth } from '../context/AuthContext';
import JobStatusBadge from '../components/JobStatusBadge';
import ApplyModal from '../components/ApplyModal';
import AkatsukiCloud from '../assets/AkatsukiCloud';
import { getDefaultAvatar } from '../constants/avatars';
import { AKATSUKI_BACKGROUNDS } from '../constants/backgrounds';

export const JobDetailsPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tabs for job creator: 'overview' | 'dms' | 'applicants'
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Creator data
  const [jobDms, setJobDms] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  
  // Status toggle state
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Apply modal
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await jobsApi.getJobById(id);
      setJob(data);
    } catch (err) {
      console.error('Failed to load job details:', err);
      setError('Opportunity not found or could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const isOwner = user && job && user.id === job.creator_id;
  const isOpen = job?.status === 'OPEN';

  // Load Job DMs and Applicants if creator
  const loadCreatorData = useCallback(async () => {
    if (!isOwner) return;
    try {
      setLoadingExtra(true);
      const [dmsData, appsData] = await Promise.all([
        conversationsApi.getJobConversations(id).catch(() => []),
        applicationsApi.getJobApplications(id).catch(() => []),
      ]);
      setJobDms(dmsData);
      setApplicants(appsData);
    } catch (err) {
      console.error('Failed to load creator data:', err);
    } finally {
      setLoadingExtra(false);
    }
  }, [id, isOwner]);

  useEffect(() => {
    if (isOwner) {
      loadCreatorData();
    }
  }, [isOwner, loadCreatorData]);

  // Toggle status: OPEN <-> CLOSED (GitHub Issues style)
  const handleToggleStatus = async () => {
    if (!isOwner || togglingStatus) return;
    try {
      setTogglingStatus(true);
      const newStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      const res = await jobsApi.updateJobStatus(job.id, newStatus);
      setJob(res.job);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle job status');
    } finally {
      setTogglingStatus(false);
    }
  };

  // Start DM as student
  const handleStartDm = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const conv = await conversationsApi.getOrCreateJobConversation(job.id);
      navigate(`/conversations?id=${conv.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start inquiry thread');
    }
  };

  // Creator updates applicant status
  const handleUpdateApplicantStatus = async (appId, newStatus) => {
    try {
      await applicationsApi.updateApplicationStatus(appId, newStatus);
      setApplicants((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update applicant status');
    }
  };

  // Delete Job
  const handleDeleteJob = async () => {
    if (!window.confirm('Are you sure you want to delete this opportunity? This cannot be undone.')) {
      return;
    }
    try {
      await jobsApi.deleteJob(job.id);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete opportunity');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <AkatsukiCloud size={48} />
        <span className="text-xs font-mono text-red-500 animate-pulse">DECRYPTING ROLE DOSSIER...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white p-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold">{error || 'Opportunity Not Found'}</h2>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold hover:bg-zinc-800 transition-colors"
        >
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const creatorAvatar = getDefaultAvatar(job.creator_roll_number || job.creator_name);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header Banner */}
      <div className="relative border-b border-red-950/40 py-8 bg-zinc-950/70">
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-20 mix-blend-screen"
          style={{ backgroundImage: `url(${AKATSUKI_BACKGROUNDS.jobDetail.url})` }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-red-950/80 border border-red-900/60 text-red-400">
                  {(job.category || 'GIG').replace(/_/g, ' ')}
                </span>
                <JobStatusBadge status={job.status} size="md" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {job.title}
              </h1>
            </div>

            {/* Owner Actions vs Student Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isOwner ? (
                <>
                  {/* Toggle Status Button (GitHub Issue Style) */}
                  <button
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-md ${
                      isOpen
                        ? 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border-red-500/40 hover:border-red-500'
                        : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40 hover:border-emerald-500'
                    }`}
                    title={isOpen ? 'Close job (locks inquiries & applications)' : 'Re-open job (accepts applications)'}
                  >
                    {isOpen ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-red-400" />
                        <span>{togglingStatus ? 'Updating...' : 'Close Opportunity'}</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{togglingStatus ? 'Updating...' : 'Re-open Opportunity'}</span>
                      </>
                    )}
                  </button>

                  {/* Delete Job */}
                  <button
                    onClick={handleDeleteJob}
                    className="p-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors"
                    title="Delete Job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {/* Non-owner Student Actions */}
                  <button
                    onClick={handleStartDm}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-red-500/40 text-xs font-semibold transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                    <span>Message Owner</span>
                  </button>

                  {isOpen ? (
                    <button
                      onClick={() => {
                        if (!isAuthenticated) navigate('/login');
                        else setIsApplyOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Apply Now</span>
                    </button>
                  ) : (
                    <div className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed">
                      <Lock className="w-3 h-3 text-red-400" />
                      <span>Submissions Locked</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Closed Job Alert Banner */}
        {!isOpen && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-3 shadow-lg">
            <Lock className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <span className="font-bold">This opportunity is CLOSED by the job owner.</span>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                The role has been filled or concluded. New student applications and new inquiry DMs are locked.
                Existing conversation history is preserved.
              </p>
            </div>
          </div>
        )}

        {/* Creator Navigation Tabs */}
        {isOwner && (
          <div className="flex items-center gap-2 border-b border-zinc-800 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Role Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('dms')}
              className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'dms'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-red-500" />
              <span>Job-Specific DMs ({jobDms.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('applicants')}
              className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'applicants'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Applicant Roster ({applicants.length})</span>
            </button>
          </div>
        )}

        {/* Tab 1: Role Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left 2 Cols: Description & Skills */}
            <div className="md:col-span-2 space-y-6">
              {/* Detailed Description */}
              <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 shadow-xl backdrop-blur-md">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>Role Description & Responsibilities</span>
                </h3>
                <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>
              </div>

              {/* Required Skills & Tech Stack */}
              {job.skills_required && (
                <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 shadow-xl">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-red-500" />
                    <span>Desired Skills & Qualifications</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills_required.split(',').map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Quick Metadata Card & Poster Info */}
            <div className="space-y-6">
              {/* Key Attributes Card */}
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-2 border-b border-zinc-800">
                  Opportunity Parameters
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Compensation:</span>
                    </span>
                    <span className="font-semibold text-emerald-400 text-right">
                      {job.stipend || 'Unpaid / Experience'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>Work Mode:</span>
                    </span>
                    <span className="font-semibold text-white">
                      {job.location_type || 'ON_CAMPUS'}
                    </span>
                  </div>

                  {job.location && (
                    <div className="flex items-start justify-between">
                      <span className="text-zinc-400">Campus Spot:</span>
                      <span className="font-medium text-zinc-300 text-right">{job.location}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Department:</span>
                    </span>
                    <span className="font-medium text-zinc-300 text-right">
                      {job.department || 'Open to All'}
                    </span>
                  </div>

                  {job.deadline && (
                    <div className="flex items-start justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-yellow-500" />
                        <span>Deadline:</span>
                      </span>
                      <span className="font-medium text-zinc-300">{job.deadline}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between pt-2 border-t border-zinc-900">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-red-400" />
                      <span>Applications:</span>
                    </span>
                    <span className="font-bold text-white">{job.applications_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Creator Dossier */}
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 shadow-xl">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-800">
                  Opportunity Creator
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-red-500/40 shrink-0">
                    <img
                      src={creatorAvatar.image}
                      alt={job.creator_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = creatorAvatar.avatarUrl;
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{job.creator_name}</h4>
                    <p className="text-xs text-red-400 font-mono">{job.creator_roll_number}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{job.creator_department}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Job-Specific DMs (Creator View) */}
        {activeTab === 'dms' && isOwner && (
          <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-red-500" />
                  <span>Student Inquiries Tied Specifically to This Listing</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Like GitHub issue discussions, every DM thread is permanently tied to this job opportunity.
                </p>
              </div>
            </div>

            {jobDms.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No students have initiated inquiries for this opportunity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {jobDms.map((dm) => (
                  <Link
                    key={dm.id}
                    to={`/conversations?id=${dm.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-red-500/40 transition-all group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-700 group-hover:border-red-500/50">
                        <img
                          src={getDefaultAvatar(dm.student_roll_number).image}
                          alt={dm.student_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getDefaultAvatar(dm.student_roll_number).avatarUrl;
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                            {dm.student_name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ({dm.student_roll_number})
                          </span>
                          <span className="text-[10px] text-zinc-500">• {dm.student_department}</span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                          {dm.last_message || 'Inquiry thread started'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {dm.unread_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                          {dm.unread_count} new
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">
                        {dm.last_message_time ? new Date(dm.last_message_time).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Applicant Roster (Creator View) */}
        {activeTab === 'applicants' && isOwner && (
          <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Received Applications & Candidate Pitches</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Review applicant qualifications, open attached portfolios, and update candidate statuses.
            </p>

            {applicants.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No students have applied to this opportunity yet.
              </div>
            ) : (
              <div className="space-y-4">
                {applicants.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{app.applicant_name}</h4>
                          <span className="text-xs text-red-400 font-mono">
                            ({app.applicant_roll_number})
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {app.applicant_department} • Batch of {app.applicant_graduation_year}
                        </p>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Status:</label>
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateApplicantStatus(app.id, e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-black border border-zinc-700 text-xs font-semibold text-white focus:border-red-500 focus:outline-none"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="SHORTLISTED">SHORTLISTED</option>
                          <option value="ACCEPTED">ACCEPTED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                    </div>

                    {/* Pitch Note */}
                    <div className="text-xs text-zinc-300 leading-relaxed bg-black/40 p-3 rounded-lg border border-zinc-800/60">
                      <strong className="text-zinc-400 block mb-1">Pitch Note:</strong>
                      {app.pitch_note}
                    </div>

                    {/* Resume / Portfolio Link */}
                    {app.resume_url && (
                      <div className="pt-1">
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Submitted Portfolio / Resume Link</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {isApplyOpen && (
        <ApplyModal
          job={job}
          isOpen={isApplyOpen}
          onClose={() => setIsApplyOpen(false)}
          onApplied={() => {
            fetchJob();
            if (isOwner) loadCreatorData();
          }}
        />
      )}
    </div>
  );
};

export default JobDetailsPage;
