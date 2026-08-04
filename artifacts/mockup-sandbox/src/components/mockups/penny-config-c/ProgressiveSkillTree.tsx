import React, { useState } from "react";
import { Sparkles, Lock, CheckCircle2, Zap, ChevronRight, ArrowRight, ArrowLeft } from "lucide-react";

export default function ProgressiveSkillTree() {
  const [selectedNode, setSelectedNode] = useState("build-companion");

  const nodes = [
    {
      id: "trail-guide",
      domain: "CORE",
      name: "Trail Guide",
      status: "ENABLED",
      x: 120,
      y: 244,
    },
    {
      id: "learning-coach",
      domain: "COACHING",
      name: "Learning Coach",
      status: "ENABLED",
      x: 380,
      y: 144,
    },
    {
      id: "build-companion",
      domain: "COACHING",
      name: "Build Companion",
      status: "IN SETUP",
      x: 380,
      y: 344,
    },
    {
      id: "career-translator",
      domain: "CAREER",
      name: "Career Translator",
      status: "AVAILABLE",
      x: 640,
      y: 44,
    },
    {
      id: "exam-coach",
      domain: "ASSESSMENT",
      name: "Exam Coach",
      status: "AVAILABLE",
      x: 640,
      y: 144,
    },
    {
      id: "quest-master",
      domain: "GAMIFICATION",
      name: "Quest Master",
      status: "AVAILABLE",
      x: 640,
      y: 344,
    },
    {
      id: "coach-intelligence",
      domain: "EXPERT",
      name: "Coach Intelligence",
      status: "LOCKED",
      x: 900,
      y: 244,
    },
  ];

  return (
    <div className="w-[1380px] h-[960px] bg-white flex flex-col font-sans relative overflow-hidden text-slate-900 border border-slate-200 shadow-xl rounded-lg">
      {/* Header */}
      <header className="h-[60px] border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-[20px]">Penny Capability Tree</h1>
          <div className="w-px h-5 bg-slate-300"></div>
          <p className="text-[13px] text-slate-500">
            Build Penny's skills in sequence — each capability builds on the last
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-slate-500 font-medium">Advanced view</span>
            <div className="w-9 h-5 bg-slate-200 rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-[2px] left-[2px] shadow-sm"></div>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-[#CC8400] text-white px-4 py-2 rounded-md text-[13px] font-semibold hover:bg-[#b37400] transition-colors shadow-sm">
            <Sparkles className="w-4 h-4" />
            Ask Penny
          </button>
        </div>
      </header>

      {/* Main Tree Area */}
      <div 
        className="flex-1 relative"
        style={{
          backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9FC3AE" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#FFD08A" />
            </marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#7DD3FC" />
            </marker>
            <marker id="arrow-grey" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#D1D5DB" />
            </marker>
          </defs>
          
          {/* TG -> LC */}
          <path d="M 280 280 C 330 280, 330 180, 376 180" fill="none" stroke="#9FC3AE" strokeWidth="2" markerEnd="url(#arrow-green)" />
          {/* TG -> BC */}
          <path d="M 280 280 C 330 280, 330 380, 376 380" fill="none" stroke="#FFD08A" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-amber)" />
          {/* LC -> EC */}
          <path d="M 540 180 C 590 180, 590 180, 636 180" fill="none" stroke="#7DD3FC" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-blue)" />
          {/* EC -> CI */}
          <path d="M 800 180 C 850 180, 850 280, 896 280" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-grey)" />
          {/* QM -> CI */}
          <path d="M 800 380 C 850 380, 850 280, 896 280" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-grey)" />
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          
          let bgClass = "";
          let borderClass = "";
          let textClass = "text-slate-900";
          let badgeClass = "";
          let statusTextClass = "";
          
          if (node.status === "ENABLED") {
            bgClass = "bg-[#E6F0EA]";
            borderClass = "border-[#9FC3AE]";
            badgeClass = "bg-[#cce3d5] text-[#2F6B3F]";
            statusTextClass = "text-[#2F6B3F]";
          } else if (node.status === "IN SETUP") {
            bgClass = "bg-[#FFF3E0]";
            borderClass = "border-[#FFD08A]";
            badgeClass = "bg-[#ffe0b2] text-[#CC8400]";
            statusTextClass = "text-[#CC8400]";
          } else if (node.status === "AVAILABLE") {
            bgClass = "bg-white";
            borderClass = "border-[#7DD3FC]";
            badgeClass = "bg-[#e0f2fe] text-[#0284c7]";
            statusTextClass = "text-[#0EA5E9]";
          } else if (node.status === "LOCKED") {
            bgClass = "bg-[#F3F4F6]";
            borderClass = "border-slate-300 border-dashed";
            badgeClass = "bg-slate-200 text-slate-500";
            statusTextClass = "text-slate-500";
            textClass = "text-slate-500";
          }

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`absolute w-[160px] h-[72px] rounded-xl border-2 flex flex-col justify-center px-4 cursor-pointer transition-all z-10 shadow-sm hover:shadow-md
                ${bgClass} ${borderClass} 
                ${isSelected ? "ring-4 ring-[#0EA5E9] ring-opacity-50 ring-offset-2" : ""}`}
              style={{ left: node.x, top: node.y }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase ${badgeClass}`}>
                  {node.domain}
                </span>
              </div>
              <h3 className={`text-[13px] font-semibold leading-tight mb-1 truncate ${textClass}`}>
                {node.name}
              </h3>
              
              <div className={`flex items-center gap-1 mt-auto ${statusTextClass}`}>
                {node.status === "ENABLED" && <CheckCircle2 className="w-3.5 h-3.5" />}
                {node.status === "IN SETUP" && <Zap className="w-3.5 h-3.5" />}
                {node.status === "LOCKED" && <Lock className="w-3 h-3" />}
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {node.status === "AVAILABLE" ? "Enable →" : node.status}
                </span>
              </div>
              
              {node.status === "LOCKED" && (
                <div className="absolute -bottom-5 left-0 w-full text-center text-[9px] text-slate-400 font-medium tracking-wide">
                  Reqs Exam + Quest
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Panel */}
      <div className="h-[280px] bg-[#F8FAFC] border-t border-slate-200 flex shrink-0">
        {/* Left: Config */}
        <div className="w-[60%] p-8 border-r border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Build Companion</h2>
              <span className="bg-[#FFF3E0] text-[#CC8400] border border-[#FFD08A] px-2.5 py-1 rounded-full text-xs font-semibold">
                In Setup · Step 3 of 4
              </span>
            </div>
            
            <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
              <div className="bg-[#CC8400] h-full w-[75%] rounded-full"></div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center">
                <span className="w-32 text-[14px] font-medium text-slate-600">Hint depth</span>
                <div className="flex bg-slate-200 p-1 rounded-lg">
                  <button className="px-4 py-1.5 text-[13px] font-medium text-slate-600 rounded-md">Surface</button>
                  <button className="px-4 py-1.5 text-[13px] font-medium text-slate-900 bg-white shadow-sm rounded-md flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#CC8400]"></div>
                    Guided
                  </button>
                  <button className="px-4 py-1.5 text-[13px] font-medium text-slate-600 rounded-md">Deep</button>
                </div>
              </div>

              <div className="flex items-start">
                <span className="w-32 text-[14px] font-medium text-slate-600 pt-1.5">Active for</span>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[13px] font-medium">
                    Foundations <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[13px] font-medium">
                    Guided Trail <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[13px] font-medium">
                    Digital Compass <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button className="px-4 py-2 text-[14px] font-medium text-slate-600 hover:bg-slate-200 rounded-md flex items-center gap-2 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button className="px-6 py-2.5 bg-[#CC8400] text-white text-[14px] font-semibold rounded-md flex items-center gap-2 hover:bg-[#b37400] transition-colors shadow-sm">
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="px-4 py-2 text-[14px] font-medium text-slate-500 hover:text-slate-800 ml-auto transition-colors">
              Skip setup →
            </button>
          </div>
        </div>

        {/* Right: Penny Advice */}
        <div className="w-[40%] p-8 bg-slate-50 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1 flex flex-col relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#FFF3E0] text-[#CC8400] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            
            <h3 className="text-[14px] font-semibold text-slate-900 ml-4 mb-3">
              Penny's take on Build Companion
            </h3>
            
            <p className="text-[14px] text-slate-600 leading-relaxed mb-6">
              "Build Companion works best when learners know what they're building. Make sure Guided Trail's project structure is active before you flip this live — the hints make much more sense in context."
            </p>
            
            <div className="mt-auto relative">
              <input 
                type="text" 
                placeholder="Ask Penny something else..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-4 pr-10 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#CC8400] focus:border-transparent transition-all"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#CC8400] p-1">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="absolute bottom-8 right-8 w-[52px] h-[52px] bg-[#CC8400] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#b37400] hover:scale-105 transition-all group z-50">
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm animate-pulse">
          1 suggestion
        </span>
      </button>
    </div>
  );
}
