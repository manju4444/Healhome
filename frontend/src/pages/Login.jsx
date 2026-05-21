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
    input::placeholder{color:rgba(226,235,232,0.25);}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    .fade{animation:fadeUp .4s ease forwards;}
    .inp:focus{border-color:rgba(45,212,191,0.5)!important;background:rgba(45,212,191,0.06)!important;outline:none;}
    .btn-main:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(13,148,136,0.5)!important;}
    .btn-main{transition:all .25s ease!important;}
  `
  document.head.appendChild(s)
}

export default function Login() {
  const [form, setForm]       = useState({ email:'', password:'' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { injectStyles() }, [])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('healhome_token', data.token)
      localStorage.setItem('healhome_user', JSON.stringify(data.user))
      navigate(data.user.role === 'patient' ? '/patient' : '/homemaker')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07090c',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px',
    }}>

      {/* AMBIENT BACKGROUND */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(20,184,166,0.13) 0%,transparent 65%)', top:-300, left:-200 }} />
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,0.1) 0%,transparent 65%)', bottom:-200, right:-100 }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(251,191,36,0.06) 0%,transparent 65%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.022) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
      </div>

      {/* CENTER CARD */}
      <div className="fade" style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: '44px 40px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }}>

        {/* LOGO */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'2rem', fontWeight:800, letterSpacing:'-1px', marginBottom:6 }}>
            <span style={{ color:'#2dd4bf' }}>Heal</span>
            <span style={{ color:'rgba(226,235,232,0.9)' }}>Home</span>
          </div>
          <div style={{ fontSize:'.8rem', color:'rgba(226,235,232,0.35)', letterSpacing:'1.5px', textTransform:'uppercase' }}>
            Welcome back
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:11, padding:'11px 14px', fontSize:'.8rem', color:'#fca5a5', marginBottom:20, textAlign:'center' }}>
            ⚠️ {error}
          </div>
        )}

        {/* EMAIL */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.4)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Email</div>
          <input className="inp" name="email" type="email" placeholder="you@email.com"
            value={form.email} onChange={handle}
            style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'13px 16px', color:'#e2ebe8', fontFamily:"'DM Sans',sans-serif", fontSize:'.88rem', transition:'all .2s' }} />
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom:26 }}>
          <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.4)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Password</div>
          <div style={{ position:'relative' }}>
            <input className="inp" name="password" type={showPass ? 'text' : 'password'} placeholder="••••••••"
              value={form.password} onChange={handle} onKeyDown={e => e.key==='Enter' && submit()}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'13px 44px 13px 16px', color:'#e2ebe8', fontFamily:"'DM Sans',sans-serif", fontSize:'.88rem', transition:'all .2s' }} />
            <button onClick={() => setShowPass(p => !p)}
              style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(226,235,232,0.35)', cursor:'pointer', fontSize:'.85rem', padding:0 }}>
              {showPass ? '❌' : '👁️'}
            </button>
          </div>
        </div>

        {/* SUBMIT */}
        <button className="btn-main" onClick={submit} disabled={loading}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: loading ? 'rgba(13,148,136,0.4)' : 'linear-gradient(135deg,#0d9488,#0891b2)', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:'.95rem', fontWeight:700, cursor: loading ? 'wait' : 'pointer', boxShadow:'0 8px 28px rgba(13,148,136,0.3)', letterSpacing:'.3px' }}>
          {loading ? '⏳........' : 'Sign In →'}
        </button>

        {/* DIVIDER */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
          <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.25)' }}>or</div>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
        </div>

        {/* REGISTER LINK */}
        <div style={{ textAlign:'center', fontSize:'.82rem', color:'rgba(226,235,232,0.35)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color:'#2dd4bf', textDecoration:'none', fontWeight:600 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  )
}
