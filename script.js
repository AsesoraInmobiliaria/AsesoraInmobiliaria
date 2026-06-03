const SUPABASE_URL = 'https://kxtbuqgqpgaseiaoclri.supabase.co'
const SUPABASE_KEY = 'sb_publishable_KiAQsHfP0ACCEWhAI2_qZg_Ng2KDSas'
const WHATSAPP_NUMBER = '5491153175943'

let supabase = null
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  } else {
    console.warn('Supabase SDK could not be loaded or window.supabase is undefined. Running in offline/fallback mode.')
  }
} catch (err) {
  console.error('Error initializing Supabase client:', err)
}

// ─── Menú hamburguesa móvil ────────────────────────────────────────────────
const menuToggle = document.getElementById('menuToggle')
const mainNav = document.getElementById('mainNav')

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = mainNav.classList.toggle('is-open')
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  })

  // Cerrar al tocar fuera del menú
  document.addEventListener('click', (e) => {
    if (mainNav.classList.contains('is-open') && !mainNav.contains(e.target) && e.target !== menuToggle) {
      mainNav.classList.remove('is-open')
      menuToggle.setAttribute('aria-expanded', 'false')
    }
  })

  // Cerrar al tocar un link del menú
  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open')
      menuToggle.setAttribute('aria-expanded', 'false')
    })
  })
}
// ──────────────────────────────────────────────────────────────────────────

const trackedViews = new Set()

async function trackView(propertyId) {
  if (trackedViews.has(propertyId)) return
  trackedViews.add(propertyId)

  if (!supabase) return
  try {
    // Si es un ID numérico válido, llamamos al RPC de Supabase
    if (propertyId && !isNaN(propertyId)) {
      await supabase.rpc('increment_views', { prop_id: Number(propertyId) })
    }
  } catch (err) {
    console.warn('Error incrementing views on Supabase:', err)
  }
}

async function trackClick(propertyId) {
  if (!supabase) return
  try {
    if (propertyId && !isNaN(propertyId)) {
      await supabase.rpc('increment_clicks', { prop_id: Number(propertyId) })
    }
  } catch (err) {
    console.warn('Error incrementing clicks on Supabase:', err)
  }
}

// Sin propiedades demo: solo se muestran las propiedades reales cargadas desde Supabase
const baseProperties = []

let allProperties = []

function getAllProperties() {
  return allProperties
}

async function loadProperties() {
  if (!supabase) {
    console.warn('Supabase not connected. Loading offline properties.')
    allProperties = [...baseProperties]
    render()
    return
  }
  try {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const dbProperties = (data || []).map((p) => ({
      id: Number(p.id),
      code: p.code || '',
      operation: p.operation,
      title: p.title,
      priceUsd: Number(p.price_usd),
      priceLabel: p.price_label,
      location: p.location,
      meters: Number(p.meters),
      rooms: Number(p.rooms),
      bathrooms: Number(p.bathrooms),
      extras: p.extras || '',
      photos: p.photos || [],
      mapLink: p.map_link || ''
    }))

    allProperties = [...baseProperties, ...dbProperties]
    render()
  } catch (err) {
    console.error('Error loading properties from Supabase:', err)
    // Fallback simple a propiedades estáticas en caso de error
    allProperties = [...baseProperties]
    render()
  }
}

function getEmbedMapUrl(link) {
  if (!link) return ''
  const trimmed = String(link).trim()
  if (!trimmed) return ''
  if (trimmed.includes('/maps/embed')) return trimmed
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`
}

function getWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

const refs = {
  ventaGrid: document.getElementById('ventaGrid'),
  alquilerGrid: document.getElementById('alquilerGrid'),
  ventaCount: document.getElementById('ventaCount'),
  alquilerCount: document.getElementById('alquilerCount'),
  operation: document.getElementById('filterOperation'),
  location: document.getElementById('filterLocation'),
  price: document.getElementById('filterPrice'),
  rooms: document.getElementById('filterRooms'),
  bathrooms: document.getElementById('filterBathrooms'),
  clear: document.getElementById('clearFilters')
}

const tasacionForm = document.getElementById('tasacionForm')

if (tasacionForm) {
  tasacionForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const nombre = document.getElementById('tasacionNombre')?.value.trim() || ''
    const zona = document.getElementById('tasacionZona')?.value.trim() || ''
    const tipo = document.getElementById('tasacionTipo')?.value.trim() || ''

    if (!nombre || !zona || !tipo) return

    const message = `¡Hola Verito! 📊 Me gustaría consultar por una tasación profesional.\n\n👤 *Nombre:* ${nombre}\n📍 *Zona de la propiedad:* ${zona}\n🏠 *Tipo:* ${tipo}\n\nQuedo a la espera de tu respuesta para coordinar. ¡Muchas gracias! 😊`
    window.open(getWhatsAppLink(message), '_blank')
  })
}

function createCard(property) {
  // Registrar visualización de la propiedad
  trackView(property.id)

  const card = document.createElement('article')
  card.className = 'card'

  const carousel = document.createElement('div')
  carousel.className = 'carousel'

  const img = document.createElement('img')
  let index = 0
  img.src = property.photos[index]
  img.alt = property.title

  const prevBtn = document.createElement('button')
  prevBtn.className = 'carousel-btn prev'
  prevBtn.type = 'button'
  prevBtn.textContent = '‹'

  const nextBtn = document.createElement('button')
  nextBtn.className = 'carousel-btn next'
  nextBtn.type = 'button'
  nextBtn.textContent = '›'

  prevBtn.addEventListener('click', () => {
    index = (index - 1 + property.photos.length) % property.photos.length
    img.src = property.photos[index]
  })

  nextBtn.addEventListener('click', () => {
    index = (index + 1) % property.photos.length
    img.src = property.photos[index]
  })

  carousel.append(img, prevBtn, nextBtn)

  const body = document.createElement('div')
  body.className = 'card-body'
  const mapHtml = property.mapLink
    ? `<iframe class="map-frame" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${getEmbedMapUrl(property.mapLink)}"></iframe>`
    : '<p class="muted">Mapa disponible a solicitud.</p>'

  const propertyMessage = `¡Hola Verito! 👋 Estoy interesado/a en la propiedad:\n✨ *${property.title}*\n🔑 *Operación:* ${property.operation.toUpperCase()}\n📍 *Ubicación:* ${property.location}\n💰 *Precio:* ${property.priceLabel}\n\nMe gustaría recibir más detalles y coordinar una visita. 📲`
  const propertyWhatsappLink = getWhatsAppLink(propertyMessage)

  const codeBadge = property.code ? `<span class="ref-code-badge">Ref: #${property.code}</span>` : ''
  body.innerHTML = `
    ${codeBadge}
    <h3>${property.title}</h3>
    <p class="price">${property.priceLabel}</p>
    <p class="muted">${property.location}</p>
    <div class="card-actions">
      <button class="more-btn" type="button">Ver más</button>
      <button class="more-btn map-btn" type="button">Ver mapa</button>
    </div>
    <div class="card-extra">
      <div class="meta">
        <span><svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.82 2.82 0 0 1 0 4c-1 1-2.5 1-3.5 0L2.3 3.8a2.82 2.82 0 0 1 0-4c1-1 2.5-1 3.5 0Z"/><path d="M5.6 7.2 7.2 5.6"/><path d="m7.2 10.4 1.6-1.6"/><path d="m10.4 12 1.6-1.6"/><path d="m13.6 15.2 1.6-1.6"/><path d="m16.8 16.8 1.6-1.6"/></svg>${property.meters} m²</span>
        <span><svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 14h18"/><path d="M6 8v6"/></svg>${property.rooms} amb.</span>
        <span><svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.6 3 4 3.6 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M2 11h20"/><path d="M12 2v4"/><path d="M8 5h3"/></svg>${property.bathrooms} baños</span>
      </div>
      <p class="muted">${property.extras || ''}</p>
    </div>
    <div class="map-box">${mapHtml}</div>
    <p class="muted"><a class="btn-primary wa-contact-btn" target="_blank" rel="noreferrer" href="${propertyWhatsappLink}">Consultar por WhatsApp</a></p>
  `

  card.append(carousel, body)
  const moreBtn = body.querySelector('.more-btn')
  const mapBtn = body.querySelector('.map-btn')
  const extra = body.querySelector('.card-extra')
  const mapBox = body.querySelector('.map-box')
  const waContactBtn = body.querySelector('.wa-contact-btn')

  moreBtn.addEventListener('click', () => {
    const isOpen = extra.classList.toggle('is-open')
    moreBtn.textContent = isOpen ? 'Ver menos' : 'Ver más'
    if (isOpen) trackClick(property.id)
  })

  mapBtn.addEventListener('click', () => {
    const isOpen = mapBox.classList.toggle('is-open')
    mapBtn.textContent = isOpen ? 'Ocultar mapa' : 'Ver mapa'
    if (isOpen) trackClick(property.id)
  })

  if (waContactBtn) {
    waContactBtn.addEventListener('click', () => {
      trackClick(property.id)
    })
  }

  return card
}

function applyFilters(items) {
  const op = refs.operation.value
  const locationTerm = refs.location.value.trim().toLowerCase()
  const maxPrice = Number(refs.price.value || 0)
  const minRooms = Number(refs.rooms.value)
  const minBathrooms = Number(refs.bathrooms.value)

  return items.filter((p) => {
    const matchOp = op === 'all' || p.operation === op
    const matchLocation = !locationTerm || p.location.toLowerCase().includes(locationTerm)
    const matchPrice = !maxPrice || p.priceUsd <= maxPrice
    const matchRooms = p.rooms >= minRooms
    const matchBathrooms = p.bathrooms >= minBathrooms

    return matchOp && matchLocation && matchPrice && matchRooms && matchBathrooms
  })
}

function renderSection(container, list, emptyText) {
  container.innerHTML = ''
  if (!list.length) {
    const p = document.createElement('p')
    p.className = 'empty'
    p.textContent = emptyText
    container.appendChild(p)
    return
  }
  list.forEach((item) => container.appendChild(createCard(item)))
}

function render() {
  const filtered = applyFilters(getAllProperties())
  const venta = filtered.filter((p) => p.operation === 'venta')
  const alquiler = filtered.filter((p) => p.operation === 'alquiler')

  renderSection(refs.ventaGrid, venta, 'No hay propiedades en venta con esos filtros.')
  renderSection(refs.alquilerGrid, alquiler, 'No hay propiedades en alquiler con esos filtros.')

  refs.ventaCount.textContent = `${venta.length} resultado(s)`
  refs.alquilerCount.textContent = `${alquiler.length} resultado(s)`
}

;[refs.operation, refs.location, refs.price, refs.rooms, refs.bathrooms].forEach((el) => {
  el.addEventListener('input', render)
  el.addEventListener('change', render)
})

refs.clear.addEventListener('click', () => {
  refs.operation.value = 'all'
  refs.location.value = ''
  refs.price.value = ''
  refs.rooms.value = '0'
  refs.bathrooms.value = '0'
  render()
})

loadProperties()
