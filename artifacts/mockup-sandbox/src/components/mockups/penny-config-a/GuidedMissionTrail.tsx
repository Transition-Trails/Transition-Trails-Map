import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  Lock, 
  Map as MapIcon, 
  BookOpen, 
  User, 
  Compass, 
  LayoutDashboard, 
  BrainCircuit, 
  Search,
  Target,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Send,
  ToggleRight,
  ChevronDown
} from 'lucide-react';

export default function GuidedMissionTrail() {
  const [step, setStep] = useState(3);

  const missions = [
    { id: 1, name: 'Trail Guide', icon: MapIcon, status: 'enabled' },
    { id: 2, name: 'Learning Coach', icon: BookOpen, status: 'enabled' },
    { id: 3, name: 'Build Companion', icon: Target, status: 'active' },
    { id: 4, name: 'Exam Coach', icon: Search, status: 'available' },
    { id: 5, name: 'Career Translator', icon: User, status: 'available' },
    { id: 6, name: 'Quest Master', icon: Compass, status: 'available' },
    { id: 7, name: 'Coach Intelligence', icon: BrainCircuit, status: 'locked' },
  ];

  return (
    <div className="flex w-[1380px] h-[960px] bg-white overflow-hidden font-sans text-slate-800 antialiased shadow-xl rounded-xl border border-slate-200">
      
      {/* LEFT PANEL - Mission Trail Map */}
      <div className="w-[280px] h-full bg-[#1C3326] flex flex-col relative shrink-0">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-2 text-white text-[13px] font-semibold tracking-wide">
            <Sparkles size={16} className="text-[#CC8400]" />
            PENNY MISSIONS
          </div>
        </div>

        {/* Trail container */}
        <div className="flex-1 relative mt-6 px-6">
          {/* The Trail Line */}
          <div className="absolute left-[39px] top-6 bottom-[100px] w-[2px] bg-[#CC8400]/40 rounded-full" />
          
          <div className="flex flex-col gap-10 relative z-10">
            {missions.map((mission, index) => {
              const Icon = mission.icon;
              const isEnabled = mission.status === 'enabled';
              const isActive = mission.status === 'active';
              const isLocked = mission.status === 'locked';
              const isAvailable = mission.status === 'available';

              return (
                <div key={mission.id} className="flex items-center group cursor-pointer">
                  {/* Node */}
                  <div className={`relative flex items-center justify-center w-[28px] h-[28px] rounded-full shrink-0 transition-all duration-300
                    ${isEnabled ? 'bg-[#2F6B3F] text-white shadow-[0_0_0_4px_#1C3326]' : ''}
                    ${isActive ? 'bg-[#CC8400] text-white shadow-[0_0_0_4px_#1C3326,0_0_0_6px_rgba(255,255,255,0.9)] scale-110' : ''}
                    ${isAvailable ? 'bg-slate-500 text-slate-200 shadow-[0_0_0_4px_#1C3326]' : ''}
                    ${isLocked ? 'bg-slate-700 text-slate-500 shadow-[0_0_0_4px_#1C3326]' : ''}
                  `}>
                    {/* Pulsing ring for active state */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-full border-2 border-[#CC8400] animate-ping opacity-50" />
                    )}

                    {isEnabled ? (
                      <Check size={14} strokeWidth={3} />
                    ) : isLocked ? (
                      <Lock size={12} strokeWidth={2.5} />
                    ) : (
                      <Icon size={14} strokeWidth={2.5} />
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className={`ml-4 text-[11px] font-medium tracking-wide uppercase transition-colors
                    ${isActive ? 'text-white font-bold' : ''}
                    ${isEnabled ? 'text-emerald-100/90' : ''}
                    ${isAvailable ? 'text-slate-400' : ''}
                    ${isLocked ? 'text-slate-600' : ''}
                  `}>
                    {mission.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Ask Penny Button */}
        <div className="p-6 mt-auto">
          <button className="w-full flex items-center justify-center gap-2 bg-[#CC8400]/10 hover:bg-[#CC8400]/20 border border-[#CC8400]/30 text-[#CC8400] rounded-lg py-2.5 px-4 text-[13px] font-semibold transition-colors">
            <Sparkles size={16} />
            Ask Penny
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        
        {/* Section 1 - Capability Header */}
        <div className="h-[96px] shrink-0 border-b border-slate-100 px-10 flex flex-col justify-center bg-white">
          <div className="text-[12px] text-slate-400 font-medium mb-1.5 flex items-center gap-2">
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Penny</span>
            <span>/</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Missions</span>
            <span>/</span>
            <span className="text-slate-800">Build Companion</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-[24px] font-serif font-semibold text-slate-900 tracking-tight">Build Companion</h1>
              <span className="text-[14px] text-slate-500 mt-1">Project assistant for hands-on work</span>
              
              <div className="flex items-center gap-2 ml-4 mt-1">
                <span className="px-2.5 py-0.5 bg-[#FFF8E8] text-[#996300] text-[11px] font-bold uppercase tracking-wider rounded-full">
                  Learning
                </span>
                <span className="px-2.5 py-0.5 border border-[#CC8400]/40 text-[#B37300] text-[11px] font-bold uppercase tracking-wider rounded-full">
                  In Development
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-slate-600">Active</span>
              <div className="w-11 h-6 bg-[#2F6B3F] rounded-full relative cursor-pointer shadow-inner">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 - Mission Wizard */}
        <div className="flex-1 overflow-auto bg-[#F9FAF9] p-10 flex justify-center items-start">
          <div className="w-full max-w-[960px] flex gap-8">
            
            {/* Left part - Step Progress & Form */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[580px]">
              {/* Stepper Header */}
              <div className="px-8 py-6 border-b border-slate-100 bg-white">
                <h2 className="text-[18px] font-serif font-semibold text-slate-800 mb-6">Setting up Build Companion</h2>
                
                <div className="flex items-center">
                  {[
                    { num: 1, label: 'Briefing', state: 'done' },
                    { num: 2, label: 'Connect', state: 'done' },
                    { num: 3, label: 'Configure', state: 'current' },
                    { num: 4, label: 'Test', state: 'pending' }
                  ].map((s, i) => (
                    <React.Fragment key={s.num}>
                      <div className="flex flex-col items-start gap-1.5 relative">
                        <div className={`flex items-center h-8 rounded-full px-3 text-[12px] font-semibold transition-all
                          ${s.state === 'done' ? 'bg-[#2F6B3F]/10 text-[#2F6B3F]' : ''}
                          ${s.state === 'current' ? 'bg-[#CC8400] text-white shadow-md' : ''}
                          ${s.state === 'pending' ? 'bg-slate-100 text-slate-400' : ''}
                        `}>
                          {s.state === 'done' ? (
                            <Check size={14} className="mr-1.5" strokeWidth={3} />
                          ) : (
                            <span className="mr-1.5 opacity-70">{s.num}</span>
                          )}
                          {s.label}
                        </div>
                        {s.state === 'current' && (
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-[#CC8400]" />
                        )}
                      </div>
                      
                      {i < 3 && (
                        <div className={`w-8 h-[2px] mx-2 rounded-full ${s.state === 'done' ? 'bg-[#2F6B3F]/30' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <div className="px-8 py-8 flex-1 overflow-y-auto bg-slate-50/50">
                <h3 className="text-[16px] font-semibold text-slate-800 mb-8">Configure Build Companion's Behaviour</h3>
                
                <div className="space-y-8">
                  {/* Coaching tone */}
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-2">Coaching tone</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2.5 px-4 pr-10 text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#CC8400]/50 focus:border-[#CC8400] shadow-sm">
                        <option>Scaffolded hints only (recommended)</option>
                        <option>Direct answers with explanation</option>
                        <option>Socratic questioning</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Hint depth */}
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-3">Hint depth</label>
                    <div className="flex flex-col gap-3">
                      {[
                        { id: 'surface', label: 'Surface only', desc: 'Brief pointers in the right direction' },
                        { id: 'guided', label: 'Guided', desc: 'Step-by-step unblocking without solving', current: true },
                        { id: 'deep', label: 'Deep explanation', desc: 'Comprehensive context and rationale' }
                      ].map(opt => (
                        <label key={opt.id} className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${opt.current ? 'border-[#CC8400] bg-[#FFF8E8]/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${opt.current ? 'border-[#CC8400]' : 'border-slate-300'}`}>
                            {opt.current && <div className="w-2 h-2 rounded-full bg-[#CC8400]" />}
                          </div>
                          <div>
                            <div className={`text-[14px] font-medium ${opt.current ? 'text-[#996300]' : 'text-slate-700'}`}>{opt.label}</div>
                            <div className="text-[12px] text-slate-500 mt-0.5">{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Project type */}
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-3">Project type specialisation</label>
                    <div className="flex flex-wrap gap-2">
                      {['Salesforce', 'Career Docs', 'General', 'Data Analysis', 'Web Dev'].map(type => {
                        const isSelected = ['Salesforce', 'Career Docs', 'General'].includes(type);
                        return (
                          <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[13px] font-medium cursor-pointer transition-all
                            ${isSelected 
                              ? 'bg-[#2F6B3F]/10 border-[#2F6B3F]/20 text-[#2F6B3F]' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }
                          `}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                            {type}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between">
                <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-[14px] font-medium transition-colors">
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button className="flex items-center gap-2 bg-[#CC8400] hover:bg-[#B37300] text-white px-5 py-2.5 rounded-lg text-[14px] font-semibold shadow-sm transition-all shadow-[#CC8400]/20">
                  Save & Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Right part - Penny guidance panel */}
            <div className="w-[340px] shrink-0 h-[580px] flex flex-col">
              <div className="bg-[#FFF8E8] border border-[#CC8400]/20 rounded-xl p-6 flex flex-col shadow-sm relative overflow-hidden h-full">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#CC8400]/10 to-transparent rounded-bl-full pointer-events-none" />

                <div className="flex items-center gap-3 mb-5 relative z-10">
                  <div className="w-[36px] h-[36px] rounded-full bg-[#CC8400] flex items-center justify-center shadow-md">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <span className="text-[#B37300] text-[12px] font-bold uppercase tracking-wider">Penny says</span>
                </div>

                <div className="flex-1 relative z-10">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg rounded-tl-none p-4 border border-[#CC8400]/10 shadow-sm">
                    <p className="text-[14px] text-slate-700 leading-relaxed">
                      For Build Companion, I recommend <strong className="font-semibold text-slate-900">'Guided'</strong> hints — this keeps learners challenged without frustrating them. 
                      <br /><br />
                      You can always tighten this later once you see how your cohort responds.
                    </p>
                  </div>
                </div>

                <div className="mt-auto relative z-10 pt-4 border-t border-[#CC8400]/10">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask Penny about this step..." 
                      className="w-full bg-white border border-[#CC8400]/20 rounded-lg py-3 pl-4 pr-10 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#CC8400]/40 shadow-sm"
                    />
                    <button className="absolute right-2 top-2 bottom-2 w-8 flex items-center justify-center text-[#CC8400] hover:bg-[#CC8400]/10 rounded-md transition-colors">
                      <Send size={16} className="ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Section 3 - Footer */}
        <div className="h-[60px] shrink-0 border-t border-slate-200 bg-[#F9FAF9] px-10 flex items-center justify-between">
          <div className="flex items-center gap-4 w-[400px]">
            <span className="text-[13px] font-medium text-slate-600">Step 3 of 4 — Configure</span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#CC8400] w-[75%] rounded-full" />
            </div>
          </div>
          
          <button className="text-[13px] text-slate-500 hover:text-slate-800 font-medium underline decoration-slate-300 underline-offset-4 transition-colors">
            Skip wizard — I know what I'm doing →
          </button>
        </div>

      </div>
    </div>
  );
}
