'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, GraduationCap, Code2, Cpu } from 'lucide-react';

export interface WdcModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WDC_TEAM_MEMBERS = [
  {
    role: 'Faculty In-Charge',
    name: 'Dr. Banavath Balaji Naik',
    title: 'Assistant Professor, Dept. of CSE',
    research:
      'Cloud Computing, Nature Inspired Algorithms, Edge Computing, Workflow Scheduling, Quantum Computing',
    image: 'https://drive.google.com/thumbnail?authuser=0&sz=w320&id=1Abn5VMv4oWnpUYyNtO_j-mrh5YBNzD-C',
    badge: 'Faculty In-Charge',
    link: 'https://www.nitp.ac.in/Department/CSE/faculty/balaji.cs@nitp.ac.in',
    icon: GraduationCap,
    iconColor: 'text-blue-700',
    titleColor: 'text-blue-700',
  },
  {
    role: 'Lead Full-Stack Developer & Architect',
    name: 'Aashish Kumar Singh',
    title: 'Full-Stack Software Developer',
    research:
      'Constraint Solver Architecture, Next.js, Distributed Systems, Database Modeling, REST APIs',
    image: 'https://avatars.githubusercontent.com/u/164627482?v=4',
    badge: 'Core Developer',
    link: 'https://github.com/AashishKumarSingh1',
    icon: Code2,
    iconColor: 'text-red-700',
    titleColor: 'text-red-700',
  },
  {
    role: 'Full-Stack Developer & Architect',
    name: 'Pratyush Kumar',
    title: 'Full-Stack Software Developer',
    research:
      'Database Architecture, Next.js Full Stack, Real-time APIs, UI/UX Engineering, Mobile Responsive Web Systems',
    image: 'https://nitp-database-s3.s3.ap-south-1.amazonaws.com/1780480576178-75f98495d95faf5e.jpg',
    badge: 'Student Lead',
    link: 'https://www.linkedin.com/in/pratyush-kumar9v8/',
    icon: Code2,
    iconColor: 'text-indigo-700',
    titleColor: 'text-indigo-700',
  },
  {
    role: 'Algorithm & Optimization',
    name: 'Naveen M M',
    title: 'Full-Stack Software Developer',
    research:
      'Combinatorial Optimization, Genetic & Greedy Scheduling Algorithms, Collision-Free Heuristics',
    image: 'https://avatars.githubusercontent.com/u/199819127?v=4',
    badge: 'Algorithm Lead',
    link: 'https://github.com/NaveenMM2006',
    icon: Cpu,
    iconColor: 'text-emerald-700',
    titleColor: 'text-emerald-700',
  },
];

export function WdcModal({ isOpen, onClose }: WdcModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Web Development Cell Team"
        className="relative bg-[#F8FAFC] border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl my-auto overflow-hidden z-10 max-h-[92vh] flex flex-col"
      >
        {/* Soft Ambient Glows in Background */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar with Close Button */}
        <div className="relative px-6 sm:px-10 pt-8 pb-4 shrink-0 text-center">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors z-20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-sans font-extrabold tracking-tight text-slate-900">
            Web Development{' '}
            <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
              Cell
            </span>
          </h1>

          <div className="space-y-1.5 text-slate-600 text-xs sm:text-sm leading-relaxed font-sans font-medium pt-3 max-w-3xl mx-auto">
            <p>
              Architecting the institutional digital infrastructure, portals, and convocation services for the National
              Institute of Technology Patna.
            </p>
            <p className="text-slate-500 text-[11px] sm:text-xs max-w-2xl mx-auto">
              Our mission is to maintain the Institute&apos;s digital platforms with high standards of technical
              excellence, accessibility, security, and responsive UI design.
            </p>
          </div>
        </div>

        {/* Scrollable Team Cards Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 pt-3 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
            {WDC_TEAM_MEMBERS.map((member, idx) => {
              const IconComponent = member.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg shadow-slate-200/50 flex flex-col items-center text-center justify-between hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="w-full flex flex-col items-center">
                    {/* Badge */}
                    <div className="inline-flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-800 mb-5 shadow-xs">
                      <IconComponent className={`w-3.5 h-3.5 ${member.iconColor}`} />
                      <span>{member.role}</span>
                    </div>

                    {/* Avatar Photo with graceful fallback */}
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-md mb-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 shrink-0 group-hover:border-blue-300 transition-all duration-300 flex items-center justify-center relative shadow-inner">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            // If external image fails to load, gracefully hide and show initials
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        style={{ display: member.image ? 'none' : 'flex' }}
                        className="text-2xl sm:text-3xl font-serif font-extrabold text-blue-900 tracking-wider items-center justify-center w-full h-full"
                      >
                        {member.name
                          .split(' ')
                          .filter((n) => !n.startsWith('Dr.'))
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                    </div>

                    {/* Name & Title */}
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mb-1">
                      {member.name}
                    </h2>
                    <p className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2.5 ${member.titleColor}`}>
                      {member.title}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mb-6 font-medium">
                      {member.research}
                    </p>
                  </div>

                  {/* Action Button */}
                  <a
                    href={member.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-xs inline-flex items-center justify-center space-x-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-5 rounded-2xl shadow-md shadow-slate-900/10 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    <span>View Profile</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
