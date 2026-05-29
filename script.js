const STORAGE_KEY = 'vg_properties'
const WHATSAPP_NUMBER = '5491153175943'

const baseProperties = [
  {
    id: 1,
    operation: 'venta',
    title: 'Casa moderna 4 ambientes',
    priceUsd: 185000,
    priceLabel: 'USD 185.000',
    location: 'General Rodriguez',
    meters: 180,
    bathrooms: 2,
    rooms: 4,
    extras: 'Pileta, parrilla, cochera x2',
    mapLink: 'General Rodriguez, Buenos Aires, Argentina',
    photos: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 2,
    operation: 'venta',
    title: 'Lote residencial en esquina',
    priceUsd: 38000,
    priceLabel: 'USD 38.000',
    location: 'Francisco Alvarez',
    meters: 420,
    bathrooms: 1,
    rooms: 1,
    extras: 'Todos los servicios, excelente acceso',
    mapLink: 'Francisco Alvarez, Buenos Aires, Argentina',
    photos: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 3,
    operation: 'alquiler',
    title: 'Departamento 3 ambientes',
    priceUsd: 780,
    priceLabel: 'USD 780 / mes',
    location: 'Lujan Centro',
    meters: 78,
    bathrooms: 1,
    rooms: 3,
    extras: 'Balcón, SUM, seguridad 24h',
    mapLink: 'Lujan Centro, Buenos Aires, Argentina',
    photos: [
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1616594039964-3de79f7e82f9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 4,
    operation: 'alquiler',
    title: 'Casa 3 ambientes con patio',
    priceUsd: 950,
    priceLabel: 'USD 950 / mes',
    location: 'Moreno',
    meters: 120,
    bathrooms: 2,
    rooms: 3,
    extras: 'Patio, cochera, apta mascotas',
    mapLink: 'Moreno, Buenos Aires, Argentina',
    photos: [
      'https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1200&q=80'
    ]
  }
]

function getStoredProperties() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getAllProperties() {
  return [...baseProperties, ...getStoredProperties()]
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

const menuToggle = document.getElementById('menuToggle')
const mainNav = document.getElementById('mainNav')
const tasacionForm = document.getElementById('tasacionForm')

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('is-open')
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  })

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open')
      menuToggle.setAttribute('aria-expanded', 'false')
    })
  })
}

if (tasacionForm) {
  tasacionForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const nombre = document.getElementById('tasacionNombre')?.value.trim() || ''
    const zona = document.getElementById('tasacionZona')?.value.trim() || ''
    const tipo = document.getElementById('tasacionTipo')?.value.trim() || ''

    const message = `Hola Verito, quiero consultar una tasación. Nombre: ${nombre}. Zona: ${zona}. Tipo de propiedad: ${tipo}.`
    window.open(getWhatsAppLink(message), '_blank', 'noopener,noreferrer')
  })
}

function createCard(property) {
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

  const propertyMessage = `Hola Verito, me interesa esta propiedad: ${property.title} (${property.operation}) en ${property.location}. Precio: ${property.priceLabel}.`
  const propertyWhatsappLink = getWhatsAppLink(propertyMessage)

  body.innerHTML = `
    <h3>${property.title}</h3>
    <p class="price">${property.priceLabel}</p>
    <p class="muted">${property.location}</p>
    <div class="card-actions">
      <button class="more-btn" type="button">Ver más</button>
      <button class="more-btn map-btn" type="button">Ver mapa</button>
    </div>
    <div class="card-extra">
      <div class="meta">
        <span>${property.meters} m2</span>
        <span>${property.rooms} amb.</span>
        <span>${property.bathrooms} baños</span>
      </div>
      <p class="muted">${property.extras || ''}</p>
    </div>
    <div class="map-box">${mapHtml}</div>
    <p class="muted"><a class="btn-primary" target="_blank" rel="noreferrer" href="${propertyWhatsappLink}">Consultar por WhatsApp</a></p>
  `

  card.append(carousel, body)
  const moreBtn = body.querySelector('.more-btn')
  const mapBtn = body.querySelector('.map-btn')
  const extra = body.querySelector('.card-extra')
  const mapBox = body.querySelector('.map-box')
  moreBtn.addEventListener('click', () => {
    const isOpen = extra.classList.toggle('is-open')
    moreBtn.textContent = isOpen ? 'Ver menos' : 'Ver más'
  })
  mapBtn.addEventListener('click', () => {
    const isOpen = mapBox.classList.toggle('is-open')
    mapBtn.textContent = isOpen ? 'Ocultar mapa' : 'Ver mapa'
  })

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

render()
