import React, { useState } from 'react';
import { Search, Plus, Settings, Sparkles, Check, ChevronRight, Lock, ArrowRight, Send } from 'lucide-react';

export default function InlineCopilotWorkshop() {
  const [expandedId, setExpandedId] = useState('build-companion');

  const capabilities = [
    {
      id: 'trail-guide',
      name: 'Trail Guide',
      domain: 'Coaching',
      status: 'active',
      desc: 'Personalized learning path advisor',
      maturity: 'Operational',
    },
    {
      id: 'learning-coach',
      name: 'Learning Coach',
      domain: 'Learning',
      status: 'active',
      desc: 'Contextual help for curriculum content',
      maturity: 'Operational',
    },
    {
      id: 'build-companion',
      name: 'Build Companion',
      domain: 'Learning',
      status: 'setting_up',
      desc: 'Project building assistant for learners',
      maturity: 'In setup',
    },
    {
      id: 'exam-coach',
      name: 'Exam Coach',
      domain: 'Coaching',
      status: 'not_started',
      desc: 'Practice test generation and review',
      maturity: 'Unconfigured',
    },
    {
      id: 'career-translator',
      name: 'Career Translator',
      domain: 'Career',
      status: 'not_started',
      desc: 'Maps skills to job requirements',
      maturity: 'Unconfigured',
    },
    {
      id: 'quest-master',
      name: 'Quest Master',
      domain: 'Questing',
      status: 'not_started',
      desc: 'Dynamic challenge generation',
      maturity: 'Unconfigured',
    },
    {
      id: 'coach-intelligence',
      name: 'Coach Intelligence',
      domain: 'Knowledge',
      status: 'locked',
      desc: 'Cross-capability insights',
      maturity: 'Locked',
      lockReason: 'Requires Quest Master',
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 pb-16">
      {/* Header */}
      <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Penny Capabilities</h1>
          <p className="text-[13px] text-slate-500">Enable and configure what Penny can do</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search capabilities..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-shadow" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white shadow-sm">
            <Plus className="w-4 h-4" />
            Add custom capability
          </button>
        </div>
      </header>

      {/* Filters & Stats */}
      <div className="h-[44px] bg-slate-100 flex items-center justify-between px-6 shrink-0 border-b border-slate-200/60">
        <div className="flex gap-1">
          {['All 7', 'Coaching', 'Career', 'Learning', 'Knowledge', 'Comms', 'Questing'].map(pill => (
            <button 
              key={pill} 
              className={`px-3 py-1.5 rounded-full text-[13px] transition-colors ${
                pill === 'All 7' 
                  ? 'bg-[#EFF6FF] text-sky-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-200 font-medium'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
        <div className="text-slate-500 text-[13px]">
          <span className="font-medium text-slate-700">3</span> active <span className="mx-1.5 text-slate-300">·</span> 
          <span className="font-medium text-slate-700">1</span> in setup <span className="mx-1.5 text-slate-300">·</span> 
          <span className="font-medium text-slate-700">3</span> not started
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map(cap => {
            const isExpanded = cap.id === expandedId;
            const isActive = cap.status === 'active';
            const isLocked = cap.status === 'locked';
            
            // EXPANDED STATE (Build Companion)
            if (isExpanded) {
              return (
                <div key={cap.id} className="col-span-1 md:col-span-2 lg:col-span-3 border border-amber-200/80 bg-[#FFFBF0] rounded-xl flex flex-col shadow-sm relative overflow-hidden transition-all duration-300">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#CC8400]"></div>
                  
                  {/* Top Row */}
                  <div className="px-6 py-4 flex items-center justify-between border-b border-amber-200/50 bg-white/40">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight">{cap.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-700">{cap.domain}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100/70 text-amber-700 flex items-center gap-1.5 border border-amber-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Setting up...
                      </span>
                    </div>
                    <div>
                      {/* Toggle switch ON (amber) */}
                      <div 
                        className="w-10 h-6 bg-[#CC8400] rounded-full flex items-center px-1 cursor-pointer transition-colors"
                        onClick={() => setExpandedId('')}
                      >
                        <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm transition-transform"></div>
                      </div>
                    </div>
                  </div>

                  {/* Content split */}
                  <div className="flex flex-col lg:flex-row flex-1">
                    {/* Left Side (Config) */}
                    <div className="w-full lg:w-[60%] p-6 lg:p-8 flex flex-col justify-between relative">
                      <div>
                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mb-8">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <div className="w-[18px] h-[18px] rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check className="w-3 h-3" /></div> 
                            1 Data
                          </div>
                          <div className="w-6 h-[1px] bg-slate-300"></div>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <div className="w-[18px] h-[18px] rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check className="w-3 h-3" /></div> 
                            2 Rules
                          </div>
                          <div className="w-6 h-[1px] bg-slate-300"></div>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-100/60 px-2.5 py-1 rounded-full border border-amber-200/50">
                            <ChevronRight className="w-3 h-3 text-amber-600" /> 
                            3 Configure
                          </div>
                          <div className="w-6 h-[1px] bg-slate-300"></div>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <div className="w-[18px] h-[18px] rounded-full border border-slate-300 flex items-center justify-center">4</div> 
                            Test
                          </div>
                        </div>

                        <h4 className="text-[17px] font-semibold text-slate-900 mb-6 tracking-tight">Configure Build Companion</h4>

                        {/* Form Rows */}
                        <div className="space-y-7">
                          <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-2.5">Hint depth</label>
                            <div className="flex p-1 bg-white border border-amber-200/60 rounded-lg w-max shadow-sm">
                              <button className="px-4 py-1.5 text-[13px] text-slate-600 rounded-md font-medium hover:bg-slate-50 transition-colors">Surface</button>
                              <button className="px-4 py-1.5 text-[13px] text-amber-900 font-medium bg-amber-100/50 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-amber-200/60 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Guided
                              </button>
                              <button className="px-4 py-1.5 text-[13px] text-slate-600 rounded-md font-medium hover:bg-slate-50 transition-colors">Deep</button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-2.5">Active programs</label>
                            <div className="flex flex-wrap gap-2">
                              <div className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-md text-[13px] text-slate-700 flex items-center gap-2 font-medium">
                                Foundations Trail <Check className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                              <div className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-md text-[13px] text-slate-700 flex items-center gap-2 font-medium">
                                Guided Trail <Check className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                              <div className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-md text-[13px] text-slate-700 flex items-center gap-2 font-medium">
                                Digital Compass <Check className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                              <div className="px-3 py-1.5 border border-dashed border-slate-300 rounded-md text-[13px] text-slate-500 flex items-center justify-center hover:bg-slate-50 cursor-pointer hover:text-slate-700 transition-colors">
                                <Plus className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom buttons */}
                      <div className="flex gap-3 mt-10">
                        <button className="px-4 py-2 border border-slate-200 bg-white shadow-sm rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">Back</button>
                        <button className="px-4 py-2 bg-slate-900 text-white shadow-sm rounded-lg text-[13px] font-medium hover:bg-slate-800 flex items-center gap-2 transition-colors">
                          Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Right side (Penny Co-pilot) */}
                    <div className="w-full lg:w-[40%] bg-[#EFF6FF] border-t lg:border-t-0 lg:border-l border-sky-100 p-6 flex flex-col relative">
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-7 h-7 rounded-md bg-white shadow-sm border border-sky-100 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-sky-500" />
                        </div>
                        <span className="font-semibold text-slate-900 text-[15px] tracking-tight">Penny</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-sky-200 text-sky-600 shadow-sm">
                          Co-pilot
                        </span>
                      </div>

                      <p className="text-[13.5px] text-slate-700 leading-relaxed mb-6 font-medium">
                        Guided hints work best for project-based cohorts. Most TT learners respond well to it. I'll also auto-suggest hint adjustments after the first 2 weeks based on interaction patterns.
                      </p>

                      <div className="flex gap-2 mb-8 flex-wrap">
                        <button className="px-3 py-1.5 bg-white border border-sky-200 shadow-sm text-sky-700 rounded-md text-[12px] font-semibold hover:bg-sky-50 transition-colors">What's the difference?</button>
                        <button className="px-3 py-1.5 bg-white border border-sky-200 shadow-sm text-sky-700 rounded-md text-[12px] font-semibold hover:bg-sky-50 transition-colors">Show me examples</button>
                      </div>

                      <div className="mt-auto bg-white rounded-lg border border-sky-200 shadow-sm p-1.5 pl-3.5 flex items-center focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                        <input 
                          type="text" 
                          placeholder="Ask me anything about this setup..." 
                          className="flex-1 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" 
                        />
                        <button className="w-8 h-8 bg-[#CC8400] hover:bg-amber-600 text-white rounded-md flex items-center justify-center shrink-0 transition-colors shadow-sm">
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // LOCKED STATE
            if (isLocked) {
              return (
                <div key={cap.id} className="bg-[#F5F5F5] border border-dashed border-slate-300 rounded-xl p-5 flex flex-col h-[180px] shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-200/80 border border-slate-300/50 flex items-center justify-center mb-1">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200/70 text-slate-600">{cap.domain}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-500 tracking-tight">{cap.name}</h3>
                  <p className="text-[13px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{cap.desc}</p>
                  <div className="mt-auto pt-3 border-t border-slate-200/60">
                    <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> {cap.lockReason}
                    </p>
                  </div>
                </div>
              );
            }

            // ACTIVE OR NOT STARTED STATE
            return (
              <div 
                key={cap.id} 
                className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-[180px] relative overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer ${!isActive ? 'opacity-[0.85] hover:opacity-100' : ''}`}
                onClick={() => setExpandedId(cap.id)}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500"></div>
                )}
                
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700`}>{cap.domain}</span>
                  {isActive ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100/50 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                      Not started
                    </span>
                  )}
                </div>

                <h3 className={`text-[15px] font-semibold tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>{cap.name}</h3>
                <p className="text-[13px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{cap.desc}</p>
                
                <div className="mt-auto flex items-center justify-between">
                  {isActive ? (
                    <>
                      <span className="text-[12px] font-medium text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200/60 bg-emerald-50/50 shadow-sm">Operational</span>
                      <div className="flex gap-1.5">
                        <button className="w-8 h-8 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 rounded border border-slate-200 flex items-center justify-center text-amber-500 hover:bg-amber-50 hover:border-amber-200 transition-colors shadow-sm bg-white relative group">
                          <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 transition-colors shadow-sm">
                      Enable Penny <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[56px] bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] flex items-center justify-between px-8 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-amber-100/80 flex items-center justify-center border border-amber-200/50">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-[14px] text-slate-700 font-medium">Need help configuring? Ask Penny about any capability</span>
        </div>
        <button className="px-4 py-2 bg-[#CC8400] hover:bg-amber-600 text-white rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors shadow-sm">
          Ask Penny <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
