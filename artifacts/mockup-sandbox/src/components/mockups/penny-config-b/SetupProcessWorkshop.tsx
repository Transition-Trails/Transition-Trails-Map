import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  Settings, 
  ChevronRight, 
  Send, 
  Search, 
  Plus, 
  ToggleRight
} from 'lucide-react';

export default function SetupProcessWorkshop() {
  const [activeStep] = useState('preflight');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans pb-[52px]">
      {/* Top header bar */}
      <header className="h-[60px] bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-semibold text-gray-900">Penny Capabilities</h1>
          <span className="text-[13px] text-gray-500 mt-1">Enable and configure what Penny can do</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search capabilities..." 
              className="h-8 pl-9 pr-3 rounded border border-gray-200 text-[13px] w-48 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button className="h-8 px-3 rounded border border-gray-200 flex items-center gap-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" />
            Add capability
          </button>
        </div>
      </header>

      {/* Filter + status bar */}
      <div className="h-[44px] bg-gray-50 border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          {['All 7', 'Coaching', 'Career', 'Learning', 'Knowledge', 'Comms', 'Questing'].map((filter, i) => (
            <button 
              key={filter}
              className={`px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${
                i === 0 
                  ? 'bg-sky-100 text-sky-700' 
                  : 'text-gray-600 hover:bg-gray-200/50'
              }`}
            >
              {filter} {filter === 'Coaching' && <span className="ml-1 text-green-600 font-bold">✓</span>}
              {filter === 'Coaching' && <span className="text-green-600">active</span>}
            </button>
          ))}
        </div>
        <div className="text-[13px] text-gray-500">
          <span className="text-gray-700 font-medium">2 active</span> · 1 in setup · 4 not started
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
        
        {/* ROW 1: Two active compact cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Trail Guide */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col relative p-4 pl-[19px]">
            {/* Left border */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#9FC3AE]" />
            
            <div className="flex items-center justify-between mb-3">
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700">Coaching</div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F0EA] text-[#2F6B3F]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F]" />
                Active
              </div>
            </div>
            
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Trail Guide</h3>
            <p className="text-[13px] text-gray-500 truncate mb-4">Personalized learning path advisor</p>
            
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[12px] font-medium text-[#2F6B3F] bg-[#E6F0EA] px-2 py-0.5 rounded">Operational</span>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>
                <button className="px-2 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Ask Penny
                </button>
              </div>
            </div>
          </div>

          {/* Learning Coach */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col relative p-4 pl-[19px]">
            {/* Left border */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#9FC3AE]" />
            
            <div className="flex items-center justify-between mb-3">
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700">Learning</div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F0EA] text-[#2F6B3F]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F]" />
                Active
              </div>
            </div>
            
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Learning Coach</h3>
            <p className="text-[13px] text-gray-500 truncate mb-4">Contextual help for in-progress modules</p>
            
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[12px] font-medium text-[#2F6B3F] bg-[#E6F0EA] px-2 py-0.5 rounded">Operational</span>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>
                <button className="px-2 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Ask Penny
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* EXPANDED CARD: Build Companion */}
        <div className="bg-[#FFFCF5] rounded-lg border border-[#F3E5CC] shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#CC8400]" />
          
          {/* Header Row */}
          <div className="p-5 pl-6 border-b border-[#F3E5CC] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[17px] font-semibold text-gray-900">Build Companion</h2>
                <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF3E0] text-[#CC8400]">Learning</div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF3E0] text-[#CC8400] border border-[#F3E5CC]">
                  <Sparkles className="w-3 h-3" /> Setting up...
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-gray-500">Step 1 of 4: Pre-flight</span>
                <ToggleRight className="w-9 h-9 text-[#CC8400] stroke-[1.5]" />
              </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-0 mt-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CC8400] text-white text-[12px] font-medium shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" /> 1 Pre-flight
                </div>
              </div>
              <div className="w-12 h-[1px] bg-gray-300 mx-2" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 text-gray-500 text-[12px] font-medium bg-white/50">
                2 Configure
              </div>
              <div className="w-12 h-[1px] bg-gray-300 mx-2" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 text-gray-500 text-[12px] font-medium bg-white/50">
                3 Test
              </div>
              <div className="w-12 h-[1px] bg-gray-300 mx-2" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 text-gray-500 text-[12px] font-medium bg-white/50">
                4 Activate
              </div>
            </div>
          </div>

          {/* Main body - TWO COLUMNS */}
          <div className="flex p-5 pl-6 gap-6 items-stretch">
            {/* Left Column - Checklist (58%) */}
            <div className="w-[58%] flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-[14px] font-semibold text-gray-900">Setup Requirements</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF3E0] text-[#CC8400]">3 of 5 met</span>
              </div>

              <div className="flex flex-col mb-5">
                {/* Row 1 */}
                <div className="flex items-center py-2.5 border-b border-gray-200/60">
                  <CheckCircle2 className="w-5 h-5 text-[#2F6B3F] shrink-0 mr-3" />
                  <span className="text-[13px] text-gray-700 flex-1">Penny_Trail_Config__c field on Contact</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F0EA] text-[#2F6B3F] ml-3">Present</span>
                </div>
                {/* Row 2 */}
                <div className="flex items-center py-2.5 border-b border-gray-200/60">
                  <CheckCircle2 className="w-5 h-5 text-[#2F6B3F] shrink-0 mr-3" />
                  <span className="text-[13px] text-gray-700 flex-1">PMM Program Management installed</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F0EA] text-[#2F6B3F] ml-3">Detected</span>
                </div>
                {/* Row 3 */}
                <div className="flex items-center py-2.5 border-b border-gray-200/60">
                  <CheckCircle2 className="w-5 h-5 text-[#2F6B3F] shrink-0 mr-3" />
                  <span className="text-[13px] text-gray-700 flex-1">At least 1 active Trail Config</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F0EA] text-[#2F6B3F] ml-3">3 active</span>
                </div>
                {/* Row 4 */}
                <div className="flex items-center py-2.5 border-b border-gray-200/60">
                  <AlertTriangle className="w-5 h-5 text-[#CC8400] shrink-0 mr-3" />
                  <span className="text-[13px] text-gray-900 font-medium flex-1">Build_Companion_Enabled__c SF field</span>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF3E0] text-[#CC8400]">Missing</span>
                    <button className="text-[12px] font-medium text-[#CC8400] hover:underline underline-offset-2">Fix →</button>
                  </div>
                </div>
                {/* Row 5 */}
                <div className="flex items-center py-2.5 border-b border-gray-200/60">
                  <AlertTriangle className="w-5 h-5 text-[#CC8400] shrink-0 mr-3" />
                  <span className="text-[13px] text-gray-900 font-medium flex-1">Guided Trail program active</span>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF3E0] text-[#CC8400]">Not found</span>
                    <button className="text-[12px] font-medium text-[#CC8400] hover:underline underline-offset-2">Fix →</button>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFF3E0] rounded-md p-3 flex items-start gap-2.5 mb-6">
                <Sparkles className="w-4 h-4 text-[#CC8400] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#A66C00] leading-relaxed">
                  2 requirements need attention before you can configure Build Companion. Penny can guide you through each fix.
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-2">
                <button className="text-[13px] font-medium text-gray-500 hover:text-gray-700">← Back</button>
                <button className="px-4 py-2 bg-[#CC8400] hover:bg-[#B37400] text-white rounded text-[13px] font-medium shadow-sm transition-colors">
                  Fix missing requirements (2) →
                </button>
              </div>
            </div>

            {/* Right Column - Penny co-pilot (42%) */}
            <div className="w-[42%] bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Sparkles className="w-4 h-4 text-[#CC8400]" />
                <h3 className="text-[14px] font-semibold text-gray-900">Penny</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-600 uppercase tracking-wide">Co-pilot</span>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto bg-white">
                <div className="text-[13px] text-gray-700 leading-relaxed space-y-3.5">
                  <p>Build Companion is almost ready. The two missing items are quick fixes:</p>
                  <p>
                    <span className="font-bold text-gray-900">Build_Companion_Enabled__c</span> is a custom field I need on your Salesforce Contact object. I can walk you through creating it — it takes about 3 minutes in Salesforce Setup.
                  </p>
                  <p>
                    <span className="font-bold text-gray-900">Guided Trail</span> needs to be an active program. Once that's live, Build Companion can start routing learners automatically.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button className="px-3 py-2.5 border border-gray-200 rounded-md text-[12px] font-medium text-gray-700 hover:bg-gray-50 text-left flex justify-between items-center group transition-colors shadow-sm">
                    Walk me through the SF field
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                  </button>
                  <button className="px-3 py-2.5 border border-gray-200 rounded-md text-[12px] font-medium text-gray-700 hover:bg-gray-50 text-left flex justify-between items-center group transition-colors shadow-sm">
                    Show me Guided Trail setup
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-3 border-t border-gray-100 bg-white">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ask Penny about this requirement..." 
                    className="w-full h-9 pl-3 pr-9 rounded-md border border-gray-300 text-[12px] focus:outline-none focus:border-[#CC8400] focus:ring-1 focus:ring-[#CC8400] placeholder:text-gray-400"
                  />
                  <button className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-white bg-[#CC8400] hover:bg-[#B37400] transition-colors">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Not-started capabilities (3 col) */}
        <div className="grid grid-cols-3 gap-4">
          {/* Exam Coach */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">Assessment</div>
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">Not started</div>
            </div>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Exam Coach</h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-snug">Pre-assessment and certification prep</p>
            <div className="mt-auto pt-2">
              <button className="w-full py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[12px] font-medium transition-colors">
                Enable Penny →
              </button>
            </div>
          </div>

          {/* Career Translator */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">Career</div>
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">Not started</div>
            </div>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Career Translator</h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-snug">Skills-to-role mapping and guidance</p>
            <div className="mt-auto pt-2">
              <button className="w-full py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[12px] font-medium transition-colors">
                Enable Penny →
              </button>
            </div>
          </div>

          {/* Quest Master */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">Gamification</div>
              <div className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">Not started</div>
            </div>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Quest Master</h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-snug">Challenge creation and reward logic</p>
            <div className="mt-auto pt-2">
              <button className="w-full py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[12px] font-medium transition-colors">
                Enable Penny →
              </button>
            </div>
          </div>
        </div>

        {/* LOCKED CARD: Coach Intelligence */}
        <div className="bg-[#F9FAFB] rounded-lg border border-dashed border-gray-300 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-700 flex items-center gap-2">
                Coach Intelligence
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">Locked</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-gray-500">Requires: Exam Coach + Quest Master to be active</span>
            <button className="text-[13px] font-medium text-gray-600 hover:text-gray-900">See requirements →</button>
          </div>
        </div>

      </main>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[52px] bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#CC8400]" />
          <span className="text-[13px] text-gray-600">Working through a requirement? Ask Penny for help</span>
        </div>
        <button className="px-4 py-1.5 bg-[#CC8400] hover:bg-[#B37400] text-white rounded text-[13px] font-medium shadow-sm transition-colors flex items-center gap-1.5">
          Ask Penny <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
