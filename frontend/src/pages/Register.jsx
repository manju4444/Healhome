import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

const injectStyles = () => {
  if (document.getElementById('hh-base')) return
  const s = document.createElement('style')
  s.id = 'hh-base'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body,#root{height:100%;}
    body{font-family:'DM Sans',sans-serif;background:#07090c;color:#e2ebe8;}
    input::placeholder,select option{color:rgba(226,235,232,0.25);}
    select option{background:#0d1a1f;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    .fade{animation:fadeUp .4s ease forwards;}
    .inp:focus{border-color:rgba(45,212,191,0.5)!important;background:rgba(45,212,191,0.06)!important;outline:none;}
    .btn-main:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(13,148,136,0.45)!important;}
    .btn-main{transition:all .25s ease!important;}
    .role-card:hover{border-color:rgba(45,212,191,0.3)!important;}
    .role-card{transition:all .2s!important;}
  `
  document.head.appendChild(s)
}

export default function Register() {
  const [form, setForm] = useState({ username:'', email:'', password:'', role:'patient', location:'' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { injectStyles() }, [])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async () => {
    if (!form.username || !form.email || !form.password || !form.location) {
      setError('Please fill in all fields'); return
    }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/register', form)
      localStorage.setItem('healhome_token', data.token)
      localStorage.setItem('healhome_user', JSON.stringify(data.user))
      navigate(data.user.role === 'patient' ? '/patient' : '/homemaker')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.')
    }
    setLoading(false)
  }

  const inputStyle = {
    width:'100%', background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:12,
    padding:'12px 16px', color:'#e2ebe8',
    fontFamily:"'DM Sans',sans-serif", fontSize:'.88rem', transition:'all .2s'
  }

  const labelStyle = {
    fontSize:'.7rem', color:'rgba(226,235,232,0.4)',
    textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, display:'block'
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#07090c', padding:'40px 20px', position:'relative', overflow:'hidden' }}>

      {/* AMBIENT */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(20,184,166,0.12) 0%,transparent 65%)', top:-300, left:-200 }} />
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,0.1) 0%,transparent 65%)', bottom:-200, right:-100 }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
      </div>

      <div className="fade" style={{ width:'100%', maxWidth:520, position:'relative', zIndex:1 }}>

        {/* LOGO */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'2rem', fontWeight:800, letterSpacing:'-1px', marginBottom:4 }}>
            <span style={{ color:'#2dd4bf' }}>Heal</span><span style={{ color:'rgba(226,235,232,0.9)' }}>Home</span>
          </div>
          <div style={{ fontSize:'.8rem', color:'rgba(226,235,232,0.35)', letterSpacing:'2px', textTransform:'uppercase' }}>Create your account</div>
        </div>

        {/* CARD */}
        <div style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, padding:'36px 32px' }}>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:11, padding:'11px 14px', fontSize:'.8rem', color:'#fca5a5', marginBottom:20 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ROLE SELECTOR */}
          <div style={{ marginBottom:22 }}>
            <label style={labelStyle}>I am a</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { v:'patient',   icon:'🧑‍⚕️', label:'Patient',   desc:'I need healthy meals' },
                { v:'homemaker', icon:'👩‍🍳', label:'Homemaker', desc:'I want to cook & earn' },
              ].map(r => (
                <div key={r.v} className="role-card" onClick={() => setForm(f=>({...f,role:r.v}))}
                  style={{ padding:'16px', borderRadius:14, border:`1px solid ${form.role===r.v ? 'rgba(45,212,191,0.45)' : 'rgba(255,255,255,0.09)'}`, background: form.role===r.v ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.04)', cursor:'pointer', textAlign:'center' }}>
                  <div style={{ fontSize:'1.6rem', marginBottom:6 }}>{r.icon}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:'.88rem', color: form.role===r.v ? '#2dd4bf' : '#e2ebe8', marginBottom:3 }}>{r.label}</div>
                  <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.4)' }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* NAME + LOCATION */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input className="inp" name="username" placeholder="Your name"
                value={form.username} onChange={handle} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>City / Town</label>
              <input className="inp" name="location" placeholder="e.g. Coimbatore"
                value={form.location} onChange={handle} style={inputStyle} />
            </div>
          </div>

          {/* EMAIL */}
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Email</label>
            <input className="inp" name="email" type="email" placeholder="you@email.com"
              value={form.email} onChange={handle} style={inputStyle} />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom:24 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position:'relative' }}>
              <input className="inp" name="password" type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                value={form.password} onChange={handle} onKeyDown={e => e.key==='Enter' && submit()}
                style={{ ...inputStyle, paddingRight:44 }} />
              <button onClick={() => setShowPass(p=>!p)}
                style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(226,235,232,0.35)', cursor:'pointer', fontSize:'.85rem', padding:0 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* SUBMIT */}
          <button className="btn-main" onClick={submit} disabled={loading}
            style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: loading ? 'rgba(13,148,136,0.4)' : 'linear-gradient(135deg,#0d9488,#0891b2)', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:'.95rem', fontWeight:700, cursor: loading ? 'wait' : 'pointer', boxShadow:'0 8px 28px rgba(13,148,136,0.3)', letterSpacing:'.3px' }}>
            {loading ? '⏳.........' : 'Create Account →'}
          </button>

          <div style={{ textAlign:'center', marginTop:18, fontSize:'.82rem', color:'rgba(226,235,232,0.35)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'#2dd4bf', textDecoration:'none', fontWeight:500 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}