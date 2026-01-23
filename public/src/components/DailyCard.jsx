// public/src/components/DailyCard.jsx
// Daily Tarot Card Component with 3D flip animation and AI-generated interpretations

import React, { useState, useEffect } from 'react';

function DailyCard({ userData, todayGeneration, onNewGeneration }) {
  // Component State
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generation, setGeneration] = useState(todayGeneration);
  const [error, setError] = useState(null);
  const [nextResetTime, setNextResetTime] = useState(null);

  // Update generation when prop changes
  useEffect(() => {
    setGeneration(todayGeneration);
    if (todayGeneration) {
      setIsFlipped(true);
    }
  }, [todayGeneration]);

  // Calculate next reset time (9:00 AM MSK)
  useEffect(() => {
    updateNextResetTime();
    const interval = setInterval(updateNextResetTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const updateNextResetTime = () => {
    const now = new Date();
    // Convert to Moscow time (UTC+3)
    const mskOffset = 3 * 60; // minutes
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const mskMinutes = utcMinutes + mskOffset;
    const mskHours = Math.floor(mskMinutes / 60) % 24;

    // Next reset is at 9:00 MSK
    let hoursUntilReset;
    if (mskHours < 9) {
      hoursUntilReset = 9 - mskHours;
    } else {
      hoursUntilReset = 24 - mskHours + 9;
    }

    const resetDate = new Date(now.getTime() + hoursUntilReset * 60 * 60 * 1000);
    resetDate.setMinutes(0);
    resetDate.setSeconds(0);

    setNextResetTime(resetDate);
  };

  // Format time until reset
  const formatTimeUntilReset = () => {
    if (!nextResetTime) return '';

    const now = new Date();
    const diff = nextResetTime - now;

    if (diff <= 0) return 'Reset available now!';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m until next card`;
    }
    return `${minutes} minutes until next card`;
  };

  // Generate new card
  const handleGenerateCard = async () => {
    if (!userData || isGenerating || generation) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: userData.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate card');
      }

      setGeneration(data.generation);
      onNewGeneration(data.generation);

      // Trigger flip animation
      setTimeout(() => {
        setIsFlipping(true);
        setTimeout(() => {
          setIsFlipped(true);
          setIsFlipping(false);
        }, 800);
      }, 300);

    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle card tap (for manual flip when already generated)
  const handleCardTap = () => {
    if (generation && !isFlipped && !isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setIsFlipped(true);
        setIsFlipping(false);
      }, 800);
    }
  };

  // Share to Story
  const handleShareToStory = () => {
    if (!generation) return;

    // Use Telegram's share functionality
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      // Create share message
      const shareText = `My Tarot Card of the Day: ${generation.card_name}\n\n` +
        `"${generation.text_content?.expert_advice || 'Discover your daily guidance!'}"\n\n` +
        `Get your own daily reading!`;

      // Try to use story sharing if available
      if (tg.shareToStory) {
        tg.shareToStory(generation.share_image_url || generation.image_url, {
          text: shareText
        });
      } else {
        // Fallback to regular share
        tg.showAlert('Share feature: ' + shareText.substring(0, 100) + '...');
      }
    }

    // Track share
    fetch('/api/generations/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generation_id: generation.id })
    }).catch(console.error);
  };

  // Render interpretation sections
  const renderInterpretations = () => {
    if (!generation?.text_content) return null;

    const { general_energy, love_relationships, career_finance, expert_advice } = generation.text_content;

    return (
      <div className="interpretation-section">
        {/* General Energy */}
        {general_energy && (
          <div className="interpretation-card general">
            <h3><span className="icon">&#10024;</span> General Energy</h3>
            <p>{general_energy}</p>
          </div>
        )}

        {/* Love & Relationships */}
        {love_relationships && (
          <div className="interpretation-card love">
            <h3><span className="icon">&#128151;</span> Love & Relationships</h3>
            <p>{love_relationships}</p>
          </div>
        )}

        {/* Career & Finance */}
        {career_finance && (
          <div className="interpretation-card career">
            <h3><span className="icon">&#128176;</span> Career & Finance</h3>
            <p>{career_finance}</p>
          </div>
        )}

        {/* Expert's Advice */}
        {expert_advice && (
          <div className="interpretation-card advice">
            <h3><span className="icon">&#129668;</span> Expert's Wisdom</h3>
            <p>{expert_advice}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="daily-card-container">
      {/* Intro Text */}
      <div className="card-intro">
        <h2>Your Daily Tarot Guidance</h2>
        <p>Discover the mystical message the Universe has for you today</p>
      </div>

      {/* Already Generated Message */}
      {generation && (
        <div className="already-generated-message">
          <p>
            You've received your card for today.
            <br />
            <span className="reset-time">{formatTimeUntilReset()}</span>
          </p>
        </div>
      )}

      {/* Tarot Card with 3D Flip */}
      <div className="tarot-card-wrapper">
        <div
          className={`tarot-card ${isFlipped ? 'flipped' : ''} ${isFlipping ? 'flipping' : ''}`}
          onClick={handleCardTap}
        >
          {/* Card Back */}
          <div className="card-face card-back">
            <span className="card-back-text">Tap to reveal</span>
          </div>

          {/* Card Front */}
          <div className="card-face card-front">
            {generation ? (
              <>
                <div className="card-image-container">
                  {generation.image_url ? (
                    <img
                      src={generation.image_url}
                      alt={generation.card_name}
                      className="card-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,' + encodeURIComponent(`
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 320">
                            <rect fill="#F8F4E8" width="200" height="320"/>
                            <text x="100" y="160" text-anchor="middle" fill="#C9A227" font-size="16" font-family="serif">${generation.card_name}</text>
                          </svg>
                        `);
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(180deg, #FFFEF9 0%, #F8F4E8 100%)',
                      fontSize: '4rem'
                    }}>
                      &#127917;
                    </div>
                  )}
                </div>
                <div className="card-name">{generation.card_name}</div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                background: 'linear-gradient(180deg, #FFFEF9 0%, #F8F4E8 100%)'
              }}>
                <span style={{ fontSize: '3rem', opacity: 0.5 }}>?</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Generate Button */}
      {!generation && (
        <button
          className={`get-card-button ${isGenerating ? 'loading' : ''}`}
          onClick={handleGenerateCard}
          disabled={isGenerating || !userData}
        >
          {isGenerating ? (
            <>
              <span className="button-spinner"></span>
              Revealing your card...
            </>
          ) : (
            'Get Card of the Day'
          )}
        </button>
      )}

      {/* Card Info Badge */}
      {generation && (
        <div className="text-center mt-2">
          <span className={`badge ${generation.card_arcana}`}>
            {generation.card_arcana === 'major' ? 'Major Arcana' : 'Minor Arcana'}
            {generation.card_suit && ` - ${generation.card_suit.charAt(0).toUpperCase() + generation.card_suit.slice(1)}`}
          </span>
        </div>
      )}

      {/* Interpretations */}
      {generation && isFlipped && renderInterpretations()}

      {/* Share Button */}
      {generation && isFlipped && (
        <div className="share-section">
          <button className="share-button" onClick={handleShareToStory}>
            <span className="icon">&#128279;</span>
            Share to Story
          </button>
        </div>
      )}
    </div>
  );
}

export default DailyCard;
