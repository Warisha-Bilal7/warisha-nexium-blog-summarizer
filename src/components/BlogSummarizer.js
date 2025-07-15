import React, { useState, useEffect } from 'react';
import { Globe, Sparkles, BookOpen, Zap, Copy, Check, RefreshCw, AlertCircle, Wifi, Clock, Shield } from 'lucide-react';

const BlogSummarizer = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('english');
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Animated background particles
  const [particles, setParticles] = useState([]);

  // Error types for better categorization
  const ERROR_TYPES = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    SERVER: 'server',
    TIMEOUT: 'timeout',
    RATE_LIMIT: 'rate_limit',
    INVALID_URL: 'invalid_url',
    CONTENT_NOT_FOUND: 'content_not_found',
    UNKNOWN: 'unknown'
  };

  // Enhanced error state structure
  const createError = (type, message, details = null, recoverable = true) => ({
    type,
    message,
    details,
    recoverable,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: particle.y > 100 ? -5 : particle.y + particle.speed,
        opacity: Math.sin(Date.now() * 0.001 + particle.id) * 0.3 + 0.4,
      })));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // URL validation
  const validateUrl = (url) => {
    if (!url.trim()) {
      return createError(ERROR_TYPES.VALIDATION, 'Please enter a URL', null, true);
    }

    try {
      const urlObject = new URL(url);
      
      // Check if it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(urlObject.protocol)) {
        return createError(ERROR_TYPES.INVALID_URL, 'URL must use HTTP or HTTPS protocol', null, true);
      }

      // Check for common blog domains or patterns
      const blogPatterns = [
        /medium\.com/,
        /wordpress\.com/,
        /blogspot\.com/,
        /substack\.com/,
        /dev\.to/,
        /hashnode\.com/,
        /\.blog/,
        /\/blog\//,
        /\/post\//,
        /\/article\//
      ];

      const isLikelyBlog = blogPatterns.some(pattern => pattern.test(url));
      if (!isLikelyBlog) {
        return createError(ERROR_TYPES.VALIDATION, 'This doesn\'t appear to be a blog URL. Please verify the link.', { url }, true);
      }

      return null;
    } catch (err) {
      return createError(ERROR_TYPES.INVALID_URL, 'Invalid URL format. Please check your URL.', { originalError: err.message }, true);
    }
  };

  // Enhanced error handling for API responses
  const handleApiError = (response, data) => {
    const status = response.status;
    
    switch (status) {
      case 400:
        return createError(ERROR_TYPES.VALIDATION, data.error || 'Invalid request. Please check your URL.', { status }, true);
      case 404:
        return createError(ERROR_TYPES.CONTENT_NOT_FOUND, 'Blog post not found or unable to access content.', { status }, true);
      case 429:
        return createError(ERROR_TYPES.RATE_LIMIT, 'Too many requests. Please wait a moment and try again.', { status, retryAfter: data.retryAfter }, true);
      case 500:
        return createError(ERROR_TYPES.SERVER, 'Server error. Please try again later.', { status }, true);
      case 503:
        return createError(ERROR_TYPES.SERVER, 'Service temporarily unavailable. Please try again later.', { status }, true);
      default:
        return createError(ERROR_TYPES.UNKNOWN, data.error || `Unexpected error (${status})`, { status }, true);
    }
  };

  // Retry mechanism with exponential backoff
  const retryWithBackoff = (fn, maxRetries = 3, delay = 1000) => {
    return new Promise((resolve, reject) => {
      const attempt = (retryCount) => {
        fn()
          .then(resolve)
          .catch((error) => {
            if (retryCount >= maxRetries) {
              reject(error);
            } else {
              const nextDelay = delay * Math.pow(2, retryCount);
              setTimeout(() => attempt(retryCount + 1), nextDelay);
            }
          });
      };
      attempt(0);
    });
  };

  const handleSummarize = async () => {
    // Check network connectivity
    if (!isOnline) {
      setError(createError(ERROR_TYPES.NETWORK, 'No internet connection. Please check your network and try again.', null, true));
      return;
    }

    // Validate URL
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setRetryCount(0);

    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const apiCall = async () => {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: url.trim() }),
          signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
          throw handleApiError(response, data);
        }

        // Validate response data
        if (!data.summary || !data.summary.title || !data.summary.englishSummary) {
          throw createError(ERROR_TYPES.SERVER, 'Invalid response from server. Please try again.', { data }, true);
        }

        return data;
      };

      // Attempt with retry mechanism
      const result = await retryWithBackoff(apiCall, 3, 1000);
      
      clearTimeout(timeoutId);
      setSummary(result.summary);
      setRetryCount(0);

    } catch (err) {
      let errorToSet;

      if (err.name === 'AbortError') {
        errorToSet = createError(ERROR_TYPES.TIMEOUT, 'Request timed out. The blog might be too large or the server is busy.', null, true);
      } else if (err.type) {
        // Already a structured error
        errorToSet = err;
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorToSet = createError(ERROR_TYPES.NETWORK, 'Network error. Please check your connection and try again.', { originalError: err.message }, true);
      } else {
        errorToSet = createError(ERROR_TYPES.UNKNOWN, 'An unexpected error occurred. Please try again.', { originalError: err.message }, true);
      }

      setError(errorToSet);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(createError(ERROR_TYPES.UNKNOWN, 'Failed to copy text to clipboard', { originalError: err.message }, false));
    }
  };

  const resetForm = () => {
    setUrl('');
    setSummary(null);
    setError(null);
    setActiveTab('english');
    setRetryCount(0);
  };

  const retryLastAction = () => {
    if (error && error.recoverable) {
      handleSummarize();
    }
  };

  // Error icon based on error type
  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case ERROR_TYPES.NETWORK:
        return <Wifi className="w-5 h-5" />;
      case ERROR_TYPES.TIMEOUT:
        return <Clock className="w-5 h-5" />;
      case ERROR_TYPES.RATE_LIMIT:
        return <Shield className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Error color based on error type
  const getErrorColor = (errorType) => {
    switch (errorType) {
      case ERROR_TYPES.NETWORK:
        return 'border-orange-500/50 bg-orange-500/20 text-orange-300';
      case ERROR_TYPES.VALIDATION:
        return 'border-yellow-500/50 bg-yellow-500/20 text-yellow-300';
      case ERROR_TYPES.RATE_LIMIT:
        return 'border-blue-500/50 bg-blue-500/20 text-blue-300';
      default:
        return 'border-red-500/50 bg-red-500/20 text-red-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              transition: 'all 0.05s linear',
            }}
          />
        ))}
      </div>

      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 flex items-center space-x-2">
          <Wifi className="w-4 h-4" />
          <span className="text-sm">No internet connection</span>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
              <div className="relative bg-white rounded-full p-4">
                <BookOpen className="w-12 h-12 text-purple-600" />
              </div>
            </div>
          </div>
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
            Blog <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Summarizer</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Enter a blog URL to get an AI-powered summary in English and Urdu
          </p>
        </div>

        {/* Main Form */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="mb-8">
              <label htmlFor="url" className="block text-white text-lg font-semibold mb-4">
                <Globe className="inline w-5 h-5 mr-2" />
                Blog URL
              </label>
              <div className="relative">
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter the URL of the blog post you want to summarize"
                  className="w-full px-6 py-4 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                  onKeyPress={(e) => e.key === 'Enter' && handleSummarize()}
                />
                {url && (
                  <button
                    onClick={resetForm}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSummarize}
              disabled={loading || !url.trim() || !isOnline}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  <span>Summarizing Blog...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Sparkles className="w-6 h-6 mr-3" />
                  <span>Summarize Blog</span>
                </div>
              )}
            </button>

            {/* Enhanced Error Message */}
            {error && (
              <div className={`mt-6 p-4 border rounded-xl animate-pulse ${getErrorColor(error.type)}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getErrorIcon(error.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{error.message}</p>
                    {error.details && (
                      <p className="text-sm mt-1 opacity-80">
                        {error.type === ERROR_TYPES.VALIDATION && 'Please check the URL format and try again.'}
                        {error.type === ERROR_TYPES.NETWORK && 'Check your internet connection and try again.'}
                        {error.type === ERROR_TYPES.RATE_LIMIT && 'Please wait a moment before making another request.'}
                        {error.type === ERROR_TYPES.TIMEOUT && 'The request took too long. Try again or use a different URL.'}
                      </p>
                    )}
                    {error.recoverable && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={retryLastAction}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={resetForm}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Retry Indicator */}
            {retryCount > 0 && !error && (
              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-xl text-blue-300 text-sm flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Retry attempt {retryCount}/3</span>
              </div>
            )}

            {/* Summary Results */}
            {summary && (
              <div className="mt-8 space-y-6 animate-fade-in">
                {/* Blog Title */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-2">{summary.title}</h2>
                  <div className="flex items-center space-x-4 text-gray-300">
                    <span className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-1" />
                      {summary.readingTime || 'N/A'}
                    </span>
                    <span className="flex items-center">
                      <Zap className="w-4 h-4 mr-1" />
                      {summary.wordCount || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Language Tabs */}
                <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
                  <button
                    onClick={() => setActiveTab('english')}
                    className={`flex-1 py-3 px-6 rounded-xl transition-all duration-300 ${
                      activeTab === 'english'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    English Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('urdu')}
                    className={`flex-1 py-3 px-6 rounded-xl transition-all duration-300 ${
                      activeTab === 'urdu'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Urdu Summary
                  </button>
                </div>

                {/* Summary Content */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-white">
                      {activeTab === 'english' ? 'English Summary' : 'Urdu Summary'}
                    </h3>
                    <button
                      onClick={() => copyToClipboard(activeTab === 'english' ? summary.englishSummary : summary.urduSummary)}
                      className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-gray-200 leading-relaxed text-lg">
                    {activeTab === 'english' ? summary.englishSummary : summary.urduSummary}
                  </p>
                </div>

                {/* Key Points */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4">Key Points</h3>
                    <div className="space-y-3">
                      {summary.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-200">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BlogSummarizer;