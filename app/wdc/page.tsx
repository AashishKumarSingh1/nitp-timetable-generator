'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { WDC_TEAM_MEMBERS } from '@/components/wdc/WdcModal';

export default function WDCPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8FAFC] text-slate-900 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Soft Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-red-700" />
          <span>NIT Patna Web Development Cell</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full flex flex-col items-center relative z-10">
        {/* Title Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <h1 className="text-4xl sm:text-6xl font-sans font-extrabold tracking-tight text-slate-900">
            Web Development{' '}
            <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
              Cell
            </span>
          </h1>

          <div className="space-y-2 text-slate-600 text-sm sm:text-base leading-relaxed font-sans font-medium pt-2">
            <p>
              Architecting the institutional digital infrastructure, portals, and convocation services for the National
              Institute of Technology Patna.
            </p>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl mx-auto">
              Our mission is to maintain the Institute&apos;s digital platforms with high standards of technical
              excellence, accessibility, security, and responsive UI design.
            </p>
          </div>
        </div>

        {/* Leadership & Development Team Cards Grid (4 people) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {WDC_TEAM_MEMBERS.map((member, idx) => {
            const IconComponent = member.icon;
            return (
              <div
                key={idx}
                className="bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center justify-between hover:shadow-2xl hover:border-blue-300 hover:-translate-y-1.5 transition-all duration-300 relative group overflow-hidden"
              >
                <div className="w-full flex flex-col items-center">
                  {/* Badge */}
                  <div className="inline-flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-800 mb-6 shadow-xs">
                    <IconComponent className={`w-4 h-4 ${member.iconColor}`} />
                    <span>{member.role}</span>
                  </div>

                  {/* Avatar Photo */}
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-lg mb-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 shrink-0 group-hover:border-blue-300 transition-all duration-300 flex items-center justify-center relative shadow-inner">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span
                      style={{ display: member.image ? 'none' : 'flex' }}
                      className="text-3xl font-serif font-extrabold text-blue-900 tracking-wider items-center justify-center w-full h-full"
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
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-1">
                    {member.name}
                  </h2>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${member.titleColor}`}>
                    {member.title}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mb-8 font-medium">
                    {member.research}
                  </p>
                </div>

                {/* Action Button */}
                <a
                  href={member.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-xs inline-flex items-center justify-center space-x-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold py-3 px-6 rounded-2xl shadow-md shadow-slate-900/10 hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-slate-300" />
                  <span>View Profile</span>
                </a>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
        National Institute of Technology Patna · Web Development Cell
      </footer>
    </div>
  );
}
