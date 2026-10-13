import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Users, MessageSquare, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import JobStatusBadge from './JobStatusBadge';
import { useAuth } from '../context/AuthContext';
import { conversationsApi } from '../api/conversations';
import { getDefaultAvatar } from '../constants/avatars';

export const JobCard = ({ job, onOpenApply }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isOwner = user && user.id === job.creator_id;
  const isOpen = job.status === 'OPEN';

  const posterAvatar = getDefaultAvatar(job.creator_roll_number || job.creator_name);

  const handleMessageClick = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isOwner) {
      // If owner clicks message, take them to the job's conversation roster
      navigate(`/jobs/${job.id}?tab=dms`);
      return;
    }

    try {
      // Start or fetch conversation for this specific job
      const conv = await conversationsApi.getOrCreateJobConversation(job.id);
      navigate(`/conversations?id=${conv.id}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Unable to start conversation';
      alert(errMsg);
    }
  };

  const formatCategory = (cat) => {
    return (cat || 'GIG').replace(/_/g, ' ');
  };

  return (
    <div className="group relative rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-red-600/50 p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(229,9,20,0.18)] hover:-translate-y-1 flex flex-col justify-between backdrop-blur-md">
      {/* Subtle crimson accent line on top */}
      <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-red-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Top Header: Category & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-red-950/60 border border-red-900/60 text-red-400">
            {formatCategory(job.category)}
          </span>
          <JobStatusBadge status={job.status} size="sm" />
        </div>

        {/* Title */}
        <Link to={`/jobs/${job.id}`} className="block group-hover:text-red-400 transition-colors">
          <h3 className="text-lg font-bold text-white tracking-tight leading-snug line-clamp-2 mb-2">
            {job.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
          {job.description}
        </p>

        {/* Key Attributes Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 mb-4 bg-black/40 p-3 rounded-xl border border-zinc-900">
          <div className="flex items-center gap-1.5 truncate">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate font-medium">{job.stipend || 'Unpaid / Experience'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">{job.location_type || 'ON_CAMPUS'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate col-span-2">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate text-zinc-400">{job.department || 'All Departments'}</span>
          </div>
        </div>

        {/* Skills Pills */}
        {job.skills_required && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {job.skills_required.split(',').slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900/90 text-zinc-300 border border-zinc-800"
              >
                {skill.trim()}
              </span>
            ))}
            {job.skills_required.split(',').length > 3 && (
              <span className="text-[10px] text-zinc-500 self-center">
                +{job.skills_required.split(',').length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-4 border-t border-zinc-900/90">
        {/* Creator Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-red-500/30">
              <img
                src={posterAvatar.image}
                alt={job.creator_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = posterAvatar.avatarUrl;
                }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200 line-clamp-1">{job.creator_name}</p>
              <p className="text-[10px] text-zinc-500">{job.creator_roll_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Users className="w-3.5 h-3.5 text-red-400" />
            <span>{job.applications_count || 0} applied</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Message Owner / Inquire button */}
          <button
            type="button"
            onClick={handleMessageClick}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-red-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            title={isOwner ? 'View student inquiry DMs' : 'Send inquiry message to creator'}
          >
            <MessageSquare className="w-3.5 h-3.5 text-red-400" />
            <span>{isOwner ? 'Inquiries' : 'Message'}</span>
          </button>

          {/* Quick Apply (if open and not creator) */}
          {isOpen && !isOwner && onOpenApply && (
            <button
              type="button"
              onClick={() => onOpenApply(job)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          )}

          {/* Details Link */}
          <Link
            to={`/jobs/${job.id}`}
            className={`${
              !isOpen || isOwner || !onOpenApply ? 'flex-1' : 'px-3'
            } py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800/80 transition-all flex items-center justify-center gap-1`}
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3 text-red-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
