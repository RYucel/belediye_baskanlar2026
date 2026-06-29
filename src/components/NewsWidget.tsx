import React, { useState, useEffect } from 'react';
import { Mayor, NewsSource } from '../types';
import { X, Loader2, ExternalLink } from 'lucide-react';

interface NewsWidgetProps {
  mayor: Mayor;
  onClose: () => void;
}

export function NewsWidget({ mayor, onClose }: NewsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/mayor/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: mayor.name, city: mayor.city })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Haberler yüklenemedi.');
        
        setContent(data.text);
        setSources(data.sources || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNews();
  }, [mayor]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-[#FDFCFB] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b-4 border-[#1a1a1a] px-6 py-4 bg-[#1a1a1a] text-white">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic font-serif leading-none">{mayor.name}</h2>
            <p className="text-xs md:text-sm font-bold tracking-widest uppercase mt-2 text-orange-500">SON GELİŞMELER & HABERLER</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-transparent hover:border-white text-white transition-colors"
          >
            <X className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1 text-[#1a1a1a]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-[#1a1a1a]" />
              <p className="text-xs md:text-sm font-bold tracking-widest uppercase animate-pulse">ARŞİV TARANIYOR...</p>
            </div>
          ) : error ? (
            <div className="bg-red-600 p-4 text-xs font-mono uppercase text-white">
              HATA: {error}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="prose prose-base max-w-none font-serif leading-relaxed border-l-4 border-orange-500 pl-4">
                {content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4">{paragraph}</p>
                ))}
              </div>
              
              {sources.length > 0 && (
                <div className="mt-8 border-t-2 border-[#1a1a1a] pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-4">KAYNAKLAR</h4>
                  <ul className="space-y-2">
                    {sources.map((src, idx) => (
                      <li key={idx}>
                        <a 
                          href={src.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 p-2 border border-gray-200 hover:border-[#1a1a1a] transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                          <span className="text-sm font-bold uppercase truncate">
                            {src.title || src.uri}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
