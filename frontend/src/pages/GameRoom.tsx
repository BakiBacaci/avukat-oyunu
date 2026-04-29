import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import JudgeBar from '../components/ui/JudgeBar';
import ChatBox from '../components/ui/ChatBox';
import ObjectionButton from '../components/ui/ObjectionButton';

export default function GameRoom() {
  const { matchId: paramId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    matchId, myRole, judgeHp, currentTurn, matchStatus,
    messages, caseInfo, lastVerdict,
  } = useGameStore();

  const activeMatchId = matchId || paramId || null;
  const { sendArgument, sendObjection, sendEndTurn } = useWebSocket(activeMatchId);

  const isMyTurn = myRole === currentTurn;
  const gameOver = matchStatus === 'finished';
  const isWaiting = matchStatus === 'waiting';

  const roleName: Record<string, string> = {
    prosecutor: '⚖️ Savcı', defense: '🛡️ Avukat',
    witness: '👁️ Tanık', judge: '🔨 Hakim',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)',
        background: 'rgba(10,12,20,0.95)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', fontSize: '1.1rem' }}>⚖️ {caseInfo?.title || 'Dava'}</span>
          <div className={`role-badge ${myRole}`}>{roleName[myRole || ''] || myRole}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`turn-indicator ${isMyTurn ? 'active' : ''}`}>
            {isMyTurn ? '🟢 Senin Sıran' : `⏳ ${roleName[currentTurn] || currentTurn} Konuşuyor`}
          </div>
        </div>
      </div>

      {/* Game Over Banner */}
      {gameOver && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))',
          border: '1px solid var(--border-glow)', padding: '1.5rem',
          textAlign: 'center',
        }}>
          <h2 style={{ marginBottom: '0.5rem' }}>
            {lastVerdict?.winner_role === myRole ? '🏆 Kazandın!' : '💀 Kaybettin'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {lastVerdict?.reasoning}
          </p>
          <button className="btn btn-gold" onClick={() => navigate('/')}>Ana Menüye Dön</button>
        </div>
      )}

      {/* Waiting Screen */}
      {isWaiting && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '2rem'
        }}>
          <div className="spinner" style={{ marginBottom: '1.5rem', width: 40, height: 40, borderWidth: 3 }} />
          <h2 style={{ fontFamily: 'Cinzel', color: 'var(--gold)', marginBottom: '0.5rem' }}>Oyun Kuruluyor</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Host'un oyunu başlatması bekleniyor...</p>
        </div>
      )}

      {!isWaiting && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0 }}>
          {/* Main chat area */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid var(--border)' }}>
            
            {/* Tutorial Banner */}
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>📖 NASIL OYNANIR?</span><br/>
              <span style={{ color: 'var(--text-secondary)' }}>
                {myRole === 'prosecutor' 
                  ? "Sen Savcısın. Şüpheliyi suçlayacak mantıklı argümanlar sun (birden fazla mesaj atabilirsin). İşin bitince aşağıdaki 'Sıramı Bitir' butonuna bas!"
                  : "Sen Avukatsın. Savcının iddialarını okuyup çürüt (birden fazla mesaj atabilirsin). İşin bitince aşağıdaki 'Sıramı Bitir' butonuna bas!"}
              </span>
            </div>

            {/* Case description */}
            {caseInfo && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontFamily: 'Cinzel', letterSpacing: '0.05em' }}>DAVA DOSYASI</p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>{caseInfo.description}</p>
            </div>
          )}

          {/* Verdict panel */}
          {lastVerdict && lastVerdict.type === 'ai_verdict' && (
            <div className="verdict-panel">
              <div className="verdict-scores">
                <div className="verdict-score-item">
                  <div className="verdict-score-num prosecution">{lastVerdict.prosecutor_score?.toFixed(0)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Savcı</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontFamily: 'Cinzel' }}>VS</div>
                <div className="verdict-score-item">
                  <div className="verdict-score-num defense">{lastVerdict.defense_score?.toFixed(0)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Savunma</div>
                </div>
              </div>
              <p className="verdict-reasoning">💬 {lastVerdict.reasoning}</p>
            </div>
          )}

          {/* Chat */}
          <ChatBox
            messages={messages}
            myRole={myRole || ''}
            onSendArgument={sendArgument}
            currentTurn={currentTurn}
            isMyTurn={isMyTurn && !gameOver}
          />

          {/* Action Area (End Turn / Objection) */}
          {!gameOver && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              {isMyTurn ? (
                <button 
                  className="btn btn-gold" 
                  onClick={sendEndTurn}
                  style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', letterSpacing: '0.05em' }}
                >
                  🛑 SIRAMI BİTİR
                </button>
              ) : (
                <ObjectionButton onObjection={sendObjection} />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <JudgeBar hp={judgeHp} />

          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontFamily: 'Cinzel', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              📋 MAÇ BİLGİSİ
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>Durum: <span style={{ color: 'var(--text-primary)' }}>{matchStatus}</span></div>
              <div>Sıra: <span style={{ color: currentTurn === 'prosecutor' ? '#e74c3c' : '#3498db' }}>
                {currentTurn === 'prosecutor' ? 'Savcı' : 'Avukat'}
              </span></div>
              <div>Sen: <span style={{ color: 'var(--gold)' }}>{user?.username}</span></div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontFamily: 'Cinzel', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              💡 HAKIM NOTLARI
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 2, paddingLeft: '1rem' }}>
              <li>Somut delile atıfta bulun</li>
              <li>Mantıksal tutarlılık önemli</li>
              <li>Sıran bitince "Sıramı Bitir"e bas</li>
              <li>İtiraz hakkın var!</li>
            </ul>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
