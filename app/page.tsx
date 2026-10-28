'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState('');

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    setStatus('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      setResult(data);
      
      if (!data.has_violation) {
        await logDecision(data, 'COMPLY', 'No violation found');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error analyzing content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logDecision = async (resultData: any, path: string, reason: string = '') => {
    try {
      const { error } = await supabase.from('arbitration_ledger').insert([
        {
          original_content: content,
          brand_rule_violated: resultData.brand_rule_violated || 'None',
          extracted_intent: resultData.extracted_intent || 'None',
          chosen_path: path,
          override_reason: reason,
        },
      ]);

      if (error) throw error;
      setStatus(`✅ Success! Decision "${path}" has been permanently logged to the Responsibility Ledger.`);
      setResult(null);
      setContent('');
    } catch (error) {
      console.error(error);
      setStatus('❌ Failed to log decision to database.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-400 mb-2">AegisBrand</h1>
        <p className="text-gray-400">The Intent-Preserving Brand Arbitration Layer</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Input */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Creator Draft</h2>
          <textarea
            className="w-full h-64 bg-gray-950 text-gray-300 p-4 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 resize-none mb-4"
            placeholder="Paste your marketing copy here... (Try typing: 'We are the cheapest option on the market!')"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Run Brand Check'}
          </button>
          {status && (
            <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${status.includes('✅') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
              {status}
            </div>
          )}
        </div>

        {/* Right Side: Arbitration Card */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg flex flex-col justify-center">
          {!result ? (
            <div className="text-center text-gray-500">
              <p>Waiting for draft...</p>
              <p className="text-sm mt-2">The Arbitration Card will appear here.</p>
            </div>
          ) : !result.has_violation ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-400 mb-2">All Clear!</h2>
              <p className="text-gray-400">No brand rule violations detected.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-gray-700 pb-4">
                <h3 className="text-red-400 font-bold text-lg mb-1">⚠️ Conflict Detected</h3>
                <p className="text-sm text-gray-300"><strong>Rule:</strong> {result.brand_rule_violated}</p>
                <p className="text-sm text-gray-300 mt-2"><strong>Creator Intent:</strong> {result.extracted_intent}</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => logDecision(result, 'COMPLY')}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 p-4 rounded-lg border border-green-500/30 transition-colors"
                >
                  <div className="text-green-400 font-bold mb-1">Path A: Comply</div>
                  <div className="text-sm text-gray-300">"{result.path_a_comply}"</div>
                </button>

                <button
                  onClick={() => logDecision(result, 'ESCALATE')}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 p-4 rounded-lg border border-yellow-500/30 transition-colors"
                >
                  <div className="text-yellow-400 font-bold mb-1">Path B: Escalate</div>
                  <div className="text-sm text-gray-300">{result.path_b_escalate}</div>
                </button>

                <button
                  onClick={() => {
                    const reason = prompt('Please provide a reason for overriding the brand rule:');
                    if (reason) logDecision(result, 'OVERRIDE', reason);
                  }}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 p-4 rounded-lg border border-red-500/30 transition-colors"
                >
                  <div className="text-red-400 font-bold mb-1">Path C: Override (Manager Approval)</div>
                  <div className="text-sm text-gray-300">Keep original text with justification.</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}