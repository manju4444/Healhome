import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { io } from 'socket.io-client'

const socket = io('http://localhost:5000')

const MEAL_PLANS = {
  diabetes: [
    { name:'Ragi Java',       desc:'No sugar, low oil',        time:'20 min', cal:'180 kcal' },
    { name:'Soft Dal Rice',   desc:'No spice, gentle on gut',  time:'25 min', cal:'320 kcal' },
    { name:'Curd Rice',       desc:'Cooling, probiotic',       time:'10 min', cal:'280 kcal' },
    { name:'Vegetable Soup',  desc:'No salt, fresh veggies',   time:'15 min', cal:'120 kcal' },
    { name:'Steam Idli',      desc:'Oil-free, soft texture',   time:'20 min', cal:'200 kcal' },
    { name:'Oats Porridge',   desc:'Low GI, filling',          time:'10 min', cal:'160 kcal' },
  ],
  surgery: [
    { name:'Steam Idli',      desc:'Ultra soft, no masala',    time:'20 min', cal:'200 kcal' },
    { name:'Soft Rice',       desc:'Well cooked, easy digest', time:'20 min', cal:'280 kcal'},
    { name:'Plain Rasam',     desc:'Thin, no chilli',          time:'15 min', cal:'60 kcal' },
    { name:'Boiled Veg',      desc:'Carrot, beans, potato',    time:'15 min', cal:'150 kcal' },
    { name:'Banana Porridge', desc:'Gentle, energy-rich',      time:'10 min', cal:'220 kcal' },
  ],
  kidney: [
    { name:'Low-K Veg Soup',  desc:'Low potassium blend',      time:'20 min', cal:'100 kcal' },
    { name:'White Rice',      desc:'Plain, no added salt',     time:'20 min', cal:'250 kcal' },
    { name:'Plain Curd',      desc:'Unsalted, fresh',          time:'5 min',  cal:'120 kcal' },
    { name:'Cucumber Salad',  desc:'No dressing, fresh cut',   time:'5 min',  cal:'30 kcal' },
    { name:'Apple Juice',     desc:'Fresh pressed, no sugar',  time:'5 min',  cal:'80 kcal' },
  ],
  heart: [
    { name:'Oats Porridge',   desc:'No salt, low fat',         time:'10 min', cal:'160 kcal' },
    { name:'Brown Rice',      desc:'Whole grain, low sodium',  time:'30 min', cal:'220 kcal' },
    { name:'Steamed Veg',     desc:'No oil, fresh greens',     time:'15 min', cal:'120 kcal'},
    { name:'Fruit Bowl',      desc:'Seasonal, fresh cut',      time:'5 min',  cal:'150 kcal'},
    { name:'Thin Buttermilk', desc:'No salt, diluted',         time:'5 min',  cal:'40 kcal' },
  ],
}

const STATUS_META = {
  pending:    { color:'#fbbf24', label:'Pending',    border:'rgba(251,191,36,0.3)' },
  accepted:   { color:'#34d399', label:'Accepted',   border:'rgba(52,211,153,0.3)' },
  cooking:    { color:'#a78bfa', label:'Cooking',    border:'rgba(167,139,250,0.3)' },
  dispatched: { color:'#60a5fa', label: 'On the way', border:'rgba(96,165,250,0.3)' },
  completed:  { color:'#5eead4', label:'Delivered',  border:'rgba(94,234,212,0.3)' },
}

const CONDITION_META = {
  diabetes: { label:'Diabetes',     color:'#34d399' },
  surgery:  { label:'Post Surgery', color:'#60a5fa' },
  kidney:   { label:'Kidney Diet',  color:'#a78bfa'},
  heart:    { label:'Heart Patient',color:'#f87171' },
}

export default function PatientDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('healhome_user') || '{}')
  const chatBottomRef = useRef(null)

  const [page, setPage]       = useState('home')
  const [orders, setOrders]   = useState([])
  const [selectedMeal, setSelectedMeal] = useState(MEAL_PLANS.diabetes[0])
  const [form, setForm]       = useState({ condition:'diabetes', mealTime:'Breakfast', mealName:'Ragi Java', customMeal:'', instructions:'', payment:'cash' })
  const [customInput, setCustomInput] = useState('')
  const [chatOrder, setChatOrder]     = useState(null)
  const [messages, setMessages]       = useState([])
  const [msgInput, setMsgInput]       = useState('')
  const [placing, setPlacing]         = useState(false)
  const [toast, setToast]             = useState(null)
  const [cartOpen, setCartOpen]       = useState(false)

  useEffect(() => {
    injectStyles()
    fetchOrders()
   socket.on('receive_message', msg => {
  if (msg.sender !== user.username) {
    setMessages(p => [...p, msg])
  }
})
    socket.on('order_updated', fetchOrders)
    return () => { socket.off('receive_message'); socket.off('order_updated') }
  }, [])

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const injectStyles = () => {
    if (document.getElementById('hh-v2')) return
    const s = document.createElement('style')
    s.id = 'hh-v2'
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;}
      html,body,#root{height:100%;}
      body{font-family:'DM Sans',sans-serif;background:#07090c;color:#e2ebe8;overflow:hidden;}
      select option{background:#0d1a1f;}
      ::-webkit-scrollbar{width:3px;}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px;}
      input::placeholder,textarea::placeholder{color:rgba(226,235,232,0.25);}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(45,212,191,0.2)}50%{box-shadow:0 0 40px rgba(45,212,191,0.4)}}
      .fade{animation:fadeUp .35s ease forwards;}
      .slide{animation:slideIn .3s ease forwards;}
      .pulse{animation:pulse 2s infinite;}
      .glow{animation:glow 3s infinite;}
      .meal-card:hover{transform:translateY(-3px);border-color:rgba(45,212,191,0.4)!important;background:rgba(45,212,191,0.08)!important;}
      .meal-card{transition:all .25s ease!important;}
      .nav-item:hover{background:rgba(255,255,255,0.07)!important;color:#e2ebe8!important;}
      .order-row:hover{border-color:rgba(45,212,191,0.25)!important;background:rgba(45,212,191,0.04)!important;}
      .order-row{transition:all .2s!important;}
    `
    document.head.appendChild(s)
  }

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchOrders = async () => {
    try { const { data } = await api.get('/orders'); setOrders(data) } catch {}
  }

  const selectMeal = (meal) => {
    setSelectedMeal(meal)
    setForm(f => ({ ...f, mealName: meal.name, customMeal:'' }))
    setCartOpen(true)
  }

  const addCustom = () => {
    if (!customInput.trim()) return
    const custom = { name: customInput, desc:'Custom request', time:'~30 min', cal:'—', icon:'✏️' }
    setSelectedMeal(custom)
    setForm(f => ({ ...f, mealName: customInput, customMeal: customInput }))
    setCustomInput('')
    setCartOpen(true)
  }

  const placeOrder = async () => {
    setPlacing(true)
    try {
      await api.post('/orders', form)
      await fetchOrders()
      showToast('🎉 Order placed! Finding a homemaker near you...')
      setCartOpen(false)
      setPage('orders')
    } catch (e) { showToast(e.response?.data?.message || 'Failed to place order', 'error') }
    setPlacing(false)
  }

  const openChat = async (order) => {
    setChatOrder(order)
    socket.emit('join_room', order._id)
    try { const { data } = await api.get(`/chat/${order._id}`); setMessages(data) } catch { setMessages([]) }
    setPage('chat')
  }

  const sendMsg = async () => {
  if (!msgInput.trim() || !chatOrder) return
  const msg = {
    orderId: chatOrder._id,
    text: msgInput,
    senderRole: user.role,
    sender: user.username,
    timestamp: new Date()
  }
  // Add to local state immediately (own message)
  setMessages(p => [...p, msg])
  setMsgInput('')
  // Send to other person via socket
  socket.emit('send_message', msg)
  // Save to database
  try { await api.post(`/orders/${chatOrder._id}/message`, { text: msgInput }) } catch {}
}

  const logout = () => { localStorage.clear(); navigate('/login') }

  const activeOrders = orders.filter(o => ['accepted','cooking','dispatched'].includes(o.status))
  const recentOrders = orders.slice(0, 4)
  const meals = MEAL_PLANS[form.condition]
  const cMeta = CONDITION_META[form.condition]

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative', background:'#07090c' }}>

      {/* AMBIENT BACKGROUND */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:800, height:800, borderRadius:'50%', background:'radial-gradient(circle,rgba(20,184,166,0.12) 0%,transparent 65%)', top:-300, left:-200 }} />
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,0.1) 0%,transparent 65%)', bottom:-200, right:-100 }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(251,191,36,0.06) 0%,transparent 65%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:1000, padding:'13px 20px', borderRadius:14, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', background: toast.type==='error' ? 'rgba(239,68,68,0.18)' : 'rgba(20,184,166,0.18)', border:`1px solid ${toast.type==='error' ? 'rgba(239,68,68,0.35)' : 'rgba(20,184,166,0.35)'}`, fontSize:'.82rem', color: toast.type==='error' ? '#fca5a5' : '#5eead4', fontWeight:500, maxWidth:340 }}>
          {toast.msg}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div style={{ width:240, flexShrink:0, position:'relative', zIndex:10, display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.03)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', borderRight:'1px solid rgba(255,255,255,0.07)', padding:'24px 14px' }}>

        {/* LOGO */}
        <div style={{ padding:'0 8px', marginBottom:28 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.5rem', fontWeight:800, letterSpacing:'-1px' }}>
            <span style={{ color:'#2dd4bf' }}>Heal</span><span style={{ color:'rgba(226,235,232,0.9)' }}>Home</span>
          </div>
          <div style={{ fontSize:'.68rem', color:'rgba(226,235,232,0.35)', letterSpacing:'2px', textTransform:'uppercase', marginTop:2 }}>Medical Meal Delivery</div>
        </div>

        {/* PROFILE CARD */}
        <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'16px 14px', marginBottom:20, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'radial-gradient(circle,rgba(45,212,191,0.15),transparent)', pointerEvents:'none' }} />
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#0d9488,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', border:'2px solid rgba(45,212,191,0.25)', flexShrink:0 }}>🙍‍♀️</div>
            <div>
              <div style={{ fontWeight:600, fontSize:'.88rem', fontFamily:"'Syne',sans-serif" }}>{user.username}</div>
              <div style={{ fontSize:'.68rem', color:'#2dd4bf', background:'rgba(45,212,191,0.1)', padding:'2px 8px', borderRadius:20, display:'inline-block', marginTop:2 }}>Patient</div>
            </div>
          </div>
          <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.4)', display:'flex', alignItems:'center', gap:5 }}>
            <span>📍</span>{user.location || 'Location not set'}
          </div>
          <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:700, color:'#2dd4bf' }}>{orders.length}</div>
              <div style={{ fontSize:'.62rem', color:'rgba(226,235,232,0.4)' }}>Orders</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:700, color:'#fbbf24' }}>{activeOrders.length}</div>
              <div style={{ fontSize:'.62rem', color:'rgba(226,235,232,0.4)' }}>Active</div>
            </div>
          </div>
        </div>

        {/* NAV */}
        <div style={{ fontSize:'.62rem', color:'rgba(226,235,232,0.3)', textTransform:'uppercase', letterSpacing:'1.5px', padding:'0 8px', marginBottom:8 }}>Menu</div>
        {[
          { id:'home',   icon:'⊞', label:'Overview' },
          { id:'order',  icon:'✦', label:'Place Order' },
          { id:'orders', icon:'◈', label:'My Orders', badge: orders.filter(o=>o.status==='pending').length },
          { id:'chat',   icon:'◎', label:'Messages',  badge: activeOrders.length },
        ].map(n => (
          <div key={n.id} className="nav-item" onClick={() => setPage(n.id)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:12, cursor:'pointer', marginBottom:3, background: page===n.id ? 'rgba(45,212,191,0.12)' : 'transparent', color: page===n.id ? '#2dd4bf' : 'rgba(226,235,232,0.5)', borderLeft: page===n.id ? '2px solid #2dd4bf' : '2px solid transparent', transition:'all .2s', fontSize:'.85rem', fontWeight: page===n.id ? 500 : 400 }}>
            <span style={{ fontSize:'.8rem', width:16 }}>{n.icon}</span>
            {n.label}
            {n.badge > 0 && <span style={{ marginLeft:'auto', background: n.id==='chat' ? '#2dd4bf' : '#fbbf24', color:'#000', fontSize:'.6rem', fontWeight:700, padding:'2px 7px', borderRadius:10 }}>{n.badge}</span>}
          </div>
        ))}

        <div style={{ marginTop:16, fontSize:'.62rem', color:'rgba(226,235,232,0.3)', textTransform:'uppercase', letterSpacing:'1.5px', padding:'0 8px', marginBottom:8 }}>Condition</div>
        {Object.entries(CONDITION_META).map(([k,v]) => (
          <div key={k} className="nav-item" onClick={() => { setForm(f=>({...f,condition:k,mealName:MEAL_PLANS[k][0].name})); setPage('order') }}
            style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderRadius:10, cursor:'pointer', marginBottom:2, background: form.condition===k ? `${v.color}18` : 'transparent', color: form.condition===k ? v.color : 'rgba(226,235,232,0.4)', fontSize:'.78rem', transition:'all .2s' }}>
            <span>{v.icon}</span>{v.label}
            {form.condition===k && <span style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:v.color }} />}
          </div>
        ))}

        <div style={{ marginTop:'auto', paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="nav-item" onClick={logout} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, cursor:'pointer', color:'rgba(248,113,113,0.7)', fontSize:'.82rem' }}>
            <span>🚪</span>Logout
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', zIndex:1 }}>

        {/* TOP BAR */}
        <div style={{ padding:'16px 28px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', background:'rgba(7,9,12,0.6)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1rem', fontWeight:700 }}>
              {page==='home' && 'Overview'}
              {page==='order' && 'Place an Order'}
              {page==='orders' && 'My Orders'}
              {page==='chat' && 'Messages'}
            </div>
            <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.4)' }}>
              {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {activeOrders.length > 0 && (
              <div className="pulse" style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:30, padding:'7px 14px', fontSize:'.75rem', color:'#34d399' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#34d399', display:'inline-block' }} />
                {activeOrders.length} active order{activeOrders.length>1?'s':''}
              </div>
            )}
            <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:.9+'rem', cursor:'pointer' }}>🔔</div>
          </div>
        </div>

        {/* SCROLL AREA */}
        <div style={{ flex:1, overflowY:'auto', display:'flex' }}>

          {/* ── HOME PAGE ── */}
          {page === 'home' && (
            <div className="fade" style={{ flex:1, padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>

              {/* HERO BANNER */}
              <div style={{ borderRadius:20, background:'linear-gradient(135deg,rgba(13,148,136,0.35) 0%,rgba(109,40,217,0.25) 60%,rgba(251,191,36,0.15) 100%)', border:'1px solid rgba(45,212,191,0.2)', padding:'28px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:0, top:0, bottom:0, width:200, background:'radial-gradient(ellipse at right,rgba(45,212,191,0.15),transparent)', pointerEvents:'none' }} />
                <div>
                  <div style={{ fontSize:'.72rem', color:'#2dd4bf', textTransform:'uppercase', letterSpacing:'2px', marginBottom:8 }}>Welcome back</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.6rem', fontWeight:800, lineHeight:1.2, marginBottom:10 }}>
                    Fresh home-cooked meals,<br/>made for your health 🌿
                  </div>
                  <div style={{ fontSize:'.82rem', color:'rgba(226,235,232,0.6)', marginBottom:18 }}>Order nutritious meals prepared by verified homemakers near you.</div>
                  <button onClick={() => setPage('order')} style={{ padding:'11px 24px', borderRadius:30, background:'linear-gradient(135deg,#0d9488,#0891b2)', border:'none', color:'#fff', fontSize:'.85rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", boxShadow:'0 4px 20px rgba(13,148,136,0.4)' }}>
                    Order Now →
                  </button>
                </div>
                <div style={{ fontSize:'5rem', opacity:.6 }}>🍱</div>
              </div>

              {/* STATS ROW */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                {[
                  { label:'Total Orders',  value: orders.length,                                                           color:'#2dd4bf' },
                  { label:'Active',        value: activeOrders.length,                                                     color:'#34d399' },
                  { label:'Completed',     value: orders.filter(o=>o.status==='completed').length,                         color:'#a78bfa' },
                  { label:'Pending',       value: orders.filter(o=>o.status==='pending').length,                           color:'#fbbf24' },
                ].map(st => (
                  <div key={st.label} style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'18px 20px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:`${st.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>{st.icon}</div>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.5rem', fontWeight:700, color:st.color, lineHeight:1 }}>{st.value}</div>
                      <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.45)', marginTop:3 }}>{st.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TWO COL */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:18 }}>

                {/* QUICK ORDER */}
                <div style={{ background:'rgba(255,255,255,0.03)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'22px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1rem', fontWeight:700 }}>Quick Order</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {Object.entries(CONDITION_META).map(([k,v]) => (
                        <button key={k} onClick={() => setForm(f=>({...f,condition:k}))}
                          style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${form.condition===k ? v.color : 'rgba(255,255,255,0.1)'}`, background: form.condition===k ? `${v.color}18` : 'transparent', color: form.condition===k ? v.color : 'rgba(226,235,232,0.4)', fontSize:'.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          {v.icon} {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {MEAL_PLANS[form.condition].slice(0,4).map(meal => (
                      <div key={meal.name} className="meal-card" onClick={() => selectMeal(meal)}
                        style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${form.mealName===meal.name ? 'rgba(45,212,191,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius:14, padding:'14px 16px', cursor:'pointer', background: form.mealName===meal.name ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize:'1.6rem', marginBottom:8 }}>{meal.icon}</div>
                        <div style={{ fontWeight:600, fontSize:'.85rem', marginBottom:3 }}>{meal.name}</div>
                        <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.45)', marginBottom:8 }}>{meal.desc}</div>
                        <div style={{ display:'flex', gap:8 }}>
                          <span style={{ fontSize:'.65rem', color:'#2dd4bf', background:'rgba(45,212,191,0.1)', padding:'2px 7px', borderRadius:8 }}>⏱ {meal.time}</span>
                          <span style={{ fontSize:'.65rem', color:'#fbbf24', background:'rgba(251,191,36,0.1)', padding:'2px 7px', borderRadius:8 }}>{meal.cal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RECENT ORDERS SIDEBAR */}
                <div style={{ background:'rgba(255,255,255,0.03)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'22px', display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1rem', fontWeight:700 }}>Recent Orders</div>
                    <button onClick={() => setPage('orders')} style={{ fontSize:'.72rem', color:'#2dd4bf', background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>View all →</button>
                  </div>
                  {recentOrders.length === 0 && (
                    <div style={{ textAlign:'center', padding:'30px 0', color:'rgba(226,235,232,0.3)', fontSize:'.82rem' }}>
                      <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🍽️</div>
                      No orders yet
                    </div>
                  )}
                  {recentOrders.map(o => {
                    const meta = STATUS_META[o.status] || STATUS_META.pending
                    return (
                      <div key={o._id} className="order-row" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                          <div style={{ fontWeight:500, fontSize:'.82rem' }}>{o.customMeal || o.mealName}</div>
                          <div style={{ fontSize:'.65rem', color:meta.color, background:`${meta.color}18`, padding:'2px 8px', borderRadius:10, border:`1px solid ${meta.border}` }}>{meta.label}</div>
                        </div>
                        <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.4)' }}>{o.condition} · {o.mealTime}</div>
                        {['accepted','cooking'].includes(o.status) && (
                          <button onClick={() => openChat(o)} style={{ marginTop:8, width:'100%', padding:'6px', borderRadius:8, background:'rgba(45,212,191,0.1)', border:'1px solid rgba(45,212,191,0.2)', color:'#2dd4bf', fontSize:'.72rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            💬 Chat with Homemaker
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── ORDER PAGE ── */}
          {page === 'order' && (
            <div className="fade" style={{ flex:1, display:'flex', overflow:'hidden' }}>

              {/* MEAL LIST */}
              <div style={{ flex:1, padding:'24px 28px', overflowY:'auto' }}>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.2rem', fontWeight:700, marginBottom:4 }}>
                    {cMeta.icon} Meals for {cMeta.label}
                  </div>
                  <div style={{ fontSize:'.8rem', color:'rgba(226,235,232,0.45)' }}>Select a meal or type your own. A homemaker near you will prepare it fresh.</div>
                </div>

                {/* CONDITION TABS */}
                <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
                  {Object.entries(CONDITION_META).map(([k,v]) => (
                    <button key={k} onClick={() => setForm(f=>({...f,condition:k,mealName:MEAL_PLANS[k][0].name}))}
                      style={{ padding:'8px 18px', borderRadius:30, border:`1px solid ${form.condition===k ? v.color : 'rgba(255,255,255,0.1)'}`, background: form.condition===k ? `${v.color}18` : 'rgba(255,255,255,0.04)', color: form.condition===k ? v.color : 'rgba(226,235,232,0.45)', fontSize:'.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight: form.condition===k ? 500 : 400 }}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>

                {/* MEAL GRID */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
                  {MEAL_PLANS[form.condition].map(meal => (
                    <div key={meal.name} className="meal-card" onClick={() => selectMeal(meal)}
                      style={{ background: form.mealName===meal.name ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.04)', border:`1px solid ${form.mealName===meal.name ? 'rgba(45,212,191,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius:16, padding:'20px', cursor:'pointer' }}>
                      <div style={{ fontSize:'2.5rem', marginBottom:12 }}>{meal.icon}</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.95rem', marginBottom:5 }}>{meal.name}</div>
                      <div style={{ fontSize:'.75rem', color:'rgba(226,235,232,0.45)', marginBottom:12, lineHeight:1.4 }}>{meal.desc}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:'.65rem', color:'#2dd4bf', background:'rgba(45,212,191,0.1)', padding:'3px 8px', borderRadius:8, border:'1px solid rgba(45,212,191,0.15)' }}>⏱ {meal.time}</span>
                        <span style={{ fontSize:'.65rem', color:'#fbbf24', background:'rgba(251,191,36,0.1)', padding:'3px 8px', borderRadius:8, border:'1px solid rgba(251,191,36,0.15)' }}>{meal.cal}</span>
                      </div>
                      {form.mealName===meal.name && !form.customMeal && (
                        <div style={{ marginTop:10, fontSize:'.7rem', color:'#2dd4bf', display:'flex', alignItems:'center', gap:5 }}>
                          ✓ Selected
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* CUSTOM MEAL */}
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px' }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, marginBottom:4, fontSize:'.9rem' }}>✏️ Request a custom meal</div>
                  <div style={{ fontSize:'.75rem', color:'rgba(226,235,232,0.4)', marginBottom:14 }}>Don't see what you need? Type exactly what you want — the homemaker will prepare it.</div>
                  <div style={{ display:'flex', gap:10 }}>
                    <input style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:11, padding:'12px 16px', color:'#e2ebe8', fontFamily:"'DM Sans',sans-serif", fontSize:'.85rem', outline:'none' }}
                      placeholder="e.g. Rice kanji without salt, only boiled vegetables, no oil..."
                      value={customInput} onChange={e => setCustomInput(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && addCustom()} />
                    <button onClick={addCustom} style={{ padding:'0 22px', borderRadius:11, background:'rgba(45,212,191,0.15)', border:'1px solid rgba(45,212,191,0.3)', color:'#2dd4bf', fontSize:'.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>+ Add</button>
                  </div>
                </div>
              </div>

              {/* ORDER PANEL (right) */}
              <div style={{ width:300, flexShrink:0, padding:'24px 20px', borderLeft:'1px solid rgba(255,255,255,0.07)', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.95rem' }}>Your Order</div>

                {/* SELECTED MEAL */}
                <div style={{ background:'rgba(45,212,191,0.08)', border:'1px solid rgba(45,212,191,0.2)', borderRadius:14, padding:'14px' }}>
                  <div style={{ fontSize:'1.8rem', marginBottom:6 }}>{selectedMeal?.icon || '🍱'}</div>
                  <div style={{ fontWeight:600, fontSize:'.88rem', marginBottom:3 }}>{form.customMeal || form.mealName}</div>
                  <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.5)' }}>{selectedMeal?.desc || 'Custom request'}</div>
                </div>

                {/* MEAL TIME */}
                <div>
                  <div style={{ fontSize:'.68rem', color:'rgba(226,235,232,0.4)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Meal Time</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {['Breakfast','Lunch','Dinner','Snack'].map(t => (
                      <button key={t} onClick={() => setForm(f=>({...f,mealTime:t}))}
                        style={{ padding:'8px', borderRadius:10, border:`1px solid ${form.mealTime===t ? 'rgba(45,212,191,0.4)' : 'rgba(255,255,255,0.08)'}`, background: form.mealTime===t ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.04)', color: form.mealTime===t ? '#2dd4bf' : 'rgba(226,235,232,0.45)', fontSize:'.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* INSTRUCTIONS */}
                <div>
                  <div style={{ fontSize:'.68rem', color:'rgba(226,235,232,0.4)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Instructions</div>
                  <textarea style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:11, padding:'10px 12px', color:'#e2ebe8', fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', outline:'none', resize:'none', height:80 }}
                    placeholder="No oil, extra soft, less spicy..."
                    value={form.instructions} onChange={e => setForm(f=>({...f,instructions:e.target.value}))} />
                </div>

                {/* PAYMENT */}
                <div>
                  <div style={{ fontSize:'.68rem', color:'rgba(226,235,232,0.4)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Payment</div>
                  {[{v:'cash',l:'💵 Cash on Delivery'},{v:'online',l:'💳 Online'}].map(p => (
                    <button key={p.v} onClick={() => setForm(f=>({...f,payment:p.v}))}
                      style={{ width:'100%', padding:'10px', borderRadius:10, border:`1px solid ${form.payment===p.v ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`, background: form.payment===p.v ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', color: form.payment===p.v ? '#fbbf24' : 'rgba(226,235,232,0.45)', fontSize:'.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", marginBottom:6, textAlign:'left' }}>
                      {p.l}
                    </button>
                  ))}
                </div>

                <button onClick={placeOrder} disabled={placing} className="glow"
                  style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#0d9488,#0891b2)', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:'1rem', fontWeight:700, cursor: placing ? 'wait' : 'pointer', opacity: placing ? .7 : 1, letterSpacing:'.3px', marginTop:4 }}>
                  {placing ? '⏳ Finding homemaker...' : '🚀 Place Order'}
                </button>
              </div>
            </div>
          )}

          {/* ── ORDERS PAGE ── */}
          {page === 'orders' && (
            <div className="fade" style={{ flex:1, padding:'24px 28px', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.2rem', fontWeight:700 }}>My Orders</div>
                  <div style={{ fontSize:'.78rem', color:'rgba(226,235,232,0.4)' }}>{orders.length} total · {activeOrders.length} active</div>
                </div>
                <button onClick={() => setPage('order')} style={{ padding:'9px 20px', borderRadius:30, background:'rgba(45,212,191,0.12)', border:'1px solid rgba(45,212,191,0.25)', color:'#2dd4bf', fontSize:'.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>+ New Order</button>
              </div>

              {orders.length === 0 ? (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'60px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'3.5rem', marginBottom:12 }}>🍱</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.2rem', fontWeight:700, marginBottom:8 }}>No orders yet</div>
                  <div style={{ fontSize:'.82rem', color:'rgba(226,235,232,0.4)', marginBottom:20 }}>Place your first order and get fresh home-cooked food!</div>
                  <button onClick={() => setPage('order')} style={{ padding:'11px 28px', borderRadius:30, background:'linear-gradient(135deg,#0d9488,#0891b2)', border:'none', color:'#fff', fontSize:'.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Order Now</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {orders.map((o,i) => {
                    const meta = STATUS_META[o.status] || STATUS_META.pending
                    return (
                      <div key={o._id} className="order-row fade" style={{ background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.08)`, borderRadius:16, padding:'18px 22px', borderLeft:`3px solid ${meta.color}`, animationDelay:`${i*0.04}s` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                          <div>
                            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1rem', marginBottom:3 }}>{o.customMeal || o.mealName}</div>
                            <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.4)' }}>#{o._id.slice(-8).toUpperCase()} · {new Date(o.createdAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</div>
                          </div>
                          <div style={{ padding:'5px 14px', borderRadius:20, background:`${meta.color}18`, color:meta.color, fontSize:'.75rem', fontWeight:500, border:`1px solid ${meta.border}` }}>{meta.label}</div>
                        </div>
                        <div style={{ display:'flex', gap:16, fontSize:'.75rem', color:'rgba(226,235,232,0.45)', marginBottom:10, flexWrap:'wrap' }}>
                          <span>🩺 {o.condition}</span>
                          <span>🕐 {o.mealTime}</span>
                          <span>{o.payment==='cash' ? '💵 Cash' : '💳 Online'}</span>
                          {o.homemaker && <span>👩 {o.homemaker.username}</span>}
                        </div>
                        {o.instructions && <div style={{ fontSize:'.75rem', color:'rgba(226,235,232,0.4)', background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'7px 12px', marginBottom:10 }}>📝 {o.instructions}</div>}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontSize:'.75rem', color:'rgba(226,235,232,0.4)' }}>
                            {!o.homemaker && <span className="pulse">🔍 Finding homemaker...</span>}
                          </div>
                          {['accepted','cooking'].includes(o.status) && (
                            <button onClick={() => openChat(o)} style={{ padding:'7px 18px', borderRadius:20, background:'rgba(45,212,191,0.1)', border:'1px solid rgba(45,212,191,0.25)', color:'#2dd4bf', fontSize:'.78rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              💬 Chat with Homemaker
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CHAT PAGE ── */}
          {page === 'chat' && (
            <div className="fade" style={{ flex:1, display:'grid', gridTemplateColumns:'260px 1fr', overflow:'hidden' }}>
              <div style={{ borderRight:'1px solid rgba(255,255,255,0.07)', overflowY:'auto', padding:'20px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.9rem', marginBottom:8, padding:'0 6px' }}>💬 Conversations</div>
                {activeOrders.length === 0 && (
                  <div style={{ textAlign:'center', padding:'30px 10px', color:'rgba(226,235,232,0.3)', fontSize:'.8rem' }}>
                    <div style={{ fontSize:'2rem', marginBottom:8 }}>💬</div>No active chats.<br/>Place an order first.
                  </div>
                )}
                {activeOrders.map(o => (
                  <div key={o._id} onClick={() => openChat(o)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 10px', borderRadius:12, cursor:'pointer', background: chatOrder?._id===o._id ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.04)', border:`1px solid ${chatOrder?._id===o._id ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.07)'}`, transition:'all .2s' }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#ef4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>👩</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'.83rem', fontWeight:600 }}>{o.homemaker?.username || 'Homemaker'}</div>
                      <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.customMeal || o.mealName}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                {!chatOrder ? (
                  <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, color:'rgba(226,235,232,0.3)' }}>
                    <div style={{ fontSize:'3rem' }}>💬</div>
                    <div style={{ fontSize:'.85rem' }}>Select a conversation</div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding:'16px 22px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#ef4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>👩</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'.9rem' }}>{chatOrder.homemaker?.username}</div>
                        <div className="pulse" style={{ fontSize:'.72rem', color:'#2dd4bf' }}>🟢 Preparing: {chatOrder.customMeal || chatOrder.mealName}</div>
                      </div>
                    </div>
                    <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                      {messages.length === 0 && <div style={{ textAlign:'center', color:'rgba(226,235,232,0.3)', fontSize:'.8rem', paddingTop:20 }}>Start chatting with your homemaker!</div>}
                      {messages.map((m,i) => (
                        <div key={i} style={{ maxWidth:'68%', alignSelf: m.senderRole==='patient' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ padding:'10px 16px', borderRadius: m.senderRole==='patient' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: m.senderRole==='patient' ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.07)', border: m.senderRole==='patient' ? '1px solid rgba(45,212,191,0.2)' : '1px solid rgba(255,255,255,0.1)', fontSize:'.83rem', lineHeight:1.5 }}>
                            {m.text}
                          </div>
                          <div style={{ fontSize:'.62rem', color:'rgba(226,235,232,0.3)', marginTop:3, textAlign: m.senderRole==='patient' ? 'right' : 'left' }}>
                            {new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>
                    <div style={{ padding:'14px 22px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:10 }}>
                      <input style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:30, padding:'11px 18px', color:'#e2ebe8', fontFamily:"'DM Sans',sans-serif", fontSize:'.83rem', outline:'none' }}
                        placeholder="Type a message..."
                        value={msgInput} onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => e.key==='Enter' && sendMsg()} />
                      <button onClick={sendMsg} style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#0d9488,#0891b2)', border:'none', color:'#fff', cursor:'pointer', fontSize:'1rem', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>➤</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
