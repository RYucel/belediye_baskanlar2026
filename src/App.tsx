import React, { useState, useEffect } from 'react';
import { Mayor } from './types';
import { MayorCard } from './components/MayorCard';
import { VoteModal } from './components/VoteModal';
import { NewsWidget } from './components/NewsWidget';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [mayors, setMayors] = useState<Mayor[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [votingMayor, setVotingMayor] = useState<Mayor | null>(null);
  const [newsMayor, setNewsMayor] = useState<Mayor | null>(null);

  const fetchMayors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mayors');
      const data = await res.json();
      setMayors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMayors();
  }, []);

  const topPartyString = () => {
    if (!mayors.length) return null;
    const parties = mayors.map(m => m.party);
    const counts = parties.reduce((acc, p) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const top = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 2);
    
    return top.map(([party]) => (
      <span key={party} className="text-sm md:text-base font-bold bg-white text-[#1a1a1a] px-3 py-1">{party}</span>
    ));
  };

  const totalVotesCount = mayors.reduce((acc, m) => acc + m.totalVotes, 0);

  return (
    <div className="min-h-screen bg-gray-100 py-4 md:py-8 px-2 md:px-4 flex justify-center selection:bg-orange-200">
      <div className="flex flex-col w-full max-w-7xl bg-[#FDFCFB] text-[#1a1a1a] font-sans border-[6px] border-[#1a1a1a] shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end px-6 md:px-12 pt-10 pb-8 border-b-2 border-[#1a1a1a]">
          <div className="flex flex-col mb-4 sm:mb-0">
            <h1 className="text-5xl md:text-[5rem] lg:text-[6rem] font-black uppercase tracking-tighter leading-none italic font-serif">PERFORMANS DEĞERLENDİRME</h1>
            <p className="mt-3 text-xs md:text-sm font-bold tracking-widest uppercase opacity-60">"Hep siz bizi?, Biraz da biz sizi!"</p>
          </div>
          <div className="flex flex-col text-left sm:text-right">
            <div className="text-xs font-bold uppercase mb-1 tracking-widest">Son Güncelleme</div>
            <div className="text-2xl md:text-3xl font-serif italic flex items-center gap-2 sm:justify-end">
              {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              <button 
                onClick={fetchMayors}
                disabled={loading}
                className="p-1 hover:text-orange-500 transition-colors focus:outline-none"
                title="Yenile"
              >
                <RefreshCw className={`h-5 w-5 md:h-6 md:w-6 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar */}
          <section className="w-full md:w-1/3 lg:w-1/4 border-b-2 md:border-b-0 md:border-r-2 border-[#1a1a1a] flex flex-col shrink-0">
            <div className="p-6 md:p-10">
              <h2 className="text-xl md:text-2xl font-bold uppercase mb-6 tracking-tight border-b-2 border-orange-500 pb-1 inline-block">NASIL OY VERİLİR?</h2>
              <p className="text-sm md:text-base leading-relaxed mb-8 font-serif">
                Güvenilir sonuçlar için sadece SMS doğrulama ile oy kabul edilmektedir. "Sallama" oyları engellemek adına her oy için 4 temel alanda değerlendirme zorunludur.
              </p>
              <div className="space-y-8">
                <div className="flex flex-col">
                  <label className="text-xs md:text-sm font-bold uppercase tracking-widest mb-2 text-orange-600">GÜVENLİK</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-100 border border-gray-300">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-xs md:text-sm font-mono uppercase">Cihaz Doğrulandı</span>
                  </div>
                </div>
                <div className="flex flex-col hidden sm:flex">
                  <label className="text-xs md:text-sm font-bold uppercase tracking-widest mb-2">KRİTERLER</label>
                  <ul className="text-xs md:text-sm space-y-2 font-medium opacity-80">
                    <li>• Altyapı ve Yol Çalışmaları</li>
                    <li>• Sosyal Belediyecilik</li>
                    <li>• Şehir Planlama & Trafik</li>
                    <li>• Şeffaflık & İletişim</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-auto bg-[#1a1a1a] text-white p-6 md:p-10">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-3">GÜNÜN ÖNE ÇIKANI</p>
              <p className="text-base md:text-lg lg:text-xl leading-tight font-serif italic">"Seçim yaklaşırken altyapı projeleri puanlamaları doğrudan etkiliyor."</p>
            </div>
          </section>

          {/* Leaderboard */}
          <section className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto max-h-[900px]">
            <div className="flex flex-col">
              {/* List Header */}
              <div className="hidden md:grid grid-cols-12 text-sm font-black uppercase tracking-widest opacity-40 mb-4 border-b border-gray-200 pb-3">
                <div className="col-span-1">SIRA</div>
                <div className="col-span-4">BAŞKAN & BELEDİYE</div>
                <div className="col-span-1">PARTİ</div>
                <div className="col-span-4">DETAYLI PUAN</div>
                <div className="col-span-2 text-right">GENEL PUAN</div>
              </div>

              {/* List Body */}
              <div className="flex flex-col space-y-2">
                {loading && mayors.length === 0 ? (
                  <div className="py-20 flex justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
                  </div>
                ) : (
                  mayors.map((mayor, index) => (
                    <MayorCard
                      key={mayor.id}
                      mayor={mayor}
                      rank={index + 1}
                      onVoteClick={setVotingMayor}
                      onNewsClick={setNewsMayor}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-[#1a1a1a] text-white p-6 md:p-10 border-t-2 border-[#1a1a1a]">
          <div className="flex gap-8 md:gap-16 w-full sm:w-auto mb-6 sm:mb-0">
            <div className="flex flex-col">
              <span className="text-xs uppercase opacity-60 tracking-widest">TOPLAM KATILIM</span>
              <span className="text-3xl md:text-4xl font-mono tracking-tighter">{totalVotesCount.toLocaleString('tr-TR')} OY</span>
            </div>
            <div className="flex flex-col border-l border-white/20 pl-8 md:pl-16">
              <span className="text-xs uppercase opacity-60 tracking-widest">EN BAŞARILI PARTİLER</span>
              <div className="flex gap-3 mt-2">
                {topPartyString()}
              </div>
            </div>
          </div>
          <div className="text-xs uppercase font-bold tracking-widest opacity-40">
            KARNE A.Ş. YAYINIDIR.
          </div>
        </div>

        {/* Footer Marquee */}
        <footer className="bg-orange-500 text-[#1a1a1a] text-xs font-bold py-2.5 overflow-hidden whitespace-nowrap uppercase tracking-[0.2em] border-t-2 border-[#1a1a1a]">
          <div className="animate-marquee inline-block">
            {mayors.map(m => `${m.city}: ${m.name} (${m.party})`).join(' • ')} • {mayors.map(m => `${m.city}: ${m.name} (${m.party})`).join(' • ')}
          </div>
        </footer>
      </div>

      {/* Modals */}
      {votingMayor && (
        <VoteModal 
          mayor={votingMayor} 
          onClose={() => setVotingMayor(null)}
          onSuccess={() => {
            setVotingMayor(null);
            fetchMayors();
          }}
        />
      )}

      {newsMayor && (
        <NewsWidget 
          mayor={newsMayor} 
          onClose={() => setNewsMayor(null)} 
        />
      )}
    </div>
  );
}
