import React from 'react';
import { AKATSUKI_AVATARS } from '../constants/avatars';
import { Check } from 'lucide-react';

export const AvatarSelector = ({ selectedId, onSelect, compact = false }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-crimson-200 uppercase tracking-wider flex items-center gap-1.5">
          <span>Choose Your Akatsuki Member Identity</span>
          <span className="text-[10px] text-zinc-400 font-normal">(Curated from Pinterest Aesthetics)</span>
        </label>
      </div>

      <div className={`grid ${compact ? 'grid-cols-5 gap-2' : 'grid-cols-2 sm:grid-cols-5 gap-3'}`}>
        {AKATSUKI_AVATARS.map((member) => {
          const isSelected = selectedId === member.id;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member.id)}
              className={`group relative flex flex-col items-center p-2 rounded-xl transition-all duration-300 text-left border ${
                isSelected
                  ? 'bg-red-950/60 border-red-500 shadow-[0_0_18px_rgba(229,9,20,0.5)] scale-[1.03]'
                  : 'bg-black/40 border-white/10 hover:border-red-500/40 hover:bg-red-950/20'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md z-10">
                  <Check className="w-3 h-3" />
                </div>
              )}

              {/* Avatar Image with Crimson Ring */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden p-0.5 mb-2 bg-gradient-to-tr from-red-600 to-black group-hover:from-red-500 transition-all">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = member.avatarUrl;
                  }}
                />
              </div>

              {/* Member Name */}
              <span className="text-xs font-bold text-white text-center leading-tight line-clamp-1">
                {member.name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-zinc-400 text-center line-clamp-1 mt-0.5">
                {member.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarSelector;
