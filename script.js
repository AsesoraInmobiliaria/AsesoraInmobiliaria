const SUPABASE_URL = 'https://kxtbuqgqpgaseiaoclri.supabase.co'
const SUPABASE_KEY = 'sb_publishable_KiAQsHfP0ACCEWhAI2_qZg_Ng2KDSas'
const WHATSAPP_NUMBER = '5491153175943'
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">' +
      '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">' +
        '<stop stop-color="#17344a"/><stop offset="1" stop-color="#315e82"/>' +
      '</linearGradient></defs>' +
      '<rect width="640" height="420" fill="url(#g)"/>' +
      '<circle cx="160" cy="120" r="64" fill="rgba(255,255,255,0.14)"/>' +
      '<circle cx="520" cy="80" r="38" fill="rgba(255,255,255,0.1)"/>' +
      '<path d="M120 280L240 190l94 70 74-58 112 78v72H120z" fill="rgba(255,255,255,0.16)"/>' +
      '<text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#fffdfa" font-family="Arial" font-size="30">Verito Garga Asesora Inmobiliaria</text>' +
    '</svg>'
  )

function waitForSupabase(maxAttempts = 40, delayMs = 150) {
  return new Promise((resolve) => {
    let attempts = 0

    const check = () => {
      if (window.supabase?.createClient) {
        resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY))
        return
      }

      attempts += 1
      if (attempts >= maxAttempts) {
        resolve(null)
        return
      }

      window.setTimeout(check, delayMs)
    }

    check()
  })
}

function getWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

function openWhatsApp(message) {
  const url = getWhatsAppLink(message)
  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)

  if (isMobile) {
    window.location.href = url
    return
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer')
  if (!popup) {
    window.location.href = url
  }
}

function getEmbedMapUrl(link) {
  if (!link) return ''
  let trimmed = String(link).trim()
  if (!trimmed) return ''

  // 1. Si pegó el código iframe completo de Google Maps, extraer el src
  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i)
    if (srcMatch && srcMatch[1]) {
      trimmed = srcMatch[1]
    }
  }

  // 2. Si ya es una URL de embed directa
  if (trimmed.includes('/maps/embed')) {
    return trimmed
  }

  // 3. Si es un link largo de Google Maps con /maps/place/
  if (trimmed.includes('/maps/place/')) {
    const placeMatch = trimmed.match(/\/maps\/place\/([^\/\?#]+)/)
    if (placeMatch && placeMatch[1]) {
      return `https://www.google.com/maps?q=${placeMatch[1]}&output=embed`
    }
  }

  // 4. Si contiene coordenadas en la URL (ej: @-34.6158,-58.9811)
  const coordMatch = trimmed.match(/\@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (coordMatch && coordMatch[1] && coordMatch[2]) {
    return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`
  }

  // 5. Si es un link corto de Google Maps (maps.app.goo.gl o goo.gl/maps)
  if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps')) {
    return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`
  }

  // 6. Por defecto, tratar como dirección de búsqueda textual
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`
}

function normalizeProperty(row) {
  const photos = Array.isArray(row.photos) ? row.photos.filter(Boolean) : []

  return {
    id: Number(row.id),
    code: row.code || '',
    operation: row.operation || 'venta',
    title: row.title || 'Propiedad disponible',
    priceUsd: Number(row.price_usd || 0),
    priceLabel: row.price_label || 'Consultar precio',
    location: row.location || 'Ubicacion a confirmar',
    meters: Number(row.meters || 0),
    metersBuilt: Number(row.meters_built || 0),
    rooms: Number(row.rooms || 0),
    bathrooms: Number(row.bathrooms || 0),
    extras: row.extras || '',
    photos: photos.length ? photos : [FALLBACK_IMAGE],
    mapLink: row.map_link || '',
    cochera: row.cochera || '',
    servicios: Array.isArray(row.servicios) ? row.servicios : [],
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    caractProp: Array.isArray(row.caract_prop) ? row.caract_prop : [],
    caractEdif: Array.isArray(row.caract_edif) ? row.caract_edif : []
  }
}

function createMenuController(toggleButton, panel) {
  if (!toggleButton || !panel) return { close() {} }

  const close = () => {
    panel.classList.remove('is-open')
    toggleButton.setAttribute('aria-expanded', 'false')
  }

  const open = () => {
    panel.classList.add('is-open')
    toggleButton.setAttribute('aria-expanded', 'true')
  }

  toggleButton.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const shouldOpen = !panel.classList.contains('is-open')
    if (shouldOpen) open()
    else close()
  })

  document.addEventListener('click', (event) => {
    if (!panel.classList.contains('is-open')) return
    if (panel.contains(event.target) || toggleButton.contains(event.target)) return
    close()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close()
  })

  return { close }
}

function bootSite() {
  const refs = {
    ventaGrid: document.getElementById('ventaGrid'),
    alquilerGrid: document.getElementById('alquilerGrid'),
    ventaCount: document.getElementById('ventaCount'),
    alquilerCount: document.getElementById('alquilerCount'),
    operation: document.getElementById('filterOperation'),
    location: document.getElementById('filterLocation'),
    priceMin: document.getElementById('filterPriceMin'),
    priceMax: document.getElementById('filterPriceMax'),
    rooms: document.getElementById('filterRooms'),
    bathrooms: document.getElementById('filterBathrooms'),
    search: document.getElementById('searchFilters'),
    clear: document.getElementById('clearFilters')
  }

  const menu = createMenuController(
    document.getElementById('menuToggle'),
    document.getElementById('mainNav')
  )

  document.querySelectorAll('#mainNav a').forEach((link) => {
    link.addEventListener('click', () => menu.close())
  })

  const tasacionForm = document.getElementById('tasacionForm')
  if (tasacionForm) {
    tasacionForm.addEventListener('submit', (event) => {
      event.preventDefault()

      const nombre = document.getElementById('tasacionNombre')?.value.trim() || ''
      const zona = document.getElementById('tasacionZona')?.value.trim() || ''
      const tipo = document.getElementById('tasacionTipo')?.value.trim() || ''

      if (!nombre || !zona || !tipo) {
        alert('Completa nombre, zona y tipo de propiedad para enviar la consulta.')
        return
      }

      const message =
        `Hola Verito! Quiero consultar por una tasacion.\n\n` +
        `Nombre: ${nombre}\n` +
        `Zona de la propiedad: ${zona}\n` +
        `Tipo de propiedad: ${tipo}\n\n` +
        `Quedo atento/a para coordinar. Muchas gracias.`

      openWhatsApp(message)
    })
  }

  const trackedViews = new Set()
  const pendingViews = new Set()
  let supabase = null
  let allProperties = []

  async function trackView(propertyId) {
    if (Number.isNaN(Number(propertyId)) || trackedViews.has(propertyId)) return

    if (!supabase) {
      pendingViews.add(propertyId)
      return
    }

    trackedViews.add(propertyId)

    try {
      await supabase.rpc('increment_views', { prop_id: Number(propertyId) })
    } catch (error) {
      console.warn('No se pudo registrar la vista:', error)
    }
  }

  async function trackClick(propertyId) {
    if (!supabase || Number.isNaN(Number(propertyId))) return

    try {
      await supabase.rpc('increment_clicks', { prop_id: Number(propertyId) })
    } catch (error) {
      console.warn('No se pudo registrar el click:', error)
    }
  }

  function createCard(property) {
    trackView(property.id)

    const card = document.createElement('article')
    card.className = 'card'

    const carousel = document.createElement('div')
    carousel.className = 'carousel'

    const img = document.createElement('img')
    let index = 0
    img.src = property.photos[index] || FALLBACK_IMAGE
    img.alt = property.title
    img.loading = 'lazy'

    const prevBtn = document.createElement('button')
    prevBtn.className = 'carousel-btn prev'
    prevBtn.type = 'button'
    prevBtn.setAttribute('aria-label', 'Foto anterior')
    prevBtn.textContent = '<'

    const nextBtn = document.createElement('button')
    nextBtn.className = 'carousel-btn next'
    nextBtn.type = 'button'
    nextBtn.setAttribute('aria-label', 'Foto siguiente')
    nextBtn.textContent = '>'

    const updateImage = () => {
      img.src = property.photos[index] || FALLBACK_IMAGE
    }

    let touchStartX = 0
    let touchDeltaX = 0

    prevBtn.addEventListener('click', () => {
      index = (index - 1 + property.photos.length) % property.photos.length
      updateImage()
    })

    nextBtn.addEventListener('click', () => {
      index = (index + 1) % property.photos.length
      updateImage()
    })

    carousel.addEventListener(
      'touchstart',
      (event) => {
        touchStartX = event.changedTouches[0]?.clientX || 0
        touchDeltaX = 0
        carousel.classList.add('is-swiping')
      },
      { passive: true }
    )

    carousel.addEventListener(
      'touchmove',
      (event) => {
        const currentX = event.changedTouches[0]?.clientX || 0
        touchDeltaX = currentX - touchStartX
      },
      { passive: true }
    )

    carousel.addEventListener(
      'touchend',
      () => {
        carousel.classList.remove('is-swiping')
        if (Math.abs(touchDeltaX) < 40 || property.photos.length < 2) return
        if (touchDeltaX < 0) {
          index = (index + 1) % property.photos.length
        } else {
          index = (index - 1 + property.photos.length) % property.photos.length
        }
        updateImage()
      },
      { passive: true }
    )

    carousel.append(img)
    if (property.photos.length > 1) {
      carousel.append(prevBtn, nextBtn)
    }

    const body = document.createElement('div')
    body.className = 'card-body'

    const propertyMessage =
      `Hola Verito! Estoy interesado/a en esta propiedad.\n\n` +
      `${property.title}\n` +
      `Operacion: ${property.operation.toUpperCase()}\n` +
      `Ubicacion: ${property.location}\n` +
      `Precio: ${property.priceLabel}\n\n` +
      `Me gustaria recibir mas detalles y coordinar una visita.`

    const codeBadge = property.code ? `<span class="ref-code-badge">Ref: #${property.code}</span>` : ''
    const mapHtml = property.mapLink
      ? `<iframe class="map-frame" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${getEmbedMapUrl(property.mapLink)}"></iframe>`
      : '<p class="muted">Mapa disponible a solicitud.</p>'

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
        <div class="card-extra-details">

          <div class="detail-chips-row">
            ${property.meters ? `
            <div class="detail-chip">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2h8v2H4v6H2V2z"/><path d="M22 22h-8v-2h6v-6h2v8z"/><path d="M2 22l20-20"/></svg>
              <span><strong>${property.meters} m²</strong><em>Sup. total</em></span>
            </div>` : ''}
            ${property.metersBuilt ? `
            <div class="detail-chip">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              <span><strong>${property.metersBuilt} m²</strong><em>Edificados</em></span>
            </div>` : ''}
            ${property.rooms ? `
            <div class="detail-chip">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span><strong>${property.rooms}</strong><em>Ambientes</em></span>
            </div>` : ''}
            ${property.bathrooms ? `
            <div class="detail-chip">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" y1="5" x2="8" y2="7"/><path d="M4 12h16"/></svg>
              <span><strong>${property.bathrooms}</strong><em>Baños</em></span>
            </div>` : ''}
            ${property.cochera ? `
            <div class="detail-chip">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              <span><strong>${property.cochera}</strong><em>Cochera</em></span>
            </div>` : ''}
          </div>

          ${property.servicios.length ? `
          <div class="details-section">
            <h4>Servicios</h4>
            <div class="details-badges">
              ${property.servicios.map(s => `<span>${s}</span>`).join('')}
            </div>
          </div>` : ''}

          ${property.caractProp.length ? `
          <div class="details-section">
            <h4>Características</h4>
            <div class="details-badges">
              ${property.caractProp.map(c => `<span>${c}</span>`).join('')}
            </div>
          </div>` : ''}

          ${property.amenities.length ? `
          <div class="details-section">
            <h4>Amenities</h4>
            <div class="details-badges">
              ${property.amenities.map(a => `<span>${a}</span>`).join('')}
            </div>
          </div>` : ''}

          ${property.caractEdif.length ? `
          <div class="details-section">
            <h4>Edificio</h4>
            <div class="details-badges">
              ${property.caractEdif.map(e => `<span>${e}</span>`).join('')}
            </div>
          </div>` : ''}

          ${property.extras ? `
          <div class="details-section details-section--desc">
            <h4>Descripción</h4>
            <p class="details-text">${property.extras.length > 120 ? property.extras.slice(0, 120).trim() + '…' : property.extras}</p>
          </div>` : ''}

        </div>
      </div>
      <div class="map-box">${mapHtml}</div>
      <p class="muted"><a class="btn-primary wa-contact-btn" target="_blank" rel="noreferrer" href="${getWhatsAppLink(propertyMessage)}">Consultar por WhatsApp</a></p>
    `

    card.append(carousel, body)

    const moreBtn = body.querySelector('.more-btn')
    const mapBtn = body.querySelector('.map-btn')
    const extra = body.querySelector('.card-extra')
    const mapBox = body.querySelector('.map-box')
    const waContactBtn = body.querySelector('.wa-contact-btn')

    moreBtn?.addEventListener('click', () => {
      const isOpen = extra.classList.toggle('is-open')
      moreBtn.textContent = isOpen ? 'Ver menos' : 'Ver mas'
      if (isOpen) trackClick(property.id)
    })

    mapBtn?.addEventListener('click', () => {
      const isOpen = mapBox.classList.toggle('is-open')
      mapBtn.textContent = isOpen ? 'Ocultar mapa' : 'Ver mapa'
      if (isOpen) trackClick(property.id)
    })

    waContactBtn?.addEventListener('click', () => trackClick(property.id))

    return card
  }

  function applyFilters(items) {
    const op = refs.operation?.value || 'all'
    const locationTerm = refs.location?.value.trim().toLowerCase() || ''
    const minPrice = Number(refs.priceMin?.value || 0)
    const maxPrice = Number(refs.priceMax?.value || 0)
    const minRooms = Number(refs.rooms?.value || 0)
    const minBathrooms = Number(refs.bathrooms?.value || 0)

    return items.filter((property) => {
      const matchOp = op === 'all' || property.operation === op
      const matchLocation = !locationTerm || property.location.toLowerCase().includes(locationTerm)

      // Filtro de precio: solo aplica si el precio USD es mayor a 0
      const hasPrice = property.priceUsd > 0
      const matchMinPrice = !minPrice || (hasPrice && property.priceUsd >= minPrice)
      const matchMaxPrice = !maxPrice || (hasPrice && property.priceUsd <= maxPrice)

      const matchRooms = property.rooms >= minRooms
      const matchBathrooms = property.bathrooms >= minBathrooms
      return matchOp && matchLocation && matchMinPrice && matchMaxPrice && matchRooms && matchBathrooms
    })
  }

  const PAGE_SIZE = 6
  const pageState = { venta: 6, alquiler: 6 }

  function showSkeletons(container, count = 3) {
    if (!container) return
    container.innerHTML = Array.from({ length: count }, () => `
      <article class="card card-skeleton">
        <div class="skeleton-img"></div>
        <div class="card-body">
          <div class="skeleton-line" style="width:55%; height:12px; margin-bottom:10px;"></div>
          <div class="skeleton-line" style="width:80%; height:22px; margin-bottom:8px;"></div>
          <div class="skeleton-line" style="width:45%; height:14px; margin-bottom:14px;"></div>
          <div style="display:flex; gap:8px;">
            <div class="skeleton-line" style="width:80px; height:32px;"></div>
            <div class="skeleton-line" style="width:80px; height:32px;"></div>
          </div>
        </div>
      </article>
    `).join('')
  }

  function renderSection(container, list, emptyText, sectionKey) {
    if (!container) return
    container.innerHTML = ''

    if (!list.length) {
      const emptyState = document.createElement('p')
      emptyState.className = 'empty'
      emptyState.textContent = emptyText
      container.appendChild(emptyState)
      return
    }

    const visible = list.slice(0, pageState[sectionKey])
    visible.forEach((item) => container.appendChild(createCard(item)))

    if (list.length > pageState[sectionKey]) {
      const remaining = list.length - pageState[sectionKey]
      const loadMoreBtn = document.createElement('button')
      loadMoreBtn.className = 'load-more-btn'
      loadMoreBtn.type = 'button'
      loadMoreBtn.textContent = `Ver más propiedades (${remaining} restantes)`
      loadMoreBtn.addEventListener('click', () => {
        pageState[sectionKey] += PAGE_SIZE
        render()
        loadMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
      container.appendChild(loadMoreBtn)
    }
  }

  function render() {
    const filtered = applyFilters(allProperties)
    const venta = filtered.filter((property) => property.operation === 'venta')
    const alquiler = filtered.filter((property) => property.operation === 'alquiler')

    // Resetear paginación al filtrar
    pageState.venta = PAGE_SIZE
    pageState.alquiler = PAGE_SIZE

    renderSection(refs.ventaGrid, venta, 'No hay propiedades en venta con esos filtros.', 'venta')
    renderSection(refs.alquilerGrid, alquiler, 'No hay propiedades en alquiler con esos filtros.', 'alquiler')

    if (refs.ventaCount) refs.ventaCount.textContent = `${venta.length} resultado(s)`
    if (refs.alquilerCount) refs.alquilerCount.textContent = `${alquiler.length} resultado(s)`
  }

  ;[refs.operation, refs.location, refs.priceMin, refs.priceMax, refs.rooms, refs.bathrooms]
    .filter(Boolean)
    .forEach((element) => {
      element.addEventListener('change', render)
    })

  refs.search?.addEventListener('click', render)

  refs.clear?.addEventListener('click', () => {
    if (refs.operation) refs.operation.value = 'all'
    if (refs.location) refs.location.value = ''
    if (refs.priceMin) refs.priceMin.value = ''
    if (refs.priceMax) refs.priceMax.value = ''
    if (refs.rooms) refs.rooms.value = '0'
    if (refs.bathrooms) refs.bathrooms.value = '0'
    render()
  })

  async function loadProperties() {
    // 1. Intentar cargar desde localStorage para visualización instantánea (caché)
    let cachedData = null
    try {
      const rawCache = localStorage.getItem('vg_properties_cache')
      if (rawCache) {
        cachedData = JSON.parse(rawCache)
      }
    } catch (e) {
      console.warn('Error leyendo caché local:', e)
    }

    if (Array.isArray(cachedData) && cachedData.length > 0) {
      allProperties = cachedData.map(normalizeProperty)
      render()
    } else {
      // Si no hay caché, mostrar skeletons inmediatamente
      showSkeletons(refs.ventaGrid, 3)
      showSkeletons(refs.alquilerGrid, 3)
    }

    // 2. Cargar en segundo plano desde Supabase
    supabase = await waitForSupabase()

    if (!supabase) {
      console.warn('Supabase no estuvo disponible. Se muestra la pagina con caché o vacía.')
      if (!allProperties.length) {
        allProperties = []
        render()
      }
      return
    }

    // Procesar vistas pendientes ahora que supabase está listo
    if (pendingViews.size > 0) {
      for (const propId of pendingViews) {
        trackView(propId)
      }
      pendingViews.clear()
    }

    try {
      const { data, error } = await supabase
        .from('propiedades')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const remoteProperties = data || []

      // Guardar en localStorage para futuras visitas
      try {
        localStorage.setItem('vg_properties_cache', JSON.stringify(remoteProperties))
      } catch (e) {
        console.warn('Error guardando en caché local:', e)
      }

      allProperties = remoteProperties.map(normalizeProperty)
      render()
    } catch (error) {
      console.error('Error cargando propiedades desde Supabase:', error)
      // Si falló pero teníamos caché, la dejamos. Si no, limpiamos
      if (!allProperties.length) {
        allProperties = []
        render()
      }
    }
  }

  loadProperties()
}

bootSite()
