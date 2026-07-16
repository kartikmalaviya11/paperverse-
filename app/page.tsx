"use client";

import React, { useState, useEffect, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { 
  Search, BookOpen, Database, Cpu, 
  ChevronDown, ArrowRight, CheckCircle2, 
  Clock, GraduationCap, FolderOpen, FileText, AlertTriangle, X
} from "lucide-react";

const statsData = [
  { value: "VNSGU", label: "Exclusive Platform", icon: GraduationCap, color: "text-[#7C3AED]" },
  { value: "2015–26", label: "Paper Coverage", icon: Clock, color: "text-[#3B82F6]" },
  { value: "40+", label: "BCA Subjects", icon: BookOpen, color: "text-[#7C3AED]" },
  { value: "100%", label: "Free for Students", icon: CheckCircle2, color: "text-[#22C55E]", valColor: "text-[#22C55E]" }
];

const featureCards = [
  { icon: Database, title: "Previous Year Papers", desc: "Access a perfectly organized repository of past VNSGU BCA papers, categorized by semester and year." },
  { icon: CheckCircle2, title: "MCQ Practice Mode", desc: "Test your knowledge with interactive multiple-choice questions tailored to the BCA syllabus." },
  { icon: Search, title: "Smart Search", desc: "Find exact topics, specific years, or particular subjects instantly with our optimized search engine." },
  { icon: Cpu, title: "Fast & Focused", desc: "No clutter. Just lightning-fast access to the study materials you actually need." },
];

const semestersData = [
  { num: 1, subjects: 6 }, { num: 2, subjects: 6 }, { num: 3, subjects: 7 },
  { num: 4, subjects: 7 }, { num: 5, subjects: 5 }, { num: 6, subjects: 4 },
];

const faqsData = [
  { q: "Which university is supported?", a: "Currently, PaperVerse exclusively supports the Bachelor of Computer Applications (BCA) program at Veer Narmad South Gujarat University (VNSGU)." },
  { q: "Which years are available?", a: "Our database actively indexes question papers spanning from 2015 to 2026, covering both CBCS and newer curriculum structures." },
  { q: "Is registration required?", a: "No. You can browse and view all question papers freely without creating an account. Registration is only required to track MCQ scores and save subjects." },
  { q: "Is PaperVerse free?", a: "Yes, accessing past papers and basic MCQ practice is completely free for students." },
];

const Counter = memo(({ end, suffix = "" }: { end: number; suffix?: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let reqId: number;
    const duration = 2000;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        reqId = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    reqId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqId);
  }, [end]);

  return <span aria-live="polite">{count}{suffix}</span>;
});
Counter.displayName = "Counter";

const FAQItem = memo(({ q, a }: { q: string; a: string }) => {
  return (
    <details className="bg-[#18181B] border border-[#27272A] rounded-xl mb-4 group transition-colors hover:border-[#3f3f46] cursor-pointer">
      <summary className="px-6 py-5 flex justify-between items-center text-left text-[#FAFAFA] font-medium outline-none select-none list-none [&::-webkit-details-marker]:hidden">
        <span>{q}</span>
        <ChevronDown className="w-5 h-5 text-[#A1A1AA] transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-6 pb-5 text-[#A1A1AA] text-sm leading-relaxed border-t border-[#27272A] pt-4 cursor-default">
        {a}
      </div>
    </details>
  );
});
FAQItem.displayName = "FAQItem";

const LoginErrorBanner = memo(() => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_failed") {
      setShow(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-16 inset-x-0 z-40 px-4">
      <div className="max-w-xl mx-auto bg-[#18181B] border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg mt-3">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-[#A1A1AA] flex-1">
          Login complete nahi ho paaya — ek hi baar &quot;Log in&quot; pe click karke thoda wait karo, phir try karo.
        </p>
        <button
          onClick={() => setShow(false)}
          aria-label="Dismiss"
          className="text-[#A1A1AA] hover:text-[#FAFAFA] flex-shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
LoginErrorBanner.displayName = "LoginErrorBanner";

type AuthState = {
  loading: boolean;
  email: string | null;
  initial: string;
  avatarUrl: string | null;
};

const Navbar = memo(() => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    email: null,
    initial: "",
    avatarUrl: null,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split("@")[0] ??
          "S";
        setAuth({
          loading: false,
          email: user.email ?? null,
          initial: name.charAt(0).toUpperCase(),
          avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        });
      } else {
        setAuth({ loading: false, email: null, initial: "", avatarUrl: null });
      }
    });
  }, []);

  const handleLoginClick = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setIsLoggingIn(false);
  };

  const handleGetStarted = () => {
    document.getElementById("semesters")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#09090B]/90 backdrop-blur-md border-b border-[#27272A]">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between" aria-label="Main Navigation">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(124,58,237,0.3)] bg-[#09090B] flex items-center justify-center p-0.5 relative">
            <Image src="/logo.png" alt="PaperVerse Logo" fill sizes="32px" className="object-contain" priority />
          </div>
          <span className="text-[#FAFAFA] font-semibold tracking-tight text-lg">PaperVerse</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#A1A1AA] font-medium">
          <a href="#home" className="hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#FAFAFA]">Home</a>
          <a href="#semesters" className="hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#FAFAFA]">Semesters</a>
          <a href="#about" className="hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#FAFAFA]">Features</a>
          <a href="#faq" className="hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#FAFAFA]">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          {!auth.loading && auth.email ? (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] font-medium transition-colors focus:outline-none focus-visible:text-[#FAFAFA]"
            >
              {auth.avatarUrl ? (
                <Image
                  src={auth.avatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full border border-[#27272A]"
                  unoptimized
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[10px] font-semibold text-[#A78BFA]">
                  {auth.initial}
                </span>
              )}
              Dashboard
            </Link>
          ) : (
            <button
              onClick={handleLoginClick}
              disabled={isLoggingIn || auth.loading}
              className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] font-medium transition-colors hidden sm:block focus:outline-none focus-visible:text-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? "Redirecting…" : "Log in"}
            </button>
          )}
          <button 
            onClick={handleGetStarted}
            className="bg-[#FAFAFA] text-[#09090B] px-4 py-2 rounded-full text-sm font-semibold hover:bg-white transition-all shadow-[0_0_10px_rgba(250,250,250,0.1)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
});
Navbar.displayName = "Navbar";

const Hero = memo(() => {
  return (
    <section id="home" className="relative min-h-[100svh] flex items-center justify-center pt-24 pb-12 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#7C3AED]/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center z-10 w-full mt-8 lg:mt-0">
        
        <div className="flex flex-col gap-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27272A]/50 border border-[#27272A] w-fit">
            <span className="flex h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" aria-hidden="true"></span>
            <span className="text-xs font-medium text-[#A1A1AA]">Built exclusively for VNSGU BCA</span>
          </div>

          <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] lg:text-[clamp(3.5rem,5vw,5rem)] font-bold tracking-tight text-[#FAFAFA] leading-[1.1]">
            Study Smarter. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]">
              Ace Every Semester.
            </span>
          </h1>

          <p className="text-lg text-[#A1A1AA] leading-relaxed max-w-xl">
            The modern exam preparation platform. Browse previous year question papers from Semester 1 to 6, practice MCQs, and track your progress in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA] group-focus-within:text-[#7C3AED] transition-colors" aria-hidden="true" />
              <input 
                type="text" 
                placeholder="Search Semester 4..." 
                aria-label="Search semesters or subjects"
                className="w-full h-12 bg-[#18181B] border border-[#27272A] rounded-xl pl-12 pr-4 text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 transition-all shadow-sm"
              />
            </div>
            <a 
              href="#semesters" 
              className="flex items-center justify-center h-12 px-6 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_25px_rgba(124,58,237,0.4)] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Browse Semesters
            </a>
          </div>

          <div className="lg:hidden grid grid-cols-2 gap-4 mt-2 w-full">
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-md">
              <p className="text-2xl font-bold text-[#3B82F6]">150+</p>
              <p className="text-xs text-[#A1A1AA] mt-1">Papers Indexed</p>
            </div>
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-md">
              <p className="text-2xl font-bold text-[#22C55E]">1000+</p>
              <p className="text-xs text-[#A1A1AA] mt-1">Practice MCQs</p>
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block h-[500px] w-full perspective-1000 select-none pointer-events-none">
          <motion.div 
            animate={{ y: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="absolute top-[20%] right-0 w-[320px] bg-[#18181B]/90 border border-[#27272A] rounded-2xl p-5 shadow-2xl backdrop-blur-xl z-20"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-3 items-center">
                <div className="p-2 bg-[#7C3AED]/10 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-[#7C3AED]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#FAFAFA]">Currently Browsing</h3>
                  <p className="text-xs text-[#A1A1AA]">Semester 6 • Core Subjects</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="w-full h-8 bg-[#27272A]/50 rounded border border-[#27272A] flex items-center px-3">
                <div className="w-3/4 h-2 bg-[#7C3AED]/50 rounded-full" />
              </div>
              <div className="w-full h-8 bg-[#27272A]/30 rounded border border-[#27272A]/50 flex items-center px-3">
                <div className="w-1/2 h-2 bg-[#3B82F6]/50 rounded-full" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [15, -15, 15] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            className="absolute top-4 left-4 w-[220px] bg-[#09090B] border border-[#27272A] rounded-2xl p-4 shadow-xl z-10 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-[#3B82F6]/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#3B82F6]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#FAFAFA] leading-none">
                <Counter end={150} suffix="+" />
              </p>
              <p className="text-xs text-[#A1A1AA] mt-1">Papers Indexed</p>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [-15, 15, -15] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            className="absolute bottom-16 right-16 w-[240px] bg-[#09090B] border border-[#27272A] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-30 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#22C55E]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#FAFAFA] leading-none">
                <Counter end={1000} suffix="+" />
              </p>
              <p className="text-xs text-[#A1A1AA] mt-1">Practice Questions</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});
Hero.displayName = "Hero";

const Stats = memo(() => (
  <section className="py-12 border-y border-[#27272A] bg-[#09090B] relative overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#7C3AED]/5 rounded-full blur-[80px] pointer-events-none" />
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-[#27272A]/0 md:divide-[#27272A] relative z-10">
      {statsData.map((stat, i) => (
        <div key={i} className="flex flex-col items-center md:items-start md:px-8 first:px-0 group cursor-default">
          <p className={`text-3xl font-bold transition-transform duration-300 group-hover:scale-105 ${stat.valColor || 'text-[#FAFAFA]'}`}>
            {stat.value}
          </p>
          <p className="text-sm text-[#A1A1AA] mt-1 font-medium flex items-center gap-2">
            <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" /> {stat.label}
          </p>
        </div>
      ))}
    </div>
  </section>
));
Stats.displayName = "Stats";

const Features = memo(() => {
  return (
    <section className="py-24 lg:py-32 max-w-7xl mx-auto px-6" id="about">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-[#FAFAFA] mb-4">Everything you need to succeed.</h2>
        <p className="text-[#A1A1AA]">Designed specifically for computer application students. Skip the endless searching and start preparing directly.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {featureCards.map((card, i) => (
          <div 
            key={i} 
            className="bg-[#18181B] border border-[#27272A] p-6 rounded-2xl hover:border-[#7C3AED]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(124,58,237,0.15)] group cursor-default"
          >
            <div className="w-12 h-12 bg-[#27272A] rounded-xl flex items-center justify-center text-[#FAFAFA] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors duration-300 mb-6">
              <card.icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">{card.title}</h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
});
Features.displayName = "Features";

const SemesterGrid = memo(() => {
  return (
    <section className="py-24 bg-[#18181B] border-y border-[#27272A]" id="semesters">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-bold text-[#FAFAFA] mb-2">Browse by Semester</h2>
            <p className="text-[#A1A1AA]">Select your current semester to view all core and elective subjects.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {semestersData.map((sem) => (
            <Link href={`/semester/${sem.num}`} key={sem.num} className="block w-full outline-none">
              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }} 
                whileTap={{ scale: 0.97 }}
                aria-label={`View Semester ${sem.num} subjects`}
                className="text-left w-full bg-[#09090B] border border-[#27272A] rounded-2xl p-6 hover:border-[#7C3AED]/50 hover:z-10 transition-colors group flex flex-col justify-between h-40 relative overflow-hidden cursor-pointer"
              >
                <div 
                  className="absolute -right-4 -bottom-8 text-8xl font-black text-[#27272A]/20 pointer-events-none group-hover:text-[#7C3AED]/5 transition-colors duration-300"
                  aria-hidden="true"
                >
                  {sem.num}
                </div>
                <div className="flex justify-between items-start z-10 pointer-events-none relative w-full">
                  <div className="p-3 bg-[#18181B] rounded-xl border border-[#27272A] group-hover:border-[#7C3AED]/30 group-hover:bg-[#7C3AED]/10 transition-colors duration-300">
                    <FolderOpen className="w-6 h-6 text-[#7C3AED]" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-medium text-[#A1A1AA] bg-[#18181B] px-3 py-1.5 rounded-full border border-[#27272A]">
                    {sem.subjects} Subjects
                  </span>
                </div>
                <div className="flex items-center justify-between z-10 mt-auto pointer-events-none relative w-full">
                  <h3 className="text-xl font-bold text-[#FAFAFA]">Semester {sem.num}</h3>
                  <div className="w-8 h-8 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center group-hover:bg-[#7C3AED] group-hover:border-[#7C3AED] group-hover:text-white transition-all duration-300 text-[#A1A1AA]">
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});
SemesterGrid.displayName = "SemesterGrid";

const FAQ = memo(() => {
  return (
    <section className="py-24 max-w-3xl mx-auto px-6" id="faq">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-4">Frequently Asked Questions</h2>
        <p className="text-[#A1A1AA]">Everything you need to know about the platform.</p>
      </div>
      <div className="space-y-4">
        {faqsData.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} />
        ))}
      </div>
    </section>
  );
});
FAQ.displayName = "FAQ";

const Footer = memo(() => (
  <footer className="bg-[#09090B] border-t border-[#27272A] pt-16 pb-8">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center bg-[#09090B] relative">
          <Image src="/logo.png" alt="PaperVerse Logo" fill sizes="24px" className="object-contain" />
        </div>
        <span className="text-[#FAFAFA] font-semibold tracking-tight">PaperVerse</span>
      </div>
      <div className="flex gap-6 text-sm text-[#A1A1AA]">
        <a href="#" className="hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#FAFAFA]">Privacy</a>
        <a href="#" className="hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#FAFAFA]">Terms</a>
        <a href="#" className="hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#FAFAFA]">GitHub</a>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-[#27272A]/50 flex flex-col items-center justify-center gap-4">
      <p className="text-xs text-[#A1A1AA]">
        &copy; {new Date().getFullYear()} PaperVerse. All rights reserved. Built for VNSGU.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-[#A1A1AA]">
        <span>Designed & Engineered by</span>
        <span className="px-4 py-1.5 rounded-full bg-[#18181B] border border-[#27272A] text-[#FAFAFA] font-semibold tracking-widest text-xs shadow-[0_0_15px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all cursor-default select-none">
          KARTIK MALAVIYA
        </span>
      </div>
    </div>
  </footer>
));
Footer.displayName = "Footer";

export default function Home() {
  return (
    <div className="min-h-[100svh] bg-[#09090B] text-[#FAFAFA] selection:bg-[#7C3AED]/30 scroll-smooth flex flex-col">
      <Navbar />
      <LoginErrorBanner />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <SemesterGrid />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}