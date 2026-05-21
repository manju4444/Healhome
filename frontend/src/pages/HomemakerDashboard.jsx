import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { io } from 'socket.io-client'

const socket = io('http://localhost:5000')

const STATUS_META = {
  pending:    { color:'#fbbf24', label:'⏳ Pending',    border:'rgba(251,191,36,0.3)' },
  accepted:   { color:'#34d399', label:'✅ Accepted',   border:'rgba(52,211,153,0.3)' },
  cooking:    { color:'#a78bfa', label:'🍳 Cooking',    border:'rgba(167,139,250,0.3)' },
  dispatched: { color:'#60a5fa', label:'🚴 On the way', border:'rgba(96,165,250,0.3)' },
  completed:  { color:'#5eead4', label:'🎉 Delivered',  border:'rgba(94,234,212,0.3)' },
}

const ORDER_FLOW = ['accepted', 'cooking', 'dispatched', 'completed']

const injectStyles = () => {
  if (document.getElementById('hh-hm')) return
  const s = document.createElement('style')
  s.id = 'hh-hm'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body,#root{height:100%;}
    body{font-family:'DM Sans',sans-serif;background:#07090c;color:#e2ebe8;overflow:hidden;}
    select option{background:#0d1a1f;}
    input::placeholder,textarea::placeholder{color:rgba(226,235,232,0.25);}
    ::-webkit-scrollbar{width:3px;}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
    @keyframes ringIn{0%{transform:scale(0.93);opacity:0}100%{transform:scale(1);opacity:1}}
    .fade{animation:fadeUp .35s ease forwards;}
    .pulse{animation:pulse 2s infinite;}
    .ring{animation:ringIn .3s ease forwards;}
    .nav-item:hover{background:rgba(255,255,255,0.07)!important;color:#e2ebe8!important;}
    .ocard:hover{border-color:rgba(45,212,191,0.25)!important;transform:translateX(3px);}
    .ocard{transition:all .2s!important;}
    .btn:hover{opacity:.85;transform:translateY(-1px);}
    .btn{transition:all .2s!important;}
    .inp:focus{border-color:rgba(45,212,191,0.45)!important;background:rgba(45,212,191,0.05)!important;outline:none;}
  `
  document.head.appendChild(s)
}

export default function HomemakerDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('healhome_user') || '{}')
  const chatBottomRef = useRef(null)

  const [page, setPage]           = useState('home')
  const [orders, setOrders]       = useState([])
  const [chatOrder, setChatOrder]   = useState(null)
  const [messages, setMessages]     = useState([])
  const [msgInput, setMsgInput]     = useState('')
  const [menu, setMenu]             = useState([])
  const [newDish, setNewDish]       = useState({ dishName:'', price:'' })
  const [toast, setToast]           = useState(null)

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

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchOrders = async () => {
    try { const { data } = await api.get('/orders'); setOrders(data) } catch {}
  }

  const acceptOrder = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/accept`)
      socket.emit('order_status_update', { orderId, status:'accepted' })
      await fetchOrders()
      showToast('Order accepted!')
    } catch { showToast('Failed to accept order', 'error') }
  }

  const updateStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status })
      socket.emit('order_status_update', { orderId, status })
      await fetchOrders()
      showToast(`Marked as ${status}`)
    } catch { showToast('Failed to update', 'error') }
  }

  const openChat = async (order) => {
    setChatOrder(order)
    socket.emit('join_room', order._id)
    try { const { data } = await api.get(`/chat/${order._id}`); setMessages(data) }
    catch { setMessages([]) }
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

  const addMenuItem = () => {
    if (!newDish.dishName || !newDish.price) { showToast('Enter dish name and price', 'error'); return }
    setMenu(p => [...p, { dishName: newDish.dishName, price: Number(newDish.price) }])
    setNewDish({ dishName:'', price:'' })
    showToast('Dish added!')
  }

  const logout = () => { localStorage.clear(); navigate('/login') }

  const pendingOrders   = orders.filter(o => o.status === 'pending')
  const activeOrders    = orders.filter(o => ['accepted','cooking','dispatched'].includes(o.status))
  const completedOrders = orders.filter(o => o.status === 'completed')
  const nextStatus      = (cur) => ORDER_FLOW[ORDER_FLOW.indexOf(cur) + 1]

  const NAV = [
    { id:'home',   icon:'⊞', label:'Overview' },
    { id:'orders', icon:'◈', label:'Incoming', badge: pendingOrders.length },
    { id:'active', icon:'🍳', label:'Active',   badge: activeOrders.length },
    { id:'menu',   icon:'✦', label:'My Menu' },
    { id:'chat',   icon:'◎', label:'Messages', badge: activeOrders.length },
  ]

  const inputStyle = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:11, padding:'11px 14px', color:'#e2ebe8', fontFamily:"'DM Sans',sans-serif", fontSize:'.85rem' }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#07090c' }}>

      {/* AMBIENT */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,0.12) 0%,transparent 65%)', top:-250, right:-200 }} />
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(20,184,166,0.1) 0%,transparent 65%)', bottom:-200, left:-100 }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.022) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:1000, padding:'12px 20px', borderRadius:14, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', background: toast.type==='error' ? 'rgba(239,68,68,0.18)' : 'rgba(20,184,166,0.18)', border:`1px solid ${toast.type==='error' ? 'rgba(239,68,68,0.3)' : 'rgba(20,184,166,0.3)'}`, fontSize:'.82rem', color: toast.type==='error' ? '#fca5a5' : '#5eead4', fontWeight:500 }}>
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{ width:230, flexShrink:0, position:'relative', zIndex:10, display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.03)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', borderRight:'1px solid rgba(255,255,255,0.07)', padding:'22px 14px' }}>
        <div style={{ padding:'0 8px', marginBottom:24 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.45rem', fontWeight:800, letterSpacing:'-1px' }}>
            <span style={{ color:'#2dd4bf' }}>Heal</span><span style={{ color:'rgba(226,235,232,0.9)' }}>Home</span>
          </div>
          <div style={{ fontSize:'.63rem', color:'rgba(226,235,232,0.3)', letterSpacing:'2px', textTransform:'uppercase', marginTop:2 }}>Homemaker Portal</div>
        </div>

        {/* PROFILE */}
        <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'16px 14px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#0d9488)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', border:'2px solid rgba(167,139,250,0.3)', flexShrink:0 }}>👩‍🍳</div>
            <div>
              <div style={{ fontWeight:600, fontSize:'.88rem', fontFamily:"'Syne',sans-serif" }}>{user.username}</div>
              <div style={{ fontSize:'.68rem', color:'#a78bfa', background:'rgba(167,139,250,0.12)', padding:'2px 8px', borderRadius:20, display:'inline-block', marginTop:2 }}>Homemaker</div>
            </div>
          </div>
          <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.38)', marginBottom:12 }}>📍 {user.location || 'Location not set'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
            {[
              { label:'Total',  value: orders.length,          color:'#2dd4bf' },
              { label:'Active', value: activeOrders.length,    color:'#a78bfa' },
              { label:'Done',   value: completedOrders.length, color:'#34d399' },
            ].map(st => (
              <div key={st.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'8px 6px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1rem', fontWeight:700, color:st.color }}>{st.value}</div>
                <div style={{ fontSize:'.6rem', color:'rgba(226,235,232,0.35)' }}>{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize:'.62rem', color:'rgba(226,235,232,0.28)', textTransform:'uppercase', letterSpacing:'1.5px', padding:'0 8px', marginBottom:8 }}>Navigation</div>
        {NAV.map(n => (
          <div key={n.id} className="nav-item" onClick={() => setPage(n.id)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:12, cursor:'pointer', marginBottom:3, background: page===n.id ? 'rgba(45,212,191,0.1)' : 'transparent', color: page===n.id ? '#2dd4bf' : 'rgba(226,235,232,0.48)', borderLeft: page===n.id ? '2px solid #2dd4bf' : '2px solid transparent', fontSize:'.84rem', fontWeight: page===n.id ? 500 : 400 }}>
            <span style={{ fontSize:'.8rem', width:16 }}>{n.icon}</span>
            {n.label}
            {n.badge > 0 && <span style={{ marginLeft:'auto', background: n.id==='orders' ? '#fbbf24' : '#2dd4bf', color:'#000', fontSize:'.6rem', fontWeight:700, padding:'2px 7px', borderRadius:10 }}>{n.badge}</span>}
          </div>
        ))}

        <div style={{ marginTop:'auto', paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div className="nav-item" onClick={logout} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, cursor:'pointer', color:'rgba(248,113,113,0.65)', fontSize:'.82rem' }}>
            <span>🚪</span> Logout
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', zIndex:1 }}>

        {/* TOPBAR */}
        <div style={{ padding:'14px 28px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', background:'rgba(7,9,12,0.6)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'.98rem', fontWeight:700 }}>{NAV.find(n=>n.id===page)?.label || 'Dashboard'}</div>
            <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.35)' }}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {pendingOrders.length > 0 && (
              <div className="pulse" style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.22)', borderRadius:30, padding:'7px 14px', fontSize:'.75rem', color:'#fbbf24' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', display:'inline-block' }} />
                {pendingOrders.length} new order{pendingOrders.length>1?'s':''} waiting
              </div>
            )}
            {activeOrders.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.18)', borderRadius:30, padding:'7px 14px', fontSize:'.75rem', color:'#34d399' }}>
                🍳 {activeOrders.length} cooking
              </div>
            )}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', display:'flex' }}>

          {/* HOME */}
          {page === 'home' && (
            <div className="fade" style={{ flex:1, padding:'24px 28px', display:'flex', flexDirection:'column', gap:18 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                {[
                  { label:'Total Orders', value: orders.length,          color:'#2dd4bf', icon:'📦', bg:'rgba(45,212,191,0.1)' },
                  { label:'Pending',      value: pendingOrders.length,   color:'#fbbf24', icon:'⏳', bg:'rgba(251,191,36,0.1)' },
                  { label:'Active',       value: activeOrders.length,    color:'#a78bfa', icon:'🍳', bg:'rgba(167,139,250,0.1)' },
                  { label:'Completed',    value: completedOrders.length, color:'#34d399', icon:'✅', bg:'rgba(52,211,153,0.1)' },
                ].map(st => (
                  <div key={st.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'18px 20px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:st.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>{st.icon}</div>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.6rem', fontWeight:700, color:st.color, lineHeight:1 }}>{st.value}</div>
                      <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.38)', marginTop:3 }}>{st.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderRadius:20, background:'linear-gradient(135deg,rgba(109,40,217,0.28) 0%,rgba(13,148,136,0.2) 60%)', border:'1px solid rgba(167,139,250,0.18)', padding:'24px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:0, top:0, bottom:0, width:150, background:'radial-gradient(ellipse at right,rgba(167,139,250,0.12),transparent)', pointerEvents:'none' }} />
                <div>
                  <div style={{ fontSize:'.72rem', color:'#a78bfa', textTransform:'uppercase', letterSpacing:'2px', marginBottom:8 }}>Ready to cook?</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.4rem', fontWeight:800, lineHeight:1.2, marginBottom:10 }}>
                    {pendingOrders.length > 0 ? `${pendingOrders.length} order${pendingOrders.length>1?'s':''} waiting for you 🍳` : 'No pending orders right now'}
                  </div>
                  <div style={{ fontSize:'.82rem', color:'rgba(226,235,232,0.48)', marginBottom:16 }}>
                    {pendingOrders.length > 0 ? 'Accept and start cooking healthy meals for patients near you.' : 'New orders will appear here when patients order nearby.'}
                  </div>
                  <button className="btn" onClick={() => setPage(pendingOrders.length > 0 ? 'orders' : 'menu')} style={{ padding:'10px 22px', borderRadius:30, background:'linear-gradient(135deg,#7c3aed,#0d9488)', border:'none', color:'#fff', fontSize:'.83rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {pendingOrders.length > 0 ? 'View Orders →' : 'Manage Menu →'}
                  </button>
                </div>
                <div style={{ fontSize:'4rem', opacity:.45 }}>👩‍🍳</div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.9rem' }}>🍳 Active Orders</div>
                    <button className="btn" onClick={() => setPage('active')} style={{ fontSize:'.72rem', color:'#2dd4bf', background:'none', border:'none', cursor:'pointer' }}>View all →</button>
                  </div>
                  {activeOrders.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'20px 0', color:'rgba(226,235,232,0.28)', fontSize:'.8rem' }}>No active orders</div>
                  ) : activeOrders.slice(0,3).map(o => {
                    const meta = STATUS_META[o.status]
                    return (
                      <div key={o._id} className="ocard" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <div style={{ fontWeight:600, fontSize:'.83rem' }}>{o.customMeal || o.mealName}</div>
                          <div style={{ fontSize:'.65rem', color:meta.color, background:`${meta.color}18`, padding:'2px 8px', borderRadius:10 }}>{meta.label}</div>
                        </div>
                        <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.35)' }}>👤 {o.patient?.username} · {o.condition}</div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.9rem' }}>✦ My Menu</div>
                    <button className="btn" onClick={() => setPage('menu')} style={{ fontSize:'.72rem', color:'#2dd4bf', background:'none', border:'none', cursor:'pointer' }}>Manage →</button>
                  </div>
                  {menu.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'20px 0', color:'rgba(226,235,232,0.28)', fontSize:'.8rem' }}>
                      <div style={{ fontSize:'1.8rem', marginBottom:6 }}>🍽️</div>No menu items
                    </div>
                  ) : menu.slice(0,4).map((item,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize:'.83rem', fontWeight:500 }}>{item.dishName}</div>
                      <div style={{ fontSize:'.82rem', color:'#fbbf24', fontWeight:600 }}>₹{item.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* INCOMING ORDERS */}
          {page === 'orders' && (
            <div className="fade" style={{ flex:1, padding:'24px 28px', overflowY:'auto' }}>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.15rem', fontWeight:700, marginBottom:4 }}>Incoming Orders</div>
                <div style={{ fontSize:'.78rem', color:'rgba(226,235,232,0.38)' }}>{pendingOrders.length} waiting for you</div>
              </div>
              {pendingOrders.length === 0 ? (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'60px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'3rem', marginBottom:12 }}>🔔</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:700, marginBottom:8 }}>No pending orders</div>
                  <div style={{ fontSize:'.82rem', color:'rgba(226,235,232,0.35)' }}>Patient orders near you will appear here.</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {pendingOrders.map((o,i) => (
                    <div key={o._id} className="ring fade" style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.18)', borderRadius:18, padding:'20px 24px', animationDelay:`${i*0.05}s` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                        <div>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1.05rem', marginBottom:4 }}>{o.customMeal || o.mealName}</div>
                          <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.38)' }}>#{o._id.slice(-8).toUpperCase()} · {new Date(o.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                        <div style={{ padding:'5px 12px', borderRadius:20, background:'rgba(251,191,36,0.15)', color:'#fbbf24', fontSize:'.73rem', fontWeight:600, border:'1px solid rgba(251,191,36,0.28)' }}>⏳ New Order</div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
                        {[
                          { label:'Patient',   value: o.patient?.username || 'Patient' },
                          { label:'Condition', value: o.condition },
                          { label:'Meal Time', value: o.mealTime },
                          { label:'Payment',   value: o.payment==='cash' ? '💵 Cash' : '💳 Online' },
                          { label:'Location',  value: o.patient?.location || 'Nearby' },
                        ].map(f => (
                          <div key={f.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px' }}>
                            <div style={{ fontSize:'.62rem', color:'rgba(226,235,232,0.32)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:4 }}>{f.label}</div>
                            <div style={{ fontSize:'.82rem', fontWeight:500 }}>{f.value}</div>
                          </div>
                        ))}
                      </div>
                      {o.instructions && (
                        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:'.78rem', color:'rgba(226,235,232,0.52)' }}>
                          📝 {o.instructions}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:10 }}>
                        <button className="btn" onClick={() => acceptOrder(o._id)}
                          style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#0d9488,#0891b2)', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:'.88rem', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 18px rgba(13,148,136,0.28)' }}>
                          ✅ Accept Order
                        </button>
                        <button className="btn"
                          style={{ padding:'12px 20px', borderRadius:12, border:'1px solid rgba(248,113,113,0.28)', background:'rgba(248,113,113,0.07)', color:'#fca5a5', fontFamily:"'DM Sans',sans-serif", fontSize:'.85rem', cursor:'pointer' }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE ORDERS */}
          {page === 'active' && (
            <div className="fade" style={{ flex:1, padding:'24px 28px', overflowY:'auto' }}>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.15rem', fontWeight:700, marginBottom:4 }}>Active Orders</div>
                <div style={{ fontSize:'.78rem', color:'rgba(226,235,232,0.38)' }}>{activeOrders.length} in progress</div>
              </div>
              {activeOrders.length === 0 ? (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'60px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'3rem', marginBottom:12 }}>🍳</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:700, marginBottom:8 }}>Nothing cooking yet</div>
                  <button className="btn" onClick={() => setPage('orders')} style={{ padding:'10px 24px', borderRadius:30, background:'rgba(45,212,191,0.12)', border:'1px solid rgba(45,212,191,0.25)', color:'#2dd4bf', fontSize:'.83rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>View Incoming →</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {activeOrders.map((o,i) => {
                    const meta = STATUS_META[o.status]
                    const next = nextStatus(o.status)
                    return (
                      <div key={o._id} className="ocard fade" style={{ background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.08)`, borderRadius:18, padding:'20px 24px', borderLeft:`3px solid ${meta.color}`, animationDelay:`${i*0.05}s` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                          <div>
                            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1rem', marginBottom:4 }}>{o.customMeal || o.mealName}</div>
                            <div style={{ fontSize:'.72rem', color:'rgba(226,235,232,0.38)' }}>👤 {o.patient?.username} · #{o._id.slice(-6).toUpperCase()}</div>
                          </div>
                          <div style={{ padding:'5px 14px', borderRadius:20, background:`${meta.color}18`, color:meta.color, fontSize:'.75rem', fontWeight:600, border:`1px solid ${meta.border}` }}>{meta.label}</div>
                        </div>
                        <div style={{ display:'flex', gap:4, marginBottom:14 }}>
                          {ORDER_FLOW.map(s => (
                            <div key={s} style={{ flex:1, height:3, borderRadius:3, background: ORDER_FLOW.indexOf(s) <= ORDER_FLOW.indexOf(o.status) ? meta.color : 'rgba(255,255,255,0.08)' }} />
                          ))}
                        </div>
                        <div style={{ display:'flex', gap:14, fontSize:'.75rem', color:'rgba(226,235,232,0.4)', marginBottom:14, flexWrap:'wrap' }}>
                          <span>🩺 {o.condition}</span>
                          <span>🕐 {o.mealTime}</span>
                          <span>{o.payment==='cash' ? '💵 Cash' : '💳 Online'}</span>
                        </div>
                        {o.instructions && (
                          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'8px 12px', marginBottom:14, fontSize:'.75rem', color:'rgba(226,235,232,0.5)' }}>📝 {o.instructions}</div>
                        )}
                        <div style={{ display:'flex', gap:10 }}>
                          {next && (
                            <button className="btn" onClick={() => updateStatus(o._id, next)}
                              style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${meta.color}99,${meta.color}66)`, color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:'.85rem', fontWeight:700, cursor:'pointer' }}>
                              Mark as {STATUS_META[next]?.label}
                            </button>
                          )}
                          <button className="btn" onClick={() => openChat(o)}
                            style={{ padding:'11px 18px', borderRadius:12, border:'1px solid rgba(45,212,191,0.25)', background:'rgba(45,212,191,0.08)', color:'#2dd4bf', fontFamily:"'DM Sans',sans-serif", fontSize:'.82rem', cursor:'pointer' }}>
                            💬 Chat
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* MENU */}
          {page === 'menu' && (
            <div className="fade" style={{ flex:1, padding:'24px 28px', overflowY:'auto' }}>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.15rem', fontWeight:700, marginBottom:4 }}>My Menu</div>
                <div style={{ fontSize:'.78rem', color:'rgba(226,235,232,0.38)' }}>Add dishes patients can order from you</div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'22px', marginBottom:18 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:'.9rem', marginBottom:14 }}>+ Add New Dish</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 140px', gap:12, marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:'.68rem', color:'rgba(226,235,232,0.35)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:7 }}>Dish Name</div>
                    <input className="inp" placeholder="e.g. Ragi Java, Soft Dal Rice..."
                      value={newDish.dishName} onChange={e => setNewDish(d=>({...d,dishName:e.target.value}))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize:'.68rem', color:'rgba(226,235,232,0.35)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:7 }}>Price (₹)</div>
                    <input className="inp" placeholder="80" type="number"
                      value={newDish.price} onChange={e => setNewDish(d=>({...d,price:e.target.value}))}
                      style={inputStyle} />
                  </div>
                </div>
                <button className="btn" onClick={addMenuItem}
                  style={{ padding:'11px 28px', borderRadius:11, background:'linear-gradient(135deg,#0d9488,#0891b2)', border:'none', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:'.85rem', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(13,148,136,0.25)' }}>
                  + Add to Menu
                </button>
              </div>
              {menu.length === 0 ? (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'50px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'3rem', marginBottom:10 }}>🍽️</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1rem', fontWeight:700, marginBottom:6 }}>No dishes yet</div>
                  <div style={{ fontSize:'.8rem', color:'rgba(226,235,232,0.32)' }}>Add your first dish above.</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {menu.map((item,i) => (
                    <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'18px' }}>
                      <div style={{ fontSize:'1.8rem', marginBottom:8 }}>🍱</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:'.9rem', marginBottom:4 }}>{item.dishName}</div>
                      <div style={{ color:'#fbbf24', fontSize:'.9rem', fontWeight:700 }}>₹{item.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {page === 'chat' && (
            <div className="fade" style={{ flex:1, display:'grid', gridTemplateColumns:'260px 1fr', overflow:'hidden' }}>
              <div style={{ borderRight:'1px solid rgba(255,255,255,0.06)', overflowY:'auto', padding:'20px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.88rem', marginBottom:8, padding:'0 4px' }}>💬 Patient Chats</div>
                {activeOrders.length === 0 && (
                  <div style={{ textAlign:'center', padding:'30px 10px', color:'rgba(226,235,232,0.28)', fontSize:'.78rem' }}>
                    <div style={{ fontSize:'2rem', marginBottom:8 }}>💬</div>Accept orders to chat.
                  </div>
                )}
                {activeOrders.map(o => (
                  <div key={o._id} onClick={() => openChat(o)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 10px', borderRadius:12, cursor:'pointer', background: chatOrder?._id===o._id ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.04)', border:`1px solid ${chatOrder?._id===o._id ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.07)'}`, transition:'all .2s' }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#0d9488,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.95rem', flexShrink:0 }}>🧑‍⚕️</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'.82rem', fontWeight:600 }}>{o.patient?.username || 'Patient'}</div>
                      <div style={{ fontSize:'.7rem', color:'rgba(226,235,232,0.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.customMeal || o.mealName}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                {!chatOrder ? (
                  <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, color:'rgba(226,235,232,0.28)' }}>
                    <div style={{ fontSize:'3rem' }}>💬</div>
                    <div style={{ fontSize:'.85rem' }}>Select a conversation</div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding:'16px 22px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#0d9488,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>🧑‍⚕️</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'.9rem' }}>{chatOrder.patient?.username || 'Patient'}</div>
                        <div className="pulse" style={{ fontSize:'.72rem', color:'#2dd4bf' }}>🟢 {chatOrder.customMeal || chatOrder.mealName} · {chatOrder.condition}</div>
                      </div>
                    </div>
                    <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                      {messages.length === 0 && <div style={{ textAlign:'center', color:'rgba(226,235,232,0.28)', fontSize:'.8rem', paddingTop:20 }}>Send a message to the patient.</div>}
                      {messages.map((m,i) => (
                        <div key={i} style={{ maxWidth:'68%', alignSelf: m.senderRole==='homemaker' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ padding:'10px 16px', borderRadius: m.senderRole==='homemaker' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: m.senderRole==='homemaker' ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.07)', border: m.senderRole==='homemaker' ? '1px solid rgba(45,212,191,0.2)' : '1px solid rgba(255,255,255,0.1)', fontSize:'.83rem', lineHeight:1.5, color:'#e2ebe8' }}>
                            {m.text}
                          </div>
                          <div style={{ fontSize:'.62rem', color:'rgba(226,235,232,0.28)', marginTop:3, textAlign: m.senderRole==='homemaker' ? 'right' : 'left' }}>
                            {new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>
                    <div style={{ padding:'14px 22px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10 }}>
                      <input className="inp" style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:30, padding:'11px 18px', color:'#e2ebe8', fontFamily:"'DM Sans',sans-serif", fontSize:'.83rem', outline:'none' }}
                        placeholder="Type a message..."
                        value={msgInput} onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => e.key==='Enter' && sendMsg()} />
                      <button className="btn" onClick={sendMsg} style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#0d9488,#0891b2)', border:'none', color:'#fff', cursor:'pointer', fontSize:'.95rem', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>➤</button>
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